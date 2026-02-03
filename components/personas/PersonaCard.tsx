import { View, Text, Image, Pressable, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Zap, Brain, Heart, Scale, Eye } from 'lucide-react-native';
import { PersonaDisplay, ChallengeStyle, CHALLENGE_STYLE_LABELS } from '../../types/persona';

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
    gradient: ['#1a1a2e', '#16213e', '#0f3460'],
    accent: '#4ade80',
    Icon: Scale,
  },
  devils_advocate: {
    gradient: ['#1a1a2e', '#2d1b3d', '#4a1942'],
    accent: '#f472b6',
    Icon: Zap,
  },
  socratic: {
    gradient: ['#1a1a2e', '#1e293b', '#1e3a5f'],
    accent: '#60a5fa',
    Icon: Brain,
  },
  empathetic_probe: {
    gradient: ['#1a1a2e', '#2d2b1b', '#3d3520'],
    accent: '#fbbf24',
    Icon: Heart,
  },
  logical_surgeon: {
    gradient: ['#1a1a2e', '#1b2d2d', '#0d4444'],
    accent: '#2dd4bf',
    Icon: Sparkles,
  },
  perspective_shifter: {
    gradient: ['#1a1a2e', '#2e1a2e', '#4c1d4c'],
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
      <Pressable onPress={onPress} style={{ marginBottom: 24 }}>
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, overflow: 'hidden' }}
        >
          <View style={{ flexDirection: 'row', padding: 20 }}>
            <View style={{ flex: 1, paddingRight: 16, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: `${theme.accent}20`,
                  }}
                >
                  <StyleIcon size={12} color={theme.accent} />
                  <Text style={{ fontSize: 12, fontWeight: '500', marginLeft: 4, color: theme.accent }}>
                    {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
                  </Text>
                </View>
              </View>

              <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 4 }}>
                {persona.name}
              </Text>

              <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 12 }}>
                {persona.tagline}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {persona.specialtyAreas.slice(0, 3).map((area, index) => (
                  <View
                    key={index}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text style={{ color: '#d1d5db', fontSize: 12 }}>{area}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ position: 'relative' }}>
              <View
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: theme.accent,
                  shadowColor: theme.accent,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 15,
                }}
              >
                <Image
                  source={imageSource as ImageSourcePropType}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
              <View
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.accent,
                }}
              >
                <StyleIcon size={16} color="#0f0f12" />
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: selected ? 2 : 0,
        borderColor: selected ? '#F59E0B' : 'transparent',
      }}
    >
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={{ position: 'relative', marginBottom: 12 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: `${theme.accent}80`,
              }}
            >
              <Image
                source={imageSource as ImageSourcePropType}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.accent,
              }}
            >
              <StyleIcon size={12} color="#0f0f12" />
            </View>
          </View>

          <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
            {persona.name}
          </Text>

          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 20,
              marginTop: 6,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: `${theme.accent}20`,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.accent }}>
              {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
            </Text>
          </View>

          {persona.tagline && (
            <Text
              style={{
                color: '#9ca3af',
                fontSize: 12,
                textAlign: 'center',
                marginTop: 8,
              }}
              numberOfLines={2}
            >
              {persona.tagline}
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12, justifyContent: 'center' }}>
          {persona.specialtyAreas.slice(0, 2).map((area, index) => (
            <View
              key={index}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ color: '#9ca3af', fontSize: 12 }}>{area}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </Pressable>
  );
}
