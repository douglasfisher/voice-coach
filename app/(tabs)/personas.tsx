import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { usePersonas } from '../../hooks/usePersonas';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { PersonaCard } from '../../components/personas/PersonaCard';
import { PersonaModal } from '../../components/personas/PersonaModal';
import { PersonaDisplay, ChallengeStyle, CHALLENGE_STYLE_LABELS } from '../../types/persona';

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
  const { personas, isLoading, refresh } = usePersonas();
  const { user } = useAuthStore();
  const { createConversation } = useChatStore();

  const [selectedPersona, setSelectedPersona] = useState<PersonaDisplay | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ChallengeStyle | 'all'>('all');

  const filteredPersonas = activeFilter === 'all'
    ? personas
    : personas.filter(p => p.challengeStyle === activeFilter);

  const featuredPersona = filteredPersonas[0];
  const otherPersonas = filteredPersonas.slice(1);

  const handleChallenge = async (persona: PersonaDisplay) => {
    if (!user?.id) return;

    setIsCreating(true);
    try {
      const conversationId = await createConversation(user.id, persona.id);
      setSelectedPersona(null);

      if (conversationId) {
        router.push(`/(tabs)/chat/${conversationId}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center">
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 py-3"
        contentContainerClassName="gap-2"
      >
        {STYLE_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <Pressable
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              className="px-4 py-2 rounded-full"
              style={{
                backgroundColor: isActive ? `${filter.color}20` : 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: isActive ? filter.color : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: isActive ? filter.color : '#9A9A9E' }}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-6"
          showsVerticalScrollIndicator={false}
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
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-text-secondary text-sm font-medium">
                {activeFilter === 'all' ? 'All Challengers' : CHALLENGE_STYLE_LABELS[activeFilter]}
              </Text>
              <Text className="text-text-muted text-xs">
                {otherPersonas.length + 1} available
              </Text>
            </View>
          )}

          {/* Grid of Personas */}
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
            {otherPersonas.map((persona) => (
              <View key={persona.id} className="w-1/2 p-1.5">
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
        </ScrollView>
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
            className="rounded-2xl p-6 items-center"
          >
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text className="text-text-primary mt-4">
              Starting conversation...
            </Text>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}
