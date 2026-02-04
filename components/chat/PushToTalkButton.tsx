import { View, Pressable, ActivityIndicator, GestureResponderEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, MicOff } from 'lucide-react-native';
import { useRef, useCallback } from 'react';
import { AudioWaveform } from './AudioWaveform';

interface PushToTalkButtonProps {
  onRecordingStart: () => void;
  onRecordingEnd: () => void;
  onCancel: () => void;
  isRecording: boolean;
  isProcessing: boolean;
  disabled: boolean;
  accentColor: string;
  audioLevel: number;
  hasPermission: boolean;
}

const CANCEL_THRESHOLD = 80; // pixels to drag down to cancel

export function PushToTalkButton({
  onRecordingStart,
  onRecordingEnd,
  onCancel,
  isRecording,
  isProcessing,
  disabled,
  accentColor,
  audioLevel,
  hasPermission,
}: PushToTalkButtonProps) {
  const scale = useSharedValue(1);
  const isPressed = useSharedValue(false);
  const startYRef = useRef<number>(0);
  const cancelledRef = useRef(false);

  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;
    startYRef.current = event.nativeEvent.pageY;
    cancelledRef.current = false;
    isPressed.value = true;
    scale.value = withSpring(1.1, { damping: 12, stiffness: 200 });
    onRecordingStart();
  }, [disabled, onRecordingStart, isPressed, scale]);

  const handlePressOut = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;

    const dragY = event.nativeEvent.pageY - startYRef.current;

    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    isPressed.value = false;

    if (cancelledRef.current || dragY > CANCEL_THRESHOLD) {
      onCancel();
    } else {
      onRecordingEnd();
    }
  }, [disabled, onRecordingEnd, onCancel, scale, isPressed]);

  const handleMove = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;
    const dragY = event.nativeEvent.pageY - startYRef.current;

    if (dragY > CANCEL_THRESHOLD && !cancelledRef.current) {
      cancelledRef.current = true;
      scale.value = withSpring(0.9, { damping: 12, stiffness: 200 });
    } else if (dragY <= CANCEL_THRESHOLD && cancelledRef.current) {
      cancelledRef.current = false;
      scale.value = withSpring(1.1, { damping: 12, stiffness: 200 });
    }
  }, [disabled, scale]);

  // Pulsing animation when recording
  const pulseStyle = useAnimatedStyle(() => {
    const baseScale = scale.value;

    if (!isPressed.value) {
      return {
        transform: [{ scale: baseScale }],
        shadowOpacity: 0.4,
      };
    }

    return {
      transform: [{ scale: baseScale }],
      shadowOpacity: withRepeat(
        withSequence(
          withTiming(0.8, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1,
        true
      ),
    };
  });

  // Glow ring animation
  const glowStyle = useAnimatedStyle(() => {
    if (!isPressed.value) {
      return {
        opacity: 0,
        transform: [{ scale: 1 }],
      };
    }

    return {
      opacity: withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(0.2, { duration: 800 })
        ),
        -1,
        true
      ),
      transform: [
        {
          scale: withRepeat(
            withSequence(
              withTiming(1.3, { duration: 800 }),
              withTiming(1.1, { duration: 800 })
            ),
            -1,
            true
          ),
        },
      ],
    };
  });

  const darkenColor = (hex: string, amount: number = 0.15): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  const showDisabled = disabled || !hasPermission;

  if (showDisabled) {
    return (
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <MicOff size={24} color="rgba(255, 255, 255, 0.3)" />
      </View>
    );
  }

  if (isProcessing) {
    return (
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: `${accentColor}20`,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: `${accentColor}40`,
        }}
      >
        <ActivityIndicator size="small" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 2,
            borderColor: accentColor,
          },
          glowStyle,
        ]}
      />

      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onTouchMove={handleMove}
        delayLongPress={0}
      >
        <Animated.View
          style={[
            {
              width: 56,
              height: 56,
              borderRadius: 28,
              shadowColor: accentColor,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 12,
              elevation: 8,
            },
            pulseStyle,
          ]}
        >
          <LinearGradient
            colors={[accentColor, darkenColor(accentColor)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isRecording ? (
              <AudioWaveform
                audioLevel={audioLevel}
                color="#0f0f12"
                barCount={5}
                width={32}
                height={24}
              />
            ) : (
              <Mic size={24} color="#0f0f12" />
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}
