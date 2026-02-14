import { View, Text, Image, Pressable, ImageSourcePropType, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Zap, Brain, Heart, Scale, Eye } from 'lucide-react-native';
import { PersonaDisplay, ChallengeStyle, CHALLENGE_STYLE_LABELS } from '../../types/persona';
import { useAppSetting } from '../../hooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding
const CARD_HEIGHT = CARD_WIDTH * 2.8; // Taller aspect ratio for impact

interface PersonaCardProps {
  persona: PersonaDisplay;
  onPress: () => void;
  selected?: boolean;
  /** @deprecated Use `featured` instead */
  variant?: 'default' | 'featured';
  featured?: boolean;
  size?: 'lg' | 'sm';
  height?: number;
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

const UNIFIED_GRADIENT: [string, string, string] = ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'];

const CARD_SCALES = {
  lg: {
    padding: 20,
    borderRadius: 24,
    nameFontSize: 28,
    taglineFontSize: 15,
    styleLabelFontSize: 13,
    pillFontSize: 12,
    specialtyCount: 3,
    iconCircle: 32,
    iconSize: 16,
    taglineLines: undefined as number | undefined,
  },
  sm: {
    padding: 14,
    borderRadius: 20,
    nameFontSize: 20,
    taglineFontSize: 13,
    styleLabelFontSize: 11,
    pillFontSize: 10,
    specialtyCount: 2,
    iconCircle: 26,
    iconSize: 13,
    taglineLines: 2,
  },
} as const;

export function PersonaCard({ persona, onPress, selected = false, variant = 'default', featured, size = 'lg', height }: PersonaCardProps) {
  const theme = STYLE_THEMES[persona.challengeStyle];
  const StyleIcon = theme.Icon;
  const { value: unifiedGradient, isLoading: isGradientLoading } = useAppSetting('unified_card_gradient');
  const imageSource = typeof persona.avatarUrl === 'string'
    ? { uri: persona.avatarUrl }
    : persona.avatarUrl;

  const isFeatured = featured ?? (variant === 'featured');
  const s = CARD_SCALES[size];

  const useUnified = unifiedGradient || isGradientLoading;
  const gradientColors = useUnified ? UNIFIED_GRADIENT : theme.gradient;
  const gradientLocations: [number, number, number] = useUnified
    ? [0, 0.5, 1]
    : [0, 0.8, 1];

  const cardHeight = height ?? (isFeatured ? 500 : CARD_HEIGHT);

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: s.borderRadius,
        overflow: 'hidden',
        height: cardHeight,
        ...(isFeatured ? { marginBottom: 24 } : {}),
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
        colors={gradientColors}
        locations={gradientLocations}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Accent border glow — featured only */}
      {isFeatured && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: s.borderRadius,
            borderWidth: 2,
            borderColor: theme.accent,
            shadowColor: theme.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 20,
          }}
        />
      )}

      {/* Content overlay */}
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: s.padding }}>
        {/* Featured badge — absolute top-right */}
        {isFeatured && (
          <View
            style={{
              position: 'absolute',
              top: s.padding,
              right: s.padding,
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
        )}

        {/* Bottom info */}
        <View>
          {/* Icon circle + style label */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <View
              style={{
                width: s.iconCircle,
                height: s.iconCircle,
                borderRadius: s.iconCircle / 2,
                backgroundColor: theme.accent,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <StyleIcon size={s.iconSize} color="#0f0f12" />
            </View>
            <Text style={{ color: theme.accent, fontSize: s.styleLabelFontSize, fontWeight: '600' }}>
              {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
            </Text>
          </View>

          {/* Name */}
          <Text style={{ color: '#fff', fontSize: s.nameFontSize, fontWeight: 'bold', marginBottom: 4 }}>
            {persona.name}
          </Text>

          {/* Tagline */}
          {persona.tagline && (
            <Text
              style={{ color: 'rgba(255,255,255,0.8)', fontSize: s.taglineFontSize, marginBottom: 12 }}
              numberOfLines={s.taglineLines}
            >
              {persona.tagline}
            </Text>
          )}

          {/* Specialty pills */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {persona.specialtyAreas.slice(0, s.specialtyCount).map((area, index) => (
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
                <Text style={{ color: '#fff', fontSize: s.pillFontSize }}>{area}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
