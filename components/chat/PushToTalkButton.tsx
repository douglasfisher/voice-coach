import { View, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  interpolate,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, MicOff } from 'lucide-react-native';
import { useEffect, useCallback } from 'react';
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
  const dragY = useSharedValue(0);
  const isPressed = useSharedValue(false);

  const handlePressIn = useCallback(() => {
    onRecordingStart();
  }, [onRecordingStart]);

  const handlePressOut = useCallback(() => {
    if (dragY.value > CANCEL_THRESHOLD) {
      onCancel();
    } else {
      onRecordingEnd();
    }
  }, [onRecordingEnd, onCancel, dragY]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // Gesture for press-and-hold with drag-to-cancel
  const gesture = Gesture.Pan()
    .onBegin(() => {
      if (disabled) return;
      isPressed.value = true;
      scale.value = withSpring(1.1, { damping: 12, stiffness: 200 });
      runOnJS(handlePressIn)();
    })
    .onUpdate((event) => {
      if (disabled) return;
      dragY.value = Math.max(0, event.translationY);

      // Scale down as user drags down (indicating cancel)
      if (dragY.value > 0) {
        const cancelProgress = Math.min(1, dragY.value / CANCEL_THRESHOLD);
        scale.value = interpolate(cancelProgress, [0, 1], [1.1, 0.9]);
      }
    })
    .onEnd(() => {
      if (disabled) return;
      if (dragY.value > CANCEL_THRESHOLD) {
        runOnJS(handleCancel)();
      } else {
        runOnJS(handlePressOut)();
      }
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      dragY.value = 0;
      isPressed.value = false;
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      dragY.value = 0;
      isPressed.value = false;
    });

  // Pulsing animation when recording
  const pulseStyle = useAnimatedStyle(() => {
    if (!isPressed.value) {
      return {
        transform: [{ scale: scale.value }],
        shadowOpacity: 0.4,
      };
    }

    return {
      transform: [{ scale: scale.value }],
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

      <GestureDetector gesture={gesture}>
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
      </GestureDetector>
    </View>
  );
}
