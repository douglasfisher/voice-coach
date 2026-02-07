import { useEffect } from 'react';
import { View, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { resolvePersonaAvatar } from '../../lib/personaImages';
import { ParticleField } from './ParticleField';
import {
  SPRING_GENTLE,
  DURATION_SPLASH,
  EASE_ENTER,
} from '../../constants/animations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SplashScreen() {
  const glowOpacity = useSharedValue(0);
  const photoOpacity = useSharedValue(0);
  const photoScale = useSharedValue(1.08);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const underlineScaleX = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // 0-400ms: Amber glow
    glowOpacity.value = withTiming(1, { duration: 400, easing: EASE_ENTER });

    // 200-800ms: Photo fade in + Ken Burns settle
    photoOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 600, easing: EASE_ENTER }),
    );
    photoScale.value = withDelay(
      200,
      withTiming(1.0, { duration: 2000, easing: EASE_ENTER }),
    );

    // 500-1000ms: Title
    titleOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 500, easing: EASE_ENTER }),
    );
    titleTranslateY.value = withDelay(
      500,
      withSpring(0, SPRING_GENTLE),
    );

    // 800-1200ms: Underline
    underlineScaleX.value = withDelay(
      800,
      withTiming(1, { duration: 400, easing: EASE_ENTER }),
    );

    // 1000-1400ms: Tagline
    taglineOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 400, easing: EASE_ENTER }),
    );
    taglineTranslateY.value = withDelay(
      1000,
      withSpring(0, SPRING_GENTLE),
    );

    // 2400-2800ms: Fade out entire screen
    screenOpacity.value = withDelay(
      2400,
      withTiming(0, { duration: 400, easing: EASE_ENTER }),
    );

    // Navigate after splash
    const timer = setTimeout(() => {
      router.replace('/(auth)/onboarding/welcome');
    }, DURATION_SPLASH);

    return () => clearTimeout(timer);
  }, []);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const photoStyle = useAnimatedStyle(() => ({
    opacity: photoOpacity.value,
    transform: [{ scale: photoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: underlineScaleX.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const alexAvatar = resolvePersonaAvatar('alex rivera');

  return (
    <Animated.View
      style={[{ flex: 1, backgroundColor: '#0F0F12' }, screenStyle]}
    >
      {/* Amber radial glow behind photo */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: -50,
            right: -50,
            height: SCREEN_HEIGHT * 0.7,
            borderRadius: SCREEN_WIDTH,
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
          },
          glowStyle,
        ]}
      />

      {/* Alex Rivera photo - bottom 65% */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: SCREEN_HEIGHT * 0.65,
            overflow: 'hidden',
          },
          photoStyle,
        ]}
      >
        <Image
          source={alexAvatar}
          style={{
            width: '100%',
            height: '100%',
            resizeMode: 'cover',
          }}
        />
        {/* Gradient overlay - heavy fade to black at top */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '60%',
            backgroundColor: 'transparent',
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: '#0F0F12',
              opacity: 0.9,
            }}
          />
        </View>
        {/* Bottom subtle gradient */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '20%',
            backgroundColor: 'rgba(15, 15, 18, 0.6)',
          }}
        />
      </Animated.View>

      {/* Particles */}
      <ParticleField />

      {/* Text content - centered above photo */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: SCREEN_HEIGHT * 0.45,
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 40,
        }}
      >
        {/* "Dialectica" wordmark */}
        <Animated.Text
          style={[
            {
              color: '#FFFFFF',
              fontSize: 42,
              fontWeight: '700',
              letterSpacing: -1,
              textAlign: 'center',
            },
            titleStyle,
          ]}
        >
          Dialectica
        </Animated.Text>

        {/* Amber underline */}
        <Animated.View
          style={[
            {
              width: 60,
              height: 3,
              backgroundColor: '#F59E0B',
              borderRadius: 2,
              marginTop: 12,
            },
            underlineStyle,
          ]}
        />

        {/* Tagline */}
        <Animated.Text
          style={[
            {
              color: 'rgba(255,255,255,0.6)',
              fontSize: 17,
              textAlign: 'center',
              marginTop: 16,
              letterSpacing: 0.3,
            },
            taglineStyle,
          ]}
        >
          Master every conversation
        </Animated.Text>
      </View>
    </Animated.View>
  );
}
