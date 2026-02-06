import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { usePersonas } from '../../hooks/usePersonas';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useScrollHideAnimation } from '../../hooks/useScrollHideAnimation';
import { PersonaCard } from '../../components/personas/PersonaCard';
import { PersonaModal } from '../../components/personas/PersonaModal';
import { PersonaDisplay, ChallengeStyle, CHALLENGE_STYLE_LABELS } from '../../types/persona';

// Height of header content (title + subtitle + filter pills) without safe area
const HEADER_CONTENT_HEIGHT = 110;

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

  const { personas, isLoading, refresh } = usePersonas();
  const { user } = useAuthStore();
  const { createConversation } = useChatStore();
  const { scrollHandler, headerAnimatedStyle } = useScrollHideAnimation(headerHeight);

  const [selectedPersona, setSelectedPersona] = useState<PersonaDisplay | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ChallengeStyle | 'all'>('all');

  // Filter to only show challengers (not coaches)
  const challengers = personas.filter(p => p.personaType === 'challenger');

  const filteredPersonas = activeFilter === 'all'
    ? challengers
    : challengers.filter(p => p.challengeStyle === activeFilter);

  const featuredPersona = filteredPersonas[0];
  const otherPersonas = filteredPersonas.slice(1);

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
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
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
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {STYLE_FILTERS.map((filter) => {
              const isActive = activeFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  style={{
                    paddingHorizontal: 16,
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

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : (
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingHorizontal: 16,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {/* Featured Persona */}
          {featuredPersona && (
            <PersonaCard
              persona={featuredPersona}
              onPress={() => setSelectedPersona(featuredPersona)}
              variant="featured"
            />
          )}

          {/* Section Header */}
          {otherPersonas.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: '#9A9A9E', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>
                {activeFilter === 'all' ? 'All Challengers' : CHALLENGE_STYLE_LABELS[activeFilter]}
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
              <View key={persona.id} style={{ width: '50%', padding: 4 }}>
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
