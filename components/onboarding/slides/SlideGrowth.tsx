import { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { SPRING_STANDARD, STAGGER_GAP, EASE_ENTER } from '../../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 160;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PROGRESS = 0.65; // 65% filled

interface SlideGrowthProps {
  isActive: boolean;
}

const STATS = [
  { value: '12', label: 'Sessions' },
  { value: '5 Day', label: 'Streak' },
  { value: 'Top 15%', label: 'Ranking' },
];

function StatCard({
  value,
  label,
  index,
  isActive,
}: {
  value: string;
  label: string;
  index: number;
  isActive: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (isActive) {
      const delay = 800 + index * STAGGER_GAP;
      opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
      translateY.value = withDelay(delay, withSpring(0, SPRING_STANDARD));
    } else {
      opacity.value = 0;
      translateY.value = 20;
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 14,
          padding: 16,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
        },
        animStyle,
      ]}
    >
      <Animated.Text
        style={{
          color: '#F59E0B',
          fontSize: 20,
          fontWeight: '700',
          marginBottom: 4,
        }}
      >
        {value}
      </Animated.Text>
      <Animated.Text
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontWeight: '500',
        }}
      >
        {label}
      </Animated.Text>
    </Animated.View>
  );
}

export function SlideGrowth({ isActive }: SlideGrowthProps) {
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(15);
  const ringProgress = useSharedValue(0);
  const levelScale = useSharedValue(0.5);
  const levelOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      titleOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      titleY.value = withDelay(100, withSpring(0, SPRING_STANDARD));

      // Ring draws itself
      ringProgress.value = withDelay(
        400,
        withTiming(PROGRESS, { duration: 1200, easing: EASE_ENTER }),
      );

      // Level text pops
      levelOpacity.value = withDelay(700, withTiming(1, { duration: 300 }));
      levelScale.value = withDelay(700, withSpring(1, SPRING_STANDARD));
    } else {
      titleOpacity.value = 0;
      titleY.value = 15;
      ringProgress.value = 0;
      levelScale.value = 0.5;
      levelOpacity.value = 0;
    }
  }, [isActive]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const levelStyle = useAnimatedStyle(() => ({
    opacity: levelOpacity.value,
    transform: [{ scale: levelScale.value }],
  }));

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - ringProgress.value),
  }));

  return (
    <View
      style={{
        width: SCREEN_WIDTH,
        flex: 1,
        backgroundColor: '#0F0F12',
        paddingHorizontal: 32,
        justifyContent: 'center',
        alignItems: 'center',
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
        Progress Tracking
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
        Track Your Growth
      </Animated.Text>

      <Animated.Text
        style={[
          {
            color: 'rgba(255,255,255,0.5)',
            fontSize: 15,
            textAlign: 'center',
            marginBottom: 40,
            lineHeight: 22,
          },
          titleStyle,
        ]}
      >
        Watch your communication skills improve
      </Animated.Text>

      {/* Progress Ring */}
      <View
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
        }}
      >
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Background circle */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Animated progress circle */}
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke="#F59E0B"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            animatedProps={animatedCircleProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>

        {/* Level text centered in ring */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              alignItems: 'center',
            },
            levelStyle,
          ]}
        >
          <Animated.Text
            style={{
              color: '#F59E0B',
              fontSize: 32,
              fontWeight: '700',
            }}
          >
            4
          </Animated.Text>
          <Animated.Text
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Level
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Stat cards */}
      <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
        {STATS.map((stat, i) => (
          <StatCard key={stat.label} {...stat} index={i} isActive={isActive} />
        ))}
      </View>
    </View>
  );
}
