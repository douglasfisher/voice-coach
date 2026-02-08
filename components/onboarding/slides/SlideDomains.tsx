import { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  Briefcase,
  Mic,
  Handshake,
  MessageCircle,
  Globe,
  Plus,
  Sparkles,
  LucideIcon,
} from 'lucide-react-native';
import { SPRING_STANDARD, STAGGER_GAP, EASE_ENTER } from '../../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideDomainsProps {
  isActive: boolean;
}

const DOMAINS: { icon: LucideIcon; name: string; color: string; gradient: [string, string] }[] = [
  { icon: Heart, name: 'Dating', color: '#f472b6', gradient: ['#831843', '#4a0e2b'] },
  { icon: Briefcase, name: 'Interviews', color: '#60a5fa', gradient: ['#1e3a5f', '#0c1f3d'] },
  { icon: Mic, name: 'Presentations', color: '#4ade80', gradient: ['#14532d', '#0a2e18'] },
  { icon: Handshake, name: 'Negotiation', color: '#fbbf24', gradient: ['#713f12', '#422508'] },
  { icon: MessageCircle, name: 'Difficult Talks', color: '#c084fc', gradient: ['#4c1d95', '#2e1065'] },
  { icon: Globe, name: 'Networking', color: '#2dd4bf', gradient: ['#134e4a', '#0a2f2c'] },
];

function DomainCard({
  icon: Icon,
  name,
  color,
  gradient,
  index,
  isActive,
}: {
  icon: LucideIcon;
  name: string;
  color: string;
  gradient: [string, string];
  index: number;
  isActive: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);
  const scale = useSharedValue(0.85);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      const delay = 400 + index * (STAGGER_GAP + 40);
      opacity.value = withDelay(delay, withTiming(1, { duration: 350, easing: EASE_ENTER }));
      translateY.value = withDelay(delay, withSpring(0, SPRING_STANDARD));
      scale.value = withDelay(delay, withSpring(1, SPRING_STANDARD));
      // Subtle pulsing glow after card appears
      glowOpacity.value = withDelay(
        delay + 500,
        withRepeat(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      );
    } else {
      opacity.value = 0;
      translateY.value = 40;
      scale.value = 0.85;
      glowOpacity.value = 0;
    }
  }, [isActive, glowOpacity, index, opacity, scale, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.15,
  }));

  const cardWidth = (SCREEN_WIDTH - 64 - 12) / 2;

  return (
    <Animated.View style={[{ width: cardWidth }, animStyle]}>
      {/* Glow behind card */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: 20,
            backgroundColor: color,
          },
          glowStyle,
        ]}
      />
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          padding: 20,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: `${color}30`,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: `${color}20`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <Icon size={26} color={color} />
        </View>
        <Animated.Text
          style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {name}
        </Animated.Text>
      </LinearGradient>
    </Animated.View>
  );
}

function ComingSoonCard({ isActive }: { isActive: boolean }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      const delay = 400 + 6 * (STAGGER_GAP + 40);
      opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing: EASE_ENTER }));
      translateY.value = withDelay(delay, withSpring(0, SPRING_STANDARD));
      shimmer.value = withDelay(
        delay + 300,
        withRepeat(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      );
    } else {
      opacity.value = 0;
      translateY.value = 40;
      shimmer.value = 0;
    }
  }, [isActive, opacity, shimmer, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.4,
  }));

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(245, 158, 11, 0.2)',
          borderStyle: 'dashed',
          backgroundColor: 'rgba(245, 158, 11, 0.05)',
        },
        animStyle,
      ]}
    >
      <Animated.View style={shimmerStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="#F59E0B" />
          <Animated.Text
            style={{
              color: '#F59E0B',
              fontSize: 13,
              fontWeight: '600',
              letterSpacing: 0.5,
            }}
          >
            More domains coming soon
          </Animated.Text>
          <Plus size={14} color="#F59E0B" />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export function SlideDomains({ isActive }: SlideDomainsProps) {
  const eyebrowOpacity = useSharedValue(0);
  const eyebrowY = useSharedValue(15);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(15);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(15);

  useEffect(() => {
    if (isActive) {
      eyebrowOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      eyebrowY.value = withDelay(100, withSpring(0, SPRING_STANDARD));
      titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      titleY.value = withDelay(200, withSpring(0, SPRING_STANDARD));
      subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
      subtitleY.value = withDelay(300, withSpring(0, SPRING_STANDARD));
    } else {
      eyebrowOpacity.value = 0;
      eyebrowY.value = 15;
      titleOpacity.value = 0;
      titleY.value = 15;
      subtitleOpacity.value = 0;
      subtitleY.value = 15;
    }
  }, [isActive, eyebrowOpacity, eyebrowY, subtitleOpacity, subtitleY, titleOpacity, titleY]);

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
          eyebrowStyle,
        ]}
      >
        Comprehensive Coaching
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
        Six Domains & Growing
      </Animated.Text>

      <Animated.Text
        style={[
          {
            color: 'rgba(255,255,255,0.5)',
            fontSize: 15,
            textAlign: 'center',
            marginBottom: 28,
            lineHeight: 22,
          },
          subtitleStyle,
        ]}
      >
        Expert coaching for every conversation type
      </Animated.Text>

      {/* 2x3 Grid */}
      <View style={{ gap: 12 }}>
        {[0, 1, 2].map((row) => (
          <View
            key={row}
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            {DOMAINS.slice(row * 2, row * 2 + 2).map((domain, colIndex) => (
              <DomainCard
                key={domain.name}
                {...domain}
                index={row * 2 + colIndex}
                isActive={isActive}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Coming soon teaser */}
      <View style={{ marginTop: 16 }}>
        <ComingSoonCard isActive={isActive} />
      </View>
    </View>
  );
}
