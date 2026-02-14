import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ScreenCapture from 'expo-screen-capture';
import { captureScreen } from 'react-native-view-shot';
import { useAuthStore } from '../stores/authStore';
import { usePersonaStore } from '../stores/personaStore';
import { useFeedbackStore } from '../stores/feedbackStore';
import { ScreenshotOverlay } from '../components/feedback/ScreenshotOverlay';
import { FeedbackModal } from '../components/feedback/FeedbackModal';
import '../global.css';

export default function RootLayout() {
  const { initialize, isLoading: _isLoading, isInitialized } = useAuthStore();
  const { fetchPersonas } = usePersonaStore();
  const pathname = usePathname();
  const { onScreenshotDetected, isOverlayVisible, isModalVisible, closeModal } = useFeedbackStore();

  useEffect(() => {
    initialize();
    fetchPersonas();
  }, [initialize, fetchPersonas]);

  // Screenshot detection for feedback system
  useEffect(() => {
    const sub = ScreenCapture.addScreenshotListener(async () => {
      try {
        const uri = await captureScreen({ format: 'png', quality: 0.8, result: 'tmpfile' });
        onScreenshotDetected(uri, pathname);
      } catch (err) {
        console.warn('Feedback screenshot capture failed:', err);
      }
    });
    return () => sub.remove();
  }, [pathname, onScreenshotDetected]);

  if (!isInitialized) {
    return (
      <View className="flex-1 bg-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0F0F12' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      {isOverlayVisible && <ScreenshotOverlay />}
      <FeedbackModal visible={isModalVisible} onClose={closeModal} />
    </GestureHandlerRootView>
  );
}
