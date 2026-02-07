import { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import {
  Heart,
  Briefcase,
  Mic,
  Handshake,
  MessageCircle,
  Globe,
  LucideIcon,
} from 'lucide-react-native';
import { SPRING_STANDARD, STAGGER_GAP, EASE_ENTER } from '../../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideDomainsProps {
  isActive: boolean;
}

const DOMAINS: { icon: LucideIcon; name: string; color: string }[] = [
  { icon: Heart, name: 'Dating', color: '#f472b6' },
  { icon: Briefcase, name: 'Interviews', color: '#60a5fa' },
  { icon: Mic, name: 'Presentations', color: '#4ade80' },
  { icon: Handshake, name: 'Negotiation', color: '#fbbf24' },
  { icon: MessageCircle, name: 'Difficult Talks', color: '#c084fc' },
  { icon: Globe, name: 'Networking', color: '#2dd4bf' },
];

function DomainCard({
  icon: Icon,
  name,
  color,
  index,
  isActive,
}: {
  icon: LucideIcon;
  name: string;
  color: string;
  index: number;
  isActive: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (isActive) {
      const delay = 300 + index * STAGGER_GAP;
      opacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
      translateY.value = withDelay(delay, withSpring(0, SPRING_STANDARD));
      scale.value = withDelay(delay, withSpring(1, SPRING_STANDARD));
    } else {
      opacity.value = 0;
      translateY.value = 30;
      scale.value = 0.9;
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: (SCREEN_WIDTH - 64 - 12) / 2,
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 20,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: `${color}20`,
        },
        animStyle,
      ]}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: `${color}15`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Icon size={24} color={color} />
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
    </Animated.View>
  );
}

export function SlideDomains({ isActive }: SlideDomainsProps) {
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(15);

  useEffect(() => {
    if (isActive) {
      titleOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      titleY.value = withDelay(100, withSpring(0, SPRING_STANDARD));
    } else {
      titleOpacity.value = 0;
      titleY.value = 15;
    }
  }, [isActive]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
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
        Six Domains, One App
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
    </View>
  );
}
