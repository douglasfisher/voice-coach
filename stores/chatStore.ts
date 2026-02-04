import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Conversation, Message } from '../types/database';

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

interface ChatMessage extends Omit<Message, 'analysis'> {}

interface DailyChallenge {
  question: string;
  topic: string;
  personaId: string;
  generatedAt: string;
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
  questionRefreshCount: number;
  isGeneratingPreview: boolean;

  // Daily challenge
  dailyChallenge: DailyChallenge | null;
  isLoadingChallenge: boolean;

  fetchConversations: (userId: string) => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchCompletedConversations: (userId: string) => Promise<void>;
  createConversation: (
    userId: string,
    personaId: string,
    topic?: string
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
  generateReport: (conversationId: string) => Promise<SessionReport | null>;
  clearPreview: () => void;
  endConversation: () => Promise<void>;
  clearMessages: (conversationId: string) => Promise<void>;
  clearActiveConversation: () => void;
  fetchDailyChallenge: (personas: { id: string }[]) => Promise<void>;
}

const MAX_QUESTION_REFRESHES = 3;

export const useChatStore = create<ChatState>((set, get) => ({
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
  questionRefreshCount: 0,
  isGeneratingPreview: false,

  // Daily challenge
  dailyChallenge: null,
  isLoadingChallenge: false,

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

  createConversation: async (userId, personaId, topic) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          persona_id: personaId,
          topic,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      set({ activeConversation: data, messages: [] });
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
    const { activeConversation, messages } = get();
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
        created_at: new Date().toISOString(),
      };

      set({ messages: [...messages, userMessage] });

      // Call Edge Function for AI response
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          conversationId: activeConversation.id,
          userMessage: content,
          personaId: activeConversation.persona_id,
        },
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
    const { activeConversation } = get();
    if (!activeConversation) return false;

    console.log('Starting chat with:', {
      conversationId: activeConversation.id,
      personaId: activeConversation.persona_id,
    });

    set({ isSending: true, error: null });
    try {
      // Use direct fetch to avoid Supabase client auto-attaching potentially invalid JWT
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey || '',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          personaId: activeConversation.persona_id,
          generateGreeting: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Start chat error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Refresh messages to show greeting
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
    const { activeConversation } = get();
    if (!activeConversation) return;

    console.log('Generating preview for:', {
      conversationId: activeConversation.id,
      personaId: activeConversation.persona_id,
    });

    set({ isGeneratingPreview: true, error: null });
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey || '',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          personaId: activeConversation.persona_id,
          previewGreeting: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Generate preview error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      set({
        previewQuestion: data.question,
        questionRefreshCount: 0,
      });
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
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey || '',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          personaId: activeConversation.persona_id,
          regenerateQuestion: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Regenerate question error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
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

  startChatWithPreview: async () => {
    const { activeConversation, previewQuestion } = get();
    if (!activeConversation || !previewQuestion) return false;

    console.log('Starting chat with preview:', {
      conversationId: activeConversation.id,
      personaId: activeConversation.persona_id,
    });

    set({ isSending: true, error: null });
    try {
      // Save only the question message to the database
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

      // Refresh messages to show greeting
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
      questionRefreshCount: 0,
    });
  },

  generateReport: async (conversationId: string) => {
    set({ isGeneratingReport: true, error: null });
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey || '',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
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
    set({ activeConversation: null, messages: [] });
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
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      // Pick a random persona for the challenge
      const randomPersona = personas[Math.floor(Math.random() * personas.length)];

      // Use the existing chat function with generateChallenge flag
      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey || '',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          personaId: randomPersona.id,
          generateChallenge: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

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
      // Fallback - don't crash the app
    } finally {
      set({ isLoadingChallenge: false });
    }
  },
}));
