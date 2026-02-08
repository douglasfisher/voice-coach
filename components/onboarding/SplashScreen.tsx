import { useEffect } from 'react';
import { View, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { resolvePersonaAvatar } from '../../lib/personaImages';
import { ParticleField } from './ParticleField';
import {
  SPRING_GENTLE,
  DURATION_SPLASH,
  EASE_ENTER,
} from '../../constants/animations';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SplashScreen() {
  const photoOpacity = useSharedValue(0);
  const photoScale = useSharedValue(1.08);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const underlineScaleX = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // 0-600ms: Photo fade in + Ken Burns settle
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

    // 3400-3800ms: Fade out entire screen
    screenOpacity.value = withDelay(
      3400,
      withTiming(0, { duration: 600, easing: EASE_ENTER }),
    );

    // Navigate after splash
    const timer = setTimeout(() => {
      router.replace('/(auth)/onboarding/welcome');
    }, DURATION_SPLASH);

    return () => clearTimeout(timer);
  }, [photoOpacity, photoScale, screenOpacity, taglineOpacity, taglineTranslateY, titleOpacity, titleTranslateY, underlineScaleX]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
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
      {/* Alex Rivera photo - full screen */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
      </Animated.View>

      {/* Gradient overlay - lower half only, for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(15, 15, 18, 0.6)', 'rgba(15, 15, 18, 0.9)', '#0F0F12']}
        locations={[0, 0.3, 0.65, 1]}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: SCREEN_HEIGHT * 0.5,
        }}
        pointerEvents="none"
      />

      {/* Particles */}
      <ParticleField />

      {/* Text content - lower third */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: SCREEN_HEIGHT * 0.33,
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 40,
        }}
      >
        {/* "Dialectica" wordmark */}
        <Animated.Text
          style={[
            {
              color: '#FFFFFF',
              fontSize: 56,
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
