import { useCallback, useEffect } from 'react';
import { useChatStore, useAuthStore, usePersonaStore } from '../stores';

export function useConversation(conversationId?: string) {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const isSending = useChatStore((s) => s.isSending);
  const error = useChatStore((s) => s.error);
  const fetchConversation = useChatStore((s) => s.fetchConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const endConversation = useChatStore((s) => s.endConversation);
  const clearActiveConversation = useChatStore((s) => s.clearActiveConversation);

  const user = useAuthStore((s) => s.user);
  const getPersonaById = usePersonaStore((s) => s.getPersonaById);

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
