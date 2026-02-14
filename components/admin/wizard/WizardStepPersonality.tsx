import { ScrollView, Pressable, Text, ActivityIndicator } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useWizardStore } from '../../../stores/wizardStore';
import { SliderInput } from '../shared/SliderInput';
import { AvatarPreviewHeader } from './AvatarPreviewHeader';

export function WizardStepPersonality() {
  const { formData, updateFormField, generatePersonaDetails, isGeneratingDetails } = useWizardStore();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <AvatarPreviewHeader />

      <Pressable
        onPress={generatePersonaDetails}
        disabled={isGeneratingDetails}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(168, 85, 247, 0.3)',
          marginBottom: 16,
          opacity: isGeneratingDetails ? 0.5 : 1,
        }}
      >
        {isGeneratingDetails ? (
          <ActivityIndicator size="small" color="#a855f7" />
        ) : (
          <Sparkles size={16} color="#a855f7" />
        )}
        <Text style={{ color: '#a855f7', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
          {isGeneratingDetails ? 'AI Generating...' : 'AI Set Personality'}
        </Text>
      </Pressable>

      <SliderInput
        label="Warmth"
        value={formData.warmth}
        onValueChange={(value) => updateFormField('warmth', value)}
      />
      <SliderInput
        label="Directness"
        value={formData.directness}
        onValueChange={(value) => updateFormField('directness', value)}
      />
      <SliderInput
        label="Patience"
        value={formData.patience}
        onValueChange={(value) => updateFormField('patience', value)}
      />
      <SliderInput
        label="Humor"
        value={formData.humor}
        onValueChange={(value) => updateFormField('humor', value)}
      />
      <SliderInput
        label="Formality"
        value={formData.formality}
        onValueChange={(value) => updateFormField('formality', value)}
      />
    </ScrollView>
  );
}
