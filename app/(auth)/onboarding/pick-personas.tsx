import { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react-native';
import { usePersonas } from '../../../hooks/usePersonas';
import { useAuthStore } from '../../../stores/authStore';
import { PersonaCard } from '../../../components/personas/PersonaCard';
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
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(192, 132, 252, 0.08)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40%',
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ padding: 20, paddingBottom: 16 }}>
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <ChevronLeft size={24} color="#F59E0B" />
            <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '600', marginLeft: 4 }}>
              Back
            </Text>
          </Pressable>

          {/* Title section */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(192, 132, 252, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Users size={24} color="#c084fc" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
                Pick Your Challengers
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 15,
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            Select 2-3 personas you'd like to practice with. You can always change these later.
          </Text>

          {/* Selection counter */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            {[1, 2, 3].map((num) => (
              <View
                key={num}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor:
                    selectedIds.length >= num
                      ? 'rgba(192, 132, 252, 0.2)'
                      : 'rgba(255,255,255,0.05)',
                  borderWidth: 2,
                  borderColor:
                    selectedIds.length >= num ? '#c084fc' : 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                }}
              >
                {selectedIds.length >= num && <Check size={16} color="#c084fc" />}
              </View>
            ))}
            <Text
              style={{
                color: selectedIds.length > 0 ? '#c084fc' : 'rgba(255,255,255,0.4)',
                fontSize: 14,
                fontWeight: '600',
                marginLeft: 8,
              }}
            >
              {selectedIds.length}/3 selected
            </Text>
          </View>
        </View>

        {/* Personas Grid */}
        <FlatList
          data={personas}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
          columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <PersonaCard
                persona={item}
                onPress={() => togglePersona(item)}
                selected={selectedIds.includes(item.id)}
              />
            </View>
          )}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#c084fc" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>
                  Loading personas...
                </Text>
              </View>
            ) : null
          }
        />

        {/* Bottom CTA */}
        <View
          style={{
            padding: 20,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
          }}
        >
          <Pressable
            onPress={handleContinue}
            disabled={selectedIds.length === 0}
            style={{ opacity: selectedIds.length === 0 ? 0.5 : 1 }}
          >
            <LinearGradient
              colors={selectedIds.length > 0 ? ['#c084fc', '#9333ea'] : ['#333', '#222']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 18,
                borderRadius: 16,
                shadowColor: selectedIds.length > 0 ? '#c084fc' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
            >
              <Sparkles size={20} color={selectedIds.length > 0 ? '#fff' : '#666'} />
              <Text
                style={{
                  color: selectedIds.length > 0 ? '#fff' : '#666',
                  fontSize: 17,
                  fontWeight: '700',
                  marginLeft: 8,
                }}
              >
                Continue
              </Text>
              <ChevronRight
                size={20}
                color={selectedIds.length > 0 ? '#fff' : '#666'}
                style={{ marginLeft: 4 }}
              />
            </LinearGradient>
          </Pressable>

          <Text
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            {selectedIds.length === 0
              ? 'Select at least one persona to continue'
              : `Great choices! You can add more from the gallery later.`}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
