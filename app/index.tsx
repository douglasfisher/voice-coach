import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

// Set to false to require authentication
const DEV_SKIP_AUTH = true;

export default function Index() {
  const { session, profile } = useAuthStore();

  // Dev mode: skip auth entirely
  if (DEV_SKIP_AUTH) {
    return <Redirect href="/(tabs)" />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile && !profile.onboarding_completed) {
    return <Redirect href="/(auth)/onboarding/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}
