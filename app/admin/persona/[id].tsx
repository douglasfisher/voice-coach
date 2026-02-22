/**
 * Admin Persona Edit Screen
 *
 * Full persona editor with all configuration options.
 */

import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import {
  Save,
  Trash2,
} from 'lucide-react-native';
import { useAdminPersonaStore } from '../../../stores/adminPersonaStore';
import { useTraits } from '../../../hooks/useTraits';

import { PersonaFormData } from '../../../types/admin';
import { supabase } from '../../../lib/supabase';
import { resolvePersonaAvatarWithUrl, getLocalAvatar } from '../../../lib/personaImages';

import { FormInput } from '../../../components/admin/shared/FormInput';
import { SliderInput } from '../../../components/admin/shared/SliderInput';
import { SelectInput } from '../../../components/admin/shared/SelectInput';
import { TraitTokenBadges, TRAIT_TOKENS, getMissingTokens } from '../../../components/admin/shared/TraitTokenBadges';
import { AvatarGeneratorSection } from '../../../components/admin/shared/AvatarGeneratorSection';

interface AIModelOption {
  id: string;
  name: string;
}

const CHALLENGE_STYLES = [
  { value: 'socratic', label: 'Socratic' },
  { value: 'devils_advocate', label: "Devil's Advocate" },
  { value: 'steelman', label: 'Steelman' },
  { value: 'empathetic_probe', label: 'Empathetic Probe' },
  { value: 'logical_surgeon', label: 'Logical Surgeon' },
  { value: 'perspective_shifter', label: 'Perspective Shifter' },
];

const VOICE_PROVIDERS = [
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'playht', label: 'PlayHT' },
  { value: 'azure', label: 'Azure' },
];


export default function AdminPersonaEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  // Redirect existing persona edits to the wizard
  useEffect(() => {
    if (id && !isNew) {
      router.replace(`/admin/persona/wizard?id=${id}`);
    }
  }, [id, isNew]);

  const {
    selectedPersona,
    isLoading,
    isSaving,
    error: _error,
    fetchPersona,
    createPersona,
    updatePersona,
    deletePersona,
    clearSelectedPersona,
    personaTraitDefaults,
    fetchPersonaTraitDefaults,
    updatePersonaTraitDefault,
  } = useAdminPersonaStore();

  // All trait categories + options for the defaults selector
  const personaType = !isNew && selectedPersona?.persona_type as 'coach' | 'challenger' | undefined;
  const { categories: allTraitCategories, options: allTraitOptions } = useTraits(personaType || undefined);

  const [form, setForm] = useState<PersonaFormData>({
    name: '',
    title: null,
    tagline: '',
    avatar_url: '',
    avatar_thumbnail_url: null,
    voice_provider: 'elevenlabs',
    voice_id: '',
    voice_speed: 1,
    voice_pitch: 1,
    voice_stability: 0.7,
    warmth: 50,
    directness: 50,
    patience: 50,
    humor: 50,
    formality: 50,
    challenge_style: 'socratic',
    specialty_areas: [],
    cultural_background: '',
    system_prompt: '',
    is_active: true,
    is_premium: false,
    sort_order: 0,
    ai_config: {
      model: 'llama-3.1-8b-instant',
      fallback_model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_completion_tokens: 1024,
    },
    // Coaching fields
    persona_type: 'challenger',
    domain_id: null,
    coaching_style: null,
    default_interaction_mode: 'coach_leads',
    feedback_style: 'sandwich',
    emotional_progression_enabled: false,
    prompt_sections: null,
    mode_prompts: null,
    age_range: null,
    gender: 'male' as const,
  });

  const [aiModels, setAiModels] = useState<AIModelOption[]>([]);

  // Fetch available AI models
  useEffect(() => {
    const fetchModels = async () => {
      const { data } = await supabase
        .from('ai_models')
        .select('id, name')
        .eq('active', true)
        .order('name');
      setAiModels(data || []);
    };
    fetchModels();
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      fetchPersona(id);
      fetchPersonaTraitDefaults(id);
    }
    return () => clearSelectedPersona();
  }, [id, isNew, clearSelectedPersona, fetchPersona, fetchPersonaTraitDefaults]);

  useEffect(() => {
    if (selectedPersona && !isNew) {
      setForm({
        name: selectedPersona.name,
        title: selectedPersona.title,
        tagline: selectedPersona.tagline || '',
        avatar_url: selectedPersona.avatar_url,
        avatar_thumbnail_url: selectedPersona.avatar_thumbnail_url,
        voice_provider: selectedPersona.voice_provider,
        voice_id: selectedPersona.voice_id,
        voice_speed: selectedPersona.voice_speed,
        voice_pitch: selectedPersona.voice_pitch,
        voice_stability: selectedPersona.voice_stability,
        warmth: selectedPersona.warmth,
        directness: selectedPersona.directness,
        patience: selectedPersona.patience,
        humor: selectedPersona.humor,
        formality: selectedPersona.formality,
        challenge_style: selectedPersona.challenge_style,
        specialty_areas: selectedPersona.specialty_areas || [],
        cultural_background: selectedPersona.cultural_background || '',
        system_prompt: selectedPersona.system_prompt,
        is_active: selectedPersona.is_active,
        is_premium: selectedPersona.is_premium,
        sort_order: selectedPersona.sort_order,
        ai_config: selectedPersona.ai_config || {
          model: 'llama-3.1-8b-instant',
          fallback_model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          max_completion_tokens: 1024,
        },
        // Coaching fields
        persona_type: selectedPersona.persona_type || 'challenger',
        domain_id: selectedPersona.domain_id,
        coaching_style: selectedPersona.coaching_style,
        default_interaction_mode: selectedPersona.default_interaction_mode || 'coach_leads',
        feedback_style: selectedPersona.feedback_style || 'sandwich',
        emotional_progression_enabled: selectedPersona.emotional_progression_enabled ?? false,
        prompt_sections: selectedPersona.prompt_sections || null,
        mode_prompts: selectedPersona.mode_prompts || null,
        age_range: selectedPersona.age_range || null,
        gender: (selectedPersona.gender as 'male' | 'female') || 'male',
      });
    }
  }, [selectedPersona, isNew]);

  const doSave = async () => {
    if (isNew) {
      const { error } = await createPersona(form);
      if (!error) {
        router.back();
      } else {
        Alert.alert('Error', error.message);
      }
    } else if (id) {
      const { error } = await updatePersona(id, form);
      if (!error) {
        router.back();
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!form.system_prompt.trim()) {
      Alert.alert('Error', 'System prompt is required');
      return;
    }

    const missing = TRAIT_TOKENS.filter(
      (t) => !form.system_prompt.includes(`{{${t}}}`)
    );

    if (missing.length > 0) {
      Alert.alert(
        'Missing Trait Tokens',
        `The system prompt is missing these tokens:\n\n${missing.map((t) => `{{${t}}}`).join('\n')}\n\nTraits using these tokens won't affect this persona.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', onPress: doSave },
        ]
      );
      return;
    }

    await doSave();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Persona',
      'Are you sure you want to deactivate this persona? It will be hidden from users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              const { error } = await deletePersona(id);
              if (!error) {
                router.back();
              }
            }
          },
        },
      ]
    );
  };

  const updateForm = <K extends keyof PersonaFormData>(key: K, value: PersonaFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const missingTokens = getMissingTokens(form.system_prompt);

  const handleInsertMissingTokens = () => {
    if (missingTokens.length === 0) return;
    const tokensBlock = missingTokens.map((t) => `{{${t}}}`).join('\n');
    updateForm('system_prompt', form.system_prompt.trimEnd() + '\n\n' + tokensBlock);
  };

  if (isLoading && !isNew) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Info */}
          <Text
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            BASIC INFO
          </Text>

          <FormInput
            label="Name"
            value={form.name}
            onChangeText={(text) => updateForm('name', text)}
            placeholder="e.g., Dr. Maya Chen"
          />

          <FormInput
            label="Tagline"
            value={form.tagline || ''}
            onChangeText={(text) => updateForm('tagline', text)}
            placeholder="e.g., The Empathetic Challenger"
          />

          {form.name.trim().length > 0 && (
            <View
              style={{
                marginBottom: 16,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: 'rgba(245, 158, 11, 0.3)',
              }}
            >
              <Image
                source={resolvePersonaAvatarWithUrl(form.name, form.avatar_url, form.avatar_thumbnail_url)}
                style={{ width: '100%', height: 400 }}
                resizeMode="cover"
              />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, textAlign: 'center', paddingBottom: 8 }}>
                {form.avatar_url === 'local' ? 'Local avatar' : form.avatar_url ? 'Custom avatar' : getLocalAvatar(form.name) ? 'Local avatar' : 'Default avatar'}
              </Text>
            </View>
          )}

          <AvatarGeneratorSection
            personaId={isNew ? undefined : id}
            onAvatarApproved={(avatarUrl, thumbnailUrl) => {
              updateForm('avatar_url', avatarUrl);
              updateForm('avatar_thumbnail_url', thumbnailUrl);
            }}
          />

          <FormInput
            label="Cultural Background"
            value={form.cultural_background || ''}
            onChangeText={(text) => updateForm('cultural_background', text)}
            placeholder="e.g., Asian-American, Clinical Psychologist"
          />

          <SelectInput
            label="Challenge Style"
            value={form.challenge_style}
            options={CHALLENGE_STYLES}
            onValueChange={(value) => updateForm('challenge_style', value)}
          />

          {/* Toggles */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginRight: 12 }}>
                Active
              </Text>
              <Switch
                value={form.is_active}
                onValueChange={(value) => updateForm('is_active', value)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(74, 222, 128, 0.5)' }}
                thumbColor={form.is_active ? '#4ade80' : 'rgba(255,255,255,0.5)'}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginRight: 12 }}>
                Premium
              </Text>
              <Switch
                value={form.is_premium}
                onValueChange={(value) => updateForm('is_premium', value)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(251, 191, 36, 0.5)' }}
                thumbColor={form.is_premium ? '#fbbf24' : 'rgba(255,255,255,0.5)'}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginRight: 12 }}>
                Mood Shift
              </Text>
              <Switch
                value={form.emotional_progression_enabled ?? false}
                onValueChange={(value) => updateForm('emotional_progression_enabled', value)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(168, 85, 247, 0.5)' }}
                thumbColor={form.emotional_progression_enabled ? '#a855f7' : 'rgba(255,255,255,0.5)'}
              />
            </View>
          </View>

          {/* Personality */}
          <Text
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            PERSONALITY TRAITS
          </Text>

          <SliderInput
            label="Warmth"
            value={form.warmth}
            onValueChange={(value) => updateForm('warmth', value)}
          />
          <SliderInput
            label="Directness"
            value={form.directness}
            onValueChange={(value) => updateForm('directness', value)}
          />
          <SliderInput
            label="Patience"
            value={form.patience}
            onValueChange={(value) => updateForm('patience', value)}
          />
          <SliderInput
            label="Humor"
            value={form.humor}
            onValueChange={(value) => updateForm('humor', value)}
          />
          <SliderInput
            label="Formality"
            value={form.formality}
            onValueChange={(value) => updateForm('formality', value)}
          />

          {/* Voice Settings */}
          <Text
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 1,
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            VOICE SETTINGS
          </Text>

          <SelectInput
            label="Voice Provider"
            value={form.voice_provider}
            options={VOICE_PROVIDERS}
            onValueChange={(value) => updateForm('voice_provider', value)}
          />

          <FormInput
            label="Voice ID"
            value={form.voice_id}
            onChangeText={(text) => updateForm('voice_id', text)}
            placeholder="Voice ID from provider"
          />

          <SliderInput
            label="Voice Speed"
            value={form.voice_speed * 100}
            onValueChange={(value) => updateForm('voice_speed', value / 100)}
            min={50}
            max={200}
          />

          <SliderInput
            label="Voice Stability"
            value={form.voice_stability * 100}
            onValueChange={(value) => updateForm('voice_stability', value / 100)}
          />

          {/* AI Configuration */}
          <Text
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 1,
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            AI CONFIGURATION
          </Text>

          <SelectInput
            label="Primary AI Model"
            value={form.ai_config?.model || ''}
            options={aiModels.map(m => ({ value: m.id, label: m.name }))}
            onValueChange={(value) => updateForm('ai_config', { ...form.ai_config, model: value })}
          />

          <SelectInput
            label="Fallback AI Model"
            value={form.ai_config?.fallback_model || ''}
            options={aiModels.map(m => ({ value: m.id, label: m.name }))}
            onValueChange={(value) => updateForm('ai_config', { ...form.ai_config, fallback_model: value })}
          />

          <SliderInput
            label={`Temperature: ${(form.ai_config?.temperature || 0.7).toFixed(2)}`}
            value={(form.ai_config?.temperature || 0.7) * 100}
            onValueChange={(value) => updateForm('ai_config', { ...form.ai_config, temperature: value / 100 })}
            min={0}
            max={100}
          />

          {/* System Prompt */}
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
            SYSTEM PROMPT
          </Text>

          {/* Trait Token Status Badges */}
          <TraitTokenBadges
            systemPrompt={form.system_prompt}
            onInsertMissing={handleInsertMissingTokens}
          />

          {/* Trait Defaults Section */}
          {!isNew && allTraitCategories.length > 0 && (
            <>
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
                TRAIT DEFAULTS
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                Set the default trait for each category. User selections override these at chat time.
              </Text>
              {allTraitCategories.map((cat) => {
                const currentDefault = personaTraitDefaults.find(
                  (d) => d.categorySlug === cat.slug
                );
                const options = allTraitOptions[cat.slug] || [];
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
                      {options.map((opt) => {
                        const isSelected = currentDefault?.optionId === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            onPress={() => {
                              if (!isSelected && id) {
                                updatePersonaTraitDefault(id, opt.id);
                              }
                            }}
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
            </>
          )}

          <FormInput
            label="System Prompt"
            value={form.system_prompt}
            onChangeText={(text) => updateForm('system_prompt', text)}
            placeholder="Enter the persona's system prompt..."
            multiline
            numberOfLines={10}
          />

          {/* Action Buttons */}
          <View style={{ marginTop: 24, marginBottom: 40, gap: 12 }}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                borderRadius: 16,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(245, 158, 11, 0.3)',
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <>
                  <Save size={20} color="#F59E0B" />
                  <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                    {isNew ? 'Create Persona' : 'Save Changes'}
                  </Text>
                </>
              )}
            </Pressable>

            {!isNew && (
              <Pressable
                onPress={handleDelete}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              >
                <Trash2 size={20} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                  Deactivate Persona
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
