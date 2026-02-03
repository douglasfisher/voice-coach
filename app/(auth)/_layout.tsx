import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F0F12' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="onboarding/welcome" />
      <Stack.Screen name="onboarding/pick-personas" />
      <Stack.Screen name="onboarding/preferences" />
    </Stack>
  );
}
