import { createContext, useCallback, useContext } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';

const SCROLL_THRESHOLD = 10;
const MIN_OFFSET_TO_HIDE = 50;
const TIMING_CONFIG = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

// Shared context so tab bar and screen headers animate in sync
export const ScrollHideContext = createContext<SharedValue<number> | null>(null);

export function useScrollHideContext() {
  const value = useContext(ScrollHideContext);
  if (!value) {
    throw new Error('useScrollHideContext must be used within ScrollHideContext.Provider');
  }
  return value;
}

export function useScrollHideAnimation(headerHeight: number, disabled?: boolean) {
  const tabBarProgress = useContext(ScrollHideContext);
  const localProgress = useSharedValue(0);
  const progress = tabBarProgress ?? localProgress;

  const lastY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (disabled) return;
      const currentY = event.contentOffset.y;
      const delta = currentY - lastY.value;

      // Always show when at or above the top (rubber-banding)
      if (currentY <= 0) {
        progress.value = withTiming(0, TIMING_CONFIG);
        lastY.value = currentY;
        return;
      }

      // Don't hide until past minimum offset
      if (currentY < MIN_OFFSET_TO_HIDE) {
        lastY.value = currentY;
        return;
      }

      if (delta > SCROLL_THRESHOLD) {
        // Scrolling down → hide
        progress.value = withTiming(1, TIMING_CONFIG);
      } else if (delta < -SCROLL_THRESHOLD) {
        // Scrolling up → show
        progress.value = withTiming(0, TIMING_CONFIG);
      }

      lastY.value = currentY;
    },
  });

  // Reset to visible when screen gains focus (tab switch)
  useFocusEffect(
    useCallback(() => {
      progress.value = withTiming(0, TIMING_CONFIG);
    }, [progress])
  );

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -headerHeight }],
  }));

  return {
    scrollHandler,
    headerAnimatedStyle,
  };
}
