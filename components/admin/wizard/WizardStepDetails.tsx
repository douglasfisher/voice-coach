import { View, Text, ScrollView, Switch } from 'react-native';
import { useEffect, useState } from 'react';
import { useWizardStore } from '../../../stores/wizardStore';
import { FormInput } from '../shared/FormInput';
import { SelectInput } from '../shared/SelectInput';
import { supabase } from '../../../lib/supabase';

const PERSONA_TYPES = [
  { value: 'coach', label: 'Coach' },
  { value: 'challenger', label: 'Challenger' },
];

const CHALLENGE_STYLES = [
  { value: 'socratic', label: 'Socratic' },
  { value: 'devils_advocate', label: "Devil's Advocate" },
  { value: 'steelman', label: 'Steelman' },
  { value: 'empathetic_probe', label: 'Empathetic Probe' },
  { value: 'logical_surgeon', label: 'Logical Surgeon' },
  { value: 'perspective_shifter', label: 'Perspective Shifter' },
];

const COACHING_STYLES = [
  { value: 'supportive_guide', label: 'Supportive Guide' },
  { value: 'tough_love', label: 'Tough Love' },
  { value: 'playful_mentor', label: 'Playful Mentor' },
  { value: 'expert_advisor', label: 'Expert Advisor' },
  { value: 'confidence_builder', label: 'Confidence Builder' },
];

const INTERACTION_MODES = [
  { value: 'coach_leads', label: 'Coach Leads' },
  { value: 'user_leads', label: 'User Leads' },
  { value: 'turn_taking', label: 'Turn Taking' },
  { value: 'question_mode', label: 'Q&A Mode' },
];

const FEEDBACK_STYLES = [
  { value: 'sandwich', label: 'Sandwich' },
  { value: 'direct', label: 'Direct' },
  { value: 'question_based', label: 'Question-Based' },
  { value: 'observational', label: 'Observational' },
];

export function WizardStepDetails() {
  const { formData, updateFormField } = useWizardStore();
  const [domains, setDomains] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const fetchDomains = async () => {
      const { data } = await supabase
        .from('coaching_domains')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      setDomains((data || []).map((d) => ({ value: d.id, label: d.name })));
    };
    fetchDomains();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <FormInput
        label="Name"
        value={formData.name}
        onChangeText={(text) => updateFormField('name', text)}
        placeholder="e.g., Dr. Maya Chen"
      />

      <FormInput
        label="Tagline"
        value={formData.tagline || ''}
        onChangeText={(text) => updateFormField('tagline', text)}
        placeholder="e.g., The Empathetic Challenger"
      />

      <FormInput
        label="Cultural Background"
        value={formData.cultural_background || ''}
        onChangeText={(text) => updateFormField('cultural_background', text)}
        placeholder="e.g., Asian-American, Clinical Psychologist"
      />

      <SelectInput
        label="Persona Type"
        value={formData.persona_type || 'coach'}
        options={PERSONA_TYPES}
        onValueChange={(value) => updateFormField('persona_type', value as 'coach' | 'challenger')}
      />

      {domains.length > 0 && (
        <SelectInput
          label="Coaching Domain"
          value={formData.domain_id || ''}
          options={[{ value: '', label: 'None' }, ...domains]}
          onValueChange={(value) => updateFormField('domain_id', value || null)}
        />
      )}

      <SelectInput
        label="Challenge Style"
        value={formData.challenge_style}
        options={CHALLENGE_STYLES}
        onValueChange={(value) => updateFormField('challenge_style', value)}
      />

      {formData.persona_type === 'coach' && (
        <>
          <SelectInput
            label="Coaching Style"
            value={formData.coaching_style || ''}
            options={[{ value: '', label: 'None' }, ...COACHING_STYLES]}
            onValueChange={(value) => updateFormField('coaching_style', value || null)}
          />

          <SelectInput
            label="Default Interaction Mode"
            value={formData.default_interaction_mode}
            options={INTERACTION_MODES}
            onValueChange={(value) => updateFormField('default_interaction_mode', value)}
          />

          <SelectInput
            label="Feedback Style"
            value={formData.feedback_style}
            options={FEEDBACK_STYLES}
            onValueChange={(value) => updateFormField('feedback_style', value)}
          />
        </>
      )}

      {/* Toggles */}
      <Text
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 1,
          marginTop: 8,
          marginBottom: 12,
        }}
      >
        OPTIONS
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginRight: 12 }}>Active</Text>
          <Switch
            value={formData.is_active}
            onValueChange={(value) => updateFormField('is_active', value)}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(74, 222, 128, 0.5)' }}
            thumbColor={formData.is_active ? '#4ade80' : 'rgba(255,255,255,0.5)'}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginRight: 12 }}>Premium</Text>
          <Switch
            value={formData.is_premium}
            onValueChange={(value) => updateFormField('is_premium', value)}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(251, 191, 36, 0.5)' }}
            thumbColor={formData.is_premium ? '#fbbf24' : 'rgba(255,255,255,0.5)'}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginRight: 12 }}>Mood Shift</Text>
          <Switch
            value={formData.emotional_progression_enabled ?? false}
            onValueChange={(value) => updateFormField('emotional_progression_enabled', value)}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(168, 85, 247, 0.5)' }}
            thumbColor={formData.emotional_progression_enabled ? '#a855f7' : 'rgba(255,255,255,0.5)'}
          />
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
