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
      <Pressable onPress={onPress} className="mb-6">
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl overflow-hidden"
        >
          <View className="flex-row p-5">
            <View className="flex-1 pr-4 justify-center">
              <View className="flex-row items-center mb-2">
                <View
                  className="px-3 py-1 rounded-full flex-row items-center"
                  style={{ backgroundColor: `${theme.accent}20` }}
                >
                  <StyleIcon size={12} color={theme.accent} />
                  <Text className="text-xs font-medium ml-1" style={{ color: theme.accent }}>
                    {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
                  </Text>
                </View>
              </View>

              <Text className="text-white text-2xl font-bold mb-1">
                {persona.name}
              </Text>

              <Text className="text-gray-400 text-sm mb-3">
                {persona.tagline}
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {persona.specialtyAreas.slice(0, 3).map((area, index) => (
                  <View
                    key={index}
                    className="px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <Text className="text-gray-300 text-xs">{area}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="relative">
              <View
                className="w-32 h-32 rounded-2xl overflow-hidden"
                style={{
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
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <View
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.accent }}
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
      className={`rounded-2xl overflow-hidden ${selected ? 'ring-2 ring-amber-500' : ''}`}
    >
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-4"
      >
        <View className="items-center">
          <View className="relative mb-3">
            <View
              className="w-20 h-20 rounded-xl overflow-hidden"
              style={{
                borderWidth: 2,
                borderColor: `${theme.accent}80`,
              }}
            >
              <Image
                source={imageSource as ImageSourcePropType}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.accent }}
            >
              <StyleIcon size={12} color="#0f0f12" />
            </View>
          </View>

          <Text className="text-white font-bold text-center">
            {persona.name}
          </Text>

          <View
            className="px-2 py-0.5 rounded-full mt-1.5 flex-row items-center"
            style={{ backgroundColor: `${theme.accent}20` }}
          >
            <Text className="text-xs" style={{ color: theme.accent }}>
              {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
            </Text>
          </View>

          {persona.tagline && (
            <Text
              className="text-gray-400 text-xs text-center mt-2"
              numberOfLines={2}
            >
              {persona.tagline}
            </Text>
          )}
        </View>

        <View className="flex-row flex-wrap gap-1 mt-3 justify-center">
          {persona.specialtyAreas.slice(0, 2).map((area, index) => (
            <View
              key={index}
              className="px-2 py-1 rounded-md"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
              <Text className="text-gray-400 text-xs">{area}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </Pressable>
  );
}
