import { View, Text, Pressable } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { AnalysisBadge } from '../ui/Badge';
import { AnalysisResult, AnalysisItemType } from '../../types/analysis';
import { PersonaDisplay } from '../../types/persona';

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant';
  persona?: PersonaDisplay;
  analysis?: AnalysisResult | null;
  audioUrl?: string | null;
  onPlayAudio?: () => void;
  isPlaying?: boolean;
  timestamp?: string;
}

export function MessageBubble({
  content,
  role,
  persona,
  analysis,
  audioUrl,
  onPlayAudio,
  isPlaying,
  timestamp,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <View className={`mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`flex-row items-end max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}
      >
        {!isUser && persona && (
          <Avatar
            source={persona.avatarUrl}
            fallback={persona.name}
            size="sm"
          />
        )}

        <View className={`${!isUser ? 'ml-2' : 'mr-2'}`}>
          <View
            className={`
              px-4 py-3 rounded-2xl
              ${isUser
                ? 'bg-accent-primary rounded-br-sm'
                : 'bg-bg-tertiary rounded-bl-sm'
              }
            `}
          >
            <Text
              className={`text-base leading-6 ${isUser ? 'text-bg-primary' : 'text-text-primary'}`}
            >
              {content}
            </Text>
          </View>

          {/* Audio button for assistant messages */}
          {!isUser && audioUrl && onPlayAudio && (
            <Pressable
              onPress={onPlayAudio}
              className="mt-2 flex-row items-center"
            >
              <View className="w-8 h-8 rounded-full bg-bg-tertiary items-center justify-center">
                <Text className="text-accent-primary">
                  {isPlaying ? '⏸' : '▶'}
                </Text>
              </View>
              <Text className="text-text-muted text-xs ml-2">
                {isPlaying ? 'Playing...' : 'Play audio'}
              </Text>
            </Pressable>
          )}

          {/* Analysis badges for user messages */}
          {isUser && analysis && analysis.items.length > 0 && (
            <View className="mt-2 flex-row flex-wrap gap-1 justify-end">
              {analysis.items.slice(0, 3).map((item, index) => (
                <AnalysisBadge
                  key={index}
                  type={item.type as AnalysisItemType}
                  label={item.label}
                  size="sm"
                />
              ))}
              {analysis.items.length > 3 && (
                <View className="px-2 py-0.5 rounded-md bg-bg-tertiary">
                  <Text className="text-xs text-text-muted">
                    +{analysis.items.length - 3} more
                  </Text>
                </View>
              )}
            </View>
          )}

          {timestamp && (
            <Text
              className={`text-xs text-text-muted mt-1 ${isUser ? 'text-right' : 'text-left'}`}
            >
              {new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
