import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { PersonaDisplay } from '../../types/persona';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { CollapsibleSceneHeader } from './CollapsibleSceneHeader';

interface ChatMessage {
  id: string;
  content: string;
  role: string;
  created_at?: string;
  audio_url?: string | null;
  response_time_ms?: number | null;
  metadata?: Record<string, unknown> | null;
}

interface UserPreferences {
  tts_enabled?: boolean;
  [key: string]: unknown;
}

interface FocusModeChatProps {
  messages: ChatMessage[];
  persona: PersonaDisplay;
  isSending: boolean;
  immersiveMode: boolean;
  isAdmin: boolean;
  preferences: UserPreferences | null;
  onPlayAudio: (audioUrl: string | null, content: string) => void;
  isPlaying: boolean;
  isQAMode: boolean;
}

export function FocusModeChat({
  messages,
  persona,
  isSending,
  immersiveMode,
  isAdmin,
  preferences,
  onPlayAudio,
  isPlaying,
  isQAMode,
}: FocusModeChatProps) {
  // Derive the key messages
  const openingMessage = messages.length > 0 ? messages[0] : null;

  // Find last assistant message (excluding the opening if it's assistant/system)
  const lastAssistant = [...messages]
    .reverse()
    .find(
      (m, _i) =>
        m.role === 'assistant' && m.id !== openingMessage?.id
    ) || null;

  // Find last user message
  const lastUser = [...messages]
    .reverse()
    .find((m) => m.role === 'user') || null;

  // Count user messages for exchange number
  const exchangeNumber = messages.filter((m) => m.role === 'user').length;

  // Only opening message — show expanded header, no bubbles
  if (messages.length <= 1) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        {openingMessage && (
          <CollapsibleSceneHeader
            message={openingMessage}
            persona={persona}
            immersiveMode={immersiveMode}
            isQAMode={isQAMode}
          />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
      {/* Collapsible opening message */}
      {openingMessage && (
        <CollapsibleSceneHeader
          message={openingMessage}
          persona={persona}
          immersiveMode={immersiveMode}
          isQAMode={isQAMode}
        />
      )}

      {/* Exchange counter pill */}
      {exchangeNumber > 0 && (
        <View
          style={{
            alignSelf: 'center',
            paddingHorizontal: 14,
            paddingVertical: 5,
            borderRadius: 12,
            backgroundColor: immersiveMode
              ? 'rgba(0,0,0,0.4)'
              : 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.5,
            }}
          >
            Exchange {exchangeNumber}
          </Text>
        </View>
      )}

      {/* Latest exchange area */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {/* Last assistant message */}
        {lastAssistant && (
          <Animated.View
            key={`assistant-${lastAssistant.id}`}
            entering={FadeIn.duration(300).springify().damping(22)}
            exiting={FadeOut.duration(200)}
          >
            <MessageBubble
              content={lastAssistant.content}
              role="assistant"
              persona={persona}
              audioUrl={lastAssistant.audio_url}
              onPlayAudio={
                preferences?.tts_enabled
                  ? () => onPlayAudio(lastAssistant.audio_url ?? null, lastAssistant.content)
                  : undefined
              }
              isPlaying={isPlaying}
              timestamp={lastAssistant.created_at}
              responseTimeMs={lastAssistant.response_time_ms}
              immersiveMode={immersiveMode}
              metadata={lastAssistant.metadata}
              isAdmin={isAdmin}
            />
          </Animated.View>
        )}

        {/* Last user message */}
        {lastUser && (
          <Animated.View
            key={`user-${lastUser.id}`}
            entering={FadeIn.duration(300).springify().damping(22)}
            exiting={FadeOut.duration(200)}
          >
            <MessageBubble
              content={lastUser.content}
              role="user"
              timestamp={lastUser.created_at}
              responseTimeMs={lastUser.response_time_ms}
              immersiveMode={immersiveMode}
              metadata={lastUser.metadata}
              isAdmin={isAdmin}
            />
          </Animated.View>
        )}

        {/* Typing indicator when sending */}
        {isSending && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
          >
            <TypingIndicator persona={persona} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}
