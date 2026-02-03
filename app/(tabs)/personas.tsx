import { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePersonas } from '../../hooks/usePersonas';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { PersonaCard } from '../../components/personas/PersonaCard';
import { PersonaModal } from '../../components/personas/PersonaModal';
import { PersonaDisplay } from '../../types/persona';

export default function PersonasScreen() {
  const { personas, isLoading, refresh } = usePersonas();
  const { user } = useAuthStore();
  const { createConversation } = useChatStore();

  const [selectedPersona, setSelectedPersona] = useState<PersonaDisplay | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
      <View className="p-6 pb-4">
        <Text className="text-text-primary text-2xl font-bold">
          Choose Your Challenger
        </Text>
        <Text className="text-text-secondary mt-2">
          Each persona brings a unique perspective and challenge style
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : (
        <FlatList
          data={personas}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerClassName="px-4 pb-6"
          columnWrapperClassName="gap-4 mb-4"
          refreshing={isLoading}
          onRefresh={refresh}
          renderItem={({ item }) => (
            <View className="flex-1">
              <PersonaCard
                persona={item}
                onPress={() => setSelectedPersona(item)}
              />
            </View>
          )}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="text-text-muted">No personas available</Text>
            </View>
          }
        />
      )}

      <PersonaModal
        persona={selectedPersona}
        visible={selectedPersona !== null}
        onClose={() => setSelectedPersona(null)}
        onChallenge={handleChallenge}
      />

      {isCreating && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center">
          <View className="bg-bg-secondary rounded-2xl p-6 items-center">
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text className="text-text-primary mt-4">
              Starting conversation...
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
