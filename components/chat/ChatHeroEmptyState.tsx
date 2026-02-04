import { View, Text, Pressable, Image, ImageSourcePropType, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Zap, Brain, Heart, Scale, Eye } from 'lucide-react-native';
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
  onStartChat: () => void;
  isStarting?: boolean;
}

export function ChatHeroEmptyState({ persona, onStartChat, isStarting = false }: ChatHeroEmptyStateProps) {
  const theme = STYLE_THEMES[persona.challengeStyle];
  const StyleIcon = theme.Icon;
  const imageSource = typeof persona.avatarUrl === 'string'
    ? { uri: persona.avatarUrl }
    : persona.avatarUrl;

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
      <Pressable
        onPress={onStartChat}
        disabled={isStarting}
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          height: 480,
          // Accent border glow
          borderWidth: 2,
          borderColor: theme.accent,
          shadowColor: theme.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
        }}
      >
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

        {/* Gradient overlay */}
        <LinearGradient
          colors={theme.gradient}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
        />

        {/* Content overlay */}
        <View style={{ flex: 1, justifyContent: 'space-between', padding: 24 }}>
          {/* Top - Challenge style icon badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: theme.accent,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: theme.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
              }}
            >
              <StyleIcon size={18} color="#0f0f12" />
            </View>
            <View
              style={{
                marginLeft: 12,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: `${theme.accent}20`,
                borderWidth: 1,
                borderColor: `${theme.accent}40`,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
                {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
              </Text>
            </View>
          </View>

          {/* Bottom info */}
          <View>
            {/* Persona name */}
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>
              {persona.name}
            </Text>

            {/* Tagline in quotes */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: 16,
                fontStyle: 'italic',
                marginBottom: 20,
                lineHeight: 24,
              }}
            >
              "{persona.tagline}"
            </Text>

            {/* Specialty area tags */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {persona.specialtyAreas.slice(0, 3).map((area, index) => (
                <View
                  key={index}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.25)',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 13 }}>{area}</Text>
                </View>
              ))}
            </View>

            {/* Start Challenge CTA button */}
            <Pressable
              onPress={onStartChat}
              disabled={isStarting}
              style={{
                paddingVertical: 16,
                borderRadius: 16,
                backgroundColor: theme.accent,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isStarting ? 0.7 : 1,
              }}
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
      </Pressable>
    </View>
  );
}
