import { View, Text, Pressable, GestureResponderEvent } from 'react-native';
import { useRef, useCallback } from 'react';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic } from 'lucide-react-native';
import { AudioWaveform } from './AudioWaveform';
import { VoiceInputState } from '../../hooks/useVoiceInput';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  accentColor?: string;
  // Voice input props
  voiceInputEnabled?: boolean;
  voiceState?: VoiceInputState;
  transcript?: string;
  interimTranscript?: string;
  audioLevel?: number;
  hasVoicePermission?: boolean;
  onVoicePressIn?: () => void;
  onVoicePressOut?: () => Promise<string>;
  onVoiceCancel?: () => void;
}

const CANCEL_THRESHOLD = 100;

export function ChatInput({
  onSend,
  disabled = false,
  accentColor = '#F59E0B',
  voiceInputEnabled = false,
  voiceState = 'idle',
  transcript = '',
  interimTranscript = '',
  audioLevel = 0,
  hasVoicePermission = false,
  onVoicePressIn,
  onVoicePressOut,
  onVoiceCancel,
}: ChatInputProps) {
  const isRecording = voiceState === 'recording';
  const isProcessing = voiceState === 'processing';
  const showRecordingUI = isRecording || isProcessing;

  // Live transcription display
  const liveText = transcript || interimTranscript;

  // Animation values
  const scale = useSharedValue(1);
  const isPressed = useSharedValue(false);
  const startYRef = useRef<number>(0);
  const cancelledRef = useRef(false);

  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    if (disabled || !voiceInputEnabled) return;
    startYRef.current = event.nativeEvent.pageY;
    cancelledRef.current = false;
    isPressed.value = true;
    scale.value = withSpring(1.1, { damping: 12, stiffness: 200 });
    onVoicePressIn?.();
  }, [disabled, voiceInputEnabled, onVoicePressIn, isPressed, scale]);

  const handlePressOut = useCallback(async (event: GestureResponderEvent) => {
    if (disabled || !voiceInputEnabled) return;

    const dragY = event.nativeEvent.pageY - startYRef.current;
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    isPressed.value = false;

    if (cancelledRef.current || dragY > CANCEL_THRESHOLD) {
      onVoiceCancel?.();
      return;
    }

    // Get transcript and auto-send
    if (onVoicePressOut) {
      const finalTranscript = await onVoicePressOut();
      if (finalTranscript.trim()) {
        onSend(finalTranscript.trim());
      }
    }
  }, [disabled, voiceInputEnabled, onVoicePressOut, onVoiceCancel, onSend, scale, isPressed]);

  const handleMove = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;
    const dragY = event.nativeEvent.pageY - startYRef.current;

    if (dragY > CANCEL_THRESHOLD && !cancelledRef.current) {
      cancelledRef.current = true;
      scale.value = withSpring(0.85, { damping: 12, stiffness: 200 });
    } else if (dragY <= CANCEL_THRESHOLD && cancelledRef.current) {
      cancelledRef.current = false;
      scale.value = withSpring(1.1, { damping: 12, stiffness: 200 });
    }
  }, [disabled, scale]);

  // Pulsing glow animation when recording
  const pulseStyle = useAnimatedStyle(() => {
    const baseScale = scale.value;

    if (!isPressed.value) {
      return {
        transform: [{ scale: baseScale }],
        shadowOpacity: 0.5,
      };
    }

    return {
      transform: [{ scale: baseScale }],
      shadowOpacity: withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.3, { duration: 500 })
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
          withTiming(0.5, { duration: 700 }),
          withTiming(0.15, { duration: 700 })
        ),
        -1,
        true
      ),
      transform: [
        {
          scale: withRepeat(
            withSequence(
              withTiming(1.4, { duration: 700 }),
              withTiming(1.15, { duration: 700 })
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

  const buttonDisabled = disabled || !voiceInputEnabled || !hasVoicePermission;

  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 28,
        backgroundColor: 'rgba(10, 10, 15, 0.95)',
        borderTopWidth: 1,
        borderTopColor: showRecordingUI ? `${accentColor}40` : 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
      }}
    >
      {/* Transcription - shown when recording */}
      {showRecordingUI && (
        <View
          style={{
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 16,
            marginBottom: 20,
            minHeight: 56,
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: liveText ? '#fff' : 'rgba(255, 255, 255, 0.4)',
              fontSize: 17,
              lineHeight: 24,
              textAlign: 'center',
              fontStyle: liveText ? 'normal' : 'italic',
            }}
            numberOfLines={4}
          >
            {liveText || 'Listening...'}
          </Text>
        </View>
      )}

      {/* Waveform - shown when recording */}
      {showRecordingUI && (
        <View style={{ marginBottom: 20 }}>
          <AudioWaveform
            audioLevel={audioLevel}
            color={accentColor}
            barCount={16}
            width={200}
            height={40}
          />
        </View>
      )}

      {/* Big Central Mic Button */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {/* Glow ring */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 80,
              height: 80,
              borderRadius: 40,
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
          disabled={buttonDisabled}
        >
          <Animated.View
            style={[
              {
                width: 80,
                height: 80,
                borderRadius: 40,
                shadowColor: accentColor,
                shadowOffset: { width: 0, height: 6 },
                shadowRadius: 16,
                elevation: 10,
              },
              pulseStyle,
            ]}
          >
            <LinearGradient
              colors={
                buttonDisabled
                  ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                  : [accentColor, darkenColor(accentColor)]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showRecordingUI ? (
                <AudioWaveform
                  audioLevel={audioLevel}
                  color="#0f0f12"
                  barCount={5}
                  width={36}
                  height={28}
                />
              ) : (
                <Mic size={32} color={buttonDisabled ? 'rgba(255,255,255,0.3)' : '#0f0f12'} />
              )}
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>

      {/* Hint text */}
      {!showRecordingUI && (
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.35)',
            fontSize: 13,
            marginTop: 12,
          }}
        >
          Hold to speak
        </Text>
      )}
    </View>
  );
}
