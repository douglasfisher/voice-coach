import { useState } from 'react';
import { View, Text, Switch, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Lightbulb } from 'lucide-react-native';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

export default function PreferencesScreen() {
  const { updatePreferences, updateProfile, isLoading } = useAuthStore();

  const [intensity, setIntensity] = useState(5);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [dailyNotifications, setDailyNotifications] = useState(true);

  const intensityLabels = ['Gentle', 'Moderate', 'Challenging', 'Intense'];
  const intensityLabel = intensityLabels[Math.min(Math.floor((intensity - 1) / 2.5), 3)];

  const handleComplete = async () => {
    await updatePreferences({
      preferred_challenge_intensity: intensity,
      tts_enabled: ttsEnabled,
      notification_daily_challenge: dailyNotifications,
    });

    await updateProfile({
      onboarding_completed: true,
    });

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        <Text className="text-text-primary text-2xl font-bold">
          Your Preferences
        </Text>
        <Text className="text-text-secondary mt-2 mb-6">
          Customize your experience. You can change these anytime in settings.
        </Text>

        <Card variant="elevated" padding="lg" className="mb-4">
          <Text className="text-text-primary font-semibold mb-2">
            Challenge Intensity
          </Text>
          <Text className="text-text-muted text-sm mb-4">
            How hard should your challengers push you?
          </Text>

          <View className="flex-row justify-between mb-2">
            <Text className="text-text-muted">Gentle</Text>
            <Text className="text-accent-primary font-semibold">{intensityLabel}</Text>
            <Text className="text-text-muted">Intense</Text>
          </View>

          <Slider
            value={intensity}
            onValueChange={setIntensity}
            minimumValue={1}
            maximumValue={10}
            step={1}
            minimumTrackTintColor="#F59E0B"
            maximumTrackTintColor="#252529"
            thumbTintColor="#F59E0B"
          />
        </Card>

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
              onValueChange={setTtsEnabled}
              trackColor={{ false: '#252529', true: '#F59E0B' }}
              thumbColor="#F5F5F7"
            />
          </View>
        </Card>

        <Card variant="elevated" padding="lg" className="mb-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-text-primary font-semibold">Daily Challenge</Text>
              <Text className="text-text-muted text-sm mt-1">
                Get notified about your daily thinking challenge
              </Text>
            </View>
            <Switch
              value={dailyNotifications}
              onValueChange={setDailyNotifications}
              trackColor={{ false: '#252529', true: '#F59E0B' }}
              thumbColor="#F5F5F7"
            />
          </View>
        </Card>

        <View className="bg-bg-secondary rounded-2xl p-4 mt-4 flex-row items-center">
          <Lightbulb size={20} color="#F59E0B" />
          <Text className="text-text-secondary text-sm flex-1 ml-3">
            We recommend starting with moderate intensity and adjusting based
            on your comfort level.
          </Text>
        </View>
      </ScrollView>

      <View className="p-6 border-t border-bg-tertiary">
        <Button
          onPress={handleComplete}
          size="lg"
          fullWidth
          loading={isLoading}
        >
          Start Thinking Sharper
        </Button>
      </View>
    </SafeAreaView>
  );
}
