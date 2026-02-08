import { View, Text, ScrollView, Switch, Pressable, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Settings,
  Volume2,
  Mic,
  Bell,
  Zap,
  Info,
  Shield,
  FileText,
  LogOut,
  ChevronRight,
  Award,
  MessageSquare,
  Heart,
  LayoutDashboard,
  Maximize2,
} from 'lucide-react-native';
import { requestSTTPermission, getSTTPermissionStatus, checkSTTAvailability, isSTTModuleAvailable } from '../../lib/stt';
import { useAuthStore } from '../../stores/authStore';

export default function ProfileScreen() {
  const { profile, preferences, user, signOut, updatePreferences, updateProfile: _updateProfile } =
    useAuthStore();

  const [intensity, setIntensity] = useState(
    preferences?.preferred_challenge_intensity ?? 5
  );
  const [ttsEnabled, setTtsEnabled] = useState(preferences?.tts_enabled ?? true);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(
    preferences?.voice_input_enabled ?? false
  );
  const [voiceInputAvailable, setVoiceInputAvailable] = useState(false);
  const [notifications, setNotifications] = useState(
    preferences?.notification_daily_challenge ?? true
  );
  const [immersiveChatEnabled, setImmersiveChatEnabled] = useState(
    preferences?.immersive_chat_enabled ?? true
  );
  const [userGender, setUserGender] = useState<string | null>(
    preferences?.user_gender ?? null
  );
  const [interestedIn, setInterestedIn] = useState<string | null>(
    preferences?.interested_in ?? null
  );

  // Sync local state when preferences load/change from the store
  useEffect(() => {
    if (preferences) {
      setIntensity(preferences.preferred_challenge_intensity ?? 5);
      setTtsEnabled(preferences.tts_enabled ?? true);
      setVoiceInputEnabled(preferences.voice_input_enabled ?? false);
      setNotifications(preferences.notification_daily_challenge ?? true);
      setImmersiveChatEnabled(preferences.immersive_chat_enabled ?? true);
      setUserGender(preferences.user_gender ?? null);
      setInterestedIn(preferences.interested_in ?? null);
    }
  }, [preferences]);

  // Check if voice input is available and has permission on mount
  useEffect(() => {
    const checkVoiceInputStatus = async () => {
      // First check if native module is even loaded (sync check)
      if (!isSTTModuleAvailable()) {
        setVoiceInputAvailable(false);
        return;
      }

      // Then check if speech recognition is available on this device
      const available = await checkSTTAvailability();
      setVoiceInputAvailable(available);

      // If voice input is enabled in preferences but we don't have permission,
      // disable it to prevent issues
      if (available && preferences?.voice_input_enabled) {
        const hasPermission = await getSTTPermissionStatus();
        if (!hasPermission) {
          setVoiceInputEnabled(false);
          // Silently update preferences to reflect reality
          updatePreferences({ voice_input_enabled: false });
        }
      }
    };

    checkVoiceInputStatus();
  }, [preferences?.voice_input_enabled, updatePreferences]);

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

  const toggleVoiceInput = async (value: boolean) => {
    if (value) {
      // Request permission when enabling
      const hasPermission = await getSTTPermissionStatus();
      if (!hasPermission) {
        const granted = await requestSTTPermission();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Microphone access is required for voice input. Please enable it in your device settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      }
    }
    setVoiceInputEnabled(value);
    await updatePreferences({ voice_input_enabled: value });
  };

  const toggleNotifications = async (value: boolean) => {
    setNotifications(value);
    await updatePreferences({ notification_daily_challenge: value });
  };

  const toggleImmersiveChat = async (value: boolean) => {
    setImmersiveChatEnabled(value);
    await updatePreferences({ immersive_chat_enabled: value });
  };

  const selectUserGender = async (value: string | null) => {
    setUserGender(value);
    await updatePreferences({ user_gender: value });
  };

  const selectInterestedIn = async (value: string | null) => {
    setInterestedIn(value);
    await updatePreferences({ interested_in: value });
  };

  const intensityLabels = ['Gentle', 'Moderate', 'Challenging', 'Intense'];
  const intensityLabel = intensityLabels[Math.min(Math.floor((intensity - 1) / 2.5), 3)];
  const intensityColor =
    intensity <= 3 ? '#4ade80' : intensity <= 6 ? '#fbbf24' : '#f472b6';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 8, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Settings size={24} color="#F59E0B" />
          </View>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>
            Settings
          </Text>
        </View>

        {/* Profile Card */}
        <View
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
          }}
        >
          <LinearGradient
            colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 20 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Avatar */}
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: '#F59E0B',
                  marginRight: 16,
                }}
              >
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={{ width: 66, height: 66, borderRadius: 33 }}
                  />
                ) : (
                  <User size={32} color="#F59E0B" />
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
                  {profile?.display_name ?? 'Anonymous Thinker'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 2 }}>
                  {user?.email}
                </Text>

                {/* Stats badges */}
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      backgroundColor: 'rgba(192, 132, 252, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(192, 132, 252, 0.3)',
                    }}
                  >
                    <Award size={14} color="#c084fc" />
                    <Text style={{ color: '#c084fc', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                      Level {profile?.current_level ?? 1}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 12,
                      backgroundColor: 'rgba(96, 165, 250, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(96, 165, 250, 0.3)',
                    }}
                  >
                    <MessageSquare size={14} color="#60a5fa" />
                    <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                      {profile?.total_sessions ?? 0} sessions
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Admin Section - Only show for admins */}
        {profile?.is_admin && (
          <>
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 1,
                marginBottom: 12,
                marginLeft: 4,
              }}
            >
              ADMIN
            </Text>

            <Pressable
              onPress={() => router.push('/admin')}
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 20,
                borderWidth: 1,
                borderColor: 'rgba(245, 158, 11, 0.3)',
              }}
            >
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 18,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <LayoutDashboard size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    Admin Panel
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
                    Manage personas, users & settings
                  </Text>
                </View>
                <ChevronRight size={20} color="#F59E0B" />
              </LinearGradient>
            </Pressable>
          </>
        )}

        {/* Preferences Section */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 12,
            marginLeft: 4,
          }}
        >
          PREFERENCES
        </Text>

        {/* Challenge Intensity */}
        <View
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <LinearGradient
            colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 18 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${intensityColor}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Zap size={20} color={intensityColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  Challenge Intensity
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
                  How hard should personas push you?
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

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Gentle</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Intense</Text>
            </View>

            <Slider
              value={intensity}
              onValueChange={setIntensity}
              onSlidingComplete={saveIntensity}
              minimumValue={1}
              maximumValue={10}
              step={1}
              minimumTrackTintColor={intensityColor}
              maximumTrackTintColor="rgba(255,255,255,0.1)"
              thumbTintColor={intensityColor}
            />
          </LinearGradient>
        </View>

        {/* Voice Settings */}
        <SettingToggle
          icon={Volume2}
          iconColor="#60a5fa"
          title="Voice Responses"
          description="Hear personas speak their responses"
          value={ttsEnabled}
          onValueChange={toggleTTS}
        />

        {/* Voice Input */}
        {voiceInputAvailable && (
          <SettingToggle
            icon={Mic}
            iconColor="#f472b6"
            title="Voice Input"
            description="Use push-to-talk for voice messages"
            value={voiceInputEnabled}
            onValueChange={toggleVoiceInput}
          />
        )}

        {/* Notifications */}
        <SettingToggle
          icon={Bell}
          iconColor="#fbbf24"
          title="Daily Challenge"
          description="Remind me about daily challenges"
          value={notifications}
          onValueChange={toggleNotifications}
        />

        {/* Immersive Chat Mode */}
        <SettingToggle
          icon={Maximize2}
          iconColor="#2dd4bf"
          title="Immersive Chat Mode"
          description="Show chat messages overlaid on persona image"
          value={immersiveChatEnabled}
          onValueChange={toggleImmersiveChat}
        />

        {/* Dating Preferences */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginTop: 8,
            marginBottom: 12,
            marginLeft: 4,
          }}
        >
          DATING SCENARIOS
        </Text>

        <View
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <LinearGradient
            colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 18 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: 'rgba(244, 114, 182, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Heart size={20} color="#f472b6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  Dating Preferences
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
                  Personalize your dating scenarios
                </Text>
              </View>
            </View>

            {/* I am */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              I am
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {(['male', 'female'] as const).map((g) => (
                <Pressable
                  key={g}
                  onPress={() => selectUserGender(userGender === g ? null : g)}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor:
                        userGender === g ? 'rgba(244, 114, 182, 0.2)' : 'rgba(255,255,255,0.05)',
                      borderWidth: 2,
                      borderColor:
                        userGender === g ? '#f472b6' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text
                      style={{
                        color: userGender === g ? '#f472b6' : 'rgba(255,255,255,0.5)',
                        fontSize: 15,
                        fontWeight: '600',
                      }}
                    >
                      {g === 'male' ? 'Male' : 'Female'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Interested in */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontWeight: '600',
                marginBottom: 8,
              }}
            >
              Interested in
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['men', 'women'] as const).map((i) => (
                <Pressable
                  key={i}
                  onPress={() => selectInterestedIn(interestedIn === i ? null : i)}
                  style={{ flex: 1 }}
                >
                  <View
                    style={{
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor:
                        interestedIn === i ? 'rgba(192, 132, 252, 0.2)' : 'rgba(255,255,255,0.05)',
                      borderWidth: 2,
                      borderColor:
                        interestedIn === i ? '#c084fc' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text
                      style={{
                        color: interestedIn === i ? '#c084fc' : 'rgba(255,255,255,0.5)',
                        fontSize: 15,
                        fontWeight: '600',
                      }}
                    >
                      {i === 'men' ? 'Men' : 'Women'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* About Section */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginTop: 8,
            marginBottom: 12,
            marginLeft: 4,
          }}
        >
          ABOUT
        </Text>

        <View
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <LinearGradient
            colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <SettingLink icon={Info} iconColor="#4ade80" title="About Dialectica" />
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 18 }} />
            <SettingLink icon={Shield} iconColor="#c084fc" title="Privacy Policy" />
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 18 }} />
            <SettingLink icon={FileText} iconColor="#60a5fa" title="Terms of Service" />
          </LinearGradient>
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            borderRadius: 16,
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <LogOut size={20} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
            Sign Out
          </Text>
        </Pressable>

        {/* Version */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: 12,
            textAlign: 'center',
            marginTop: 24,
            marginBottom: 20,
          }}
        >
          Dialectica v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingToggle({
  icon: Icon,
  iconColor,
  title,
  description,
  value,
  onValueChange,
}: {
  icon: typeof Volume2;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 12,
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
          padding: 18,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: `${iconColor}15`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Icon size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            {title}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
            {description}
          </Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: 'rgba(255,255,255,0.1)', true: `${iconColor}60` }}
          thumbColor={value ? iconColor : 'rgba(255,255,255,0.5)'}
          ios_backgroundColor="rgba(255,255,255,0.1)"
        />
      </LinearGradient>
    </View>
  );
}

function SettingLink({
  icon: Icon,
  iconColor,
  title,
  onPress,
}: {
  icon: typeof Info;
  iconColor: string;
  title: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${iconColor}15`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Icon size={18} color={iconColor} />
      </View>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500', flex: 1 }}>
        {title}
      </Text>
      <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
    </Pressable>
  );
}
