import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Conversation, Message } from '../types/database';
import { InteractionMode, SessionPhase, SituationVariant, TraitSelection } from '../types/coaching';
import { ChallengeStyle } from '../types/persona';
import { useAuthStore } from './authStore';

interface SessionReport {
  tldr: string;
  strengths: string[];
  weaknesses: string[];
  detailed_analysis: string;
  overall_score: number;
  generated_at: string;
}

interface CompletedConversation {
  id: string;
  persona_id: string;
  overall_score: number | null;
  ended_at: string | null;
  created_at: string;
}

interface ChatMessage extends Omit<Message, 'analysis' | 'metadata'> {
  metadata?: Record<string, unknown> | null;
}

interface DailyChallenge {
  question: string;
  topic: string;
  personaId: string;
  generatedAt: string;
}

interface CoachingSessionOptions {
  domainId?: string;
  scenarioId?: string;
  interactionMode?: InteractionMode;
  scenarioVariant?: SituationVariant;
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  completedConversations: CompletedConversation[];
  isLoading: boolean;
  isSending: boolean;
  isGeneratingReport: boolean;
  error: string | null;

  // Preview state (question only, no intro)
  previewQuestion: string | null;
  previewScenario: string | null;  // For Q&A mode
  questionRefreshCount: number;
  scenarioRefreshCount: number;  // For Q&A mode
  isGeneratingPreview: boolean;

  // Daily challenge
  dailyChallenge: DailyChallenge | null;
  isLoadingChallenge: boolean;

  // Coaching state
  currentPhase: SessionPhase;
  coachingOptions: CoachingSessionOptions | null;

  // Global interaction mode preference (Practice vs Q&A)
  globalInteractionMode: 'practice' | 'question';

  // Trait selections for prompt token system
  selectedTraits: TraitSelection;

  // Screen filter preferences (persisted)
  coachesActiveDomain: string;
  challengersActiveFilter: ChallengeStyle | 'all';

  fetchConversations: (userId: string) => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchCompletedConversations: (userId: string) => Promise<void>;
  createConversation: (
    userId: string,
    personaId: string,
    topic?: string,
    coachingOptions?: CoachingSessionOptions
  ) => Promise<string | null>;
  startChallengeChat: (
    userId: string,
    personaId: string,
    challengeQuestion: string,
    topic?: string
  ) => Promise<string | null>;
  sendMessage: (content: string) => Promise<{ response: string } | null>;
  startChat: () => Promise<boolean>;
  startChatWithPreview: () => Promise<boolean>;
  generatePreview: () => Promise<void>;
  regenerateQuestion: () => Promise<boolean>;
  regenerateScenario: () => Promise<boolean>;
  generateReport: (conversationId: string) => Promise<SessionReport | null>;
  clearPreview: () => void;
  endConversation: () => Promise<void>;
  clearMessages: (conversationId: string) => Promise<void>;
  clearActiveConversation: () => void;
  fetchDailyChallenge: (personas: { id: string }[]) => Promise<void>;
  // Coaching-specific actions
  switchPhase: (phase: SessionPhase) => Promise<{ response: string } | null>;
  requestQuickFeedback: () => Promise<{ response: string } | null>;
  setCoachingOptions: (options: CoachingSessionOptions | null) => void;
  // Global interaction mode
  setGlobalInteractionMode: (mode: 'practice' | 'question') => void;
  // Trait actions
  setTrait: (categorySlug: string, optionId: string, promptModifier: string) => void;
  clearTraits: () => void;
  // Filter actions
  setCoachesActiveDomain: (domain: string) => void;
  setChallengersActiveFilter: (filter: ChallengeStyle | 'all') => void;
}

const MAX_QUESTION_REFRESHES = 3;

/** Build promptTokens for scenario generation from traits + gender preferences */
function buildScenarioPromptTokens(selectedTraits: TraitSelection): Record<string, string> {
  const promptTokens: Record<string, string> = {};
  for (const [slug, selection] of Object.entries(selectedTraits)) {
    promptTokens[slug] = selection.promptModifier;
  }
  // Add gender/dating preference context as a pseudo-token
  const prefs = useAuthStore.getState().preferences;
  if (prefs?.user_gender || prefs?.interested_in) {
    const parts: string[] = [];
    if (prefs.user_gender) parts.push(`The user is ${prefs.user_gender}`);
    if (prefs.interested_in) parts.push(`interested in ${prefs.interested_in}`);
    promptTokens['_user_context'] = `${parts.join(', ')}. Use appropriate gender pronouns for the person they encounter.`;
  }
  return promptTokens;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  completedConversations: [],
  isLoading: false,
  isSending: false,
  isGeneratingReport: false,
  error: null,

  // Preview state (question only, no intro)
  previewQuestion: null,
  previewScenario: null,
  questionRefreshCount: 0,
  scenarioRefreshCount: 0,
  isGeneratingPreview: false,

  // Daily challenge
  dailyChallenge: null,
  isLoadingChallenge: false,

  // Coaching state
  currentPhase: 'roleplay',
  coachingOptions: null,

  // Global interaction mode
  globalInteractionMode: 'practice',

  // Trait selections
  selectedTraits: {},

  // Screen filter preferences
  coachesActiveDomain: 'all',
  challengersActiveFilter: 'all',

  fetchConversations: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ conversations: data ?? [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchConversation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      set({ activeConversation: data });

      // Load saved trait selections for this conversation
      const { data: savedTraits } = await supabase
        .from('conversation_traits')
        .select('trait_option_id, trait_options(category_id, slug, prompt_modifier, trait_categories(slug))')
        .eq('conversation_id', id);

      if (savedTraits && savedTraits.length > 0) {
        const restoredTraits: TraitSelection = {};
        for (const row of savedTraits as any[]) {
          const opt = row.trait_options;
          const catSlug = opt.trait_categories.slug;
          restoredTraits[catSlug] = {
            optionId: row.trait_option_id,
            promptModifier: opt.prompt_modifier,
          };
        }
        set({ selectedTraits: restoredTraits });
      } else {
        set({ selectedTraits: {} });
      }

      await get().fetchMessages(id);
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (conversationId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence', { ascending: true });

    if (error) {
      set({ error: error.message });
      return;
    }

    const messages: ChatMessage[] = (data ?? []).map((msg: Record<string, unknown>) => ({
      id: msg.id as string,
      conversation_id: msg.conversation_id as string,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content as string,
      audio_url: msg.audio_url as string | null,
      audio_duration_ms: msg.audio_duration_ms as number | null,
      sequence: msg.sequence as number,
      response_time_ms: msg.response_time_ms as number | null,
      metadata: msg.metadata as Record<string, unknown> | null,
      created_at: msg.created_at as string,
    }));

    set({ messages });
  },

  fetchCompletedConversations: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, persona_id, overall_score, ended_at, created_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('overall_score', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      set({ completedConversations: data ?? [] });
    } catch (error) {
      console.error('Failed to fetch completed conversations:', error);
    }
  },

  createConversation: async (userId, personaId, topic, coachingOptions) => {
    const { globalInteractionMode, selectedTraits } = get();
    set({ isLoading: true, error: null });
    try {
      const insertData: Record<string, unknown> = {
        user_id: userId,
        persona_id: personaId,
        topic,
        status: 'active',
      };

      // Apply global interaction mode if set to question mode
      if (globalInteractionMode === 'question') {
        insertData.interaction_mode = 'question_mode';
      }

      // Add coaching fields if provided (these can override global mode)
      if (coachingOptions) {
        if (coachingOptions.domainId) {
          insertData.domain_id = coachingOptions.domainId;
        }
        if (coachingOptions.scenarioId) {
          insertData.scenario_id = coachingOptions.scenarioId;
        }
        if (coachingOptions.interactionMode) {
          insertData.interaction_mode = coachingOptions.interactionMode;
        }
        if (coachingOptions.scenarioVariant) {
          insertData.scenario_variant = coachingOptions.scenarioVariant;
        }
        insertData.current_phase = 'roleplay';
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Save trait selections to conversation_traits
      const traitEntries = Object.values(selectedTraits);
      if (traitEntries.length > 0) {
        const traitRows = traitEntries.map(({ optionId }) => ({
          conversation_id: data.id,
          trait_option_id: optionId,
        }));
        await supabase.from('conversation_traits').insert(traitRows);
      }

      set({
        activeConversation: data,
        messages: [],
        coachingOptions: coachingOptions || null,
        currentPhase: 'roleplay',
      });
      return data.id;
    } catch (error) {
      console.error('createConversation error:', error);
      set({ error: (error as Error).message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  startChallengeChat: async (userId, personaId, challengeQuestion, topic) => {
    set({ isLoading: true, error: null });
    try {
      // Create the conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          persona_id: personaId,
          topic: topic || 'Daily Challenge',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Save the challenge question as the first assistant message
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: data.id,
        role: 'assistant',
        content: challengeQuestion,
        sequence: 1,
      });

      if (msgError) throw msgError;

      // Set active conversation and fetch the message
      set({ activeConversation: data });
      await get().fetchMessages(data.id);

      return data.id;
    } catch (error) {
      console.error('startChallengeChat error:', error);
      set({ error: (error as Error).message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (content) => {
    const { activeConversation, messages, coachingOptions, currentPhase, selectedTraits } = get();
    if (!activeConversation) return null;

    set({ isSending: true, error: null });
    try {
      const sequence = messages.length + 1;

      // Add user message to local state immediately
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: activeConversation.id,
        role: 'user',
        content,
        audio_url: null,
        audio_duration_ms: null,
        sequence,
        response_time_ms: null,
        created_at: new Date().toISOString(),
      };

      set({ messages: [...messages, userMessage] });

      // Build request body with coaching context
      const requestBody: Record<string, unknown> = {
        conversationId: activeConversation.id,
        userMessage: content,
        personaId: activeConversation.persona_id,
      };

      // Add coaching context if this is a coaching session
      if (coachingOptions) {
        if (coachingOptions.scenarioId) {
          requestBody.scenarioId = coachingOptions.scenarioId;
        }
        if (coachingOptions.interactionMode) {
          requestBody.interactionMode = coachingOptions.interactionMode;
        }
        requestBody.currentPhase = currentPhase;
        if (coachingOptions.scenarioVariant) {
          requestBody.scenarioVariant = coachingOptions.scenarioVariant;
        }
      }

      // Add prompt tokens from trait selections
      if (Object.keys(selectedTraits).length > 0) {
        const promptTokens: Record<string, string> = {};
        for (const [slug, selection] of Object.entries(selectedTraits)) {
          promptTokens[slug] = selection.promptModifier;
        }
        requestBody.promptTokens = promptTokens;
      }

      // Call Edge Function for AI response
      const { data, error } = await supabase.functions.invoke('chat', {
        body: requestBody,
      });

      if (error) throw error;

      // Refresh messages from DB to get saved versions with IDs
      await get().fetchMessages(activeConversation.id);

      return {
        response: data.response,
      };
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    } finally {
      set({ isSending: false });
    }
  },

  startChat: async () => {
    const { activeConversation, coachingOptions, selectedTraits } = get();
    if (!activeConversation) return false;

    console.log('Starting chat with:', {
      conversationId: activeConversation.id,
      personaId: activeConversation.persona_id,
      coachingOptions,
    });

    set({ isSending: true, error: null });
    try {
      const requestBody: Record<string, unknown> = {
        conversationId: activeConversation.id,
        personaId: activeConversation.persona_id,
        generateGreeting: true,
      };

      if (coachingOptions) {
        if (coachingOptions.scenarioId) {
          requestBody.scenarioId = coachingOptions.scenarioId;
        }
        if (coachingOptions.interactionMode) {
          requestBody.interactionMode = coachingOptions.interactionMode;
        }
        if (coachingOptions.scenarioVariant) {
          requestBody.scenarioVariant = coachingOptions.scenarioVariant;
        }
      }

      if (Object.keys(selectedTraits).length > 0) {
        const promptTokens: Record<string, string> = {};
        for (const [slug, selection] of Object.entries(selectedTraits)) {
          promptTokens[slug] = selection.promptModifier;
        }
        requestBody.promptTokens = promptTokens;
      }

      const { data, error } = await supabase.functions.invoke('chat', {
        body: requestBody,
      });

      if (error) throw error;

      // Refresh messages to show greeting/scene context
      await get().fetchMessages(activeConversation.id);
      return true;
    } catch (error) {
      console.error('Start chat failed:', error);
      set({ error: (error as Error).message });
      return false;
    } finally {
      set({ isSending: false });
    }
  },

  generatePreview: async () => {
    const { activeConversation, globalInteractionMode, selectedTraits } = get();
    if (!activeConversation) return;

    const isQAMode = globalInteractionMode === 'question';

    console.log('Generating preview for:', {
      conversationId: activeConversation.id,
      personaId: activeConversation.persona_id,
      isQAMode,
    });

    set({ isGeneratingPreview: true, error: null });
    try {
      if (isQAMode) {
        const { data, error } = await supabase.functions.invoke('chat', {
          body: {
            personaId: activeConversation.persona_id,
            generateScenario: true,
            promptTokens: buildScenarioPromptTokens(selectedTraits),
          },
        });

        if (error) throw error;
        set({
          previewScenario: data.scenario,
          scenarioRefreshCount: 0,
        });
      } else {
        const { data, error } = await supabase.functions.invoke('chat', {
          body: {
            conversationId: activeConversation.id,
            personaId: activeConversation.persona_id,
            previewGreeting: true,
          },
        });

        if (error) throw error;
        set({
          previewQuestion: data.question,
          questionRefreshCount: 0,
        });
      }
    } catch (error) {
      console.error('Generate preview failed:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ isGeneratingPreview: false });
    }
  },

  regenerateQuestion: async () => {
    const { activeConversation, questionRefreshCount } = get();
    if (!activeConversation) return false;
    if (questionRefreshCount >= MAX_QUESTION_REFRESHES) return false;

    console.log('Regenerating question:', {
      conversationId: activeConversation.id,
      refreshCount: questionRefreshCount + 1,
    });

    set({ isGeneratingPreview: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          conversationId: activeConversation.id,
          personaId: activeConversation.persona_id,
          regenerateQuestion: true,
        },
      });

      if (error) throw error;
      set({
        previewQuestion: data.question,
        questionRefreshCount: questionRefreshCount + 1,
      });
      return true;
    } catch (error) {
      console.error('Regenerate question failed:', error);
      set({ error: (error as Error).message });
      return false;
    } finally {
      set({ isGeneratingPreview: false });
    }
  },

  regenerateScenario: async () => {
    const { activeConversation, scenarioRefreshCount, selectedTraits } = get();
    if (!activeConversation) return false;
    if (scenarioRefreshCount >= MAX_QUESTION_REFRESHES) return false;

    console.log('Regenerating scenario:', {
      personaId: activeConversation.persona_id,
      refreshCount: scenarioRefreshCount + 1,
    });

    set({ isGeneratingPreview: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          personaId: activeConversation.persona_id,
          generateScenario: true,
          promptTokens: buildScenarioPromptTokens(selectedTraits),
        },
      });

      if (error) throw error;
      set({
        previewScenario: data.scenario,
        scenarioRefreshCount: scenarioRefreshCount + 1,
      });
      return true;
    } catch (error) {
      console.error('Regenerate scenario failed:', error);
      set({ error: (error as Error).message });
      return false;
    } finally {
      set({ isGeneratingPreview: false });
    }
  },

  startChatWithPreview: async () => {
    const { activeConversation, previewQuestion, previewScenario, globalInteractionMode } = get();
    const isQAMode = globalInteractionMode === 'question';

    // For Q&A mode, we need a scenario; for practice mode, we need a question
    if (!activeConversation) return false;
    if (isQAMode && !previewScenario) return false;
    if (!isQAMode && !previewQuestion) return false;

    console.log('Starting chat with preview:', {
      conversationId: activeConversation.id,
      personaId: activeConversation.persona_id,
      isQAMode,
    });

    set({ isSending: true, error: null });
    try {
      if (isQAMode) {
        // Q&A mode: Save scenario as system message (context only)
        // User will type the first actual message
        const { error: insertError } = await supabase.from('messages').insert({
          conversation_id: activeConversation.id,
          role: 'system',
          content: `[SCENE CONTEXT]\n${previewScenario}`,
          sequence: 1,
        });

        if (insertError) throw insertError;

        // Clear preview state
        set({
          previewScenario: null,
          scenarioRefreshCount: 0,
        });
      } else {
        // Practice mode: Save the question as first assistant message
        const { error: insertError } = await supabase.from('messages').insert({
          conversation_id: activeConversation.id,
          role: 'assistant',
          content: previewQuestion,
          sequence: 1,
        });

        if (insertError) throw insertError;

        // Clear preview state
        set({
          previewQuestion: null,
          questionRefreshCount: 0,
        });
      }

      // Refresh messages to show greeting/context
      await get().fetchMessages(activeConversation.id);
      return true;
    } catch (error) {
      console.error('Start chat with preview failed:', error);
      set({ error: (error as Error).message });
      return false;
    } finally {
      set({ isSending: false });
    }
  },

  clearPreview: () => {
    set({
      previewQuestion: null,
      previewScenario: null,
      questionRefreshCount: 0,
      scenarioRefreshCount: 0,
    });
  },

  generateReport: async (conversationId: string) => {
    set({ isGeneratingReport: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { conversationId, generateReport: true },
      });

      if (error) {
        // Extract the actual error body from the edge function response
        let detail = error.message;
        if (error.context && typeof error.context.json === 'function') {
          try {
            const body = await error.context.json();
            detail = body?.error || JSON.stringify(body);
          } catch { /* use default message */ }
        }
        throw new Error(detail);
      }
      return data.report as SessionReport;
    } catch (error) {
      console.error('Generate report failed:', error);
      set({ error: (error as Error).message });
      return null;
    } finally {
      set({ isGeneratingReport: false });
    }
  },

  endConversation: async () => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    const endedAt = new Date().toISOString();
    await supabase
      .from('conversations')
      .update({
        status: 'completed',
        ended_at: endedAt,
      })
      .eq('id', activeConversation.id);

    const updatedConversation: Conversation = {
      ...activeConversation,
      status: 'completed' as const,
      ended_at: endedAt,
    };

    set({ activeConversation: updatedConversation });
  },

  clearMessages: async (conversationId) => {
    try {
      // Delete all messages for this conversation from DB
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('Failed to clear messages:', error);
        set({ error: error.message });
        return;
      }

      // Clear local state
      set({ messages: [] });
    } catch (error) {
      console.error('Clear messages error:', error);
      set({ error: (error as Error).message });
    }
  },

  clearActiveConversation: () => {
    set({
      activeConversation: null,
      messages: [],
      coachingOptions: null,
      currentPhase: 'roleplay',
      selectedTraits: {},
    });
  },

  // Coaching-specific actions
  switchPhase: async (phase) => {
    const { activeConversation, coachingOptions, selectedTraits } = get();
    if (!activeConversation) return null;

    set({ isSending: true, error: null, currentPhase: phase });
    try {
      const requestBody: Record<string, unknown> = {
        conversationId: activeConversation.id,
        personaId: activeConversation.persona_id,
        switchPhase: phase,
      };

      if (coachingOptions) {
        if (coachingOptions.scenarioId) {
          requestBody.scenarioId = coachingOptions.scenarioId;
        }
        if (coachingOptions.scenarioVariant) {
          requestBody.scenarioVariant = coachingOptions.scenarioVariant;
        }
      }

      if (Object.keys(selectedTraits).length > 0) {
        const promptTokens: Record<string, string> = {};
        for (const [slug, selection] of Object.entries(selectedTraits)) {
          promptTokens[slug] = selection.promptModifier;
        }
        requestBody.promptTokens = promptTokens;
      }

      const { data, error } = await supabase.functions.invoke('chat', {
        body: requestBody,
      });

      if (error) throw error;

      if (data.response) {
        await get().fetchMessages(activeConversation.id);
      }

      return { response: data.response || data.message };
    } catch (error) {
      console.error('Switch phase failed:', error);
      set({ error: (error as Error).message });
      return null;
    } finally {
      set({ isSending: false });
    }
  },

  requestQuickFeedback: async () => {
    const { activeConversation, coachingOptions, selectedTraits } = get();
    if (!activeConversation) return null;

    set({ isSending: true, error: null });
    try {
      const requestBody: Record<string, unknown> = {
        conversationId: activeConversation.id,
        personaId: activeConversation.persona_id,
        requestQuickFeedback: true,
      };

      if (coachingOptions?.scenarioId) {
        requestBody.scenarioId = coachingOptions.scenarioId;
      }

      if (Object.keys(selectedTraits).length > 0) {
        const promptTokens: Record<string, string> = {};
        for (const [slug, selection] of Object.entries(selectedTraits)) {
          promptTokens[slug] = selection.promptModifier;
        }
        requestBody.promptTokens = promptTokens;
      }

      const { data, error } = await supabase.functions.invoke('chat', {
        body: requestBody,
      });

      if (error) throw error;

      await get().fetchMessages(activeConversation.id);

      return { response: data.response };
    } catch (error) {
      console.error('Quick feedback failed:', error);
      set({ error: (error as Error).message });
      return null;
    } finally {
      set({ isSending: false });
    }
  },

  setCoachingOptions: (options) => {
    set({ coachingOptions: options });
  },

  setGlobalInteractionMode: (mode) => {
    set({ globalInteractionMode: mode });
  },

  setTrait: (categorySlug, optionId, promptModifier) => {
    const { selectedTraits } = get();
    set({
      selectedTraits: {
        ...selectedTraits,
        [categorySlug]: { optionId, promptModifier },
      },
    });
  },

  clearTraits: () => {
    set({ selectedTraits: {} });
  },

  setCoachesActiveDomain: (domain) => {
    set({ coachesActiveDomain: domain });
  },

  setChallengersActiveFilter: (filter) => {
    set({ challengersActiveFilter: filter });
  },

  fetchDailyChallenge: async (personas) => {
    const { dailyChallenge } = get();

    // Check if we have a valid challenge for today
    if (dailyChallenge) {
      const generatedDate = new Date(dailyChallenge.generatedAt).toDateString();
      const today = new Date().toDateString();
      if (generatedDate === today) {
        return; // Already have today's challenge
      }
    }

    if (personas.length === 0) return;

    set({ isLoadingChallenge: true });
    try {
      const randomPersona = personas[Math.floor(Math.random() * personas.length)];

      // Retry logic for edge function cold starts
      let data: { question: string; topic: string } | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await supabase.functions.invoke('chat', {
          body: {
            personaId: randomPersona.id,
            generateChallenge: true,
          },
        });

        if (!result.error) {
          data = result.data;
          break;
        }
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
      }

      if (!data) {
        throw new Error('Challenge generation failed');
      }

      set({
        dailyChallenge: {
          question: data.question,
          topic: data.topic,
          personaId: randomPersona.id,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to fetch daily challenge:', error);
      // Client-side fallback so the home screen still shows a challenge
      set({
        dailyChallenge: {
          question: "What belief do you hold that you've never seriously questioned?",
          topic: 'Self-Reflection',
          personaId: personas[0]?.id || '',
          generatedAt: new Date().toISOString(),
        },
      });
    } finally {
      set({ isLoadingChallenge: false });
    }
  },
    }),
    {
      name: 'dialectica-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        globalInteractionMode: state.globalInteractionMode,
        selectedTraits: state.selectedTraits,
        coachesActiveDomain: state.coachesActiveDomain,
        challengersActiveFilter: state.challengersActiveFilter,
      }),
    },
  ),
);
