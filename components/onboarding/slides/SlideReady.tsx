import { useEffect, useMemo } from 'react';
import { View, Image, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { resolvePersonaAvatar } from '../../../lib/personaImages';
import { SPRING_BOUNCY, SPRING_GENTLE, EASE_ENTER } from '../../../constants/animations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SlideReadyProps {
  isActive: boolean;
}

interface CoachEntry {
  name: string;
  badge: string;
  badgeColor: string;
}

const ALL_COACHES: CoachEntry[] = [
  { name: 'alex rivera', badge: 'Dating', badgeColor: '#f472b6' },
  { name: 'jordan chen', badge: 'Dating', badgeColor: '#f472b6' },
  { name: 'sam taylor', badge: 'Dating', badgeColor: '#f472b6' },
  { name: 'mia chang', badge: 'Dating', badgeColor: '#f472b6' },
  { name: 'priya sharma', badge: 'Interviews', badgeColor: '#60a5fa' },
  { name: 'michael santos', badge: 'Interviews', badgeColor: '#60a5fa' },
  { name: 'grace williams', badge: 'Interviews', badgeColor: '#60a5fa' },
  { name: 'david park', badge: 'Interviews', badgeColor: '#60a5fa' },
  { name: 'james morrison', badge: 'Presenting', badgeColor: '#4ade80' },
  { name: 'aisha rahman', badge: 'Presenting', badgeColor: '#4ade80' },
  { name: 'lisa park', badge: 'Presenting', badgeColor: '#4ade80' },
  { name: 'victor reyes', badge: 'Negotiation', badgeColor: '#fbbf24' },
  { name: 'catherine walsh', badge: 'Negotiation', badgeColor: '#fbbf24' },
  { name: 'omar hassan', badge: 'Negotiation', badgeColor: '#fbbf24' },
  { name: 'dr. nina patel', badge: 'Difficult Talks', badgeColor: '#c084fc' },
  { name: 'marcus johnson', badge: 'Difficult Talks', badgeColor: '#c084fc' },
  { name: 'emma larsson', badge: 'Difficult Talks', badgeColor: '#c084fc' },
  { name: 'derek thompson', badge: 'Networking', badgeColor: '#2dd4bf' },
  { name: 'yuki yamamoto', badge: 'Networking', badgeColor: '#2dd4bf' },
  { name: 'sophia martinez', badge: 'Networking', badgeColor: '#2dd4bf' },
];

function shuffleArr<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Designed at 390px width — scales proportionally to any screen
const DESIGN_WIDTH = 390;
const S = SCREEN_WIDTH / DESIGN_WIDTH;

const LAYOUT = [
  { left: -10, top: 20, size: 120 },   // top-left
  { left: 155, top: 15, size: 100 },   // top-center
  { left: 275, top: 0, size: 140 },    // top-right
  { left: 60, top: 90, size: 280 },    // CENTER HERO - much bigger
  { left: -30, top: 150, size: 170 },  // mid-left
  { left: 300, top: 155, size: 115 },  // mid-right
  { left: 20, top: 350, size: 125 },   // bottom-left
  { left: 260, top: 300, size: 110 },  // bottom-right
].map(item => ({
  left: Math.round(item.left * S),
  top: Math.round(item.top * S),
  size: Math.round(item.size * S),
}));

const COACH_COUNT = 8;

export function SlideReady({ isActive }: SlideReadyProps) {
  const selectedCoaches = useMemo(() => shuffleArr(ALL_COACHES).slice(0, COACH_COUNT), []);

  // Randomise positions of non-hero circles each mount
  const randomizedLayout = useMemo(() => {
    return LAYOUT.map((item, i) => {
      if (i === 3) return item; // keep hero fixed
      const offsetX = Math.round((Math.random() - 0.5) * 30 * S);
      const offsetY = Math.round((Math.random() - 0.5) * 25 * S);
      const sizeJitter = Math.round((Math.random() - 0.5) * 20 * S);
      return {
        left: item.left + offsetX,
        top: item.top + offsetY,
        size: Math.max(Math.round(85 * S), item.size + sizeJitter),
      };
    });
  }, []);

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(15);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(15);
  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(0.95);
  const glowOpacity = useSharedValue(0.3);

  const avatarValues = selectedCoaches.map(() => ({
    opacity: useSharedValue(0),
    scale: useSharedValue(0.3),
    glowOpacity: useSharedValue(0),
  }));

  useEffect(() => {
    if (isActive) {
      // Avatars pop in scattered
      avatarValues.forEach((av, i) => {
        const delay = 150 + i * 100;
        av.opacity.value = withDelay(delay, withTiming(1, { duration: 350, easing: EASE_ENTER }));
        av.scale.value = withDelay(delay, withSpring(1, SPRING_BOUNCY));
        av.glowOpacity.value = withDelay(
          delay + 600,
          withRepeat(
            withTiming(1, { duration: 2200 + i * 300, easing: Easing.inOut(Easing.sin) }),
            -1,
            true,
          ),
        );
      });

      // Title
      titleOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
      titleY.value = withDelay(900, withSpring(0, SPRING_GENTLE));
      subtitleOpacity.value = withDelay(1050, withTiming(1, { duration: 400 }));
      subtitleY.value = withDelay(1050, withSpring(0, SPRING_GENTLE));

      // CTA
      ctaOpacity.value = withDelay(1300, withTiming(1, { duration: 400 }));
      ctaScale.value = withDelay(1300, withSpring(1, SPRING_GENTLE));

      glowOpacity.value = withDelay(
        1600,
        withRepeat(
          withSequence(
            withTiming(0.6, { duration: 1500 }),
            withTiming(0.3, { duration: 1500 }),
          ),
          -1,
          false,
        ),
      );
    } else {
      titleOpacity.value = 0;
      titleY.value = 15;
      subtitleOpacity.value = 0;
      subtitleY.value = 15;
      ctaOpacity.value = 0;
      ctaScale.value = 0.95;
      glowOpacity.value = 0.3;
      avatarValues.forEach((av) => {
        av.opacity.value = 0;
        av.scale.value = 0.3;
        av.glowOpacity.value = 0;
      });
    }
  }, [isActive]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleY.value }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ scale: ctaScale.value }],
  }));

  const buttonGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('@dialectica/hasSeenOnboarding', 'true');
    router.push('/(auth)/onboarding/pick-personas');
  };

  const handleLogin = () => {
    AsyncStorage.setItem('@dialectica/hasSeenOnboarding', 'true');
    router.push('/(auth)/login');
  };

  const containerHeight = Math.round(440 * S);

  return (
    <View
      style={{
        width: SCREEN_WIDTH,
        flex: 1,
        backgroundColor: '#0F0F12',
      }}
    >
      {/* Scattered avatar field - full width */}
      <View
        style={{
          width: SCREEN_WIDTH,
          height: containerHeight,
          marginTop: SCREEN_HEIGHT * 0.08,
        }}
      >
        {selectedCoaches.map((coach, i) => {
          const layout = randomizedLayout[i];
          const size = layout.size;
          const animStyle = useAnimatedStyle(() => ({
            opacity: avatarValues[i].opacity.value,
            transform: [{ scale: avatarValues[i].scale.value }],
          }));
          const ringGlow = useAnimatedStyle(() => ({
            opacity: avatarValues[i].glowOpacity.value * 0.3,
          }));

          return (
            <Animated.View
              key={coach.name}
              style={[
                {
                  position: 'absolute',
                  left: layout.left,
                  top: layout.top,
                  width: size,
                  alignItems: 'center',
                  zIndex: i === 3 ? 10 : 1,
                },
                animStyle,
              ]}
            >
              {/* Glow */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: -4,
                    width: size + 8,
                    height: size + 8,
                    borderRadius: (size + 8) / 2,
                    backgroundColor: coach.badgeColor,
                  },
                  ringGlow,
                ]}
              />
              {/* Avatar circle */}
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  overflow: 'hidden',
                  borderWidth: 2.5,
                  borderColor: `${coach.badgeColor}50`,
                }}
              >
                <Image
                  source={resolvePersonaAvatar(coach.name)}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
              {/* Badge */}
              <View
                style={{
                  marginTop: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  backgroundColor: `${coach.badgeColor}18`,
                  borderWidth: 1,
                  borderColor: `${coach.badgeColor}30`,
                }}
              >
                <Animated.Text
                  style={{
                    color: coach.badgeColor,
                    fontSize: size > 85 ? 10 : 9,
                    fontWeight: '600',
                  }}
                  numberOfLines={1}
                >
                  {coach.badge}
                </Animated.Text>
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Text + CTA - bottom portion */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 32,
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 120,
          zIndex: 20,
        }}
      >
        <Animated.Text
          style={[
            {
              color: '#FFFFFF',
              fontSize: 30,
              fontWeight: '700',
              textAlign: 'center',
              letterSpacing: -0.5,
              marginBottom: 10,
            },
            titleStyle,
          ]}
        >
          Ready to Begin?
        </Animated.Text>

        <Animated.Text
          style={[
            {
              color: 'rgba(255,255,255,0.5)',
              fontSize: 15,
              textAlign: 'center',
              marginBottom: 28,
              lineHeight: 22,
              paddingHorizontal: 16,
            },
            subtitleStyle,
          ]}
        >
          Choose your coaches and start your first conversation
        </Animated.Text>

        {/* CTA Button with glow */}
        <Animated.View style={[{ width: '100%' }, ctaStyle]}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: -8,
                left: 20,
                right: 20,
                bottom: -8,
                borderRadius: 24,
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
              },
              buttonGlowStyle,
            ]}
          />

          <Pressable onPress={handleGetStarted}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 18,
                borderRadius: 16,
                gap: 8,
              }}
            >
              <Sparkles size={18} color="#0F0F12" />
              <Animated.Text
                style={{
                  color: '#0F0F12',
                  fontSize: 17,
                  fontWeight: '700',
                }}
              >
                Get Started
              </Animated.Text>
              <ChevronRight size={20} color="#0F0F12" />
            </LinearGradient>
          </Pressable>

          <Pressable onPress={handleLogin} style={{ marginTop: 16, alignItems: 'center' }}>
            <Animated.Text
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 15,
              }}
            >
              I have an account
            </Animated.Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
