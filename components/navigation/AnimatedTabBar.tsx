import React from 'react';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollHideContext } from '../../hooks/useScrollHideAnimation';

const TAB_BAR_HEIGHT = 85;

export function AnimatedTabBar(props: BottomTabBarProps) {
  const progress = useScrollHideContext();
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * (TAB_BAR_HEIGHT + insets.bottom) },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        animatedStyle,
      ]}
    >
      <BottomTabBar {...props} />
    </Animated.View>
  );
}
