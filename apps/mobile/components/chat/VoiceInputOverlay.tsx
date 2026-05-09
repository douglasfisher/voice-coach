import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown } from 'lucide-react-native';
import { LiveTranscription } from './LiveTranscription';
import { AudioWaveform } from './AudioWaveform';

interface VoiceInputOverlayProps {
  isVisible: boolean;
  transcript: string;
  interimTranscript: string;
  audioLevel: number;
  accentColor: string;
}

export function VoiceInputOverlay({
  isVisible,
  transcript,
  interimTranscript,
  audioLevel,
  accentColor,
}: VoiceInputOverlayProps) {
  if (!isVisible) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      exiting={SlideOutDown.duration(150)}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 100,
        paddingTop: 16,
      }}
    >
      <LinearGradient
        colors={['transparent', 'rgba(10, 10, 15, 0.95)', 'rgba(10, 10, 15, 1)']}
        style={{
          position: 'absolute',
          top: -40,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <View style={{ gap: 16 }}>
        {/* Live Transcription */}
        <LiveTranscription
          transcript={transcript}
          interimTranscript={interimTranscript}
          maxHeight={100}
        />

        {/* Waveform */}
        <View style={{ alignItems: 'center' }}>
          <AudioWaveform
            audioLevel={audioLevel}
            color={accentColor}
            barCount={16}
            width={200}
            height={40}
          />
        </View>

        {/* Cancel hint */}
        <Animated.View
          entering={FadeIn.delay(500).duration(300)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <ChevronDown size={16} color="rgba(255, 255, 255, 0.4)" />
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: 12,
              fontWeight: '500',
            }}
          >
            Drag down to cancel
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
