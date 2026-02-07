import { useEffect } from 'react';
import { View, Image, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { resolvePersonaAvatar } from '../../../lib/personaImages';
import { SPRING_BOUNCY, SPRING_GENTLE, STAGGER_GAP } from '../../../constants/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideReadyProps {
  isActive: boolean;
}

const AVATAR_COACHES = [
  'alex rivera',
  'priya sharma',
  'victor reyes',
  'dr. nina patel',
  'aisha rahman',
  'derek thompson',
];

// Position avatars in an arc
const AVATAR_SIZE = 56;
const ARC_RADIUS = 110;

function getArcPosition(index: number, total: number) {
  const startAngle = -Math.PI * 0.75;
  const endAngle = -Math.PI * 0.25;
  const angle = startAngle + (endAngle - startAngle) * (index / (total - 1));
  return {
    x: Math.cos(angle) * ARC_RADIUS,
    y: Math.sin(angle) * ARC_RADIUS,
  };
}

export function SlideReady({ isActive }: SlideReadyProps) {
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(15);
  const ctaOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(0.95);
  const glowOpacity = useSharedValue(0.3);

  // Avatar animations
  const avatarValues = AVATAR_COACHES.map(() => ({
    opacity: useSharedValue(0),
    scale: useSharedValue(0.3),
  }));

  useEffect(() => {
    if (isActive) {
      titleOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
      titleY.value = withDelay(100, withSpring(0, SPRING_GENTLE));

      // Avatars pop in with bounce
      avatarValues.forEach((av, i) => {
        const delay = 300 + i * STAGGER_GAP;
        av.opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
        av.scale.value = withDelay(delay, withSpring(1, SPRING_BOUNCY));
      });

      // CTA button
      ctaOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
      ctaScale.value = withDelay(800, withSpring(1, SPRING_GENTLE));

      // Glow pulse
      glowOpacity.value = withDelay(
        1000,
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
      ctaOpacity.value = 0;
      ctaScale.value = 0.95;
      glowOpacity.value = 0.3;
      avatarValues.forEach((av) => {
        av.opacity.value = 0;
        av.scale.value = 0.3;
      });
    }
  }, [isActive]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ scale: ctaScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
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
      {/* Avatar arc */}
      <View
        style={{
          width: ARC_RADIUS * 2 + AVATAR_SIZE,
          height: ARC_RADIUS + AVATAR_SIZE,
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: 40,
        }}
      >
        {AVATAR_COACHES.map((name, i) => {
          const pos = getArcPosition(i, AVATAR_COACHES.length);
          const animStyle = useAnimatedStyle(() => ({
            opacity: avatarValues[i].opacity.value,
            transform: [{ scale: avatarValues[i].scale.value }],
          }));

          return (
            <Animated.View
              key={name}
              style={[
                {
                  position: 'absolute',
                  left: ARC_RADIUS + pos.x - AVATAR_SIZE / 2 + AVATAR_SIZE / 2,
                  bottom: -pos.y - AVATAR_SIZE / 2 + AVATAR_SIZE / 2,
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  borderRadius: AVATAR_SIZE / 2,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                },
                animStyle,
              ]}
            >
              <Image
                source={resolvePersonaAvatar(name)}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </Animated.View>
          );
        })}
      </View>

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
            marginBottom: 40,
            lineHeight: 22,
            paddingHorizontal: 16,
          },
          titleStyle,
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
            glowStyle,
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
            }}
          >
            <Animated.Text
              style={{
                color: '#0F0F12',
                fontSize: 17,
                fontWeight: '700',
              }}
            >
              Get Started
            </Animated.Text>
            <ChevronRight size={20} color="#0F0F12" style={{ marginLeft: 4 }} />
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
