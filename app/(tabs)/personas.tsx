import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, RefreshControl, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { usePersonas } from '../../hooks/usePersonas';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useScrollHideAnimation } from '../../hooks/useScrollHideAnimation';
import { useAppSetting } from '../../hooks';
import { PersonaCard } from '../../components/personas/PersonaCard';
import { PersonaModal } from '../../components/personas/PersonaModal';
import { PersonaDisplay, ChallengeStyle, CHALLENGE_STYLE_LABELS } from '../../types/persona';
import { HEADER_TOP_PADDING } from '../../constants/layout';
import { HeaderFade } from '../../components/ui/HeaderFade';
import { shuffleArray } from '../../lib/shuffle';

// Height of header content (title + subtitle + filter pills) without safe area
const HEADER_CONTENT_HEIGHT = 119;
const TAB_BAR_HEIGHT = 85;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const STYLE_FILTERS: { key: ChallengeStyle | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: '#F59E0B' },
  { key: 'socratic', label: 'Socratic', color: '#60a5fa' },
  { key: 'devils_advocate', label: 'Challenger', color: '#f472b6' },
  { key: 'steelman', label: 'Builder', color: '#4ade80' },
  { key: 'logical_surgeon', label: 'Logical', color: '#2dd4bf' },
  { key: 'perspective_shifter', label: 'Perspective', color: '#c084fc' },
  { key: 'empathetic_probe', label: 'Empathetic', color: '#fbbf24' },
];

export default function PersonasScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + HEADER_CONTENT_HEIGHT;
  const { openPersonaId } = useLocalSearchParams<{ openPersonaId?: string }>();

  const { personas, isLoading } = usePersonas();
  const user = useAuthStore((s) => s.user);
  const createConversation = useChatStore((s) => s.createConversation);
  const challengersActiveFilter = useChatStore((s) => s.challengersActiveFilter);
  const setChallengersActiveFilter = useChatStore((s) => s.setChallengersActiveFilter);
  const { value: fullscreenCardMode } = useAppSetting('fullscreen_card_mode');
  const isSnapMode = fullscreenCardMode === true;
  const { scrollHandler, headerAnimatedStyle } = useScrollHideAnimation(headerHeight, isSnapMode);
  const snapCardHeight = SCREEN_HEIGHT - headerHeight - TAB_BAR_HEIGHT;

  const [selectedPersona, setSelectedPersona] = useState<PersonaDisplay | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const listOpacity = useSharedValue(1);
  const listAnimatedStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
  }));

  // Filter to only show challengers (not coaches)
  const challengers = useMemo(() => personas.filter(p => p.personaType === 'challenger'), [personas]);

  // Auto-open persona modal when navigated with openPersonaId param
  useEffect(() => {
    if (openPersonaId && challengers.length > 0) {
      const match = challengers.find(c => c.id === openPersonaId);
      if (match) setSelectedPersona(match);
    }
  }, [openPersonaId, challengers.length]);

  const filteredPersonas = challengersActiveFilter === 'all'
    ? challengers
    : challengers.filter(p => p.challengeStyle === challengersActiveFilter);

  // Stable key based on actual content so shuffle doesn't re-run on every render
  const filteredKey = filteredPersonas.map(c => c.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- filteredKey tracks content; shuffleKey triggers explicit re-shuffle
  const shuffledPersonas = useMemo(() => shuffleArray(filteredPersonas), [filteredKey, shuffleKey]);
  const featuredPersona = shuffledPersonas[0];
  const otherPersonas = shuffledPersonas.slice(1);

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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sparkles size={24} color="#F59E0B" />
                <Text className="text-text-primary text-2xl font-bold ml-2">
                  Challengers
                </Text>
              </View>
              <Text className="text-text-secondary mt-1">
                Choose your intellectual sparring partner
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={{ paddingVertical: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8, gap: 8 }}
          >
            {STYLE_FILTERS.map((filter) => {
              const isActive = challengersActiveFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setChallengersActiveFilter(filter.key)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isActive ? `${filter.color}20` : 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: isActive ? filter.color : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: isActive ? filter.color : '#9A9A9E'
                    }}
                  >
                    {filter.label}
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
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : isSnapMode ? (
        <Animated.FlatList
          data={shuffledPersonas}
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
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#F59E0B" progressViewOffset={headerHeight} />}
          ListEmptyComponent={
            <View style={{ paddingVertical: 80, alignItems: 'center' }}>
              <Text style={{ color: '#6E6E73' }}>No challengers match this filter</Text>
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
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#F59E0B" progressViewOffset={headerHeight} />}
        >
          {isRefreshing && (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator size="small" color="#F59E0B" />
              <Text style={{ color: '#6E6E73', fontSize: 12, marginTop: 6 }}>Shuffling challengers...</Text>
            </View>
          )}

          <Animated.View style={listAnimatedStyle}>
            {/* Featured Persona */}
            {featuredPersona && (
              <PersonaCard
                persona={featuredPersona}
                onPress={() => setSelectedPersona(featuredPersona)}
                featured
              />
            )}

            {/* Section Header */}
            {otherPersonas.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: '#9A9A9E', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {challengersActiveFilter === 'all' ? 'All Challengers' : CHALLENGE_STYLE_LABELS[challengersActiveFilter]}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', marginRight: 6 }} />
                  <Text style={{ color: '#6E6E73', fontSize: 12 }}>
                    {otherPersonas.length + 1} available
                  </Text>
                </View>
              </View>
            )}

            {/* Grid of Personas */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {otherPersonas.map((persona) => (
                <View key={persona.id} style={{ width: '100%', padding: 4 }}>
                  <PersonaCard
                    persona={persona}
                    onPress={() => setSelectedPersona(persona)}
                  />
                </View>
              ))}
            </View>

            {filteredPersonas.length === 0 && (
              <View className="py-20 items-center">
                <Text className="text-text-muted">No challengers match this filter</Text>
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
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text className="text-text-primary mt-4">
              Starting conversation...
            </Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}
