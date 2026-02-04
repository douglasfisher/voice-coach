import { View, Text, Pressable, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Info, Sparkles, Zap, Brain, Heart, Scale, Eye } from 'lucide-react-native';
import { PersonaDisplay, ChallengeStyle, CHALLENGE_STYLE_LABELS } from '../../types/persona';

// Challenge style themes matching other components
const STYLE_THEMES: Record<ChallengeStyle, {
  gradient: [string, string];
  accent: string;
  Icon: typeof Sparkles;
}> = {
  steelman: {
    gradient: ['rgba(16, 52, 96, 0.9)', 'rgba(10, 10, 15, 0.95)'],
    accent: '#4ade80',
    Icon: Scale,
  },
  devils_advocate: {
    gradient: ['rgba(74, 25, 66, 0.9)', 'rgba(10, 10, 15, 0.95)'],
    accent: '#f472b6',
    Icon: Zap,
  },
  socratic: {
    gradient: ['rgba(30, 58, 95, 0.9)', 'rgba(10, 10, 15, 0.95)'],
    accent: '#60a5fa',
    Icon: Brain,
  },
  empathetic_probe: {
    gradient: ['rgba(61, 53, 32, 0.9)', 'rgba(10, 10, 15, 0.95)'],
    accent: '#fbbf24',
    Icon: Heart,
  },
  logical_surgeon: {
    gradient: ['rgba(13, 68, 68, 0.9)', 'rgba(10, 10, 15, 0.95)'],
    accent: '#2dd4bf',
    Icon: Sparkles,
  },
  perspective_shifter: {
    gradient: ['rgba(76, 29, 76, 0.9)', 'rgba(10, 10, 15, 0.95)'],
    accent: '#c084fc',
    Icon: Eye,
  },
};

interface PersonaHeaderProps {
  persona: PersonaDisplay;
  onInfoPress?: () => void;
  compact?: boolean;
}

export function PersonaHeader({ persona, onInfoPress, compact = false }: PersonaHeaderProps) {
  const theme = STYLE_THEMES[persona.challengeStyle];
  const StyleIcon = theme.Icon;
  const imageSource = typeof persona.avatarUrl === 'string'
    ? { uri: persona.avatarUrl }
    : persona.avatarUrl;

  // Compact mode: name + badge only, no avatar
  if (compact) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 4,
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 17,
            fontWeight: '600',
            marginRight: 10,
          }}
        >
          {persona.name}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: `${theme.accent}20`,
            borderWidth: 1,
            borderColor: `${theme.accent}40`,
          }}
        >
          <StyleIcon size={12} color={theme.accent} />
          <Text
            style={{
              color: theme.accent,
              fontSize: 11,
              fontWeight: '600',
              marginLeft: 4,
            }}
          >
            {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable onPress={onInfoPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 4,
        }}
      >
        {/* Avatar with glow effect */}
        <View
          style={{
            position: 'relative',
            marginRight: 12,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 2,
              borderColor: theme.accent,
              overflow: 'hidden',
              shadowColor: theme.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
            }}
          >
            <Image
              source={imageSource as ImageSourcePropType}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
          {/* Online indicator */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#4ade80',
              borderWidth: 2,
              borderColor: '#0a0a0f',
            }}
          />
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                color: '#fff',
                fontSize: 17,
                fontWeight: '600',
                marginRight: 8,
              }}
            >
              {persona.name}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 12,
                backgroundColor: `${theme.accent}20`,
                borderWidth: 1,
                borderColor: `${theme.accent}40`,
              }}
            >
              <StyleIcon size={12} color={theme.accent} />
              <Text
                style={{
                  color: theme.accent,
                  fontSize: 11,
                  fontWeight: '600',
                  marginLeft: 4,
                }}
              >
                {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
              </Text>
            </View>
          </View>
          <Text
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 13,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {persona.tagline}
          </Text>
        </View>

        {/* Info button */}
        {onInfoPress && (
          <Pressable
            onPress={onInfoPress}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <Info size={18} color="#9A9A9E" />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}
