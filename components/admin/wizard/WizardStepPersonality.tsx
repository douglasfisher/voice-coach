import { ScrollView } from 'react-native';
import { useWizardStore } from '../../../stores/wizardStore';
import { SliderInput } from '../shared/SliderInput';

export function WizardStepPersonality() {
  const { formData, updateFormField } = useWizardStore();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
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
