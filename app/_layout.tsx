import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { usePersonaStore } from '../stores/personaStore';
import '../global.css';

export default function RootLayout() {
  const { initialize, isLoading: _isLoading, isInitialized } = useAuthStore();
  const { fetchPersonas } = usePersonaStore();

  useEffect(() => {
    initialize();
    fetchPersonas();
  }, [initialize, fetchPersonas]);

  if (!isInitialized) {
    return (
      <View className="flex-1 bg-bg-primary items-center justify-center">
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <>
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
    </>
  );
}
