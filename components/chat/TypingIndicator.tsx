import { View, Image, ImageSourcePropType } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PersonaDisplay, ChallengeStyle } from '../../types/persona';

// Challenge style themes
const STYLE_THEMES: Record<ChallengeStyle, {
  bubbleGradient: [string, string];
  accent: string;
  dotColor: string;
}> = {
  steelman: {
    bubbleGradient: ['rgba(16, 52, 96, 0.6)', 'rgba(16, 52, 96, 0.3)'],
    accent: '#4ade80',
    dotColor: '#4ade80',
  },
  devils_advocate: {
    bubbleGradient: ['rgba(74, 25, 66, 0.6)', 'rgba(74, 25, 66, 0.3)'],
    accent: '#f472b6',
    dotColor: '#f472b6',
  },
  socratic: {
    bubbleGradient: ['rgba(30, 58, 95, 0.6)', 'rgba(30, 58, 95, 0.3)'],
    accent: '#60a5fa',
    dotColor: '#60a5fa',
  },
  empathetic_probe: {
    bubbleGradient: ['rgba(61, 53, 32, 0.6)', 'rgba(61, 53, 32, 0.3)'],
    accent: '#fbbf24',
    dotColor: '#fbbf24',
  },
  logical_surgeon: {
    bubbleGradient: ['rgba(13, 68, 68, 0.6)', 'rgba(13, 68, 68, 0.3)'],
    accent: '#2dd4bf',
    dotColor: '#2dd4bf',
  },
  perspective_shifter: {
    bubbleGradient: ['rgba(76, 29, 76, 0.6)', 'rgba(76, 29, 76, 0.3)'],
    accent: '#c084fc',
    dotColor: '#c084fc',
  },
};

interface TypingIndicatorProps {
  persona?: PersonaDisplay;
}

function Dot({ delay, color }: { delay: number; color: string }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withSequence(
        withDelay(delay, withTiming(1, { duration: 300 })),
        withTiming(0.3, { duration: 300 })
      ),
      -1,
      false
    ),
    transform: [
      {
        translateY: withRepeat(
          withSequence(
            withDelay(delay, withTiming(-4, { duration: 300 })),
            withTiming(0, { duration: 300 })
          ),
          -1,
          false
        ),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginHorizontal: 3,
        },
      ]}
    />
  );
}

export function TypingIndicator({ persona }: TypingIndicatorProps) {
  const theme = persona ? STYLE_THEMES[persona.challengeStyle] : null;
  const dotColor = theme?.dotColor || '#9A9A9E';
  const imageSource = persona
    ? typeof persona.avatarUrl === 'string'
      ? { uri: persona.avatarUrl }
      : persona.avatarUrl
    : null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 }}>
      {/* Avatar */}
      {persona && (
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

      {/* Typing bubble */}
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          borderColor: `${theme?.accent || '#F59E0B'}30`,
          borderRadius: 20,
          borderBottomLeftRadius: 6,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={theme?.bubbleGradient || ['rgba(30, 30, 40, 0.6)', 'rgba(30, 30, 40, 0.3)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Dot delay={0} color={dotColor} />
          <Dot delay={150} color={dotColor} />
          <Dot delay={300} color={dotColor} />
        </LinearGradient>
      </View>
    </View>
  );
}
