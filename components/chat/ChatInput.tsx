import { View, TextInput, Pressable, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Share your thoughts...',
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View className="flex-row items-end p-4 bg-bg-secondary border-t border-bg-tertiary">
        <View className="flex-1 bg-bg-tertiary rounded-2xl px-4 py-2 mr-3">
          <TextInput
            ref={inputRef}
            value={message}
            onChangeText={setMessage}
            placeholder={placeholder}
            placeholderTextColor="#6E6E73"
            multiline
            maxLength={2000}
            editable={!disabled}
            className="text-text-primary text-base max-h-32"
            style={{ minHeight: 24 }}
          />
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          className={`
            w-10 h-10 rounded-full items-center justify-center
            ${canSend ? 'bg-accent-primary' : 'bg-bg-tertiary'}
          `}
        >
          <Text className={`text-lg ${canSend ? 'text-bg-primary' : 'text-text-muted'}`}>
            ↑
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
