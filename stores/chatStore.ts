import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Conversation, Message } from '../types/database';
import { AnalysisResult } from '../types/analysis';

interface ChatMessage extends Omit<Message, 'analysis'> {
  analysis: AnalysisResult | null;
}

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchConversations: (userId: string) => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  createConversation: (
    userId: string,
    personaId: string,
    topic?: string
  ) => Promise<string | null>;
  sendMessage: (content: string) => Promise<{ response: string; analysis: AnalysisResult | null } | null>;
  startChat: () => Promise<boolean>;
  endConversation: () => Promise<void>;
  clearMessages: (conversationId: string) => Promise<void>;
  clearActiveConversation: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,

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
      analysis: msg.analysis as AnalysisResult | null,
      sequence: msg.sequence as number,
      created_at: msg.created_at as string,
    }));

    set({ messages });
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
        analysis: null,
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
        analysis: data.analysis as AnalysisResult | null,
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

    // Get session for auth token
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    console.log('Session check:', sessionData?.session ? 'Active' : 'No session');
    console.log('Starting chat with:', {
      conversationId: activeConversation.id,
      personaId: activeConversation.persona_id,
    });

    if (!accessToken) {
      console.error('No access token available');
      set({ error: 'Not authenticated' });
      return false;
    }

    set({ isSending: true, error: null });
    try {
      const response = await supabase.functions.invoke('chat', {
        body: {
          conversationId: activeConversation.id,
          personaId: activeConversation.persona_id,
          generateGreeting: true,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('Start chat response:', JSON.stringify(response, null, 2));

      if (response.error) {
        console.error('Start chat error:', response.error);
        // Try to get more details from the error context
        if (response.error.context) {
          const errorBody = await response.error.context.text?.() || response.error.context;
          console.error('Error details:', errorBody);
        }
        throw response.error;
      }

      const { data, error } = response;
      if (error) {
        console.error('Start chat data error:', error);
        throw error;
      }

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
}));
