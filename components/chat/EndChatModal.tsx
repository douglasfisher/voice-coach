import { View, Text, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquareOff, ArrowRight, X } from 'lucide-react-native';

interface EndChatModalProps {
  visible: boolean;
  onContinue: () => void;
  onEnd: () => void;
  isGenerating?: boolean;
}

export function EndChatModal({
  visible,
  onContinue,
  onEnd,
  isGenerating = false,
}: EndChatModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 340,
            backgroundColor: '#1a1a1f',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View
            style={{
              alignItems: 'center',
              paddingTop: 32,
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <MessageSquareOff size={28} color="#F59E0B" />
            </View>

            <Text
              style={{
                color: '#fff',
                fontSize: 22,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              End this conversation?
            </Text>

            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              Your session will be analyzed and a report will be generated.
            </Text>
          </View>

          {/* Buttons */}
          <View style={{ padding: 24, gap: 12 }}>
            {/* End & View Report Button */}
            <Pressable
              onPress={onEnd}
              disabled={isGenerating}
              style={{ opacity: isGenerating ? 0.7 : 1 }}
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
                <Text
                  style={{
                    color: '#0f0f12',
                    fontSize: 16,
                    fontWeight: '600',
                  }}
                >
                  {isGenerating ? 'Generating Report...' : 'End & View Report'}
                </Text>
                {!isGenerating && <ArrowRight size={18} color="#0f0f12" />}
              </LinearGradient>
            </Pressable>

            {/* Continue Chat Button */}
            <Pressable
              onPress={onContinue}
              disabled={isGenerating}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                gap: 8,
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              <X size={18} color="rgba(255, 255, 255, 0.7)" />
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: 16,
                  fontWeight: '500',
                }}
              >
                Continue Chat
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
