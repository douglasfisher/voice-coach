import { useState } from 'react';
import { View, Text, ScrollView, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePersonas } from '../../../hooks/usePersonas';
import { useAuthStore } from '../../../stores/authStore';
import { PersonaCard } from '../../../components/personas/PersonaCard';
import { Button } from '../../../components/ui/Button';
import { PersonaDisplay } from '../../../types/persona';

export default function PickPersonasScreen() {
  const { personas, isLoading } = usePersonas();
  const { updatePreferences } = useAuthStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const togglePersona = (persona: PersonaDisplay) => {
    setSelectedIds((prev) => {
      if (prev.includes(persona.id)) {
        return prev.filter((id) => id !== persona.id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), persona.id];
      }
      return [...prev, persona.id];
    });
  };

  const handleContinue = async () => {
    if (selectedIds.length > 0) {
      await updatePreferences({ preferred_persona_ids: selectedIds });
    }
    router.push('/(auth)/onboarding/preferences');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <View className="flex-1">
        <View className="p-6 pb-4">
          <Text className="text-text-primary text-2xl font-bold">
            Pick Your Challengers
          </Text>
          <Text className="text-text-secondary mt-2">
            Select 2-3 personas you'd like to practice with. You can always
            change these later.
          </Text>
          <Text className="text-accent-primary text-sm mt-2">
            {selectedIds.length}/3 selected
          </Text>
        </View>

        <FlatList
          data={personas}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerClassName="px-4 pb-6"
          columnWrapperClassName="gap-4 mb-4"
          renderItem={({ item }) => (
            <View className="flex-1">
              <PersonaCard
                persona={item}
                onPress={() => togglePersona(item)}
                selected={selectedIds.includes(item.id)}
              />
            </View>
          )}
          ListEmptyComponent={
            isLoading ? (
              <View className="py-20 items-center">
                <Text className="text-text-muted">Loading personas...</Text>
              </View>
            ) : null
          }
        />

        <View className="p-6 border-t border-bg-tertiary">
          <Button
            onPress={handleContinue}
            size="lg"
            fullWidth
            disabled={selectedIds.length === 0}
          >
            Continue
          </Button>
          <Text className="text-text-muted text-center text-sm mt-3">
            Select at least one persona to continue
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
