import { TextInput, View, Text, TextInputProps } from 'react-native';
import { forwardRef } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, helper, className = '', ...props }, ref) => {
    return (
      <View className="w-full">
        {label && (
          <Text className="text-text-secondary text-sm mb-1.5 font-medium">{label}</Text>
        )}
        <TextInput
          ref={ref}
          className={`
            bg-bg-tertiary rounded-xl px-4 py-3
            text-text-primary text-base
            border ${error ? 'border-error' : 'border-transparent'}
            ${className}
          `}
          placeholderTextColor="#6E6E73"
          {...props}
        />
        {error && (
          <Text className="text-error text-sm mt-1">{error}</Text>
        )}
        {helper && !error && (
          <Text className="text-text-muted text-sm mt-1">{helper}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
