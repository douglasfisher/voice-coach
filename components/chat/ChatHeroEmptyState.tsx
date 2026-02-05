import { View, Text, Pressable, Image, ImageSourcePropType, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Zap, Brain, Heart, Scale, Eye, RefreshCw } from 'lucide-react-native';
import { PersonaDisplay, ChallengeStyle, CHALLENGE_STYLE_LABELS } from '../../types/persona';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Challenge style themes
const STYLE_THEMES: Record<ChallengeStyle, {
  gradient: [string, string, string];
  accent: string;
  Icon: typeof Sparkles;
}> = {
  steelman: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#4ade80',
    Icon: Scale,
  },
  devils_advocate: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#f472b6',
    Icon: Zap,
  },
  socratic: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#60a5fa',
    Icon: Brain,
  },
  empathetic_probe: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#fbbf24',
    Icon: Heart,
  },
  logical_surgeon: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#2dd4bf',
    Icon: Sparkles,
  },
  perspective_shifter: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#c084fc',
    Icon: Eye,
  },
};

interface ChatHeroEmptyStateProps {
  persona: PersonaDisplay;
  questionMessage: string | null;
  refreshCount: number;
  maxRefreshes: number;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefreshQuestion: () => void;
  onStartChat: () => void;
  isStarting?: boolean;
}

export function ChatHeroEmptyState({
  persona,
  questionMessage,
  refreshCount,
  maxRefreshes,
  isLoading,
  isRefreshing,
  onRefreshQuestion,
  onStartChat,
  isStarting = false,
}: ChatHeroEmptyStateProps) {
  const theme = STYLE_THEMES[persona.challengeStyle];
  const StyleIcon = theme.Icon;
  const imageSource = typeof persona.avatarUrl === 'string'
    ? { uri: persona.avatarUrl }
    : persona.avatarUrl;

  const refreshesRemaining = maxRefreshes - refreshCount;
  const canRefresh = refreshesRemaining > 0 && !isRefreshing && !isLoading && questionMessage;
  const hasPreview = !!questionMessage;

  return (
    <View style={{ flex: 1 }}>
      {/* Full bleed background image */}
      <Image
        source={imageSource as ImageSourcePropType}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
        resizeMode="cover"
      />

      {/* Gradient overlay - stronger at bottom for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
        locations={[0, 0.35, 0.6, 1]}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Content overlay */}
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 24 }}>
        {/* Persona name */}
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
          {persona.name}
        </Text>

        {/* Challenge style badge inline */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: theme.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StyleIcon size={14} color="#0f0f12" />
          </View>
          <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
            {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
          </Text>
        </View>

        {/* Question or loading skeleton */}
        {isLoading && !hasPreview ? (
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                height: 18,
                width: '90%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 8,
                marginBottom: 8,
              }}
            />
            <View
              style={{
                height: 18,
                width: '70%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 8,
              }}
            />
          </View>
        ) : questionMessage ? (
          <Text
            style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: '600',
              lineHeight: 24,
              marginBottom: 20,
            }}
          >
            {questionMessage}
          </Text>
        ) : null}

        {/* New Question button */}
        <Pressable
          onPress={onRefreshQuestion}
          disabled={!canRefresh}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            marginBottom: 12,
            opacity: canRefresh ? 1 : 0.4,
          }}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <RefreshCw size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                New Question
              </Text>
              {refreshesRemaining > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginLeft: 8 }}>
                  ({refreshesRemaining} left)
                </Text>
              )}
            </>
          )}
        </Pressable>

        {/* Start Challenge CTA button */}
        <Pressable
          onPress={onStartChat}
          disabled={isStarting || isLoading || !hasPreview}
          style={({ pressed }) => ({
            paddingVertical: 16,
            borderRadius: 16,
            backgroundColor: theme.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (isStarting || isLoading || !hasPreview) ? 0.7 : pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          {isStarting ? (
            <ActivityIndicator color="#0f0f12" />
          ) : (
            <Text style={{ color: '#0f0f12', fontWeight: '700', fontSize: 18 }}>
              Start Challenge
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
