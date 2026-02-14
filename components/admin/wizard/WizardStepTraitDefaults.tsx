import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Sparkles, Shuffle } from 'lucide-react-native';
import { useTraits } from '../../../hooks/useTraits';
import { useWizardStore } from '../../../stores/wizardStore';
import { AvatarPreviewHeader } from './AvatarPreviewHeader';

// =============================================================================
// PRESETS
// =============================================================================

interface TraitPreset {
  label: string;
  icon: string;
  traits: Record<string, string>; // categorySlug → optionSlug
}

const PRESETS: TraitPreset[] = [
  {
    label: 'Supportive Coach',
    icon: '🤝',
    traits: {
      directness: 'diplomatic',
      challenge_intensity: 'gentle',
      emotional_attunement: 'deeply_attuned',
      humor_style: 'warm_humor',
      energy_mirroring: 'adaptive',
    },
  },
  {
    label: 'Tough Challenger',
    icon: '🔥',
    traits: {
      directness: 'blunt',
      challenge_intensity: 'intense',
      emotional_attunement: 'measured',
      humor_style: 'dry_wit',
      energy_mirroring: 'full_mirror',
    },
  },
  {
    label: 'Balanced',
    icon: '⚖️',
    traits: {}, // Will use is_default options
  },
];

export function WizardStepTraitDefaults() {
  const { formData, traitDefaults, setTraitDefault, setTraitDefaults, aiComplete } = useWizardStore();
  const personaType = formData.persona_type as 'coach' | 'challenger' | undefined;
  const { categories, options } = useTraits(personaType || undefined);
  const [isAIFilling, setIsAIFilling] = useState(false);

  // Apply a preset by matching option slugs to option IDs
  const applyPreset = (preset: TraitPreset) => {
    const newDefaults: Record<string, string> = {};

    for (const cat of categories) {
      const catOptions = options[cat.slug] || [];
      if (preset.traits[cat.slug]) {
        // Find option by slug
        const match = catOptions.find((o) => o.slug === preset.traits[cat.slug]);
        if (match) newDefaults[cat.slug] = match.id;
      } else {
        // Use default option
        const defaultOpt = catOptions.find((o) => o.isDefault);
        if (defaultOpt) newDefaults[cat.slug] = defaultOpt.id;
      }
    }

    setTraitDefaults(newDefaults);
  };

  // AI fill: ask AI to pick best option per category
  const handleAIFill = async () => {
    setIsAIFilling(true);
    try {
      const categoryList = categories.map((cat) => {
        const catOptions = options[cat.slug] || [];
        return `${cat.slug}: ${catOptions.map((o) => o.slug).join(', ')}`;
      }).join('\n');

      const prompt = `Based on this persona, pick the best trait option for each category.

Persona: ${formData.name || 'Unknown'}, ${formData.persona_type}, ${formData.coaching_style || 'general'} style.
Tagline: ${formData.tagline || 'None'}
Warmth: ${formData.warmth}/100, Directness: ${formData.directness}/100

Categories and options:
${categoryList}

Return ONLY a JSON object mapping category_slug to the chosen option_slug. No explanation.`;

      const responseText = await aiComplete(
        'You are selecting personality traits for an AI coaching persona. Return only valid JSON.',
        prompt,
      );

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      const aiPicks: Record<string, string> = JSON.parse(jsonMatch[0]);
      const newDefaults: Record<string, string> = {};

      for (const cat of categories) {
        const catOptions = options[cat.slug] || [];
        const pickedSlug = aiPicks[cat.slug];
        if (pickedSlug) {
          const match = catOptions.find((o) => o.slug === pickedSlug);
          if (match) newDefaults[cat.slug] = match.id;
        }
      }

      setTraitDefaults(newDefaults);
    } catch (err) {
      console.error('AI fill traits error:', err);
    } finally {
      setIsAIFilling(false);
    }
  };

  // Random: pick random option from each category
  const handleRandom = () => {
    const newDefaults: Record<string, string> = {};
    for (const cat of categories) {
      const catOptions = options[cat.slug] || [];
      if (catOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * catOptions.length);
        newDefaults[cat.slug] = catOptions[randomIndex].id;
      }
    }
    setTraitDefaults(newDefaults);
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
          marginBottom: 12,
        }}
      >
        Set the default trait for each category. User selections override these at chat time.
      </Text>

      {/* Action buttons row */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {/* Presets */}
        {PRESETS.map((preset) => (
          <Pressable
            key={preset.label}
            onPress={() => applyPreset(preset)}
            style={{
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 6,
              borderRadius: 8,
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.2)',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, marginBottom: 2 }}>{preset.icon}</Text>
            <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '600', textAlign: 'center' }}>
              {preset.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* AI + Random row */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Pressable
          onPress={handleAIFill}
          disabled={isAIFilling}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 9,
            borderRadius: 8,
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(168, 85, 247, 0.3)',
            opacity: isAIFilling ? 0.5 : 1,
          }}
        >
          {isAIFilling ? (
            <ActivityIndicator size="small" color="#a855f7" />
          ) : (
            <Sparkles size={14} color="#a855f7" />
          )}
          <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
            {isAIFilling ? 'AI Picking...' : 'AI Set Traits'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleRandom}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 9,
            borderRadius: 8,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(59, 130, 246, 0.3)',
          }}
        >
          <Shuffle size={14} color="#3b82f6" />
          <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
            Random
          </Text>
        </Pressable>
      </View>

      {/* Trait categories */}
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
                const isSelected = traitDefaults[cat.slug] === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setTraitDefault(cat.slug, opt.id)}
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

      {/* Selection count */}
      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
        {Object.keys(traitDefaults).length} / {categories.length} traits selected
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
