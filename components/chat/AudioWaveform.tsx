import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  useSharedValue,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface AudioWaveformProps {
  audioLevel: number;
  color: string;
  barCount?: number;
  width?: number;
  height?: number;
}

interface WaveformBarProps {
  index: number;
  level: { value: number };
  color: string;
  barCount: number;
  maxHeight: number;
}

function WaveformBar({ index, level, color, barCount, maxHeight }: WaveformBarProps) {
  // Create variation based on bar position
  const centerIndex = (barCount - 1) / 2;
  const distanceFromCenter = Math.abs(index - centerIndex);
  const normalizedDistance = distanceFromCenter / centerIndex;

  // Bars closer to center are taller
  const heightMultiplier = 1 - normalizedDistance * 0.5;

  // Add slight random offset for organic feel
  const phaseOffset = (index * 0.15) % 1;

  const animatedStyle = useAnimatedStyle(() => {
    // Apply phase offset and height variation
    const adjustedLevel = Math.min(1, level.value * (1 + phaseOffset * 0.3));
    const minHeight = 6;
    const calculatedHeight = interpolate(
      adjustedLevel,
      [0, 1],
      [minHeight, maxHeight * heightMultiplier]
    );

    return {
      height: withSpring(calculatedHeight, {
        damping: 12,
        stiffness: 150,
        mass: 0.5,
      }),
      opacity: interpolate(adjustedLevel, [0, 0.3, 1], [0.4, 0.7, 1]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: 4,
          borderRadius: 2,
          backgroundColor: color,
          marginHorizontal: 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export function AudioWaveform({
  audioLevel,
  color,
  barCount = 12,
  width = 120,
  height = 32,
}: AudioWaveformProps) {
  const level = useSharedValue(0);

  useEffect(() => {
    level.value = audioLevel;
  }, [audioLevel, level]);

  return (
    <View
      style={{
        width,
        height,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: barCount }).map((_, index) => (
        <WaveformBar
          key={index}
          index={index}
          level={level}
          color={color}
          barCount={barCount}
          maxHeight={height}
        />
      ))}
    </View>
  );
}
