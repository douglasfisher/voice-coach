import { useCallback, useEffect } from 'react';
import { useChatStore, useAuthStore, usePersonaStore } from '../stores';

export function useConversation(conversationId?: string) {
  const {
    activeConversation,
    messages,
    isLoading,
    isSending,
    error,
    fetchConversation,
    sendMessage,
    endConversation,
    clearActiveConversation,
  } = useChatStore();

  const { user } = useAuthStore();
  const { getPersonaById } = usePersonaStore();

  useEffect(() => {
    if (conversationId) {
      fetchConversation(conversationId);
    }
    return () => {
      clearActiveConversation();
    };
  }, [conversationId, fetchConversation, clearActiveConversation]);

  const persona = activeConversation
    ? getPersonaById(activeConversation.persona_id)
    : undefined;

  const send = useCallback(
    async (content: string) => {
      if (!content.trim()) return null;
      return sendMessage(content);
    },
    [sendMessage]
  );

  const end = useCallback(async () => {
    await endConversation();
  }, [endConversation]);

  return {
    conversation: activeConversation,
    messages,
    persona,
    isLoading,
    isSending,
    error,
    send,
    end,
    isOwner: user?.id === activeConversation?.user_id,
  };
}
