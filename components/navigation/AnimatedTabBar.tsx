import React from 'react';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollHideContext } from '../../hooks/useScrollHideAnimation';

const TAB_BAR_HEIGHT = 85;

export function AnimatedTabBar(props: BottomTabBarProps) {
  const progress = useScrollHideContext();
  const insets = useSafeAreaInsets();

  // Check if focused screen wants the tab bar hidden
  const focusedRoute = props.state.routes[props.state.index];
  const focusedOptions = props.descriptors[focusedRoute.key]?.options;
  const tabBarStyle = focusedOptions?.tabBarStyle as Record<string, unknown> | undefined;
  if (tabBarStyle?.display === 'none') {
    return null;
  }

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
