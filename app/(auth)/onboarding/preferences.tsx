import { useState } from 'react';
import { View, Text, Switch, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import {
  Zap,
  Volume2,
  Bell,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Settings,
} from 'lucide-react-native';
import { useAuthStore } from '../../../stores/authStore';

export default function PreferencesScreen() {
  const { updatePreferences, updateProfile, isLoading } = useAuthStore();

  const [intensity, setIntensity] = useState(5);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [dailyNotifications, setDailyNotifications] = useState(true);

  const intensityLabels = ['Gentle', 'Moderate', 'Challenging', 'Intense'];
  const intensityLabel = intensityLabels[Math.min(Math.floor((intensity - 1) / 2.5), 3)];
  const intensityColor =
    intensity <= 3 ? '#4ade80' : intensity <= 6 ? '#fbbf24' : '#f472b6';

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
    <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(74, 222, 128, 0.08)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40%',
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ padding: 20, paddingBottom: 16 }}>
          {/* Title section with inline back button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <ChevronLeft size={20} color="#F59E0B" />
            </Pressable>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(74, 222, 128, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Settings size={24} color="#4ade80" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
                Your Preferences
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 15,
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            Customize your experience. You can change these anytime in settings.
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Challenge Intensity Card */}
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <LinearGradient
              colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: `${intensityColor}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Zap size={22} color={intensityColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
                    Challenge Intensity
                  </Text>
                  <Text
                    style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}
                  >
                    How hard should challengers push you?
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: `${intensityColor}15`,
                    borderWidth: 1,
                    borderColor: `${intensityColor}40`,
                  }}
                >
                  <Text style={{ color: intensityColor, fontSize: 13, fontWeight: '700' }}>
                    {intensityLabel}
                  </Text>
                </View>
              </View>

              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Gentle</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Intense</Text>
              </View>

              <Slider
                value={intensity}
                onValueChange={setIntensity}
                minimumValue={1}
                maximumValue={10}
                step={1}
                minimumTrackTintColor={intensityColor}
                maximumTrackTintColor="rgba(255,255,255,0.1)"
                thumbTintColor={intensityColor}
              />
            </LinearGradient>
          </View>

          {/* Voice Responses Card */}
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <LinearGradient
              colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 20,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: 'rgba(96, 165, 250, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <Volume2 size={22} color="#60a5fa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
                  Voice Responses
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
                  Hear personas speak their responses
                </Text>
              </View>
              <Switch
                value={ttsEnabled}
                onValueChange={setTtsEnabled}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(96, 165, 250, 0.6)' }}
                thumbColor={ttsEnabled ? '#60a5fa' : 'rgba(255,255,255,0.5)'}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            </LinearGradient>
          </View>

          {/* Daily Challenge Card */}
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <LinearGradient
              colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 20,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: 'rgba(251, 191, 36, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <Bell size={22} color="#fbbf24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
                  Daily Challenge
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
                  Get notified about your daily thinking challenge
                </Text>
              </View>
              <Switch
                value={dailyNotifications}
                onValueChange={setDailyNotifications}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(251, 191, 36, 0.6)' }}
                thumbColor={dailyNotifications ? '#fbbf24' : 'rgba(255,255,255,0.5)'}
                ios_backgroundColor="rgba(255,255,255,0.1)"
              />
            </LinearGradient>
          </View>

          {/* Tip Card */}
          <View
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(74, 222, 128, 0.2)',
            }}
          >
            <LinearGradient
              colors={['rgba(74, 222, 128, 0.1)', 'rgba(74, 222, 128, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                padding: 16,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(74, 222, 128, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Lightbulb size={18} color="#4ade80" />
              </View>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                  flex: 1,
                  lineHeight: 20,
                }}
              >
                We recommend starting with moderate intensity and adjusting based on your comfort
                level as you grow.
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View
          style={{
            padding: 20,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
          }}
        >
          <Pressable onPress={handleComplete} disabled={isLoading}>
            <LinearGradient
              colors={['#4ade80', '#22c55e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 18,
                borderRadius: 16,
                shadowColor: '#4ade80',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
            >
              <Sparkles size={20} color="#0f0f12" />
              <Text
                style={{
                  color: '#0f0f12',
                  fontSize: 17,
                  fontWeight: '700',
                  marginLeft: 8,
                }}
              >
                Start Thinking Sharper
              </Text>
              <ChevronRight size={20} color="#0f0f12" style={{ marginLeft: 4 }} />
            </LinearGradient>
          </Pressable>

          <Text
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            You're all set! Let's begin your journey.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
