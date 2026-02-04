import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Conversation, Message } from '../types/database';
import { AnalysisResult } from '../types/analysis';
import { PersonaDisplay, ChallengeStyle } from '../types/persona';

interface ChatMessage extends Omit<Message, 'analysis'> {
  analysis: AnalysisResult | null;
}

// Generate persona intro message based on their style
function generatePersonaGreeting(persona: PersonaDisplay): string {
  const greetings: Record<ChallengeStyle, string[]> = {
    socratic: [
      `Hello, I'm ${persona.name}. I believe the best way to understand something deeply is through thoughtful questions. What's been on your mind lately that you'd like to explore together?`,
      `Welcome! I'm ${persona.name}, and I'm here to help you discover insights through inquiry. What topic would you like to examine today?`,
    ],
    devils_advocate: [
      `Hey there, I'm ${persona.name}. My job is to challenge your thinking and help you see the other side. So tell me — what's a belief you hold strongly that you'd like me to push back on?`,
      `I'm ${persona.name}, your friendly contrarian. I'll question everything you say — not to frustrate you, but to strengthen your thinking. What position would you like to defend today?`,
    ],
    steelman: [
      `Hi, I'm ${persona.name}. I specialize in building the strongest possible version of your arguments before we examine them together. What idea would you like to develop?`,
      `Welcome! I'm ${persona.name}. I'll help you articulate your best thinking, then we'll explore its limits. What belief or argument would you like to strengthen?`,
    ],
    empathetic_probe: [
      `Hello, I'm ${persona.name}. I'm here to help you explore not just what you think, but why you think it — including the emotions and experiences behind your beliefs. What's something meaningful you'd like to discuss?`,
      `Hi there, I'm ${persona.name}. I believe our reasoning is deeply connected to our experiences and feelings. What's been weighing on your mind that you'd like to explore together?`,
    ],
    logical_surgeon: [
      `Greetings, I'm ${persona.name}. I specialize in precisely analyzing the structure of arguments and ideas. What claim or reasoning would you like me to examine with you?`,
      `Hello, I'm ${persona.name}. My approach is to carefully dissect arguments to find their strengths and weaknesses. What topic would you like to analyze together?`,
    ],
    perspective_shifter: [
      `Hi, I'm ${persona.name}. I'll help you see your ideas through completely different lenses. What's a situation or belief you'd like to view from new angles?`,
      `Welcome! I'm ${persona.name}. I love exploring how the same thing can look entirely different depending on your vantage point. What would you like to examine from fresh perspectives?`,
    ],
  };

  const options = greetings[persona.challengeStyle];
  return options[Math.floor(Math.random() * options.length)];
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
    persona: PersonaDisplay,
    topic?: string
  ) => Promise<string | null>;
  sendMessage: (content: string) => Promise<{ response: string; analysis: AnalysisResult | null } | null>;
  endConversation: () => Promise<void>;
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

  createConversation: async (userId, personaId, persona, topic) => {
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

      // Generate and save the persona's greeting message
      const greeting = generatePersonaGreeting(persona);
      const { data: greetingMsg, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: data.id,
          role: 'assistant',
          content: greeting,
          sequence: 1,
        })
        .select()
        .single();

      if (msgError) {
        console.warn('Failed to create greeting message:', msgError);
      }

      const initialMessage: ChatMessage = greetingMsg ? {
        id: greetingMsg.id,
        conversation_id: greetingMsg.conversation_id,
        role: 'assistant',
        content: greetingMsg.content,
        audio_url: null,
        audio_duration_ms: null,
        analysis: null,
        sequence: 1,
        created_at: greetingMsg.created_at,
      } : {
        id: `temp-greeting-${Date.now()}`,
        conversation_id: data.id,
        role: 'assistant',
        content: greeting,
        audio_url: null,
        audio_duration_ms: null,
        analysis: null,
        sequence: 1,
        created_at: new Date().toISOString(),
      };

      set({ activeConversation: data, messages: [initialMessage] });
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
      // Get the max sequence from existing messages
      const maxSequence = messages.reduce((max, msg) => Math.max(max, msg.sequence), 0);
      const sequence = maxSequence + 1;

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

  clearActiveConversation: () => {
    set({ activeConversation: null, messages: [] });
  },
}));
