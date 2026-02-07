import { Easing } from 'react-native-reanimated';

// Spring configs
export const SPRING_GENTLE = { damping: 22, stiffness: 100 };
export const SPRING_BOUNCY = { damping: 12, stiffness: 120 };
export const SPRING_STANDARD = { damping: 18, stiffness: 150 };

// Durations
export const DURATION_SPLASH = 2800;
export const STAGGER_GAP = 100;

// Easing presets
export const EASE_ENTER = Easing.out(Easing.cubic);
export const EASE_EXIT = Easing.in(Easing.cubic);
export const EASE_SMOOTH = Easing.bezier(0.4, 0, 0.2, 1);
