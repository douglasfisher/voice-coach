import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

interface SelectInputProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
}

export function SelectInput({ label, value, options, onValueChange }: SelectInputProps) {
  const [showOptions, setShowOptions] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>
        {label}
      </Text>
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
          {selectedOption?.label || 'Select...'}
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
