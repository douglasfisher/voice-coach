import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useWizardStore } from '../../../stores/wizardStore';
import { SelectInput } from '../shared/SelectInput';
import { SliderInput } from '../shared/SliderInput';
import { AvatarPreviewHeader } from './AvatarPreviewHeader';
import { supabase } from '../../../lib/supabase';

export function WizardStepModel() {
  const { formData, updateFormField } = useWizardStore();
  const [aiModels, setAiModels] = useState<{ value: string; label: string }[]>([]);

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

  const updateAiConfig = (key: string, value: string | number) => {
    updateFormField('ai_config', { ...formData.ai_config, [key]: value });
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
    </ScrollView>
  );
}
