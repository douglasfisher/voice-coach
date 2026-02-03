import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConversation } from '../../../hooks/useConversation';
import { useTTS } from '../../../hooks/useTTS';
import { useAuthStore } from '../../../stores/authStore';
import {
  PersonaHeader,
  MessageBubble,
  TypingIndicator,
  ChatInput,
} from '../../../components/chat';
import { AnalysisCard } from '../../../components/chat/AnalysisCard';
import { AnalysisResult } from '../../../types/analysis';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const flatListRef = useRef<FlatList>(null);
  const { preferences } = useAuthStore();

  const {
    conversation,
    messages,
    persona,
    isLoading,
    isSending,
    error,
    send,
    end,
  } = useConversation(id);

  const { play, stop, isPlaying, generateAndPlay, isLoading: ttsLoading } = useTTS();

  const [latestAnalysis, setLatestAnalysis] = useState<{
    messageId: string;
    analysis: AnalysisResult;
  } | null>(null);

  const handleSend = async (content: string) => {
    const result = await send(content);

    if (result?.analysis) {
      setLatestAnalysis({
        messageId: messages[messages.length - 1]?.id ?? '',
        analysis: result.analysis,
      });
    }

    // Auto-play TTS for assistant response if enabled
    if (result?.response && preferences?.tts_enabled && persona?.voiceConfig) {
      generateAndPlay(result.response, persona.voiceConfig);
    }
  };

  const handlePlayAudio = async (audioUrl: string | null, content: string) => {
    if (isPlaying) {
      await stop();
      return;
    }

    if (audioUrl) {
      await play(audioUrl);
    } else if (persona?.voiceConfig) {
      await generateAndPlay(content, persona.voiceConfig);
    }
  };

  const handleEndConversation = async () => {
    await end();
    router.back();
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  if (isLoading && !conversation) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#F59E0B" />
      </SafeAreaView>
    );
  }

  if (!conversation || !persona) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary items-center justify-center p-6">
        <Text className="text-text-primary text-lg mb-4">
          Conversation not found
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text className="text-accent-primary">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between pr-4">
          <Pressable
            onPress={() => router.back()}
            className="p-4"
          >
            <Text className="text-accent-primary text-lg">←</Text>
          </Pressable>
          <View className="flex-1">
            <PersonaHeader persona={persona} />
          </View>
          {conversation.status === 'active' && (
            <Pressable
              onPress={handleEndConversation}
              className="px-3 py-1.5 rounded-lg bg-bg-tertiary"
            >
              <Text className="text-text-muted text-sm">End</Text>
            </Pressable>
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 pb-2"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MessageBubble
              content={item.content}
              role={item.role as 'user' | 'assistant'}
              persona={item.role === 'assistant' ? persona : undefined}
              analysis={item.role === 'user' ? item.analysis : null}
              audioUrl={item.audio_url}
              onPlayAudio={
                item.role === 'assistant'
                  ? () => handlePlayAudio(item.audio_url, item.content)
                  : undefined
              }
              isPlaying={isPlaying}
              timestamp={item.created_at}
            />
          )}
          ListFooterComponent={
            isSending ? <TypingIndicator persona={persona} /> : null
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-4xl mb-4">👋</Text>
              <Text className="text-text-primary text-lg font-medium text-center">
                Start a conversation with {persona.name}
              </Text>
              <Text className="text-text-muted text-center mt-2 px-8">
                Share your thoughts on any topic and I'll help you think more
                clearly about it.
              </Text>
            </View>
          }
        />

        {/* Latest Analysis Card */}
        {latestAnalysis?.analysis && (
          <View className="px-4 pb-2">
            <AnalysisCard
              analysis={latestAnalysis.analysis as AnalysisResult}
              expanded={false}
            />
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View className="mx-4 mb-2 p-3 rounded-lg bg-error/20">
            <Text className="text-error text-center">{error}</Text>
          </View>
        )}

        {/* Input */}
        {conversation.status === 'active' ? (
          <ChatInput
            onSend={handleSend}
            disabled={isSending}
            placeholder={`Share your thoughts with ${persona.name}...`}
          />
        ) : (
          <View className="p-4 bg-bg-secondary border-t border-bg-tertiary">
            <Text className="text-text-muted text-center">
              This conversation has ended
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/personas')}
              className="mt-2"
            >
              <Text className="text-accent-primary text-center">
                Start a new conversation
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
