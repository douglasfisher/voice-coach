import { useEffect } from 'react';
import { View, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { resolvePersonaAvatar } from '../../../lib/personaImages';
import { ParticleField } from '../ParticleField';
import { SPRING_GENTLE, STAGGER_GAP, EASE_ENTER } from '../../../constants/animations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SlideHeroProps {
  isActive: boolean;
}

export function SlideHero({ isActive }: SlideHeroProps) {
  const bgScale = useSharedValue(1.0);
  const eyebrowOpacity = useSharedValue(0);
  const eyebrowY = useSharedValue(15);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(15);
  const subtitleOpacity = useSharedValue(0);
  const subtitleY = useSharedValue(15);

  useEffect(() => {
    if (isActive) {
      // Ken Burns slow zoom
      bgScale.value = withRepeat(
        withTiming(1.03, { duration: 6000, easing: EASE_ENTER }),
        -1,
        true,
      );

      // Staggered text entrance
      eyebrowOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
      eyebrowY.value = withDelay(200, withSpring(0, SPRING_GENTLE));

      titleOpacity.value = withDelay(200 + STAGGER_GAP, withTiming(1, { duration: 400 }));
      titleY.value = withDelay(200 + STAGGER_GAP, withSpring(0, SPRING_GENTLE));

      subtitleOpacity.value = withDelay(200 + STAGGER_GAP * 2, withTiming(1, { duration: 400 }));
      subtitleY.value = withDelay(200 + STAGGER_GAP * 2, withSpring(0, SPRING_GENTLE));
    } else {
      bgScale.value = 1.0;
      eyebrowOpacity.value = 0;
      eyebrowY.value = 15;
      titleOpacity.value = 0;
      titleY.value = 15;
      subtitleOpacity.value = 0;
      subtitleY.value = 15;
    }
  }, [isActive]);

  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
  }));

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

  const alexAvatar = resolvePersonaAvatar('alex rivera');

  return (
    <View style={{ width: SCREEN_WIDTH, flex: 1, backgroundColor: '#0F0F12' }}>
      {/* Background image with Ken Burns */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: -10,
            right: -10,
            bottom: 0,
          },
          bgStyle,
        ]}
      >
        <Image
          source={alexAvatar}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        />
      </Animated.View>

      {/* Gradient overlays */}
      <LinearGradient
        pointerEvents="none"
        colors={['#0F0F12', 'rgba(15, 15, 18, 0.85)', 'transparent']}
        locations={[0, 0.5, 1]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60%',
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(15, 15, 18, 0.8)', '#0F0F12']}
        locations={[0, 0.5, 1]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
        }}
      />

      <ParticleField />

      {/* Text content */}
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
          paddingTop: 60,
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
              marginBottom: 16,
            },
            eyebrowStyle,
          ]}
        >
          Welcome to Dialectica
        </Animated.Text>

        <Animated.Text
          style={[
            {
              color: '#FFFFFF',
              fontSize: 34,
              fontWeight: '700',
              textAlign: 'center',
              letterSpacing: -0.5,
              lineHeight: 42,
              marginBottom: 16,
            },
            titleStyle,
          ]}
        >
          Your AI Conversation Coaches
        </Animated.Text>

        <Animated.Text
          style={[
            {
              color: 'rgba(255,255,255,0.6)',
              fontSize: 16,
              textAlign: 'center',
              lineHeight: 24,
            },
            subtitleStyle,
          ]}
        >
          28 expert coaches across 6 real-world domains
        </Animated.Text>
      </View>
    </View>
  );
}
