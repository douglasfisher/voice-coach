import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const PARTICLE_COUNT = 10;

interface Particle {
  x: number;
  size: number;
  opacity: number;
  startY: number;
  duration: number;
  delay: number;
}

function ParticleDot({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(-300, { duration: particle.duration }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: `${particle.x}%` as any,
          top: `${particle.startY}%` as any,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: '#F59E0B',
          opacity: particle.opacity,
        },
        style,
      ]}
    />
  );
}

export function ParticleField() {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * 100,
        size: 3 + Math.random() * 2,
        opacity: 0.08 + Math.random() * 0.12,
        startY: 60 + Math.random() * 40,
        duration: 4000 + Math.random() * 3000,
        delay: Math.random() * 3000,
      })),
    [],
  );

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => (
        <ParticleDot key={i} particle={p} />
      ))}
    </Animated.View>
  );
}
