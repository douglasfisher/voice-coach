import { View, Text, Image, Pressable, ImageSourcePropType, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Zap, Brain, Heart, Scale, Eye } from 'lucide-react-native';
import { PersonaDisplay, ChallengeStyle, CHALLENGE_STYLE_LABELS } from '../../types/persona';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding
const CARD_HEIGHT = CARD_WIDTH * 1.8; // Taller aspect ratio for impact

interface PersonaCardProps {
  persona: PersonaDisplay;
  onPress: () => void;
  selected?: boolean;
  variant?: 'default' | 'featured';
}

// Challenge style colors and gradients
const STYLE_THEMES: Record<ChallengeStyle, {
  gradient: [string, string, string];
  accent: string;
  Icon: typeof Sparkles;
}> = {
  steelman: {
    gradient: ['transparent', 'rgba(16, 52, 96, 0.8)', '#0f3460'],
    accent: '#4ade80',
    Icon: Scale,
  },
  devils_advocate: {
    gradient: ['transparent', 'rgba(74, 25, 66, 0.8)', '#4a1942'],
    accent: '#f472b6',
    Icon: Zap,
  },
  socratic: {
    gradient: ['transparent', 'rgba(30, 58, 95, 0.8)', '#1e3a5f'],
    accent: '#60a5fa',
    Icon: Brain,
  },
  empathetic_probe: {
    gradient: ['transparent', 'rgba(61, 53, 32, 0.8)', '#3d3520'],
    accent: '#fbbf24',
    Icon: Heart,
  },
  logical_surgeon: {
    gradient: ['transparent', 'rgba(13, 68, 68, 0.8)', '#0d4444'],
    accent: '#2dd4bf',
    Icon: Sparkles,
  },
  perspective_shifter: {
    gradient: ['transparent', 'rgba(76, 29, 76, 0.8)', '#4c1d4c'],
    accent: '#c084fc',
    Icon: Eye,
  },
};

export function PersonaCard({ persona, onPress, selected = false, variant = 'default' }: PersonaCardProps) {
  const theme = STYLE_THEMES[persona.challengeStyle];
  const StyleIcon = theme.Icon;
  const imageSource = typeof persona.avatarUrl === 'string'
    ? { uri: persona.avatarUrl }
    : persona.avatarUrl;

  if (variant === 'featured') {
    return (
      <Pressable
        onPress={onPress}
        style={{
          marginBottom: 24,
          borderRadius: 24,
          overflow: 'hidden',
          height: 400,
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
          colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)']}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
        />

        {/* Accent border glow effect */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: theme.accent,
            shadowColor: theme.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 20,
          }}
        />

        {/* Content overlay */}
        <View style={{ flex: 1, justifyContent: 'space-between', padding: 20 }}>
          {/* Top badge */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: theme.accent,
              }}
            >
              <StyleIcon size={14} color="#0f0f12" />
              <Text style={{ fontSize: 12, fontWeight: '700', marginLeft: 4, color: '#0f0f12' }}>
                FEATURED
              </Text>
            </View>
          </View>

          {/* Bottom info */}
          <View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <StyleIcon size={16} color="#0f0f12" />
              </View>
              <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
                {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
              </Text>
            </View>

            <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 4 }}>
              {persona.name}
            </Text>

            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, marginBottom: 12 }}>
              {persona.tagline}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {persona.specialtyAreas.slice(0, 3).map((area, index) => (
                <View
                  key={index}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  // Default card - image focused
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        height: CARD_HEIGHT,
        borderWidth: selected ? 2 : 0,
        borderColor: selected ? '#F59E0B' : 'transparent',
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
        locations={[0, 0.95, 1]}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Icon badge - top right */}
      <View
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
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

      {/* Content at bottom */}
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: 14 }}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 }}>
          {persona.name}
        </Text>

        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: `${theme.accent}30`,
            borderWidth: 1,
            borderColor: theme.accent,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.accent }}>
            {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
          </Text>
        </View>

        {persona.tagline && (
          <Text
            style={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: 12,
              marginBottom: 8,
              lineHeight: 16,
            }}
            numberOfLines={2}
          >
            {persona.tagline}
          </Text>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {persona.specialtyAreas.slice(0, 2).map((area, index) => (
            <View
              key={index}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>{area}</Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}
