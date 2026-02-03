import { View, Text, ScrollView, Switch, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import Slider from '@react-native-community/slider';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';

export default function ProfileScreen() {
  const { profile, preferences, user, signOut, updatePreferences, updateProfile } =
    useAuthStore();

  const [intensity, setIntensity] = useState(
    preferences?.preferred_challenge_intensity ?? 5
  );
  const [ttsEnabled, setTtsEnabled] = useState(preferences?.tts_enabled ?? true);
  const [notifications, setNotifications] = useState(
    preferences?.notification_daily_challenge ?? true
  );

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const saveIntensity = async () => {
    await updatePreferences({ preferred_challenge_intensity: intensity });
  };

  const toggleTTS = async (value: boolean) => {
    setTtsEnabled(value);
    await updatePreferences({ tts_enabled: value });
  };

  const toggleNotifications = async (value: boolean) => {
    setNotifications(value);
    await updatePreferences({ notification_daily_challenge: value });
  };

  const intensityLabels = ['Gentle', 'Moderate', 'Challenging', 'Intense'];
  const intensityLabel = intensityLabels[Math.min(Math.floor((intensity - 1) / 2.5), 3)];

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        <Text className="text-text-primary text-2xl font-bold mb-6">Settings</Text>

        {/* Profile Section */}
        <Card variant="elevated" padding="lg" className="mb-4">
          <View className="flex-row items-center">
            <Avatar
              source={profile?.avatar_url}
              fallback={profile?.display_name ?? user?.email}
              size="lg"
            />
            <View className="ml-4 flex-1">
              <Text className="text-text-primary text-lg font-semibold">
                {profile?.display_name ?? 'Anonymous Thinker'}
              </Text>
              <Text className="text-text-muted text-sm">{user?.email}</Text>
              <View className="flex-row mt-2">
                <View className="bg-bg-tertiary rounded-full px-3 py-1 mr-2">
                  <Text className="text-text-secondary text-xs">
                    Level {profile?.current_level ?? 1}
                  </Text>
                </View>
                <View className="bg-bg-tertiary rounded-full px-3 py-1">
                  <Text className="text-text-secondary text-xs">
                    {profile?.total_sessions ?? 0} sessions
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Challenge Intensity */}
        <Card variant="elevated" padding="lg" className="mb-4">
          <Text className="text-text-primary font-semibold mb-1">
            Challenge Intensity
          </Text>
          <Text className="text-text-muted text-sm mb-4">
            How hard should personas push you?
          </Text>

          <View className="flex-row justify-between mb-2">
            <Text className="text-text-muted">Gentle</Text>
            <Text className="text-accent-primary font-semibold">{intensityLabel}</Text>
            <Text className="text-text-muted">Intense</Text>
          </View>

          <Slider
            value={intensity}
            onValueChange={setIntensity}
            onSlidingComplete={saveIntensity}
            minimumValue={1}
            maximumValue={10}
            step={1}
            minimumTrackTintColor="#F59E0B"
            maximumTrackTintColor="#252529"
            thumbTintColor="#F59E0B"
          />
        </Card>

        {/* Voice Settings */}
        <Card variant="elevated" padding="lg" className="mb-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-text-primary font-semibold">Voice Responses</Text>
              <Text className="text-text-muted text-sm mt-1">
                Hear personas speak their responses
              </Text>
            </View>
            <Switch
              value={ttsEnabled}
              onValueChange={toggleTTS}
              trackColor={{ false: '#252529', true: '#F59E0B' }}
              thumbColor="#F5F5F7"
            />
          </View>
        </Card>

        {/* Notifications */}
        <Card variant="elevated" padding="lg" className="mb-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-text-primary font-semibold">Daily Challenge</Text>
              <Text className="text-text-muted text-sm mt-1">
                Remind me about daily challenges
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#252529', true: '#F59E0B' }}
              thumbColor="#F5F5F7"
            />
          </View>
        </Card>

        {/* About Section */}
        <Card variant="default" padding="md" className="mb-4">
          <Pressable className="py-2">
            <Text className="text-text-primary">About Dialectica</Text>
          </Pressable>
          <View className="h-px bg-bg-tertiary my-2" />
          <Pressable className="py-2">
            <Text className="text-text-primary">Privacy Policy</Text>
          </Pressable>
          <View className="h-px bg-bg-tertiary my-2" />
          <Pressable className="py-2">
            <Text className="text-text-primary">Terms of Service</Text>
          </Pressable>
        </Card>

        {/* Sign Out */}
        <Button onPress={handleSignOut} variant="danger" fullWidth size="lg">
          Sign Out
        </Button>

        <Text className="text-text-muted text-xs text-center mt-6">
          Dialectica v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
