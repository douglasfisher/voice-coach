import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Lightbulb, Settings } from 'lucide-react-native';
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

const HEADER_CONTENT_HEIGHT = 119;
const TAB_BAR_HEIGHT = 85;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const ACCENT = '#8b5cf6';

interface AdvisorCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  tagline: string | null;
}

export default function AdvisorsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
  const { openPersonaId } = useLocalSearchParams<{ openPersonaId?: string }>();

  const { personas, isLoading: personasLoading } = usePersonas();
  const user = useAuthStore((s) => s.user);
  const createConversation = useChatStore((s) => s.createConversation);
  const advisorsActiveCategory = useChatStore((s) => s.advisorsActiveCategory);
  const setAdvisorsActiveCategory = useChatStore((s) => s.setAdvisorsActiveCategory);
  const { value: fullscreenCardMode } = useAppSetting('fullscreen_card_mode');
  const isSnapMode = fullscreenCardMode === true;
  const { scrollHandler, headerAnimatedStyle } = useScrollHideAnimation(headerHeight, isSnapMode);
  const snapCardHeight = SCREEN_HEIGHT - headerHeight - TAB_BAR_HEIGHT;

  const [selectedPersona, setSelectedPersona] = useState<PersonaDisplay | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [categories, setCategories] = useState<AdvisorCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const listOpacity = useSharedValue(1);
  const listAnimatedStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));

  // Fetch advisor categories
  useEffect(() => {
    async function fetchCategories() {
      setCategoriesLoading(true);
      try {
        const { data, error } = await supabase
          .from('advisor_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Failed to fetch advisor categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    }
    fetchCategories();
  }, []);

  // Filter to only show advisors
  const advisors = useMemo(() => personas.filter(p => p.personaType === 'advisor'), [personas]);

  // Auto-open persona modal when navigated with openPersonaId param
  useEffect(() => {
    if (openPersonaId && advisors.length > 0) {
      const match = advisors.find(a => a.id === openPersonaId);
      if (match) setSelectedPersona(match);
    }
  }, [openPersonaId, advisors.length]);

  const filteredAdvisors = advisorsActiveCategory === 'all'
    ? advisors
    : advisors.filter(p => p.advisorCategoryId === advisorsActiveCategory);

  const filteredKey = filteredAdvisors.map(a => a.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledAdvisors = useMemo(() => shuffleArray(filteredAdvisors), [filteredKey, shuffleKey]);
  const featuredAdvisor = shuffledAdvisors[0];
  const otherAdvisors = shuffledAdvisors.slice(1);

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

  const getCategoryName = (categoryId: string | 'all'): string => {
    if (categoryId === 'all') return 'All Advisors';
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Advisors';
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

  const isLoading = personasLoading || categoriesLoading;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F12' }}>
      {/* Floating header */}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Lightbulb size={24} color={ACCENT} />
                <Text className="text-text-primary text-2xl font-bold ml-2">
                  Advisors
                </Text>
              </View>
              <Text className="text-text-secondary mt-1">
                Get expert advice on any topic
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              hitSlop={8}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={20} color="#9A9A9E" />
            </Pressable>
          </View>
        </View>

        {/* Category Filter Pills */}
        <View style={{ paddingVertical: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {/* All filter */}
            <Pressable
              onPress={() => setAdvisorsActiveCategory('all')}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: advisorsActiveCategory === 'all' ? `${ACCENT}33` : 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: advisorsActiveCategory === 'all' ? ACCENT : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: advisorsActiveCategory === 'all' ? ACCENT : '#9A9A9E'
                }}
              >
                All
              </Text>
            </Pressable>

            {/* Category filters */}
            {categories.map((cat) => {
              const isActive = advisorsActiveCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setAdvisorsActiveCategory(cat.id)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isActive ? `${cat.color}20` : 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: isActive ? cat.color : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: isActive ? cat.color : '#9A9A9E'
                    }}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Fade gradient */}
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
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : isSnapMode ? (
        <Animated.FlatList
          data={shuffledAdvisors}
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
          getItemLayout={(_data, index) => ({
            length: snapCardHeight,
            offset: snapCardHeight * index,
            index,
          })}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: headerHeight,
          }}
          showsVerticalScrollIndicator={false}
          snapToInterval={snapCardHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          windowSize={5}
          maxToRenderPerBatch={3}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={ACCENT} progressViewOffset={headerHeight} />}
          ListEmptyComponent={
            <View style={{ paddingVertical: 80, alignItems: 'center' }}>
              <Text style={{ color: '#6E6E73' }}>No advisors available in this category</Text>
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
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={ACCENT} progressViewOffset={headerHeight} />}
        >
          {isRefreshing && (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={ACCENT} />
              <Text style={{ color: '#6E6E73', fontSize: 12, marginTop: 6 }}>Shuffling advisors...</Text>
            </View>
          )}

          <Animated.View style={listAnimatedStyle}>
            {/* Featured Advisor */}
            {featuredAdvisor && (
              <PersonaCard
                persona={featuredAdvisor}
                onPress={() => setSelectedPersona(featuredAdvisor)}
                featured
              />
            )}

            {/* Section Header */}
            {otherAdvisors.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: '#9A9A9E', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {getCategoryName(advisorsActiveCategory)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, marginRight: 6 }} />
                  <Text style={{ color: '#6E6E73', fontSize: 12 }}>
                    {otherAdvisors.length + 1} available
                  </Text>
                </View>
              </View>
            )}

            {/* Grid of Advisors */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {otherAdvisors.map((advisor) => (
                <View key={advisor.id} style={{ width: '100%', padding: 4 }}>
                  <PersonaCard
                    persona={advisor}
                    onPress={() => setSelectedPersona(advisor)}
                  />
                </View>
              ))}
            </View>

            {filteredAdvisors.length === 0 && (
              <View className="py-20 items-center">
                <Text className="text-text-muted">No advisors available in this category</Text>
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
        onPersonaUpdated={(p) => setSelectedPersona(p)}
      />

      {isCreating && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={{ borderRadius: 16, padding: 24, alignItems: 'center' }}
          >
            <ActivityIndicator size="large" color={ACCENT} />
            <Text className="text-text-primary mt-4">
              Starting session...
            </Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}
