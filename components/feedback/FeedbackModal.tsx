import { useEffect } from 'react';
import { View, Text, Pressable, Modal, TextInput, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, X, Bug, Lightbulb, HelpCircle, CheckCircle, Send } from 'lucide-react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { useAuthStore } from '../../stores/authStore';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { key: 'bug' as const, label: 'Bug', icon: Bug, color: '#ef4444' },
  { key: 'suggestion' as const, label: 'Suggestion', icon: Lightbulb, color: '#60a5fa' },
  { key: 'other' as const, label: 'Other', icon: HelpCircle, color: '#9ca3af' },
];

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const {
    screenshotUri,
    category,
    message,
    currentRoute,
    isSubmitting,
    submitSuccess,
    setCategory,
    setMessage,
    submitFeedback,
    closeModal,
  } = useFeedbackStore();
  const { user } = useAuthStore();

  // Auto-close on success
  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => {
        closeModal();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess, closeModal]);

  const handleSubmit = async () => {
    if (!user?.id || !message.trim()) return;
    await submitFeedback(user.id);
  };

  const appVersion = Constants.expoConfig?.version ?? 'unknown';
  const deviceInfo = `${Device.modelName ?? 'Unknown'} (${Device.osName} ${Device.osVersion})`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            maxHeight: '85%',
            backgroundColor: '#1a1a1f',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
          }}
        >
          {submitSuccess ? (
            /* Success State */
            <View style={{ padding: 40, alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(74, 222, 128, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <CheckCircle size={32} color="#4ade80" />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
                Thanks!
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                Your feedback helps us improve Dialectica.
              </Text>
            </View>
          ) : (
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 20,
                  paddingBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Camera size={18} color="#F59E0B" />
                  </View>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                    Report Feedback
                  </Text>
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <X size={22} color="rgba(255,255,255,0.5)" />
                </Pressable>
              </View>

              {/* Screenshot preview */}
              {screenshotUri && (
                <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                  <Image
                    source={{ uri: screenshotUri }}
                    style={{
                      width: '100%',
                      height: 160,
                      borderRadius: 12,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Category selector */}
              <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                  CATEGORY
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {CATEGORIES.map(({ key, label, icon: Icon, color }) => {
                    const isSelected = category === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setCategory(key)}
                        style={{ flex: 1 }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 10,
                            borderRadius: 10,
                            gap: 6,
                            backgroundColor: isSelected
                              ? `${color}20`
                              : 'rgba(255,255,255,0.05)',
                            borderWidth: 1.5,
                            borderColor: isSelected ? color : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          <Icon size={14} color={isSelected ? color : 'rgba(255,255,255,0.4)'} />
                          <Text
                            style={{
                              color: isSelected ? color : 'rgba(255,255,255,0.4)',
                              fontSize: 13,
                              fontWeight: '600',
                            }}
                          >
                            {label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Message input */}
              <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                  DESCRIPTION
                </Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Describe the issue or suggestion..."
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: 14,
                    color: '#fff',
                    fontSize: 15,
                    minHeight: 100,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                />
              </View>

              {/* Context metadata */}
              <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, lineHeight: 16 }}>
                  {currentRoute ? `Route: ${currentRoute}\n` : ''}
                  {`Version: ${appVersion} | ${deviceInfo}`}
                </Text>
              </View>

              {/* Submit button */}
              <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
                <Pressable
                  onPress={handleSubmit}
                  disabled={isSubmitting || !message.trim()}
                  style={{ opacity: isSubmitting || !message.trim() ? 0.5 : 1 }}
                >
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 16,
                      borderRadius: 14,
                      gap: 8,
                    }}
                  >
                    <Send size={16} color="#0f0f12" />
                    <Text style={{ color: '#0f0f12', fontSize: 16, fontWeight: '600' }}>
                      {isSubmitting ? 'Sending...' : 'Send Feedback'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
