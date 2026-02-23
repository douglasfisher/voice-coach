import { useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { IntakeQuestion } from '../../types/coaching';

interface IntakeOptionsPanelProps {
  intake: IntakeQuestion;
  intakeRound: number;
  onSubmit: (selectedLabels: string[], customText?: string) => void;
  disabled?: boolean;
  accentColor?: string;
  immersiveMode?: boolean;
}

export function IntakeOptionsPanel({
  intake,
  intakeRound: _intakeRound,
  onSubmit,
  disabled = false,
  accentColor = '#F59E0B',
  immersiveMode = false,
}: IntakeOptionsPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState('');

  const handleOptionPress = useCallback((optionId: string) => {
    if (disabled) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (intake.multiSelect) {
        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          next.add(optionId);
        }
      } else {
        // Radio behavior
        next.clear();
        next.add(optionId);
      }
      return next;
    });
    // Clear "something else" state when picking a regular option
    setShowCustomInput(false);
    setCustomText('');
  }, [disabled, intake.multiSelect]);

  const handleNonePress = useCallback(() => {
    if (disabled) return;
    // Immediately submit "None of these apply"
    onSubmit(['None of these apply']);
  }, [disabled, onSubmit]);

  const handleSomethingElsePress = useCallback(() => {
    if (disabled) return;
    setSelected(new Set());
    setShowCustomInput(true);
  }, [disabled]);

  const handleSubmit = useCallback(() => {
    if (disabled) return;

    if (showCustomInput && customText.trim()) {
      onSubmit([], customText.trim());
      return;
    }

    if (selected.size === 0) return;

    const selectedLabels = intake.options
      .filter((opt) => selected.has(opt.id))
      .map((opt) => opt.label);

    onSubmit(selectedLabels);
  }, [disabled, showCustomInput, customText, selected, intake.options, onSubmit]);

  const canSubmit = showCustomInput ? customText.trim().length > 0 : selected.size > 0;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 28,
        backgroundColor: immersiveMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(10, 10, 15, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        gap: 8,
      }}
    >
      {/* Options */}
      {intake.options.map((option) => {
        const isSelected = selected.has(option.id);
        return (
          <Pressable
            key={option.id}
            onPress={() => handleOptionPress(option.id)}
            disabled={disabled}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: isSelected
                ? `${accentColor}20`
                : 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: isSelected
                ? accentColor
                : 'rgba(255,255,255,0.12)',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {/* Radio / checkbox indicator */}
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: intake.multiSelect ? 4 : 10,
                borderWidth: 2,
                borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.3)',
                backgroundColor: isSelected ? accentColor : 'transparent',
                marginRight: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSelected && (
                <View
                  style={{
                    width: intake.multiSelect ? 10 : 8,
                    height: intake.multiSelect ? 10 : 8,
                    borderRadius: intake.multiSelect ? 2 : 4,
                    backgroundColor: intake.multiSelect ? '#0a0a0f' : '#0a0a0f',
                  }}
                />
              )}
            </View>
            <Text
              style={{
                flex: 1,
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.8)',
                fontSize: 15,
                fontWeight: isSelected ? '600' : '400',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}

      {/* Separator */}
      <View style={{ height: 4 }} />

      {/* None of these */}
      <Pressable
        onPress={handleNonePress}
        disabled={disabled}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 14,
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          None of these
        </Text>
      </Pressable>

      {/* Something else */}
      <Pressable
        onPress={handleSomethingElsePress}
        disabled={disabled}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 14,
          backgroundColor: showCustomInput
            ? `${accentColor}15`
            : 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: showCustomInput
            ? `${accentColor}60`
            : 'rgba(255,255,255,0.08)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            color: showCustomInput ? accentColor : 'rgba(255,255,255,0.5)',
            fontSize: 14,
          }}
        >
          Something else...
        </Text>
      </Pressable>

      {/* Custom text input (expanded) */}
      {showCustomInput && (
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            paddingHorizontal: 16,
            paddingVertical: 4,
          }}
        >
          <TextInput
            value={customText}
            onChangeText={setCustomText}
            placeholder="Tell me what's on your mind..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={{
              color: '#fff',
              fontSize: 15,
              paddingVertical: 12,
              minHeight: 44,
            }}
            multiline
            autoFocus
            editable={!disabled}
          />
        </View>
      )}

      {/* Continue button */}
      {canSubmit && (
        <Pressable
          onPress={handleSubmit}
          disabled={disabled}
          style={{
            marginTop: 4,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: accentColor,
            alignItems: 'center',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Text style={{ color: '#0a0a0f', fontSize: 16, fontWeight: '700' }}>
            Continue
          </Text>
        </Pressable>
      )}
    </View>
  );
}
