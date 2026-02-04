import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Conversation, Message } from '../types/database';
import { AnalysisResult } from '../types/analysis';
import { PersonaDisplay, ChallengeStyle } from '../types/persona';

interface ChatMessage extends Omit<Message, 'analysis'> {
  analysis: AnalysisResult | null;
}

// Topics and questions for each challenge style
const CONVERSATION_STARTERS: Record<ChallengeStyle, Array<{ intro: string; topic: string; question: string }>> = {
  socratic: [
    { intro: "I've been thinking about success lately.", topic: "success", question: "When you imagine a truly successful life, what does it actually look like? And more importantly — whose definition of success are you using?" },
    { intro: "Here's something worth examining.", topic: "knowledge", question: "How do you decide what's true? When someone disagrees with you, what makes you confident that you're the one who's right?" },
    { intro: "Let's explore something fundamental.", topic: "happiness", question: "Do you think happiness is something you find, something you create, or something you choose? What's shaped that view?" },
  ],
  devils_advocate: [
    { intro: "Let me throw something at you.", topic: "work ethic", question: "Everyone praises hard work, but what if the cult of 'hustle' is actually making us miserable and less creative? Convince me that working hard is actually worth it." },
    { intro: "Here's a position I'll challenge.", topic: "authenticity", question: "People say 'be yourself' like it's obviously good advice. But what if being yourself is overrated? What if adapting to situations is actually more valuable?" },
    { intro: "Let's debate something.", topic: "technology", question: "Smartphones have made life objectively better in almost every way. Or have they? I'd argue we've lost more than we've gained. Change my mind." },
  ],
  steelman: [
    { intro: "I want to help you build a strong case.", topic: "life choices", question: "Think of a major decision you've made that others questioned. What's the strongest possible justification for that choice — not just your reasons, but the best reasons?" },
    { intro: "Let's strengthen an argument together.", topic: "beliefs", question: "What's an unpopular opinion you hold? Let's work together to make the most compelling, bulletproof version of that argument." },
    { intro: "Here's an exercise in rigorous thinking.", topic: "values", question: "What do you value most in life? Now, let's build the strongest philosophical defense for why that should be anyone's top priority." },
  ],
  empathetic_probe: [
    { intro: "I'd like to explore something personal with you.", topic: "change", question: "When you think about how you've changed over the past few years, what shift surprises you the most? What do you think drove that change?" },
    { intro: "Let's go a bit deeper today.", topic: "fears", question: "What's something you want but are afraid to fully pursue? What do you think that fear is really protecting you from?" },
    { intro: "I'm curious about your inner world.", topic: "identity", question: "If you had to describe who you are without mentioning your job, relationships, or achievements — just your inner self — what would you say?" },
  ],
  logical_surgeon: [
    { intro: "Let's dissect a common assumption.", topic: "fairness", question: "Most people believe life should be fair. But what exactly do we mean by 'fair'? Equal outcomes? Equal opportunities? And is fairness even achievable or desirable?" },
    { intro: "Here's a claim worth examining.", topic: "free will", question: "You made a decision today. But did you really 'choose' it, or was it the inevitable result of your genes, upbringing, and circumstances? Let's trace the logic." },
    { intro: "Time for some precise analysis.", topic: "morality", question: "Is there such a thing as an objectively wrong action, or is morality just a social construct we've agreed upon? Walk me through your reasoning." },
  ],
  perspective_shifter: [
    { intro: "Let's flip your viewpoint.", topic: "conflict", question: "Think of someone you disagree with strongly. Now — what would you believe if you had lived their exact life? Can you genuinely argue their position?" },
    { intro: "Time to see things differently.", topic: "progress", question: "We often think our era is more enlightened than the past. But what might people 100 years from now find barbaric or foolish about how we live today?" },
    { intro: "Let's challenge your lens.", topic: "self-perception", question: "How do you think your closest friend would describe you to a stranger? What about someone who doesn't like you? Which description is closer to the truth?" },
  ],
};

// Generate persona intro message based on their style
function generatePersonaGreeting(persona: PersonaDisplay): string {
  const starters = CONVERSATION_STARTERS[persona.challengeStyle];
  const starter = starters[Math.floor(Math.random() * starters.length)];

  return `Hi, I'm ${persona.name}. ${starter.intro}\n\n${starter.question}`;
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
