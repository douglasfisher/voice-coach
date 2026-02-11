import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GraduationCap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { usePersonas } from '../../hooks/usePersonas';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useScrollHideAnimation } from '../../hooks/useScrollHideAnimation';
import { useAppSetting } from '../../hooks';
import { PersonaCard } from '../../components/personas/PersonaCard';
import { PersonaModal } from '../../components/personas/PersonaModal';
import { PersonaDisplay } from '../../types/persona';
import { supabase } from '../../lib/supabase';
import { HEADER_TOP_PADDING } from '../../constants/layout';
import { HeaderFade } from '../../components/ui/HeaderFade';
import { shuffleArray } from '../../lib/shuffle';

// Height of header content (title + subtitle + filter pills) without safe area
const HEADER_CONTENT_HEIGHT = 119;
const TAB_BAR_HEIGHT = 85;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface CoachingDomain {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  tagline: string | null;
}

export default function CoachesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
  const { openPersonaId } = useLocalSearchParams<{ openPersonaId?: string }>();

  const { personas, isLoading: personasLoading } = usePersonas();
  const { user } = useAuthStore();
  const { createConversation, coachesActiveDomain, setCoachesActiveDomain } = useChatStore();
  const { value: fullscreenCardMode } = useAppSetting('fullscreen_card_mode');
  const isSnapMode = fullscreenCardMode === true;
  const { scrollHandler, headerAnimatedStyle } = useScrollHideAnimation(headerHeight, isSnapMode);
  const snapCardHeight = SCREEN_HEIGHT - headerHeight - TAB_BAR_HEIGHT;

  const [selectedPersona, setSelectedPersona] = useState<PersonaDisplay | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [domains, setDomains] = useState<CoachingDomain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const listOpacity = useSharedValue(1);
  const listAnimatedStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));

  // Fetch coaching domains
  useEffect(() => {
    async function fetchDomains() {
      setDomainsLoading(true);
      try {
        const { data, error } = await supabase
          .from('coaching_domains')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setDomains(data || []);
      } catch (error) {
        console.error('Failed to fetch coaching domains:', error);
      } finally {
        setDomainsLoading(false);
      }
    }
    fetchDomains();
  }, []);

  // Filter to only show coaches
  const coaches = personas.filter(p => p.personaType === 'coach');

  // Auto-open persona modal when navigated with openPersonaId param
  useEffect(() => {
    if (openPersonaId && coaches.length > 0) {
      const match = coaches.find(c => c.id === openPersonaId);
      if (match) setSelectedPersona(match);
    }
  }, [openPersonaId, coaches.length]);

  const filteredCoaches = coachesActiveDomain === 'all'
    ? coaches
    : coaches.filter(p => p.domainId === coachesActiveDomain);

  // Stable key based on actual content so shuffle doesn't re-run on every render
  const filteredKey = filteredCoaches.map(c => c.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- filteredKey tracks content; shuffleKey triggers explicit re-shuffle
  const shuffledCoaches = useMemo(() => shuffleArray(filteredCoaches), [filteredKey, shuffleKey]);
  const featuredCoach = shuffledCoaches[0];
  const otherCoaches = shuffledCoaches.slice(1);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    listOpacity.value = withTiming(0.15, { duration: 150 });
    await new Promise(resolve => setTimeout(resolve, 200));
    setShuffleKey(prev => prev + 1);
    listOpacity.value = withTiming(1, { duration: 250 });
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsRefreshing(false);
  }, [listOpacity]);

  // Get domain info for display
  const getDomainName = (domainId: string | 'all'): string => {
    if (domainId === 'all') return 'All Coaches';
    const domain = domains.find(d => d.id === domainId);
    return domain?.name || 'Coaches';
  };

  const _getDomainColor = (domainId: string): string => {
    const domain = domains.find(d => d.id === domainId);
    return domain?.color || '#F59E0B';
  };

  const handleChallenge = async (persona: PersonaDisplay) => {
    if (!user?.id) {
      console.error('Cannot start chat: User not authenticated');
      return;
    }

    setIsCreating(true);
    try {
      const conversationId = await createConversation(user.id, persona.id);

      if (conversationId) {
        setSelectedPersona(null);
        router.push(`/(tabs)/chat/${conversationId}`);
      } else {
        console.error('Failed to create conversation - no ID returned');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const isLoading = personasLoading || domainsLoading;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F12' }}>
      {/* Floating header — slides fully off screen including safe area */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: '#0F0F12',
            paddingTop: insets.top,
          },
          headerAnimatedStyle,
        ]}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: HEADER_TOP_PADDING, paddingBottom: 8 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <GraduationCap size={24} color="#10b981" />
              <Text className="text-text-primary text-2xl font-bold ml-2">
                Coaches
              </Text>
            </View>
            <Text className="text-text-secondary mt-1">
              Practice real-world conversations
            </Text>
          </View>
        </View>

        {/* Domain Filter Pills */}
        <View style={{ paddingVertical: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {/* All filter */}
            <Pressable
              onPress={() => setCoachesActiveDomain('all')}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: coachesActiveDomain === 'all' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: coachesActiveDomain === 'all' ? '#10b981' : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: coachesActiveDomain === 'all' ? '#10b981' : '#9A9A9E'
                }}
              >
                All
              </Text>
            </Pressable>

            {/* Domain filters */}
            {domains.map((domain) => {
              const isActive = coachesActiveDomain === domain.id;
              return (
                <Pressable
                  key={domain.id}
                  onPress={() => setCoachesActiveDomain(domain.id)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isActive ? `${domain.color}20` : 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: isActive ? domain.color : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: isActive ? domain.color : '#9A9A9E'
                    }}
                  >
                    {domain.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Fade gradient — fixed below status bar, always visible */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9,
        }}
        pointerEvents="none"
      >
        <HeaderFade />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : isSnapMode ? (
        <Animated.FlatList
          data={shuffledCoaches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ height: snapCardHeight, paddingHorizontal: 8, paddingBottom: 16 }}>
              <PersonaCard
                persona={item}
                onPress={() => setSelectedPersona(item)}
                height={snapCardHeight - 16}
              />
            </View>
          )}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: headerHeight,
          }}
          showsVerticalScrollIndicator={false}
          snapToInterval={snapCardHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#10b981" progressViewOffset={headerHeight} />}
          ListEmptyComponent={
            <View style={{ paddingVertical: 80, alignItems: 'center' }}>
              <Text style={{ color: '#6E6E73' }}>No coaches available in this category</Text>
            </View>
          }
        />
      ) : (
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: headerHeight + 10,
            paddingHorizontal: 8,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#10b981" progressViewOffset={headerHeight} />}
        >
          {isRefreshing && (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={{ color: '#6E6E73', fontSize: 12, marginTop: 6 }}>Shuffling coaches...</Text>
            </View>
          )}

          <Animated.View style={listAnimatedStyle}>
            {/* Featured Coach */}
            {featuredCoach && (
              <PersonaCard
                persona={featuredCoach}
                onPress={() => setSelectedPersona(featuredCoach)}
                featured
              />
            )}

            {/* Section Header */}
            {otherCoaches.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: '#9A9A9E', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {getDomainName(coachesActiveDomain)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 6 }} />
                  <Text style={{ color: '#6E6E73', fontSize: 12 }}>
                    {otherCoaches.length + 1} available
                  </Text>
                </View>
              </View>
            )}

            {/* Grid of Coaches */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {otherCoaches.map((coach) => (
                <View key={coach.id} style={{ width: '100%', padding: 4 }}>
                  <PersonaCard
                    persona={coach}
                    onPress={() => setSelectedPersona(coach)}
                  />
                </View>
              ))}
            </View>

            {filteredCoaches.length === 0 && (
              <View className="py-20 items-center">
                <Text className="text-text-muted">No coaches available in this category</Text>
              </View>
            )}
          </Animated.View>
        </Animated.ScrollView>
      )}

      <PersonaModal
        persona={selectedPersona}
        visible={selectedPersona !== null}
        onClose={() => setSelectedPersona(null)}
        onChallenge={handleChallenge}
      />

      {isCreating && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={{ borderRadius: 16, padding: 24, alignItems: 'center' }}
          >
            <ActivityIndicator size="large" color="#10b981" />
            <Text className="text-text-primary mt-4">
              Starting session...
            </Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}
