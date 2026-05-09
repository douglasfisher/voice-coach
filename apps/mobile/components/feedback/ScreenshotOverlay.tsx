import { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { useFeedbackStore } from '../../stores/feedbackStore';

export function ScreenshotOverlay() {
  const { screenshotUri, openModal, dismissOverlay } = useFeedbackStore();
  const translateX = useSharedValue(-140);
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Slide in
    translateX.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 300 });

    // Auto-dismiss after 5s
    dismissTimer.current = setTimeout(() => {
      slideOut();
    }, 5000);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slideOut = () => {
    translateX.value = withTiming(-140, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      runOnJS(dismissOverlay)();
    }, 320);
  };

  const handleDismiss = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    slideOut();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  if (!screenshotUri) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 120,
          left: 16,
          zIndex: 9999,
        },
        animatedStyle,
      ]}
    >
      <Pressable onPress={openModal}>
        <View
          style={{
            backgroundColor: '#1a1a1f',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
            padding: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          {/* Dismiss button */}
          <Pressable
            onPress={handleDismiss}
            hitSlop={8}
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              zIndex: 1,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#333',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <X size={12} color="#fff" />
          </Pressable>

          {/* Screenshot thumbnail */}
          <Image
            source={{ uri: screenshotUri }}
            style={{
              width: 70,
              height: 120,
              borderRadius: 6,
            }}
            resizeMode="cover"
          />

          {/* Label */}
          <Text
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 10,
              fontWeight: '600',
              textAlign: 'center',
              marginTop: 6,
            }}
          >
            Tap to report
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
