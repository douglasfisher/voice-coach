import { ScrollView, Text } from 'react-native';
import { useWizardStore } from '../../../stores/wizardStore';
import { FormInput } from '../shared/FormInput';
import { TraitTokenBadges, TRAIT_TOKENS } from '../shared/TraitTokenBadges';

export function WizardStepPrompt() {
  const { formData, updateFormField } = useWizardStore();

  const handleInsertMissing = () => {
    const missing = TRAIT_TOKENS.filter(
      (t) => !formData.system_prompt.includes(`{{${t}}}`)
    );
    if (missing.length === 0) return;
    const tokensBlock = missing.map((t) => `{{${t}}}`).join('\n');
    updateFormField('system_prompt', formData.system_prompt.trimEnd() + '\n\n' + tokensBlock);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        TRAIT TOKENS
      </Text>

      <TraitTokenBadges
        systemPrompt={formData.system_prompt}
        onInsertMissing={handleInsertMissing}
      />

      <FormInput
        label="System Prompt"
        value={formData.system_prompt}
        onChangeText={(text) => updateFormField('system_prompt', text)}
        placeholder="Enter the persona's system prompt..."
        multiline
        numberOfLines={12}
      />
    </ScrollView>
  );
}
