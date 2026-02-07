import { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame,
  Trophy,
  TrendingUp,
  Zap,
  Target,
  Award,
  LucideIcon,
} from 'lucide-react-native';
import { SPRING_STANDARD, SPRING_GENTLE, STAGGER_GAP, EASE_ENTER } from '../../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 180;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PROGRESS = 0.65;

interface SlideGrowthProps {
  isActive: boolean;
}

const STATS: { value: string; label: string; icon: LucideIcon; color: string; gradient: [string, string] }[] = [
  { value: '12', label: 'Sessions', icon: Target, color: '#60a5fa', gradient: ['#1e3a5f', '#0c1f3d'] },
  { value: '5 Day', label: 'Streak', icon: Flame, color: '#F59E0B', gradient: ['#713f12', '#422508'] },
  { value: 'Top 5%', label: 'Ranking', icon: Trophy, color: '#4ade80', gradient: ['#14532d', '#0a2e18'] },
];

const BADGES: { icon: LucideIcon; label: string; color: string }[] = [
  { icon: Zap, label: 'Fast Learner', color: '#fbbf24' },
  { icon: TrendingUp, label: 'On the Rise', color: '#4ade80' },
  { icon: Award, label: 'Top Performer', color: '#c084fc' },
];

function StatCard({
  value,
  label,
  icon: Icon,
  color,
  gradient,
  index,
  isActive,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
  gradient: [string, string];
  index: number;
  isActive: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    if (isActive) {
      const delay = 900 + index * (STAGGER_GAP + 60);
      opacity.value = withDelay(delay, withTiming(1, { duration: 350, easing: EASE_ENTER }));
      translateY.value = withDelay(delay, withSpring(0, SPRING_STANDARD));
      scale.value = withDelay(delay, withSpring(1, SPRING_STANDARD));
    } else {
      opacity.value = 0;
      translateY.value = 30;
      scale.value = 0.85;
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 14,
          padding: 14,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: `${color}25`,
        }}
      >
        <Icon size={18} color={color} style={{ marginBottom: 8 }} />
        <Animated.Text
          style={{
            color,
            fontSize: 20,
            fontWeight: '700',
            marginBottom: 2,
          }}
        >
          {value}
        </Animated.Text>
        <Animated.Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 11,
            fontWeight: '500',
          }}
        >
          {label}
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
}

function BadgePill({
  icon: Icon,
  label,
  color,
  index,
  isActive,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  index: number;
  isActive: boolean;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (isActive) {
      const delay = 1400 + index * 120;
      opacity.value = withDelay(delay, withTiming(1, { duration: 350, easing: EASE_ENTER }));
      scale.value = withDelay(delay, withSpring(1, SPRING_GENTLE));
    } else {
      opacity.value = 0;
      scale.value = 0.8;
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: `${color}12`,
          borderWidth: 1,
          borderColor: `${color}25`,
        },
        animStyle,
      ]}
    >
      <Icon size={14} color={color} />
      <Animated.Text style={{ color, fontSize: 11, fontWeight: '600' }}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
}

export function SlideGrowth({ isActive }: SlideGrowthProps) {
  const eyebrowOpacity = useSharedValue(0);
  const eyebrowY = useSharedValue(15);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(15);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(15);
  const ringProgress = useSharedValue(0);
  const ringGlow = useSharedValue(0);
  const levelScale = useSharedValue(0.5);
  const levelOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      eyebrowOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      eyebrowY.value = withDelay(100, withSpring(0, SPRING_STANDARD));
      titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      titleY.value = withDelay(200, withSpring(0, SPRING_STANDARD));
      subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
      subtitleY.value = withDelay(300, withSpring(0, SPRING_STANDARD));

      // Ring draws itself
      ringProgress.value = withDelay(
        500,
        withTiming(PROGRESS, { duration: 1400, easing: EASE_ENTER }),
      );

      // Pulsing glow on the ring
      ringGlow.value = withDelay(
        1200,
        withRepeat(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      );

      // Level text pops
      levelOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));
      levelScale.value = withDelay(800, withSpring(1, { damping: 10, stiffness: 150 }));
    } else {
      eyebrowOpacity.value = 0;
      eyebrowY.value = 15;
      titleOpacity.value = 0;
      titleY.value = 15;
      subtitleOpacity.value = 0;
      subtitleY.value = 15;
      ringProgress.value = 0;
      ringGlow.value = 0;
      levelScale.value = 0.5;
      levelOpacity.value = 0;
    }
  }, [isActive]);

  const eyebrowStyle = useAnimatedStyle(() => ({
    opacity: eyebrowOpacity.value,
    transform: [{ translateY: eyebrowY.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  const levelStyle = useAnimatedStyle(() => ({
    opacity: levelOpacity.value,
    transform: [{ scale: levelScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: ringGlow.value * 0.25,
    transform: [{ scale: 1 + ringGlow.value * 0.08 }],
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
          eyebrowStyle,
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
            marginBottom: 32,
            lineHeight: 22,
          },
          subtitleStyle,
        ]}
      >
        Watch your communication skills improve
      </Animated.Text>

      {/* Progress Ring with glow */}
      <View
        style={{
          width: RING_SIZE + 40,
          height: RING_SIZE + 40,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
        }}
      >
        {/* Ambient glow behind ring */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: RING_SIZE + 20,
              height: RING_SIZE + 20,
              borderRadius: (RING_SIZE + 20) / 2,
              backgroundColor: '#F59E0B',
            },
            glowStyle,
          ]}
        />

        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Background circle */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.06)"
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
              fontSize: 40,
              fontWeight: '800',
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
              letterSpacing: 2,
            }}
          >
            Level
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Stat cards */}
      <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginBottom: 20 }}>
        {STATS.map((stat, i) => (
          <StatCard key={stat.label} {...stat} index={i} isActive={isActive} />
        ))}
      </View>

      {/* Achievement badges */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {BADGES.map((badge, i) => (
          <BadgePill key={badge.label} {...badge} index={i} isActive={isActive} />
        ))}
      </View>
    </View>
  );
}
