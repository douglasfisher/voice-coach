import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F0F12' },
        animation: 'none',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="sessions"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="report/[id]"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
