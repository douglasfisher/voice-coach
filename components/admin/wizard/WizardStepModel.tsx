import { useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput } from 'react-native';
import { useWizardStore } from '../../../stores/wizardStore';
import { SelectInput } from '../shared/SelectInput';
import { SliderInput } from '../shared/SliderInput';
import { AvatarPreviewHeader } from './AvatarPreviewHeader';
import { supabase } from '../../../lib/supabase';

export function WizardStepModel() {
  const { formData, updateFormField } = useWizardStore();
  const [aiModels, setAiModels] = useState<{ value: string; label: string }[]>([]);
  const [stopText, setStopText] = useState(
    (formData.ai_config?.stop || []).join(', ')
  );

  useEffect(() => {
    const fetchModels = async () => {
      const { data } = await supabase
        .from('ai_models')
        .select('id, name')
        .eq('active', true)
        .order('name');
      setAiModels((data || []).map((m) => ({ value: m.id, label: m.name })));
    };
    fetchModels();
  }, []);

  const updateAiConfig = (key: string, value: string | number | string[]) => {
    updateFormField('ai_config', { ...formData.ai_config, [key]: value });
  };

  const handleStopChange = (text: string) => {
    setStopText(text);
    const stopArr = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    updateAiConfig('stop', stopArr);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <AvatarPreviewHeader />

      <SelectInput
        label="Primary AI Model"
        value={formData.ai_config?.model || ''}
        options={aiModels}
        onValueChange={(value) => updateAiConfig('model', value)}
      />

      <SelectInput
        label="Fallback AI Model"
        value={formData.ai_config?.fallback_model || ''}
        options={aiModels}
        onValueChange={(value) => updateAiConfig('fallback_model', value)}
      />

      <SliderInput
        label={`Temperature: ${(formData.ai_config?.temperature || 0.7).toFixed(2)}`}
        value={(formData.ai_config?.temperature || 0.7) * 100}
        onValueChange={(value) => updateAiConfig('temperature', value / 100)}
        min={0}
        max={100}
      />

      <SliderInput
        label={`Top P: ${(formData.ai_config?.top_p ?? 0.9).toFixed(2)}`}
        value={(formData.ai_config?.top_p ?? 0.9) * 100}
        onValueChange={(value) => updateAiConfig('top_p', Math.round(value) / 100)}
        min={0}
        max={100}
      />

      <SliderInput
        label={`Max Tokens: ${formData.ai_config?.max_completion_tokens || 1024}`}
        value={formData.ai_config?.max_completion_tokens || 1024}
        onValueChange={(value) => updateAiConfig('max_completion_tokens', Math.round(value))}
        min={128}
        max={4096}
      />

      {/* Stop sequences */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>
          Stop Sequences (comma-separated, max 4)
        </Text>
        <TextInput
          value={stopText}
          onChangeText={handleStopChange}
          placeholder="e.g. [END], \n\n"
          placeholderTextColor="rgba(255,255,255,0.3)"
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 14,
            color: '#fff',
            fontSize: 15,
          }}
        />
        {(formData.ai_config?.stop || []).length > 0 && (
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>
            {(formData.ai_config?.stop || []).length} sequence(s) configured
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
