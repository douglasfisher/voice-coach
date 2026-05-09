import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';

// Set to false to require authentication
const DEV_SKIP_AUTH = false;
// Set to true to skip onboarding screens in dev
const DEV_SKIP_ONBOARDING = false;

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const [onboardingState, setOnboardingState] = useState<{
    loaded: boolean;
    hasSeenSplash: boolean;
    hasSeenOnboarding: boolean;
  }>({ loaded: false, hasSeenSplash: false, hasSeenOnboarding: false });

  useEffect(() => {
    (async () => {
      const [splash, onboarding] = await Promise.all([
        AsyncStorage.getItem('@dialectica/hasSeenSplash'),
        AsyncStorage.getItem('@dialectica/hasSeenOnboarding'),
      ]);
      setOnboardingState({
        loaded: true,
        hasSeenSplash: splash === 'true',
        hasSeenOnboarding: onboarding === 'true',
      });
    })();
  }, []);

  if (!onboardingState.loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F0F12', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  // Onboarding flow (before auth)
  if (!DEV_SKIP_ONBOARDING) {
    if (!onboardingState.hasSeenSplash) {
      return <Redirect href="/(auth)/onboarding/splash" />;
    }

    if (!onboardingState.hasSeenOnboarding) {
      return <Redirect href="/(auth)/onboarding/welcome" />;
    }
  }

  // Dev mode: skip auth entirely
  if (DEV_SKIP_AUTH) {
    return <Redirect href="/(tabs)" />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile && !profile.onboarding_completed) {
    return <Redirect href="/(auth)/onboarding/pick-personas" />;
  }

  return <Redirect href="/(tabs)" />;
}
