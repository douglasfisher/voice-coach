import { View, TextInput, Pressable, Text } from 'react-native';
import { useState, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Sparkles } from 'lucide-react-native';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  accentColor?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Share your thoughts...',
  accentColor = '#F59E0B',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    if (!message.trim() || disabled) return;
    onSend(message.trim());
    setMessage('');
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 20,
        backgroundColor: 'rgba(10, 10, 15, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Input container */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
        }}
      >
        {/* Text input with gradient border */}
        <View
          style={{
            flex: 1,
            marginRight: 12,
            borderRadius: 24,
            padding: 1,
            backgroundColor: canSend ? accentColor : 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <View
            style={{
              backgroundColor: '#1a1a1f',
              borderRadius: 23,
              paddingHorizontal: 18,
              paddingVertical: 12,
            }}
          >
            <TextInput
              ref={inputRef}
              value={message}
              onChangeText={setMessage}
              placeholder={placeholder}
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              multiline
              maxLength={2000}
              editable={!disabled}
              style={{
                color: '#fff',
                fontSize: 16,
                lineHeight: 22,
                maxHeight: 120,
                minHeight: 24,
              }}
            />
          </View>
        </View>

        {/* Send button */}
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={{
            marginBottom: 2,
          }}
        >
          {canSend ? (
            <LinearGradient
              colors={[accentColor, darkenColor(accentColor)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: accentColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              }}
            >
              <Send size={20} color="#0f0f12" style={{ marginLeft: -2, marginTop: -2 }} />
            </LinearGradient>
          ) : (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Sparkles size={20} color="rgba(255, 255, 255, 0.3)" />
            </View>
          )}
        </Pressable>
      </View>

      {/* Character count when typing */}
      {message.length > 100 && (
        <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: 11,
              color: message.length > 1800 ? '#ef4444' : 'rgba(255, 255, 255, 0.3)',
            }}
          >
            {message.length}/2000
          </Text>
        </View>
      )}
    </View>
  );
}

// Helper to darken a hex color
function darkenColor(hex: string, amount: number = 0.15): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
