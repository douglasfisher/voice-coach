import { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Lightbulb } from 'lucide-react-native';
import { SPRING_GENTLE, EASE_ENTER } from '../../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideConversationProps {
  isActive: boolean;
}

function ChatBubble({
  text,
  isUser,
  delay,
  isActive,
}: {
  text: string;
  isUser: boolean;
  delay: number;
  isActive: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(isUser ? 40 : -40);

  useEffect(() => {
    if (isActive) {
      opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
      translateX.value = withDelay(delay, withSpring(0, SPRING_GENTLE));
    } else {
      opacity.value = 0;
      translateX.value = isUser ? 40 : -40;
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          maxWidth: '80%',
          backgroundColor: isUser
            ? 'rgba(245, 158, 11, 0.15)'
            : 'rgba(255,255,255,0.08)',
          borderRadius: 18,
          borderBottomRightRadius: isUser ? 6 : 18,
          borderBottomLeftRadius: isUser ? 18 : 6,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: isUser
            ? 'rgba(245, 158, 11, 0.2)'
            : 'rgba(255,255,255,0.06)',
        },
        animStyle,
      ]}
    >
      <Animated.Text
        style={{
          color: isUser ? '#F59E0B' : 'rgba(255,255,255,0.8)',
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {text}
      </Animated.Text>
    </Animated.View>
  );
}

export function SlideConversation({ isActive }: SlideConversationProps) {
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(15);
  const insightOpacity = useSharedValue(0);
  const insightY = useSharedValue(20);

  useEffect(() => {
    if (isActive) {
      titleOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      titleY.value = withDelay(100, withSpring(0, SPRING_GENTLE));
      insightOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
      insightY.value = withDelay(1000, withSpring(0, SPRING_GENTLE));
    } else {
      titleOpacity.value = 0;
      titleY.value = 15;
      insightOpacity.value = 0;
      insightY.value = 20;
    }
  }, [isActive]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const insightStyle = useAnimatedStyle(() => ({
    opacity: insightOpacity.value,
    transform: [{ translateY: insightY.value }],
  }));

  return (
    <View
      style={{
        width: SCREEN_WIDTH,
        flex: 1,
        backgroundColor: '#0F0F12',
        paddingHorizontal: 32,
        justifyContent: 'center',
      }}
    >
      <Animated.Text
        style={[
          {
            color: '#F59E0B',
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 3,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 12,
          },
          titleStyle,
        ]}
      >
        Interactive Practice
      </Animated.Text>

      <Animated.Text
        style={[
          {
            color: '#FFFFFF',
            fontSize: 28,
            fontWeight: '700',
            textAlign: 'center',
            letterSpacing: -0.5,
            marginBottom: 8,
          },
          titleStyle,
        ]}
      >
        Practice Real Scenarios
      </Animated.Text>

      <Animated.Text
        style={[
          {
            color: 'rgba(255,255,255,0.5)',
            fontSize: 15,
            textAlign: 'center',
            marginBottom: 32,
            lineHeight: 22,
          },
          titleStyle,
        ]}
      >
        Realistic conversations with real-time coaching
      </Animated.Text>

      {/* Mock chat */}
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <ChatBubble
          text="How would you approach asking for a promotion?"
          isUser={false}
          delay={300}
          isActive={isActive}
        />
        <ChatBubble
          text="I'd highlight my recent project wins and the revenue impact."
          isUser={true}
          delay={600}
          isActive={isActive}
        />
        <ChatBubble
          text="Strong start. What if they bring up budget constraints?"
          isUser={false}
          delay={800}
          isActive={isActive}
        />
      </View>

      {/* Coaching insight card */}
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            borderRadius: 14,
            padding: 14,
            marginTop: 16,
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.15)',
          },
          insightStyle,
        ]}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Lightbulb size={18} color="#F59E0B" />
        </View>
        <View style={{ flex: 1 }}>
          <Animated.Text
            style={{
              color: '#F59E0B',
              fontSize: 12,
              fontWeight: '700',
              marginBottom: 2,
            }}
          >
            Coaching Insight
          </Animated.Text>
          <Animated.Text
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            Anticipating objections shows strategic thinking
          </Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}
