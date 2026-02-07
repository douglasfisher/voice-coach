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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideReadyProps {
  isActive: boolean;
}

const ALL_COACHES = [
  'alex rivera',
  'priya sharma',
  'victor reyes',
  'dr. nina patel',
  'aisha rahman',
  'derek thompson',
  'jordan chen',
  'sam taylor',
  'michael santos',
  'grace williams',
  'james morrison',
  'lisa park',
  'catherine walsh',
  'omar hassan',
  'marcus johnson',
  'emma larsson',
  'yuki yamamoto',
  'sophia martinez',
  'mia chang',
  'david park',
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const AVATAR_SIZE = 88;
const AVATAR_COLORS = ['#f472b6', '#60a5fa', '#4ade80', '#F59E0B', '#c084fc'];

// Wave offsets for visual interest: center high, sides lower
const WAVE_OFFSETS = [-8, -20, -28, -20, -8];

export function SlideReady({ isActive }: SlideReadyProps) {
  // Random 5 coaches, stable per mount
  const selectedCoaches = useMemo(() => shuffle(ALL_COACHES).slice(0, 5), []);

  const eyebrowOpacity = useSharedValue(0);
  const eyebrowY = useSharedValue(15);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(15);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(15);
  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(0.95);
  const glowOpacity = useSharedValue(0.3);

  // Avatar animations
  const avatarValues = selectedCoaches.map(() => ({
    opacity: useSharedValue(0),
    scale: useSharedValue(0.3),
    glowOpacity: useSharedValue(0),
  }));

  useEffect(() => {
    if (isActive) {
      // Eyebrow
      eyebrowOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      eyebrowY.value = withDelay(100, withSpring(0, SPRING_GENTLE));

      // Avatars pop in with bounce
      avatarValues.forEach((av, i) => {
        const delay = 200 + i * 120;
        av.opacity.value = withDelay(delay, withTiming(1, { duration: 350, easing: EASE_ENTER }));
        av.scale.value = withDelay(delay, withSpring(1, SPRING_BOUNCY));
        // Staggered glow pulse
        av.glowOpacity.value = withDelay(
          delay + 600,
          withRepeat(
            withTiming(1, { duration: 2000 + i * 200, easing: Easing.inOut(Easing.sin) }),
            -1,
            true,
          ),
        );
      });

      // Title & subtitle
      titleOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
      titleY.value = withDelay(700, withSpring(0, SPRING_GENTLE));
      subtitleOpacity.value = withDelay(850, withTiming(1, { duration: 400 }));
      subtitleY.value = withDelay(850, withSpring(0, SPRING_GENTLE));

      // CTA button
      ctaOpacity.value = withDelay(1100, withTiming(1, { duration: 400 }));
      ctaScale.value = withDelay(1100, withSpring(1, SPRING_GENTLE));

      // Glow pulse
      glowOpacity.value = withDelay(
        1400,
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
      eyebrowOpacity.value = 0;
      eyebrowY.value = 15;
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

  // Total width of the overlapping avatar row
  const overlap = 16;
  const totalWidth = AVATAR_SIZE * 5 - overlap * 4;

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
      {/* Avatar row - overlapping with wave offsets */}
      <View
        style={{
          width: totalWidth,
          height: AVATAR_SIZE + 30,
          marginBottom: 36,
        }}
      >
        {selectedCoaches.map((name, i) => {
          const animStyle = useAnimatedStyle(() => ({
            opacity: avatarValues[i].opacity.value,
            transform: [{ scale: avatarValues[i].scale.value }],
          }));
          const ringGlow = useAnimatedStyle(() => ({
            opacity: avatarValues[i].glowOpacity.value * 0.35,
          }));
          const color = AVATAR_COLORS[i];

          return (
            <Animated.View
              key={name}
              style={[
                {
                  position: 'absolute',
                  left: i * (AVATAR_SIZE - overlap),
                  top: -WAVE_OFFSETS[i],
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: i === 2 ? 10 : 5 - Math.abs(i - 2),
                },
                animStyle,
              ]}
            >
              {/* Glow ring */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    width: AVATAR_SIZE + 8,
                    height: AVATAR_SIZE + 8,
                    borderRadius: (AVATAR_SIZE + 8) / 2,
                    backgroundColor: color,
                  },
                  ringGlow,
                ]}
              />
              <View
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  overflow: 'hidden',
                  borderWidth: 3,
                  borderColor: `${color}60`,
                }}
              >
                <Image
                  source={resolvePersonaAvatar(name)}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Eyebrow */}
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
        Your Coaches Await
      </Animated.Text>

      <Animated.Text
        style={[
          {
            color: '#FFFFFF',
            fontSize: 30,
            fontWeight: '700',
            textAlign: 'center',
            letterSpacing: -0.5,
            marginBottom: 12,
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
            marginBottom: 36,
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
        {/* Glow behind button */}
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

        {/* Secondary link */}
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
  );
}
