/**
 * Admin Settings Screen
 *
 * App-wide configuration settings.
 */

import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import {
  Save,
  Zap,
  AlertTriangle,
  Bot,
  ChevronDown,
  RefreshCw,
  RotateCcw,
  Palette,
  ImageIcon,
  Target,
  Maximize,
  Crosshair,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAdminStatsStore } from '../../stores/adminStatsStore';
import { useAdminPersonaStore } from '../../stores/adminPersonaStore';
import { useAuthStore } from '../../stores/authStore';
import { AppSettingsMap } from '../../types/admin';
import { supabase } from '../../lib/supabase';

// Simplified AI model for the dropdown
interface AIModelOption {
  id: string;
  name: string;
  context_window: number | null;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'K';
  }
  return num.toString();
}

interface SelectInputProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
  icon?: React.ReactNode;
}

function SelectInput({ label, value, options, onValueChange, icon }: SelectInputProps) {
  const [showOptions, setShowOptions] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{label}</Text>
      </View>
      <Pressable
        onPress={() => setShowOptions(!showOptions)}
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 15 }}>
          {selectedOption?.label || value || 'Select...'}
        </Text>
        <ChevronDown size={18} color="rgba(255,255,255,0.5)" />
      </Pressable>

      {showOptions && (
        <View
          style={{
            marginTop: 8,
            backgroundColor: '#1A1A1F',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onValueChange(option.value);
                setShowOptions(false);
              }}
              style={{
                padding: 14,
                backgroundColor:
                  option.value === value ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255,255,255,0.05)',
              }}
            >
              <Text
                style={{
                  color: option.value === value ? '#F59E0B' : '#fff',
                  fontSize: 15,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function RefreshChallengesButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('chat', {
        body: { generateChallengeBatch: true, refreshChallengeBatch: true },
      });
      if (error) throw error;
      Alert.alert('Success', 'Daily challenges have been refreshed.');
    } catch (err) {
      Alert.alert('Error', 'Failed to refresh challenges. Please try again.');
      console.error('Refresh challenges error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Pressable
      onPress={handleRefresh}
      disabled={isRefreshing}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        marginTop: 8,
      }}
    >
      <Target size={18} color="#60a5fa" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>
          Refresh Today's Challenges
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          Regenerate all 10 daily challenges
        </Text>
      </View>
      {isRefreshing ? (
        <ActivityIndicator size="small" color="#60a5fa" />
      ) : (
        <RefreshCw size={18} color="#60a5fa" />
      )}
    </Pressable>
  );
}

export default function AdminSettingsScreen() {
  const {
    settings,
    isLoadingSettings,
    isSavingSettings,
    fetchSettings,
    updateSetting,
  } = useAdminStatsStore();

  const { personas, fetchPersonas } = useAdminPersonaStore();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localSettings, setLocalSettings] = useState<Partial<AppSettingsMap>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showCustomModelInput, setShowCustomModelInput] = useState(false);
  const [customModelValue, setCustomModelValue] = useState('');
  const [aiModels, setAiModels] = useState<AIModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  // Fetch AI models from database
  const fetchModels = async () => {
    setIsLoadingModels(true);
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('id, name, context_window, active')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setAiModels(data || []);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Refresh models from Groq API
  const refreshModelsFromAPI = async () => {
    setIsRefreshingModels(true);
    try {
      const { data, error } = await supabase.functions.invoke('models', {
        body: { action: 'refresh' },
      });

      if (error) throw error;

      Alert.alert('Success', `Refreshed ${data.count} models from Groq API`);
      await fetchModels();
    } catch (error) {
      console.error('Failed to refresh models:', error);
      Alert.alert('Error', 'Failed to refresh models from Groq API');
    } finally {
      setIsRefreshingModels(false);
    }
  };

  // Reset onboarding state for current user
  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will clear splash, carousel, and onboarding completion state. The app will reload to start onboarding from the beginning.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResettingOnboarding(true);
            try {
              // Clear AsyncStorage flags
              await AsyncStorage.multiRemove([
                '@dialectica/hasSeenSplash',
                '@dialectica/hasSeenOnboarding',
              ]);

              // Reset database flag
              if (profile?.id) {
                await supabase
                  .from('user_profiles')
                  .update({ onboarding_completed: false })
                  .eq('id', profile.id);
              }

              // Sign out so user must re-authenticate after onboarding
              await signOut();

              // Navigate to root to re-trigger onboarding checks
              router.replace('/');
            } catch (error) {
              console.error('Failed to reset onboarding:', error);
              Alert.alert('Error', 'Failed to reset onboarding. Try restarting the app manually.');
            } finally {
              setIsResettingOnboarding(false);
            }
          },
        },
      ]
    );
  };

  // Build model options from database
  const modelOptions = [
    ...aiModels.map(m => ({
      value: m.id,
      label: `${m.name}${m.context_window ? ` (${Math.round(m.context_window / 1000)}K)` : ''}`,
    })),
    { value: 'custom', label: '+ Custom Model...' },
  ];

  useEffect(() => {
    fetchSettings();
    fetchPersonas();
    fetchModels();
  }, [fetchSettings, fetchPersonas]);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
    // Check if current model is not in the model list
    const currentModel = settings.default_model;
    const isKnownModel = aiModels.some(m => m.id === currentModel);
    if (currentModel && !isKnownModel && aiModels.length > 0) {
      setShowCustomModelInput(true);
      setCustomModelValue(currentModel);
    }
  }, [settings, aiModels]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSettings();
    setRefreshing(false);
  };

  const updateLocal = <K extends keyof AppSettingsMap>(key: K, value: AppSettingsMap[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const updates = Object.keys(localSettings).filter(
      (key) => localSettings[key as keyof AppSettingsMap] !== settings[key as keyof AppSettingsMap]
    );

    for (const key of updates) {
      const { error } = await updateSetting(
        key as keyof AppSettingsMap,
        localSettings[key as keyof AppSettingsMap] as AppSettingsMap[keyof AppSettingsMap]
      );
      if (error) {
        Alert.alert('Error', `Failed to update ${key}: ${error.message}`);
        return;
      }
    }

    setHasChanges(false);
    Alert.alert('Success', 'Settings saved successfully');
  };

  const personaOptions = [
    { value: 'null', label: 'None' },
    ...personas.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F59E0B"
          />
        }
      >
        {isLoadingSettings ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : (
          <>
            {/* Dev Tools */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 1,
                marginBottom: 16,
              }}
            >
              DEV TOOLS
            </Text>

            <View
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 24,
                borderWidth: 1,
                borderColor: 'rgba(168, 85, 247, 0.2)',
              }}
            >
              <LinearGradient
                colors={['rgba(168, 85, 247, 0.08)', 'rgba(30, 30, 40, 0.9)']}
                style={{ padding: 16 }}
              >
                <Pressable
                  onPress={handleResetOnboarding}
                  disabled={isResettingOnboarding}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(168, 85, 247, 0.2)',
                    opacity: isResettingOnboarding ? 0.5 : 1,
                  }}
                >
                  {isResettingOnboarding ? (
                    <ActivityIndicator size="small" color="#a855f7" />
                  ) : (
                    <RotateCcw size={18} color="#a855f7" />
                  )}
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>
                      Reset Onboarding
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                      Clear splash, carousel & profile state. App will reload.
                    </Text>
                  </View>
                </Pressable>
              </LinearGradient>
            </View>

            {/* AI Settings */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 1,
                }}
              >
                AI SETTINGS
              </Text>
              <Pressable
                onPress={refreshModelsFromAPI}
                disabled={isRefreshingModels}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: 'rgba(96, 165, 250, 0.15)',
                  opacity: isRefreshingModels ? 0.5 : 1,
                }}
              >
                {isRefreshingModels ? (
                  <ActivityIndicator size="small" color="#60a5fa" />
                ) : (
                  <RefreshCw size={14} color="#60a5fa" />
                )}
                <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '500', marginLeft: 6 }}>
                  Scan Models
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 24,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <LinearGradient
                colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
                style={{ padding: 16 }}
              >
                {isLoadingModels ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#F59E0B" />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, fontSize: 13 }}>
                      Loading models...
                    </Text>
                  </View>
                ) : (
                  <>
                    <SelectInput
                      label="Default AI Model"
                      value={showCustomModelInput ? 'custom' : (localSettings.default_model || '')}
                      options={modelOptions}
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setShowCustomModelInput(true);
                          setCustomModelValue(localSettings.default_model || '');
                        } else {
                          setShowCustomModelInput(false);
                          updateLocal('default_model', value);
                        }
                      }}
                      icon={<Bot size={16} color="#F59E0B" />}
                    />

                    {showCustomModelInput && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 }}>
                          Custom Model ID (from Groq)
                        </Text>
                        <TextInput
                          value={customModelValue}
                          onChangeText={(text) => {
                            setCustomModelValue(text);
                            updateLocal('default_model', text);
                          }}
                          placeholder="e.g., llama-3.3-70b-versatile"
                          placeholderTextColor="rgba(255,255,255,0.3)"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 12,
                            padding: 14,
                            color: '#fff',
                            fontSize: 15,
                          }}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    )}
                  </>
                )}

                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Zap size={16} color="#60a5fa" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginLeft: 8 }}>
                      Max Tokens per Request
                    </Text>
                    <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600', marginLeft: 'auto' }}>
                      {localSettings.max_tokens_per_request || 1024}
                    </Text>
                  </View>
                  <Slider
                    value={localSettings.max_tokens_per_request || 1024}
                    onValueChange={(value) => updateLocal('max_tokens_per_request', Math.round(value))}
                    minimumValue={256}
                    maximumValue={4096}
                    step={128}
                    minimumTrackTintColor="#60a5fa"
                    maximumTrackTintColor="rgba(255,255,255,0.1)"
                    thumbTintColor="#60a5fa"
                  />
                </View>
              </LinearGradient>
            </View>

            {/* Token Limits */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 1,
                marginBottom: 16,
              }}
            >
              DAILY TOKEN LIMITS
            </Text>

            <View
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 24,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <LinearGradient
                colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
                style={{ padding: 16 }}
              >
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                      Free Users
                    </Text>
                    <Text style={{ color: '#4ade80', fontSize: 14, fontWeight: '600' }}>
                      {formatNumber(localSettings.daily_token_limit_free || 50000)}
                    </Text>
                  </View>
                  <Slider
                    value={localSettings.daily_token_limit_free || 50000}
                    onValueChange={(value) => updateLocal('daily_token_limit_free', Math.round(value))}
                    minimumValue={10000}
                    maximumValue={200000}
                    step={10000}
                    minimumTrackTintColor="#4ade80"
                    maximumTrackTintColor="rgba(255,255,255,0.1)"
                    thumbTintColor="#4ade80"
                  />
                </View>

                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                      Premium Users
                    </Text>
                    <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '600' }}>
                      {formatNumber(localSettings.daily_token_limit_premium || 500000)}
                    </Text>
                  </View>
                  <Slider
                    value={localSettings.daily_token_limit_premium || 500000}
                    onValueChange={(value) => updateLocal('daily_token_limit_premium', Math.round(value))}
                    minimumValue={100000}
                    maximumValue={2000000}
                    step={50000}
                    minimumTrackTintColor="#fbbf24"
                    maximumTrackTintColor="rgba(255,255,255,0.1)"
                    thumbTintColor="#fbbf24"
                  />
                </View>
              </LinearGradient>
            </View>

            {/* App Features */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 1,
                marginBottom: 16,
              }}
            >
              APP FEATURES
            </Text>

            <View
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 24,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <LinearGradient
                colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
                style={{ padding: 16 }}
              >
                <SelectInput
                  label="Featured Persona"
                  value={localSettings.featured_persona_id || 'null'}
                  options={personaOptions}
                  onValueChange={(value) => updateLocal('featured_persona_id', value === 'null' ? null : value)}
                  icon={<Bot size={16} color="#c084fc" />}
                />

                {/* Unified Card Gradient */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.05)',
                    marginTop: 8,
                  }}
                >
                  <Palette size={18} color="#c084fc" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>
                      Unified Card Gradient
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                      Black gradient on all persona cards
                    </Text>
                  </View>
                  <Switch
                    value={localSettings.unified_card_gradient || false}
                    onValueChange={(value) => updateLocal('unified_card_gradient', value)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(192, 132, 252, 0.5)' }}
                    thumbColor={localSettings.unified_card_gradient ? '#c084fc' : 'rgba(255,255,255,0.5)'}
                    ios_backgroundColor="rgba(255,255,255,0.1)"
                  />
                </View>

                {/* Fullscreen Card Mode */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.05)',
                    marginTop: 8,
                  }}
                >
                  <Maximize size={18} color="#2dd4bf" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>
                      Fullscreen Card Mode
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                      One card at a time with snap scrolling
                    </Text>
                  </View>
                  <Switch
                    value={localSettings.fullscreen_card_mode || false}
                    onValueChange={(value) => updateLocal('fullscreen_card_mode', value)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(45, 212, 191, 0.5)' }}
                    thumbColor={localSettings.fullscreen_card_mode ? '#2dd4bf' : 'rgba(255,255,255,0.5)'}
                    ios_backgroundColor="rgba(255,255,255,0.1)"
                  />
                </View>

                {/* Focus Mode Chat */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.05)',
                    marginTop: 8,
                  }}
                >
                  <Crosshair size={18} color="#f59e0b" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>
                      Focus Mode Chat
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                      Show only the latest exchange in conversations
                    </Text>
                  </View>
                  <Switch
                    value={localSettings.focus_mode_chat || false}
                    onValueChange={(value) => updateLocal('focus_mode_chat', value)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(245, 158, 11, 0.5)' }}
                    thumbColor={localSettings.focus_mode_chat ? '#f59e0b' : 'rgba(255,255,255,0.5)'}
                    ios_backgroundColor="rgba(255,255,255,0.1)"
                  />
                </View>

                {/* Maintenance Mode */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.05)',
                    marginTop: 8,
                  }}
                >
                  <AlertTriangle size={18} color="#ef4444" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>
                      Maintenance Mode
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                      Block new conversations
                    </Text>
                  </View>
                  <Switch
                    value={localSettings.maintenance_mode || false}
                    onValueChange={(value) => updateLocal('maintenance_mode', value)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(239, 68, 68, 0.5)' }}
                    thumbColor={localSettings.maintenance_mode ? '#ef4444' : 'rgba(255,255,255,0.5)'}
                    ios_backgroundColor="rgba(255,255,255,0.1)"
                  />
                </View>

                {/* Show Expert Photo on Challenges */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(255,255,255,0.05)',
                    marginTop: 8,
                  }}
                >
                  <ImageIcon size={18} color="#60a5fa" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>
                      Show Expert Photo on Challenges
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                      Display persona avatar on challenge cards
                    </Text>
                  </View>
                  <Switch
                    value={localSettings.challenge_show_persona_image || false}
                    onValueChange={(value) => updateLocal('challenge_show_persona_image', value)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(96, 165, 250, 0.5)' }}
                    thumbColor={localSettings.challenge_show_persona_image ? '#60a5fa' : 'rgba(255,255,255,0.5)'}
                    ios_backgroundColor="rgba(255,255,255,0.1)"
                  />
                </View>

                {/* Refresh Daily Challenges */}
                <RefreshChallengesButton />
              </LinearGradient>
            </View>

            {/* Save Button */}
            {hasChanges && (
              <Pressable
                onPress={handleSave}
                disabled={isSavingSettings}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                  marginBottom: 24,
                  opacity: isSavingSettings ? 0.5 : 1,
                }}
              >
                {isSavingSettings ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <>
                    <Save size={20} color="#F59E0B" />
                    <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                      Save Changes
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
