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
} from '../types/wizard';

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_AVATAR_PARAMS: AvatarParams = {
  ethnicity: 'Northern European',
  gender: 'male',
  lighting: 'soft studio',
  clothing: 'business casual',
  expression: 'warm smile',
  accessories: ['none'],
  pose: 'slight angle',
  camera: 'Canon 85mm f/1.4',
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
    max_completion_tokens: 1024,
  },
  persona_type: 'coach',
  domain_id: null,
  coaching_style: null,
  default_interaction_mode: 'coach_leads',
  feedback_style: 'sandwich',
  emotional_progression_enabled: false,
};

// =============================================================================
// PROMPT BUILDER
// =============================================================================

function buildPromptFromParams(params: AvatarParams): string {
  const accessoriesText = params.accessories.filter((a) => a !== 'none').join(', ');
  const accessoriesPart = accessoriesText ? `wearing ${accessoriesText}` : 'no accessories';

  return [
    `A classic mid-length head and shoulders portrait of a ${params.ethnicity} ${params.gender},`,
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
  generateDrafts: () => Promise<void>;
  selectDraft: (id: string) => void;
  upscaleSelected: () => Promise<void>;
  saveUnusedToLibrary: () => Promise<void>;
  selectFromLibrary: (publicUrl: string, storagePath: string) => void;

  // Save
  savePersona: () => Promise<{ id: string | null; error: Error | null }>;

  // Reset
  reset: () => void;
}

export const useWizardStore = create<WizardState>((set, get) => ({
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
      // Build Runware payload for 4 draft images
      const payload = [
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
          outputType: ['dataURI', 'URL'],
          acceleration: 'high',
        },
      ];

      const { data: runwareResponse, error: invokeError } = await supabase.functions.invoke('runware', {
        body: payload,
      });

      if (invokeError) {
        // FunctionsHttpError has a .context with the Response object
        const ctx = (invokeError as any).context;
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

      console.log('Runware response:', JSON.stringify(runwareResponse).slice(0, 500));

      // Runware returns { data: [...images] }
      const images = runwareResponse?.data || runwareResponse || [];

      // Upload each image to Supabase storage
      const drafts: DraftImage[] = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const imageUrl = img.imageURL || img.imageUrl || img.image_url;
        if (!imageUrl) continue;

        // Fetch the image
        const imageResponse = await fetch(imageUrl);
        const blob = await imageResponse.blob();

        const fileName = `drafts/${Date.now()}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('persona-avatars')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('persona-avatars')
          .getPublicUrl(fileName);

        drafts.push({
          id: img.taskUUID || `draft_${i}`,
          url: urlData.publicUrl,
          storagePath: fileName,
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
      const payload = [
        {
          taskType: 'imageInference',
          taskUUID: generateUUID(),
          model: 'google:4@2',
          positivePrompt: 'make this is more photorealistic, with full ultra photorealistic details but keep the same pose and position in the frame',
          referenceImages: [selected.url],
          width: 1792,
          height: 2400,
          numberResults: 1,
          outputFormat: 'JPEG',
          includeCost: true,
          outputType: ['dataURI', 'URL'],
        },
      ];

      const { data: runwareResponse, error: invokeError } = await supabase.functions.invoke('runware', {
        body: payload,
      });

      if (invokeError) throw invokeError;

      const images = runwareResponse?.data || runwareResponse || [];
      const hiResImage = images[0];
      const hiResImageUrl = hiResImage?.imageURL || hiResImage?.imageUrl || hiResImage?.image_url;

      if (!hiResImageUrl) throw new Error('No hi-res image returned');

      // Upload hi-res
      const imageResponse = await fetch(hiResImageUrl);
      const blob = await imageResponse.blob();
      const fileName = `hires/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('persona-avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('persona-avatars')
        .getPublicUrl(fileName);

      // Set avatar URL on formData too
      set((state) => ({
        avatar: {
          ...state.avatar,
          hiResUrl: urlData.publicUrl,
          hiResStoragePath: fileName,
          isUpscaling: false,
        },
        formData: {
          ...state.formData,
          avatar_url: urlData.publicUrl,
          avatar_thumbnail_url: selected.url,
        },
      }));
    } catch (err) {
      console.error('Upscale error:', err);
      set((state) => ({ avatar: { ...state.avatar, isUpscaling: false } }));
    }
  },

  saveUnusedToLibrary: async () => {
    const { avatar } = get();
    const userId = useAuthStore.getState().user?.id;
    const unused = avatar.drafts.filter((d) => d.id !== avatar.selectedDraftId);

    for (const draft of unused) {
      await supabase.from('avatar_library').insert({
        storage_path: draft.storagePath,
        public_url: draft.url,
        prompt: avatar.editablePrompt,
        params: avatar.params as unknown as Record<string, unknown>,
        gender: avatar.params.gender,
        ethnicity: avatar.params.ethnicity,
        created_by: userId,
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
  // SAVE
  // =========================================================================

  savePersona: async () => {
    const { formData, avatar, saveUnusedToLibrary } = get();
    const store = useAdminPersonaStore.getState();

    const result = await store.createPersona(formData);

    // If successful and we have drafts, save unused to library and mark selected as used
    if (result.id && avatar.drafts.length > 0) {
      await saveUnusedToLibrary();

      // Mark the selected image as used by this persona
      if (avatar.hiResStoragePath) {
        await supabase.from('avatar_library').insert({
          storage_path: avatar.hiResStoragePath,
          public_url: avatar.hiResUrl || formData.avatar_url,
          prompt: avatar.editablePrompt,
          params: avatar.params as unknown as Record<string, unknown>,
          gender: avatar.params.gender,
          ethnicity: avatar.params.ethnicity,
          created_by: useAuthStore.getState().user?.id,
          used_by_persona_id: result.id,
        });
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
}));
