import { View, Text, Pressable, Modal } from 'react-native';
import { RotateCcw, X } from 'lucide-react-native';

interface ResetConfirmationModalProps {
  visible: boolean;
  onCancel: () => void;
  onReset: () => void;
  isResetting?: boolean;
}

/**
 * Modal for confirming conversation reset.
 * Shows destructive action with Cancel and Reset buttons.
 */
export function ResetConfirmationModal({
  visible,
  onCancel,
  onReset,
  isResetting = false,
}: ResetConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <RotateCcw size={28} color="#ef4444" />
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
              Reset Conversation?
            </Text>

            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              This will clear all messages and start fresh with a new question.
            </Text>
          </View>

          {/* Buttons */}
          <View
            style={{
              flexDirection: 'row',
              padding: 24,
              gap: 12,
            }}
          >
            {/* Cancel Button */}
            <Pressable
              onPress={onCancel}
              disabled={isResetting}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                gap: 6,
                opacity: isResetting ? 0.5 : 1,
              }}
            >
              <X size={18} color="rgba(255, 255, 255, 0.7)" />
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: 15,
                  fontWeight: '500',
                }}
              >
                Cancel
              </Text>
            </Pressable>

            {/* Reset Button */}
            <Pressable
              onPress={onReset}
              disabled={isResetting}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                borderRadius: 14,
                backgroundColor: '#ef4444',
                gap: 6,
                opacity: isResetting ? 0.7 : 1,
              }}
            >
              <RotateCcw size={18} color="#fff" />
              <Text
                style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                {isResetting ? 'Resetting...' : 'Reset'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
