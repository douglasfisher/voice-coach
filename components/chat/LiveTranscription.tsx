import { View, Text, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';

interface LiveTranscriptionProps {
  transcript: string;
  interimTranscript: string;
  maxHeight?: number;
}

function PulsingCursor() {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0.3, { duration: 500 })
      ),
      -1,
      true
    ),
  }));

  return (
    <Animated.View
      style={[
        {
          width: 2,
          height: 18,
          backgroundColor: '#fff',
          marginLeft: 2,
          borderRadius: 1,
        },
        animatedStyle,
      ]}
    />
  );
}

export function LiveTranscription({
  transcript,
  interimTranscript,
  maxHeight = 80,
}: LiveTranscriptionProps) {
  const displayText = transcript || interimTranscript;
  const hasText = displayText.trim().length > 0;

  if (!hasText) {
    return (
      <View
        style={{
          minHeight: 40,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: 15,
            fontStyle: 'italic',
          }}
        >
          Listening...
        </Text>
        <PulsingCursor />
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={{
        maxHeight,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <ScrollView
        style={{ maxHeight }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={displayText.length > 100}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Final transcript in white */}
          {transcript && (
            <Text
              style={{
                color: '#fff',
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {transcript}
            </Text>
          )}

          {/* Interim transcript in grey */}
          {interimTranscript && (
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {transcript ? ' ' : ''}
              {interimTranscript}
            </Text>
          )}

          <PulsingCursor />
        </View>
      </ScrollView>
    </Animated.View>
  );
}
