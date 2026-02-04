import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  MessageSquare,
  X,
  Sparkles,
  Zap,
  Brain,
  Heart,
  Scale,
  Eye,
} from 'lucide-react-native';
import { useConversation } from '../../../hooks/useConversation';
import { useTTS } from '../../../hooks/useTTS';
import { useVoiceInput } from '../../../hooks/useVoiceInput';
import { useAuthStore } from '../../../stores/authStore';
import { useChatStore } from '../../../stores/chatStore';
import { supabase } from '../../../lib/supabase';
import {
  PersonaHeader,
  MessageBubble,
  TypingIndicator,
  ChatInput,
} from '../../../components/chat';
import { AnalysisCard } from '../../../components/chat/AnalysisCard';
import { AnalysisResult } from '../../../types/analysis';
import { ChallengeStyle, CHALLENGE_STYLE_LABELS } from '../../../types/persona';

// Challenge style themes
const STYLE_THEMES: Record<ChallengeStyle, {
  gradient: [string, string, string];
  accent: string;
  Icon: typeof Sparkles;
}> = {
  steelman: {
    gradient: ['transparent', 'rgba(16, 52, 96, 0.3)', 'rgba(16, 52, 96, 0.6)'],
    accent: '#4ade80',
    Icon: Scale,
  },
  devils_advocate: {
    gradient: ['transparent', 'rgba(74, 25, 66, 0.3)', 'rgba(74, 25, 66, 0.6)'],
    accent: '#f472b6',
    Icon: Zap,
  },
  socratic: {
    gradient: ['transparent', 'rgba(30, 58, 95, 0.3)', 'rgba(30, 58, 95, 0.6)'],
    accent: '#60a5fa',
    Icon: Brain,
  },
  empathetic_probe: {
    gradient: ['transparent', 'rgba(61, 53, 32, 0.3)', 'rgba(61, 53, 32, 0.6)'],
    accent: '#fbbf24',
    Icon: Heart,
  },
  logical_surgeon: {
    gradient: ['transparent', 'rgba(13, 68, 68, 0.3)', 'rgba(13, 68, 68, 0.6)'],
    accent: '#2dd4bf',
    Icon: Sparkles,
  },
  perspective_shifter: {
    gradient: ['transparent', 'rgba(76, 29, 76, 0.3)', 'rgba(76, 29, 76, 0.6)'],
    accent: '#c084fc',
    Icon: Eye,
  },
};

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

  // Voice input
  const voiceInputEnabled = preferences?.voice_input_enabled ?? false;
  const {
    state: voiceState,
    transcript: voiceTranscript,
    interimTranscript,
    audioLevel,
    handlers: voiceHandlers,
    hasPermission: hasVoicePermission,
  } = useVoiceInput(voiceInputEnabled);

  const isRecording = voiceState === 'recording';

  const [latestAnalysis, setLatestAnalysis] = useState<{
    messageId: string;
    analysis: AnalysisResult;
  } | null>(null);

  const [isStartingChat, setIsStartingChat] = useState(false);
  const { fetchMessages } = useChatStore();
  const chatStarted = messages.length > 0;

  const theme = persona ? STYLE_THEMES[persona.challengeStyle] : null;
  const StyleIcon = theme?.Icon || Sparkles;
  const imageSource = persona
    ? typeof persona.avatarUrl === 'string'
      ? { uri: persona.avatarUrl }
      : persona.avatarUrl
    : null;

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

  const handleStartChat = async () => {
    if (!conversation) return;
    setIsStartingChat(true);
    try {
      await supabase.functions.invoke('chat', {
        body: {
          conversationId: conversation.id,
          personaId: conversation.persona_id,
          generateGreeting: true,
        },
      });
      // Refresh messages to show greeting
      await fetchMessages(conversation.id);
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setIsStartingChat(false);
    }
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>
            Loading conversation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!conversation || !persona) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <X size={40} color="#ef4444" />
          </View>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 8 }}>
            Conversation not found
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 24 }}>
            This conversation may have been deleted or doesn't exist.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: '#F59E0B',
            }}
          >
            <Text style={{ color: '#0f0f12', fontWeight: '600' }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 16,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              padding: 16,
              paddingRight: 8,
            }}
          >
            <ChevronLeft size={24} color={theme?.accent || '#F59E0B'} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <PersonaHeader persona={persona} />
          </View>
          {conversation.status === 'active' && (
            <Pressable
              onPress={handleEndConversation}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' }}>
                End
              </Text>
            </Pressable>
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
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
            (isSending || isStartingChat) ? <TypingIndicator persona={persona} /> : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              {/* Large persona image */}
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  overflow: 'hidden',
                  borderWidth: 3,
                  borderColor: theme?.accent || '#F59E0B',
                  marginBottom: 24,
                  shadowColor: theme?.accent || '#F59E0B',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 20,
                }}
              >
                <Image
                  source={imageSource as ImageSourcePropType}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>

              {/* Challenge style badge */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: `${theme?.accent || '#F59E0B'}15`,
                  borderWidth: 1,
                  borderColor: `${theme?.accent || '#F59E0B'}40`,
                  marginBottom: 16,
                }}
              >
                <StyleIcon size={16} color={theme?.accent || '#F59E0B'} />
                <Text
                  style={{
                    color: theme?.accent || '#F59E0B',
                    fontSize: 13,
                    fontWeight: '600',
                    marginLeft: 8,
                  }}
                >
                  {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
                </Text>
              </View>

              <Text
                style={{
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                Start a conversation with {persona.name}
              </Text>

              <Text
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 15,
                  textAlign: 'center',
                  paddingHorizontal: 40,
                  lineHeight: 22,
                  marginBottom: 24,
                }}
              >
                {persona.tagline}
              </Text>

              {/* Start Chat Button */}
              <Pressable
                onPress={handleStartChat}
                disabled={isStartingChat}
                style={{
                  paddingHorizontal: 32,
                  paddingVertical: 16,
                  borderRadius: 16,
                  backgroundColor: theme?.accent || '#F59E0B',
                  opacity: isStartingChat ? 0.7 : 1,
                }}
              >
                {isStartingChat ? (
                  <ActivityIndicator color="#0f0f12" />
                ) : (
                  <Text style={{ color: '#0f0f12', fontWeight: '700', fontSize: 18 }}>
                    Start Chat
                  </Text>
                )}
              </Pressable>
            </View>
          }
        />

        {/* Latest Analysis Card */}
        {latestAnalysis?.analysis && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <AnalysisCard
              analysis={latestAnalysis.analysis as AnalysisResult}
              expanded={false}
            />
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 8,
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(239, 68, 68, 0.3)',
            }}
          >
            <Text style={{ color: '#ef4444', textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        {/* Input - only show after chat has started */}
        {conversation.status === 'active' && chatStarted ? (
          <ChatInput
            onSend={handleSend}
            disabled={isSending}
            accentColor={theme?.accent}
            voiceInputEnabled={voiceInputEnabled}
            voiceState={voiceState}
            transcript={voiceTranscript}
            interimTranscript={interimTranscript}
            audioLevel={audioLevel}
            hasVoicePermission={hasVoicePermission}
            onVoicePressIn={voiceHandlers.onPressIn}
            onVoicePressOut={voiceHandlers.onPressOut}
            onVoiceCancel={voiceHandlers.onCancel}
          />
        ) : conversation.status !== 'active' ? (
          <View
            style={{
              padding: 16,
              paddingBottom: 24,
              backgroundColor: 'rgba(10, 10, 15, 0.95)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
              This conversation has ended
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/personas')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: theme?.accent || '#F59E0B',
              }}
            >
              <MessageSquare size={18} color="#0f0f12" />
              <Text style={{ color: '#0f0f12', fontWeight: '600', marginLeft: 8 }}>
                Start a new conversation
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
