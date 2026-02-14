import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTraits } from '../../../hooks/useTraits';
import { useWizardStore } from '../../../stores/wizardStore';
import { useState } from 'react';
import { AvatarPreviewHeader } from './AvatarPreviewHeader';

export function WizardStepTraitDefaults() {
  const { formData } = useWizardStore();
  const personaType = formData.persona_type as 'coach' | 'challenger' | undefined;
  const { categories, options } = useTraits(personaType || undefined);

  // Local state for tracking selections (will be applied after persona creation)
  const [selectedDefaults, setSelectedDefaults] = useState<Record<string, string>>({});

  const handleSelectOption = (categorySlug: string, optionId: string) => {
    setSelectedDefaults((prev) => ({ ...prev, [categorySlug]: optionId }));
  };

  if (categories.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' }}>
          Trait defaults can be configured after creating the persona.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <AvatarPreviewHeader />

      <Text
        style={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: 12,
          marginBottom: 16,
        }}
      >
        Set the default trait for each category. User selections override these at chat time.
        These will be applied after creating the persona.
      </Text>

      {categories.map((cat) => {
        const catOptions = options[cat.slug] || [];
        return (
          <View key={cat.id} style={{ marginBottom: 14 }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontWeight: '500',
                marginBottom: 8,
              }}
            >
              {cat.name}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {catOptions.map((opt) => {
                const isSelected = selectedDefaults[cat.slug] === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleSelectOption(cat.slug, opt.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 8,
                      backgroundColor: isSelected
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(255,255,255,0.05)',
                      borderWidth: 1,
                      borderColor: isSelected
                        ? 'rgba(245, 158, 11, 0.4)'
                        : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? '#F59E0B' : 'rgba(255,255,255,0.6)',
                        fontSize: 12,
                        fontWeight: isSelected ? '600' : '400',
                      }}
                    >
                      {opt.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
