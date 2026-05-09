import { ScrollView } from 'react-native';
import { useWizardStore } from '../../../stores/wizardStore';
import { FormInput } from '../shared/FormInput';
import { SelectInput } from '../shared/SelectInput';
import { SliderInput } from '../shared/SliderInput';
import { AvatarPreviewHeader } from './AvatarPreviewHeader';

const VOICE_PROVIDERS = [
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'playht', label: 'PlayHT' },
  { value: 'azure', label: 'Azure' },
];

export function WizardStepVoice() {
  const { formData, updateFormField } = useWizardStore();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <AvatarPreviewHeader />

      <SelectInput
        label="Voice Provider"
        value={formData.voice_provider}
        options={VOICE_PROVIDERS}
        onValueChange={(value) => updateFormField('voice_provider', value)}
      />

      <FormInput
        label="Voice ID"
        value={formData.voice_id}
        onChangeText={(text) => updateFormField('voice_id', text)}
        placeholder="Voice ID from provider"
      />

      <SliderInput
        label="Voice Speed"
        value={formData.voice_speed * 100}
        onValueChange={(value) => updateFormField('voice_speed', value / 100)}
        min={50}
        max={200}
      />

      <SliderInput
        label="Voice Stability"
        value={formData.voice_stability * 100}
        onValueChange={(value) => updateFormField('voice_stability', value / 100)}
      />
    </ScrollView>
  );
}
