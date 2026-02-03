import { View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Avatar } from '../ui/Avatar';
import { PersonaDisplay } from '../../types/persona';

interface TypingIndicatorProps {
  persona?: PersonaDisplay;
}

function Dot({ delay }: { delay: number }) {
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
      style={animatedStyle}
      className="w-2 h-2 rounded-full bg-text-muted mx-0.5"
    />
  );
}

export function TypingIndicator({ persona }: TypingIndicatorProps) {
  return (
    <View className="flex-row items-end mb-4">
      {persona && (
        <Avatar
          source={persona.avatarUrl}
          fallback={persona.name}
          size="sm"
        />
      )}
      <View className="ml-2 px-4 py-3 rounded-2xl rounded-bl-sm bg-bg-tertiary flex-row items-center">
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </View>
  );
}
