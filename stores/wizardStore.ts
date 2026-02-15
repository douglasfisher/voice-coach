/**
 * Wizard Store
 *
 * Ephemeral Zustand store for the persona creation wizard.
 * Manages step navigation, form data, and avatar generation.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAdminPersonaStore } from './adminPersonaStore';
import { useAuthStore } from './authStore';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
import {
  AvatarParams,
  AvatarGenerationState,
  DraftImage,
  WizardStep,
  WizardFormData,
  ETHNICITY_OPTIONS,
  GENDER_OPTIONS,
  LIGHTING_OPTIONS,
  CLOTHING_OPTIONS,
  EXPRESSION_OPTIONS,
  ACCESSORY_OPTIONS,
  POSE_OPTIONS,
  CAMERA_OPTIONS,
  APPEARANCE_OPTIONS,
  PROMPT_SECTION_KEYS,
  PromptSectionKey,
} from '../types/wizard';
import { TRAIT_TOKENS } from '../components/admin/shared/TraitTokenBadges';

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_AVATAR_PARAMS: AvatarParams = {
  ethnicity: 'English',
  gender: 'male',
  appearance: 'classically attractive',
  lighting: 'Rembrandt lighting with butterfly kicker and edge-lit hair light',
  clothing: 'formal',
  expression: 'warm smile',
  accessories: ['none'],
  pose: 'slight angle',
  camera: 'shot on medium format, f/2.8 shallow depth',
};

const DEFAULT_FORM_DATA: WizardFormData = {
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
    top_p: 0.9,
    max_completion_tokens: 1024,
    stop: [],
  },
  persona_type: 'coach',
  domain_id: null,
  coaching_style: null,
  default_interaction_mode: 'coach_leads',
  feedback_style: 'sandwich',
  emotional_progression_enabled: false,
  prompt_sections: null,
};

// =============================================================================
// PROMPT BUILDER
// =============================================================================

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomizeParams(): AvatarParams {
  const numAccessories = Math.random() > 0.5 ? Math.floor(Math.random() * 2) + 1 : 0;
  const accessories = numAccessories === 0
    ? ['none']
    : Array.from({ length: numAccessories }, () =>
      pickRandom(ACCESSORY_OPTIONS.filter((a) => a !== 'none'))
    );

  return {
    ethnicity: pickRandom(ETHNICITY_OPTIONS),
    gender: pickRandom(GENDER_OPTIONS),
    appearance: pickRandom(APPEARANCE_OPTIONS),
    lighting: pickRandom(LIGHTING_OPTIONS),
    clothing: pickRandom(CLOTHING_OPTIONS),
    expression: pickRandom(EXPRESSION_OPTIONS),
    accessories: [...new Set(accessories)],
    pose: pickRandom(POSE_OPTIONS),
    camera: pickRandom(CAMERA_OPTIONS),
  };
}

function buildPromptFromParams(params: AvatarParams): string {
  const accessoriesText = params.accessories.filter((a) => a !== 'none').join(', ');
  const accessoriesPart = accessoriesText ? `wearing ${accessoriesText}` : 'no accessories';

  return [
    `A classic mid-length head and shoulders portrait of a ${params.appearance} ${params.ethnicity} ${params.gender},`,
    `${params.expression},`,
    `wearing ${params.clothing} attire,`,
    `${accessoriesPart},`,
    `${params.pose} composition,`,
    `lit with ${params.lighting} lighting on a dark charcoal background with space around.`,
    `Shot on ${params.camera}.`,
  ].join(' ');
}

// =============================================================================
// STORE
// =============================================================================

interface WizardState {
  // Edit mode
  editingPersonaId: string | null;
  isLoadingPersona: boolean;
  loadPersona: (id: string) => Promise<void>;

  // Step navigation
  currentStep: WizardStep;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: WizardStep) => void;

  // Form data
  formData: WizardFormData;
  updateFormField: <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => void;

  // Avatar generation
  avatar: AvatarGenerationState;
  updateAvatarParams: (params: Partial<AvatarParams>) => void;
  setEditablePrompt: (prompt: string) => void;
  randomizeAvatarParams: () => void;
  generateDrafts: () => Promise<void>;
  selectDraft: (id: string) => void;
  upscaleSelected: () => Promise<void>;
  saveDraftsToLibrary: (personaId?: string) => Promise<void>;
  selectFromLibrary: (publicUrl: string, storagePath: string) => void;

  // Trait defaults
  traitDefaults: Record<string, string>; // categorySlug → optionId
  setTraitDefault: (categorySlug: string, optionId: string) => void;
  setTraitDefaults: (defaults: Record<string, string>) => void;

  // Prompt sections
  promptSections: Record<string, string>;
  setPromptSection: (key: PromptSectionKey, value: string) => void;
  generatePromptSection: (key: PromptSectionKey) => Promise<void>;
  compilePrompt: () => void;
  isGeneratingSection: PromptSectionKey | null;

  // AI-assisted generation
  generatePersonaDetails: () => Promise<void>;
  generateSystemPrompt: () => Promise<void>;
  aiComplete: (systemPrompt: string, userPrompt: string) => Promise<string>;
  isGeneratingDetails: boolean;
  isGeneratingPrompt: boolean;

  // Save
  savePersona: () => Promise<{ id: string | null; error: Error | null }>;

  // Reset
  reset: () => void;
  resetAvatar: (initialParams?: AvatarParams) => void;
}

export const useWizardStore = create<WizardState>((set, get) => ({
  // =========================================================================
  // EDIT MODE
  // =========================================================================

  editingPersonaId: null,
  isLoadingPersona: false,

  loadPersona: async (id: string) => {
    set({ isLoadingPersona: true, editingPersonaId: id });

    try {
      const store = useAdminPersonaStore.getState();

      // Fetch persona data and trait defaults in parallel
      await Promise.all([
        store.fetchPersona(id),
        store.fetchPersonaTraitDefaults(id),
      ]);

      const persona = useAdminPersonaStore.getState().selectedPersona;
      if (!persona) throw new Error('Persona not found');

      // Map persona → formData
      const formData: WizardFormData = {
        name: persona.name,
        title: persona.title,
        tagline: persona.tagline || '',
        avatar_url: persona.avatar_url,
        avatar_thumbnail_url: persona.avatar_thumbnail_url,
        voice_provider: persona.voice_provider,
        voice_id: persona.voice_id,
        voice_speed: persona.voice_speed,
        voice_pitch: persona.voice_pitch,
        voice_stability: persona.voice_stability,
        warmth: persona.warmth,
        directness: persona.directness,
        patience: persona.patience,
        humor: persona.humor,
        formality: persona.formality,
        challenge_style: persona.challenge_style,
        specialty_areas: persona.specialty_areas || [],
        cultural_background: persona.cultural_background || '',
        system_prompt: persona.system_prompt,
        is_active: persona.is_active,
        is_premium: persona.is_premium,
        sort_order: persona.sort_order,
        ai_config: persona.ai_config || {
          model: 'llama-3.1-8b-instant',
          fallback_model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          top_p: 0.9,
          max_completion_tokens: 1024,
          stop: [],
        },
        persona_type: persona.persona_type || 'challenger',
        domain_id: persona.domain_id,
        coaching_style: persona.coaching_style,
        default_interaction_mode: persona.default_interaction_mode || 'coach_leads',
        feedback_style: persona.feedback_style || 'sandwich',
        emotional_progression_enabled: persona.emotional_progression_enabled ?? false,
        prompt_sections: persona.prompt_sections || null,
      };

      // Map trait defaults: categorySlug → optionId
      const traitDefaults: Record<string, string> = {};
      const defaults = useAdminPersonaStore.getState().personaTraitDefaults;
      for (const d of defaults) {
        if (d.categorySlug && d.optionId) {
          traitDefaults[d.categorySlug] = d.optionId;
        }
      }

      // Map prompt_sections from JSONB
      const promptSections: Record<string, string> = {
        identity: '',
        trait_tokens: '',
        character_traits: '',
        roleplay_behavior: '',
        coaching_approach: '',
      };
      if (persona.prompt_sections && typeof persona.prompt_sections === 'object') {
        const sections = persona.prompt_sections as Record<string, string>;
        for (const key of PROMPT_SECTION_KEYS) {
          if (sections[key]) {
            promptSections[key] = sections[key];
          }
        }
      }

      // Check avatar_library for existing avatar params
      const { data: avatarEntry } = await supabase
        .from('avatar_library')
        .select('params, public_url, storage_path')
        .eq('used_by_persona_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const avatarParams = avatarEntry?.params
        ? (avatarEntry.params as unknown as AvatarParams)
        : { ...DEFAULT_AVATAR_PARAMS };

      set({
        formData,
        traitDefaults,
        promptSections,
        currentStep: 0 as WizardStep,
        isLoadingPersona: false,
        avatar: {
          params: avatarParams,
          editablePrompt: buildPromptFromParams(avatarParams),
          drafts: [],
          selectedDraftId: null,
          hiResUrl: persona.avatar_url || null,
          hiResStoragePath: avatarEntry?.storage_path || null,
          isGenerating: false,
          isUpscaling: false,
        },
      });
    } catch (err) {
      console.error('Failed to load persona for editing:', err);
      set({ isLoadingPersona: false, editingPersonaId: null });
    }
  },

  // =========================================================================
  // STEP NAVIGATION
  // =========================================================================

  currentStep: 0 as WizardStep,

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < 7) {
      set({ currentStep: (currentStep + 1) as WizardStep });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: (currentStep - 1) as WizardStep });
    }
  },

  goToStep: (step: WizardStep) => {
    set({ currentStep: step });
  },

  // =========================================================================
  // FORM DATA
  // =========================================================================

  formData: { ...DEFAULT_FORM_DATA },

  updateFormField: (key, value) => {
    set((state) => ({
      formData: { ...state.formData, [key]: value },
    }));
  },

  // =========================================================================
  // AVATAR GENERATION
  // =========================================================================

  avatar: {
    params: { ...DEFAULT_AVATAR_PARAMS },
    editablePrompt: buildPromptFromParams(DEFAULT_AVATAR_PARAMS),
    drafts: [],
    selectedDraftId: null,
    hiResUrl: null,
    hiResStoragePath: null,
    isGenerating: false,
    isUpscaling: false,
  },

  randomizeAvatarParams: () => {
    const newParams = randomizeParams();
    set((state) => ({
      avatar: {
        ...state.avatar,
        params: newParams,
        editablePrompt: buildPromptFromParams(newParams),
      },
    }));
  },

  updateAvatarParams: (params) => {
    set((state) => {
      const newParams = { ...state.avatar.params, ...params };
      return {
        avatar: {
          ...state.avatar,
          params: newParams,
          editablePrompt: buildPromptFromParams(newParams),
        },
      };
    });
  },

  setEditablePrompt: (prompt) => {
    set((state) => ({
      avatar: { ...state.avatar, editablePrompt: prompt },
    }));
  },

  generateDrafts: async () => {
    const { avatar } = get();
    set((state) => ({
      avatar: { ...state.avatar, isGenerating: true, drafts: [], selectedDraftId: null, hiResUrl: null, hiResStoragePath: null },
    }));

    try {
      // Build Runware payload — edge function uploads to storage via service role
      const { data: runwareResponse, error: invokeError } = await supabase.functions.invoke('runware', {
        body: {
          uploadToStorage: true,
          storagePrefix: 'drafts',
          tasks: [
            {
              taskType: 'imageInference',
              taskUUID: generateUUID(),
              model: 'runware:400@1',
              positivePrompt: avatar.editablePrompt,
              negativePrompt: 'cartoon, anime, 3d render, distorted, blurry, low quality, text, watermark',
              width: 896,
              height: 1152,
              numberResults: 4,
              outputFormat: 'JPEG',
              CFGScale: 3.5,
              scheduler: 'FlowMatchEulerDiscreteScheduler',
              includeCost: true,
              outputType: ['URL'],
              acceleration: 'high',
            },
          ],
        },
      });

      if (invokeError) {
        const ctx = (invokeError as Record<string, unknown>).context as { json?: () => Promise<unknown>; text?: () => Promise<string> } | undefined;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const errBody = await ctx.json();
            console.error('Runware error body:', JSON.stringify(errBody));
          } catch {
            const errText = await ctx.text?.();
            console.error('Runware error text:', errText);
          }
        }
        console.error('Runware invoke error:', invokeError.message);
        throw invokeError;
      }

      const images = runwareResponse?.data || runwareResponse || [];

      const drafts: DraftImage[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        // Prefer storage URL (permanent), fall back to Runware URL (expires)
        const url = img.storageUrl || img.imageURL || img.imageUrl;
        if (!url) continue;

        drafts.push({
          id: img.imageUUID || `draft_${i}`,
          url,
          storagePath: img.storagePath || '',
          selected: false,
        });
      }

      set((state) => ({
        avatar: { ...state.avatar, drafts, isGenerating: false },
      }));
    } catch (err) {
      console.error('Generate drafts error:', err);
      set((state) => ({
        avatar: { ...state.avatar, isGenerating: false },
      }));
    }
  },

  selectDraft: (id) => {
    set((state) => ({
      avatar: {
        ...state.avatar,
        selectedDraftId: id,
        drafts: state.avatar.drafts.map((d) => ({
          ...d,
          selected: d.id === id,
        })),
      },
    }));
  },

  upscaleSelected: async () => {
    const { avatar } = get();
    const selected = avatar.drafts.find((d) => d.id === avatar.selectedDraftId);
    if (!selected) return;

    set((state) => ({ avatar: { ...state.avatar, isUpscaling: true } }));

    try {
      const { data: runwareResponse, error: invokeError } = await supabase.functions.invoke('runware', {
        body: {
          uploadToStorage: true,
          storagePrefix: 'hires',
          tasks: [
            {
              taskType: 'imageInference',
              taskUUID: generateUUID(),
              model: 'google:4@2',
              positivePrompt: 'Reconstruct this image as an ultra-photorealistic studio photograph, preserving the exact pose, body position, composition and framing precisely as shown. Apply full human-accurate detail: natural skin with visible pores, fine vellus hair, subsurface light scattering, authentic skin imperfections and micro-texture variation. Eyes must have realistic iris detail, moisture reflection and precise specular catch lights. Hair should show individual strand separation, natural flyaways and light-transmissive edges. All fabrics and materials must exhibit true-to-life weave texture, weight, drape and surface response to light. Render with three-point studio lighting — defined key light with natural falloff, subtle fill preserving shadow detail, and rim/hair light for subject-background separation. Accurate specular highlights, contact shadows, ambient occlusion and global illumination throughout. Shot on medium format digital, 80mm lens, f/2.8 shallow depth of field, 150MP resolution, cinematic colour grading with editorial-grade retouching. No AI artifacts, no plastic skin, no uncanny smoothing.',
              referenceImages: [selected.url],
              width: 1792,
              height: 2400,
              numberResults: 1,
              outputFormat: 'JPEG',
              includeCost: true,
              outputType: ['URL'],
            },
          ],
        },
      });

      if (invokeError) throw invokeError;

      const images = runwareResponse?.data || runwareResponse || [];
      const hiResImage = images[0];
      const hiResUrl = hiResImage?.storageUrl || hiResImage?.imageURL || hiResImage?.imageUrl;

      if (!hiResUrl) throw new Error('No hi-res image returned');

      set((state) => ({
        avatar: {
          ...state.avatar,
          hiResUrl,
          hiResStoragePath: hiResImage?.storagePath || '',
          isUpscaling: false,
        },
        formData: {
          ...state.formData,
          avatar_url: hiResUrl,
          avatar_thumbnail_url: selected.url,
        },
      }));
    } catch (err) {
      console.error('Upscale error:', err);
      set((state) => ({ avatar: { ...state.avatar, isUpscaling: false } }));
    }
  },

  saveDraftsToLibrary: async (personaId?: string) => {
    const { avatar } = get();
    const userId = useAuthStore.getState().user?.id;
    if (avatar.drafts.length === 0) return;

    // Generate a batch ID to link all drafts from this generation
    const batchId = generateUUID();

    // Save ALL drafts (selected + unused) with batch tracking
    for (const draft of avatar.drafts) {
      const isSelected = draft.id === avatar.selectedDraftId;
      await supabase.from('avatar_library').insert({
        storage_path: draft.storagePath,
        public_url: draft.url,
        prompt: avatar.editablePrompt,
        params: avatar.params as unknown as Record<string, unknown>,
        gender: avatar.params.gender,
        ethnicity: avatar.params.ethnicity,
        created_by: userId,
        generation_batch_id: batchId,
        used_by_persona_id: isSelected && personaId ? personaId : null,
      });
    }

    // Save hi-res version too if available
    if (avatar.hiResUrl && avatar.hiResStoragePath && personaId) {
      await supabase.from('avatar_library').insert({
        storage_path: avatar.hiResStoragePath,
        public_url: avatar.hiResUrl,
        prompt: avatar.editablePrompt,
        params: avatar.params as unknown as Record<string, unknown>,
        gender: avatar.params.gender,
        ethnicity: avatar.params.ethnicity,
        created_by: userId,
        generation_batch_id: batchId,
        used_by_persona_id: personaId,
        is_hi_res: true,
      });
    }
  },

  selectFromLibrary: (publicUrl, storagePath) => {
    set((state) => ({
      formData: {
        ...state.formData,
        avatar_url: publicUrl,
        avatar_thumbnail_url: publicUrl,
      },
      avatar: {
        ...state.avatar,
        hiResUrl: publicUrl,
        hiResStoragePath: storagePath,
      },
    }));
  },

  // =========================================================================
  // TRAIT DEFAULTS
  // =========================================================================

  traitDefaults: {},

  setTraitDefault: (categorySlug, optionId) => {
    set((state) => ({
      traitDefaults: { ...state.traitDefaults, [categorySlug]: optionId },
    }));
  },

  setTraitDefaults: (defaults) => {
    set({ traitDefaults: defaults });
  },

  // =========================================================================
  // PROMPT SECTIONS
  // =========================================================================

  promptSections: {
    identity: '',
    trait_tokens: '',
    character_traits: '',
    roleplay_behavior: '',
    coaching_approach: '',
  },
  isGeneratingSection: null,

  setPromptSection: (key, value) => {
    set((state) => ({
      promptSections: { ...state.promptSections, [key]: value },
    }));
  },

  generatePromptSection: async (key: PromptSectionKey) => {
    const { formData, avatar, aiComplete } = get();
    set({ isGeneratingSection: key });

    const personaContext = `Name: ${formData.name || 'Unknown'}
Tagline: ${formData.tagline || 'None'}
Cultural Background: ${formData.cultural_background || 'None'}
Type: ${formData.persona_type}
Coaching Style: ${formData.coaching_style || 'Not set'}
Challenge Style: ${formData.challenge_style}
Feedback Style: ${formData.feedback_style}
Personality: Warmth ${formData.warmth}/100, Directness ${formData.directness}/100, Patience ${formData.patience}/100, Humor ${formData.humor}/100, Formality ${formData.formality}/100
Avatar: ${avatar.params.ethnicity} ${avatar.params.gender}, ${avatar.params.expression}`;

    const sectionPrompts: Record<PromptSectionKey, string> = {
      identity: `Write an opening identity paragraph for this AI coaching persona. Start with "You are [Name], a [role]..." and establish who they are, their background, and their approach. 2-4 sentences.\n\nPersona:\n${personaContext}\n\nReturn ONLY the paragraph, no explanation.`,
      trait_tokens: '', // Not AI-generated
      character_traits: `Write a CHARACTER TRAITS section for this AI coaching persona. Start with "CHARACTER TRAITS:" on its own line, then include the placeholder {{character_demeanor}} on its own line, followed by 4-6 bullet points describing specific character traits. Each bullet should be one concise sentence.\n\nPersona:\n${personaContext}\n\nReturn ONLY the section text, no explanation.`,
      roleplay_behavior: `Write a "WHEN IN ROLEPLAY:" section for this AI coaching persona. Start with "WHEN IN ROLEPLAY:" on its own line, then 5-7 bullet points describing specific roleplay behaviors and rules. Each bullet should be one concise directive.\n\nPersona:\n${personaContext}\n\nReturn ONLY the section text, no explanation.`,
      coaching_approach: `Write a "COACHING APPROACH:" section for this AI coaching persona. Start with "COACHING APPROACH:" on its own line, then 4-6 bullet points describing specific coaching methods and philosophy. Each bullet should be one concise sentence.\n\nPersona:\n${personaContext}\n\nReturn ONLY the section text, no explanation.`,
    };

    try {
      if (key === 'trait_tokens') {
        // Not AI-generated — insert standard 12 tokens
        const tokensBlock = TRAIT_TOKENS.map((t) => `{{${t}}}`).join('\n');
        set((state) => ({
          promptSections: { ...state.promptSections, trait_tokens: tokensBlock },
          isGeneratingSection: null,
        }));
        return;
      }

      const responseText = await aiComplete(
        'You are an expert prompt engineer designing AI coaching personas. Write natural, engaging system prompt sections.',
        sectionPrompts[key],
      );

      if (responseText.trim()) {
        set((state) => ({
          promptSections: { ...state.promptSections, [key]: responseText.trim() },
          isGeneratingSection: null,
        }));
      } else {
        throw new Error('Empty response');
      }
    } catch (err) {
      console.error(`Generate prompt section "${key}" error:`, err);
      set({ isGeneratingSection: null });
    }
  },

  compilePrompt: () => {
    const { promptSections } = get();
    const compiled = PROMPT_SECTION_KEYS
      .map((key) => promptSections[key]?.trim())
      .filter(Boolean)
      .join('\n\n');

    set((state) => ({
      formData: { ...state.formData, system_prompt: compiled },
    }));
  },

  // =========================================================================
  // AI-ASSISTED GENERATION
  // =========================================================================

  isGeneratingDetails: false,
  isGeneratingPrompt: false,

  aiComplete: async (sysPrompt: string, userPrompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: {
        action: 'complete',
        systemPrompt: sysPrompt,
        userPrompt,
        settings: { temperature: 0.9, max_completion_tokens: 1024 },
      },
    });
    if (error) throw error;
    return (data?.content || data?.message || '') as string;
  },

  generatePersonaDetails: async () => {
    const { avatar, aiComplete } = get();
    set({ isGeneratingDetails: true });

    try {
      const { params } = avatar;
      const prompt = `Based on this avatar description, generate persona details for a coaching app character.

Avatar: ${params.ethnicity} ${params.gender}, ${params.expression}, wearing ${params.clothing} attire, ${params.accessories.join(', ')}.

Generate a JSON object with these fields:
- name: A culturally appropriate full name (first + last)
- tagline: A short catchy tagline (5-8 words) describing their coaching style
- cultural_background: A brief cultural/professional background (e.g., "Japanese-American, Executive Coach")
- coaching_style: One of: supportive_guide, tough_love, playful_mentor, expert_advisor, confidence_builder
- challenge_style: One of: socratic, devils_advocate, steelman, empathetic_probe, logical_surgeon, perspective_shifter
- warmth: number 0-100
- directness: number 0-100
- patience: number 0-100
- humor: number 0-100
- formality: number 0-100

Return ONLY valid JSON, no markdown or explanation.`;

      const responseText = await aiComplete(
        'You are a creative character designer for a coaching app. Return only valid JSON.',
        prompt,
      );

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      const details = JSON.parse(jsonMatch[0]);

      set((state) => ({
        formData: {
          ...state.formData,
          name: details.name || state.formData.name,
          tagline: details.tagline || state.formData.tagline,
          cultural_background: details.cultural_background || state.formData.cultural_background,
          coaching_style: details.coaching_style || state.formData.coaching_style,
          challenge_style: details.challenge_style || state.formData.challenge_style,
          warmth: details.warmth ?? state.formData.warmth,
          directness: details.directness ?? state.formData.directness,
          patience: details.patience ?? state.formData.patience,
          humor: details.humor ?? state.formData.humor,
          formality: details.formality ?? state.formData.formality,
        },
        isGeneratingDetails: false,
      }));
    } catch (err) {
      console.error('Generate persona details error:', err);
      set({ isGeneratingDetails: false });
    }
  },

  generateSystemPrompt: async () => {
    const { formData, avatar, aiComplete } = get();
    set({ isGeneratingPrompt: true });

    try {
      const prompt = `Create a system prompt for an AI coaching persona with these characteristics:

Name: ${formData.name || 'Unknown'}
Tagline: ${formData.tagline || 'None'}
Cultural Background: ${formData.cultural_background || 'None'}
Type: ${formData.persona_type}
Coaching Style: ${formData.coaching_style || 'Not set'}
Challenge Style: ${formData.challenge_style}
Feedback Style: ${formData.feedback_style}
Personality: Warmth ${formData.warmth}/100, Directness ${formData.directness}/100, Patience ${formData.patience}/100, Humor ${formData.humor}/100, Formality ${formData.formality}/100
Avatar: ${avatar.params.ethnicity} ${avatar.params.gender}, ${avatar.params.expression}

Write a detailed system prompt (200-400 words) that:
1. Establishes the persona's voice and communication style
2. Defines how they coach/challenge users
3. Sets boundaries and personality traits
4. Includes these trait token placeholders where appropriate: {{character_demeanor}}, {{conversation_register}}, {{vocabulary_complexity}}, {{emotional_tone}}, {{response_pacing}}, {{cultural_context}}

Return ONLY the system prompt text, no explanation or markdown.`;

      const responseText = await aiComplete(
        'You are an expert prompt engineer designing AI coaching personas. Write natural, engaging system prompts.',
        prompt,
      );

      if (responseText.trim()) {
        set((state) => ({
          formData: { ...state.formData, system_prompt: responseText.trim() },
          isGeneratingPrompt: false,
        }));
      } else {
        throw new Error('Empty response');
      }
    } catch (err) {
      console.error('Generate system prompt error:', err);
      set({ isGeneratingPrompt: false });
    }
  },

  // =========================================================================
  // SAVE
  // =========================================================================

  savePersona: async () => {
    const { formData, avatar, saveDraftsToLibrary, traitDefaults, promptSections, editingPersonaId } = get();
    const store = useAdminPersonaStore.getState();

    // Include prompt_sections in the form data
    const dataWithSections = {
      ...formData,
      prompt_sections: Object.values(promptSections).some((v) => v.trim())
        ? promptSections
        : null,
    };

    if (editingPersonaId) {
      // UPDATE existing persona
      const { error } = await store.updatePersona(editingPersonaId, dataWithSections as typeof formData);

      if (!error) {
        // Save trait defaults
        const traitEntries = Object.entries(traitDefaults);
        if (traitEntries.length > 0) {
          try {
            for (const [, optionId] of traitEntries) {
              await store.updatePersonaTraitDefault(editingPersonaId, optionId);
            }
          } catch (err) {
            console.warn('Failed to save trait defaults:', err);
          }
        }

        // Save new drafts to library if any were generated
        if (avatar.drafts.length > 0) {
          try {
            await saveDraftsToLibrary(editingPersonaId);
          } catch (err) {
            console.warn('Failed to save drafts to library:', err);
          }
        }
      }

      return { id: editingPersonaId, error };
    }

    // CREATE new persona
    const result = await store.createPersona(dataWithSections as typeof formData);

    if (result.id) {
      // Save trait defaults
      const traitEntries = Object.entries(traitDefaults);
      if (traitEntries.length > 0) {
        try {
          for (const [, optionId] of traitEntries) {
            await store.updatePersonaTraitDefault(result.id, optionId);
          }
        } catch (err) {
          console.warn('Failed to save trait defaults:', err);
        }
      }

      // Save all drafts to library with batch tracking (selected one marked as used)
      if (avatar.drafts.length > 0) {
        try {
          await saveDraftsToLibrary(result.id);
        } catch (err) {
          console.warn('Failed to save drafts to library:', err);
        }
      }
    }

    return result;
  },

  // =========================================================================
  // RESET
  // =========================================================================

  reset: () => {
    set({
      currentStep: 0 as WizardStep,
      formData: { ...DEFAULT_FORM_DATA },
      traitDefaults: {},
      promptSections: {
        identity: '',
        trait_tokens: '',
        character_traits: '',
        roleplay_behavior: '',
        coaching_approach: '',
      },
      isGeneratingSection: null,
      editingPersonaId: null,
      isLoadingPersona: false,
      avatar: {
        params: { ...DEFAULT_AVATAR_PARAMS },
        editablePrompt: buildPromptFromParams(DEFAULT_AVATAR_PARAMS),
        drafts: [],
        selectedDraftId: null,
        hiResUrl: null,
        hiResStoragePath: null,
        isGenerating: false,
        isUpscaling: false,
      },
    });
  },

  resetAvatar: (initialParams?: AvatarParams) => {
    const params = initialParams ? { ...initialParams } : { ...DEFAULT_AVATAR_PARAMS };
    set({
      avatar: {
        params,
        editablePrompt: buildPromptFromParams(params),
        drafts: [],
        selectedDraftId: null,
        hiResUrl: null,
        hiResStoragePath: null,
        isGenerating: false,
        isUpscaling: false,
      },
    });
  },
}));
