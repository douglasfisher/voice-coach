import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
  const { session, profile } = useAuthStore();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile && !profile.onboarding_completed) {
    return <Redirect href="/(auth)/onboarding/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}
