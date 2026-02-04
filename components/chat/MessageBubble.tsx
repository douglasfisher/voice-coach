import { View, Text, Pressable, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, Volume2, Sparkles, Zap, Brain, Heart, Scale, Eye } from 'lucide-react-native';
import { AnalysisBadge } from '../ui/Badge';
import { AnalysisResult, AnalysisItemType } from '../../types/analysis';
import { PersonaDisplay, ChallengeStyle } from '../../types/persona';

// Challenge style themes
const STYLE_THEMES: Record<ChallengeStyle, {
  bubbleGradient: [string, string];
  accent: string;
  Icon: typeof Sparkles;
}> = {
  steelman: {
    bubbleGradient: ['rgba(16, 52, 96, 0.6)', 'rgba(16, 52, 96, 0.3)'],
    accent: '#4ade80',
    Icon: Scale,
  },
  devils_advocate: {
    bubbleGradient: ['rgba(74, 25, 66, 0.6)', 'rgba(74, 25, 66, 0.3)'],
    accent: '#f472b6',
    Icon: Zap,
  },
  socratic: {
    bubbleGradient: ['rgba(30, 58, 95, 0.6)', 'rgba(30, 58, 95, 0.3)'],
    accent: '#60a5fa',
    Icon: Brain,
  },
  empathetic_probe: {
    bubbleGradient: ['rgba(61, 53, 32, 0.6)', 'rgba(61, 53, 32, 0.3)'],
    accent: '#fbbf24',
    Icon: Heart,
  },
  logical_surgeon: {
    bubbleGradient: ['rgba(13, 68, 68, 0.6)', 'rgba(13, 68, 68, 0.3)'],
    accent: '#2dd4bf',
    Icon: Sparkles,
  },
  perspective_shifter: {
    bubbleGradient: ['rgba(76, 29, 76, 0.6)', 'rgba(76, 29, 76, 0.3)'],
    accent: '#c084fc',
    Icon: Eye,
  },
};

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant';
  persona?: PersonaDisplay;
  analysis?: AnalysisResult | null;
  audioUrl?: string | null;
  onPlayAudio?: () => void;
  isPlaying?: boolean;
  timestamp?: string;
  immersiveMode?: boolean;
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
  immersiveMode = false,
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const theme = persona ? STYLE_THEMES[persona.challengeStyle] : null;
  const imageSource = persona
    ? typeof persona.avatarUrl === 'string'
      ? { uri: persona.avatarUrl }
      : persona.avatarUrl
    : null;

  // Immersive mode styles - more transparent backgrounds
  const immersiveAssistantGradient: [string, string] = ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)'];
  const immersiveUserGradient: [string, string] = ['rgba(245, 158, 11, 0.85)', 'rgba(217, 119, 6, 0.85)'];

  return (
    <View style={{ marginBottom: 16, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          maxWidth: '85%',
          ...(isUser ? { flexDirection: 'row-reverse' } : {}),
        }}
      >
        {/* Avatar for assistant */}
        {!isUser && persona && (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: theme?.accent || '#F59E0B',
              marginRight: 8,
              shadowColor: theme?.accent || '#F59E0B',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 6,
            }}
          >
            <Image
              source={imageSource as ImageSourcePropType}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={{ flex: 1, ...(isUser ? { marginRight: 0 } : {}) }}>
          {/* Message bubble */}
          {isUser ? (
            <LinearGradient
              colors={immersiveMode ? immersiveUserGradient : ['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 20,
                borderBottomRightRadius: 6,
              }}
            >
              <Text style={{ color: '#0f0f12', fontSize: 15, lineHeight: 22, fontWeight: '500' }}>
                {content}
              </Text>
            </LinearGradient>
          ) : (
            <View
              style={{
                backgroundColor: immersiveMode ? 'transparent' : 'rgba(255,255,255,0.08)',
                borderWidth: immersiveMode ? 0 : 1,
                borderColor: `${theme?.accent || '#F59E0B'}30`,
                borderRadius: 20,
                borderBottomLeftRadius: 6,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={immersiveMode ? immersiveAssistantGradient : (theme?.bubbleGradient || ['rgba(30, 30, 40, 0.6)', 'rgba(30, 30, 40, 0.3)'])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>
                  {content}
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* Audio button for assistant messages */}
          {!isUser && onPlayAudio && (
            <Pressable
              onPress={onPlayAudio}
              style={{
                marginTop: 8,
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: `${theme?.accent || '#F59E0B'}15`,
                borderWidth: 1,
                borderColor: `${theme?.accent || '#F59E0B'}40`,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: theme?.accent || '#F59E0B',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isPlaying ? (
                  <Pause size={14} color="#0f0f12" />
                ) : (
                  <Play size={14} color="#0f0f12" style={{ marginLeft: 2 }} />
                )}
              </View>
              <Text
                style={{
                  color: theme?.accent || '#F59E0B',
                  fontSize: 13,
                  fontWeight: '500',
                  marginLeft: 8,
                }}
              >
                {isPlaying ? 'Playing...' : 'Listen'}
              </Text>
              {isPlaying && (
                <Volume2
                  size={14}
                  color={theme?.accent || '#F59E0B'}
                  style={{ marginLeft: 6 }}
                />
              )}
            </Pressable>
          )}

          {/* Analysis badges for user messages */}
          {isUser && analysis && analysis.items.length > 0 && (
            <View
              style={{
                marginTop: 8,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6,
                justifyContent: 'flex-end',
              }}
            >
              {analysis.items.slice(0, 3).map((item, index) => (
                <AnalysisBadge
                  key={index}
                  type={item.type as AnalysisItemType}
                  label={item.label}
                  size="sm"
                />
              ))}
              {analysis.items.length > 3 && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#9A9A9E' }}>
                    +{analysis.items.length - 3} more
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Timestamp */}
          {timestamp && (
            <Text
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.4)',
                marginTop: 6,
                textAlign: isUser ? 'right' : 'left',
              }}
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
