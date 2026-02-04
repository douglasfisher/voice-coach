import { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

interface SessionTimerProps {
  startTime: Date;
  accentColor?: string;
  isImmersive?: boolean;
}

/**
 * Displays elapsed session time in MM:SS or H:MM:SS format.
 * Features a pulsing colon animation and persona accent color styling.
 */
export function SessionTimer({
  startTime,
  accentColor = '#F59E0B',
  isImmersive = false,
}: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTime.getTime();
      setElapsed(Math.floor(elapsedMs / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Pulsing colon animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  // Format time as MM:SS or H:MM:SS
  const formatTime = (seconds: number): { parts: string[]; separator: string } => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return {
        parts: [hours.toString(), pad(minutes), pad(secs)],
        separator: ':',
      };
    }
    return {
      parts: [pad(minutes), pad(secs)],
      separator: ':',
    };
  };

  const { parts, separator } = formatTime(elapsed);

  return (
    <View
      style={{
        backgroundColor: isImmersive
          ? 'rgba(0, 0, 0, 0.4)'
          : `${accentColor}26`, // 15% opacity
        borderWidth: 1,
        borderColor: isImmersive
          ? 'rgba(255, 255, 255, 0.2)'
          : `${accentColor}4D`, // 30% opacity
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        ...(isImmersive && {
          backdropFilter: 'blur(10px)',
        }),
      }}
    >
      {parts.map((part, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'monospace',
              fontSize: 14,
              fontWeight: '600',
              color: isImmersive ? '#fff' : accentColor,
            }}
          >
            {part}
          </Text>
          {index < parts.length - 1 && (
            <Animated.Text
              style={{
                fontFamily: 'monospace',
                fontSize: 14,
                fontWeight: '600',
                color: isImmersive ? '#fff' : accentColor,
                opacity: pulseAnim,
              }}
            >
              {separator}
            </Animated.Text>
          )}
        </View>
      ))}
    </View>
  );
}
