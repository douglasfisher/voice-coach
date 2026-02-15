/**
 * Avatar Studio Admin Page
 *
 * Dedicated page for configuring avatar generation settings.
 * Three sections: Draft Generation, Hi-Res Creative Look, Hi-Res Technical.
 */

import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Save,
  Camera,
  Sparkles,
  Settings2,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { AvatarGenerationConfig, AvatarHiresConfig } from '../../types/admin';
import { OptionChips } from '../../components/admin/shared/OptionChips';
import {
  HIRES_OPTION_MAPS,
  HIRES_OPTION_LABELS,
  buildHiresPrompt,
} from '../../types/avatarOptions';

const DEFAULT_CONFIG: AvatarGenerationConfig = {
  draft: {
    prompt_template:
      'A classic mid-length head and shoulders portrait of a {{appearance}} {{ethnicity}} {{gender}}, {{expression}}, wearing {{clothing}} attire, {{accessories}}, {{pose}} composition, lit with {{lighting}} lighting on a dark charcoal background with space around. Shot on {{camera}}.',
    negative_prompt:
      'cartoon, anime, 3d render, distorted, blurry, low quality, text, watermark',
    model: 'runware:400@1',
    width: 896,
    height: 1152,
    number_results: 4,
    cfg_scale: 3.5,
    scheduler: 'FlowMatchEulerDiscreteScheduler',
  },
  hires: {
    prompt_template:
      'Reconstruct this image as an {{style}}, preserving the exact pose, body position, composition and framing precisely as shown. Apply full human-accurate detail: {{skin}}. Eyes must have realistic iris detail, moisture reflection and precise specular catch lights. Hair should show individual strand separation, natural flyaways and light-transmissive edges. All fabrics and materials must exhibit true-to-life weave texture, weight, drape and surface response to light. Render with {{lighting}}. Accurate specular highlights, contact shadows, ambient occlusion and global illumination throughout. {{camera}}, {{dof}}, {{detail}}, {{grading}} with editorial-grade retouching. {{negative_prompt}}.',
    style: 'Studio portrait',
    grading: 'Cinematic warm',
    lighting: 'Three-point studio',
    skin: 'Hyper-realistic',
    dof: 'Portrait f/2.8',
    camera: 'Medium format 80mm',
    detail: 'Ultra (150MP)',
    negative_prompt: 'Standard',
    model: 'google:4@2',
    width: 1792,
    height: 2400,
  },
};

export default function AvatarStudioScreen() {
  const [config, setConfig] = useState<AvatarGenerationConfig>(DEFAULT_CONFIG);
  const [savedConfig, setSavedConfig] = useState<AvatarGenerationConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [templateExpanded, setTemplateExpanded] = useState(false);

  const hasChanges = JSON.stringify(config) !== JSON.stringify(savedConfig);

  const assembledPrompt = useMemo(
    () => buildHiresPrompt(config.hires),
    [config.hires],
  );

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ai_avatar_config')
        .single();
      if (error) throw error;
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      const merged: AvatarGenerationConfig = {
        ...DEFAULT_CONFIG,
        ...parsed,
        draft: { ...DEFAULT_CONFIG.draft, ...parsed?.draft },
        hires: { ...DEFAULT_CONFIG.hires, ...parsed?.hires },
      };
      setConfig(merged);
      setSavedConfig(merged);
    } catch (err) {
      console.warn('Failed to fetch avatar config:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: config })
        .eq('key', 'ai_avatar_config');
      if (error) throw error;
      setSavedConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save avatar config:', err);
    } finally {
      setIsSaving(false);
    }
  }

  const updateDraft = (key: string, value: string | number) => {
    setConfig((prev) => ({
      ...prev,
      draft: { ...prev.draft, [key]: value },
    }));
  };

  const updateHires = (key: string, value: string | number) => {
    setConfig((prev) => ({
      ...prev,
      hires: { ...prev.hires, [key]: value },
    }));
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================ */}
        {/* SECTION 1: DRAFT GENERATION                                      */}
        {/* ================================================================ */}
        <SectionHeader icon={Camera} color="#f59e0b" title="Draft Generation" />

        <View style={styles.card}>
          <LinearGradient
            colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
            style={{ padding: 16 }}
          >
            <FieldLabel>Prompt Template</FieldLabel>
            <Text style={styles.tokenHint}>
              {'Tokens: {{appearance}} {{ethnicity}} {{gender}} {{expression}} {{clothing}} {{accessories}} {{pose}} {{lighting}} {{camera}}'}
            </Text>
            <TextInput
              value={config.draft.prompt_template}
              onChangeText={(t) => updateDraft('prompt_template', t)}
              multiline
              style={styles.multilineInput}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <FieldLabel>Negative Prompt</FieldLabel>
            <TextInput
              value={config.draft.negative_prompt}
              onChangeText={(t) => updateDraft('negative_prompt', t)}
              style={styles.input}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <FieldLabel>Model ID</FieldLabel>
            <TextInput
              value={config.draft.model}
              onChangeText={(t) => updateDraft('model', t)}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Width</FieldLabel>
                <TextInput
                  value={String(config.draft.width)}
                  onChangeText={(t) => updateDraft('width', parseInt(t) || 0)}
                  style={styles.input}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>Height</FieldLabel>
                <TextInput
                  value={String(config.draft.height)}
                  onChangeText={(t) => updateDraft('height', parseInt(t) || 0)}
                  style={styles.input}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Results</FieldLabel>
                <TextInput
                  value={String(config.draft.number_results)}
                  onChangeText={(t) => updateDraft('number_results', parseInt(t) || 1)}
                  style={styles.input}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>CFG Scale</FieldLabel>
                <TextInput
                  value={String(config.draft.cfg_scale)}
                  onChangeText={(t) => updateDraft('cfg_scale', parseFloat(t) || 0)}
                  style={styles.input}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <FieldLabel>Scheduler</FieldLabel>
            <TextInput
              value={config.draft.scheduler}
              onChangeText={(t) => updateDraft('scheduler', t)}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </LinearGradient>
        </View>

        {/* ================================================================ */}
        {/* SECTION 2: HI-RES CREATIVE LOOK                                  */}
        {/* ================================================================ */}
        <SectionHeader icon={Sparkles} color="#60a5fa" title="Hi-Res Creative Look" />

        <View style={styles.card}>
          <LinearGradient
            colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
            style={{ padding: 16 }}
          >
            {(Object.keys(HIRES_OPTION_MAPS) as Array<keyof typeof HIRES_OPTION_MAPS>).map(
              (key) => (
                <OptionChips
                  key={key}
                  label={HIRES_OPTION_LABELS[key]}
                  options={Object.keys(HIRES_OPTION_MAPS[key])}
                  selected={config.hires[key as keyof AvatarHiresConfig] as string}
                  onSelect={(val) => updateHires(key, val)}
                />
              ),
            )}

            {/* Live Preview */}
            <Pressable
              onPress={() => setPreviewExpanded(!previewExpanded)}
              style={styles.collapsibleHeader}
            >
              <Text style={styles.collapsibleLabel}>Assembled Prompt Preview</Text>
              <ChevronDown
                size={14}
                color="rgba(255,255,255,0.5)"
                style={{ transform: [{ rotate: previewExpanded ? '180deg' : '0deg' }] }}
              />
            </Pressable>
            {previewExpanded && (
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>{assembledPrompt}</Text>
              </View>
            )}

            {/* Advanced: editable template */}
            <Pressable
              onPress={() => setTemplateExpanded(!templateExpanded)}
              style={[styles.collapsibleHeader, { marginTop: 8 }]}
            >
              <Text style={styles.collapsibleLabel}>Advanced: Edit Template</Text>
              <ChevronDown
                size={14}
                color="rgba(255,255,255,0.5)"
                style={{ transform: [{ rotate: templateExpanded ? '180deg' : '0deg' }] }}
              />
            </Pressable>
            {templateExpanded && (
              <>
                <Text style={styles.tokenHint}>
                  {'Tokens: {{style}} {{grading}} {{lighting}} {{skin}} {{dof}} {{camera}} {{detail}} {{negative_prompt}}'}
                </Text>
                <TextInput
                  value={config.hires.prompt_template}
                  onChangeText={(t) => updateHires('prompt_template', t)}
                  multiline
                  style={styles.multilineInput}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </>
            )}
          </LinearGradient>
        </View>

        {/* ================================================================ */}
        {/* SECTION 3: HI-RES TECHNICAL                                      */}
        {/* ================================================================ */}
        <SectionHeader icon={Settings2} color="#a78bfa" title="Hi-Res Technical" />

        <View style={styles.card}>
          <LinearGradient
            colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
            style={{ padding: 16 }}
          >
            <FieldLabel>Model ID</FieldLabel>
            <TextInput
              value={config.hires.model}
              onChangeText={(t) => updateHires('model', t)}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FieldLabel>Width</FieldLabel>
                <TextInput
                  value={String(config.hires.width)}
                  onChangeText={(t) => updateHires('width', parseInt(t) || 0)}
                  style={styles.input}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>Height</FieldLabel>
                <TextInput
                  value={String(config.hires.height)}
                  onChangeText={(t) => updateHires('height', parseInt(t) || 0)}
                  style={styles.input}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Save FAB */}
      {hasChanges && (
        <View style={styles.fabContainer}>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.fab, isSaving && { opacity: 0.5 }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : saved ? (
              <Check size={20} color="#000" />
            ) : (
              <Save size={20} color="#000" />
            )}
            <Text style={styles.fabText}>
              {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function SectionHeader({
  icon: Icon,
  color,
  title,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  title: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
      <Icon size={18} color={color} />
      <Text style={{ color, fontSize: 16, fontWeight: '700', marginLeft: 8 }}>{title}</Text>
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 6 }}>
      {children}
    </Text>
  );
}

const styles = {
  card: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    marginBottom: 16,
  },
  multilineInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top' as const,
    marginBottom: 16,
  },
  tokenHint: {
    color: 'rgba(245,158,11,0.6)',
    fontSize: 11,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 0,
  },
  collapsibleHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 8,
  },
  collapsibleLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  previewBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  previewText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 18,
  },
  fabContainer: {
    position: 'absolute' as const,
    bottom: 30,
    left: 16,
    right: 16,
  },
  fab: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
  },
  fabText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700' as const,
    marginLeft: 8,
  },
};
