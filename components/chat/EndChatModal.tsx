import { View, Text, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquareOff, ArrowRight, Users, MessageCircle } from 'lucide-react-native';

interface EndChatModalProps {
  visible: boolean;
  onContinue: () => void;
  onViewReport: () => void;
  onChooseNewChallenger: () => void;
  isGenerating?: boolean;
}

/**
 * Modal for ending a chat session with 3 options:
 * 1. View Report (primary) - generates report and navigates to report screen
 * 2. End & Choose New Challenger (secondary) - ends and goes to personas
 * 3. Continue Chatting (tertiary) - dismisses modal
 */
export function EndChatModal({
  visible,
  onContinue,
  onViewReport,
  onChooseNewChallenger,
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
              End Session
            </Text>

            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              What would you like to do?
            </Text>
          </View>

          {/* Buttons - Vertical Stack */}
          <View style={{ padding: 24, gap: 12 }}>
            {/* Option 1: View Report (Primary) */}
            <Pressable
              onPress={onViewReport}
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
                  {isGenerating ? 'Generating Report...' : 'View Report'}
                </Text>
                {!isGenerating && <ArrowRight size={18} color="#0f0f12" />}
              </LinearGradient>
            </Pressable>

            {/* Option 2: End & Choose New Challenger (Secondary) */}
            <Pressable
              onPress={onChooseNewChallenger}
              disabled={isGenerating}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                gap: 8,
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              <Users size={18} color="#fff" />
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: '500',
                }}
              >
                End & Choose New Challenger
              </Text>
            </Pressable>

            {/* Option 3: Continue Chatting (Tertiary) */}
            <Pressable
              onPress={onContinue}
              disabled={isGenerating}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 16,
                borderRadius: 14,
                backgroundColor: 'transparent',
                gap: 8,
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              <MessageCircle size={18} color="rgba(255, 255, 255, 0.6)" />
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: 16,
                  fontWeight: '500',
                }}
              >
                Continue Chatting
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
