import { ScrollView, Text, Pressable, ActivityIndicator } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useWizardStore } from '../../../stores/wizardStore';
import { FormInput } from '../shared/FormInput';
import { TraitTokenBadges, TRAIT_TOKENS } from '../shared/TraitTokenBadges';
import { AvatarPreviewHeader } from './AvatarPreviewHeader';

export function WizardStepPrompt() {
  const { formData, updateFormField, generateSystemPrompt, isGeneratingPrompt } = useWizardStore();

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
      <AvatarPreviewHeader />

      {/* AI Generate Prompt button */}
      <Pressable
        onPress={generateSystemPrompt}
        disabled={isGeneratingPrompt}
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
          opacity: isGeneratingPrompt ? 0.5 : 1,
        }}
      >
        {isGeneratingPrompt ? (
          <ActivityIndicator size="small" color="#a855f7" />
        ) : (
          <Sparkles size={16} color="#a855f7" />
        )}
        <Text style={{ color: '#a855f7', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
          {isGeneratingPrompt ? 'AI Writing...' : 'AI Generate System Prompt'}
        </Text>
      </Pressable>

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
