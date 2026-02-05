import { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Brain, HelpCircle } from 'lucide-react-native';

interface ModeToggleProps {
  mode: 'practice' | 'question';
  onModeChange: (mode: 'practice' | 'question') => void;
  disabled?: boolean;
  accentColor?: string;
}

/**
 * Compact pill toggle for switching between Practice and Q&A modes.
 * Practice mode: Coach asks questions, challenges user to think
 * Q&A mode: User asks questions, coach provides expert answers
 */
export function ModeToggle({
  mode,
  onModeChange,
  disabled = false,
  accentColor = '#10b981',
}: ModeToggleProps) {
  const slideAnim = useRef(new Animated.Value(mode === 'practice' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: mode === 'practice' ? 0 : 1,
      useNativeDriver: true,
      duration: 200,
    }).start();
  }, [mode]);

  const toggleWidth = 158;
  const practiceWidth = 92; // Wider for "Practice"
  const qaWidth = 66;       // Narrower for "Q&A" but with right padding

  // Dynamic highlight width based on mode
  const highlightWidth = mode === 'practice' ? practiceWidth - 4 : qaWidth - 4;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, practiceWidth],
  });

  return (
    <View
      style={{
        width: toggleWidth,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        flexDirection: 'row',
        position: 'relative',
        opacity: disabled ? 0.5 : 1,
        overflow: 'hidden',
      }}
    >
      {/* Animated highlight */}
      <Animated.View
        style={{
          position: 'absolute',
          width: highlightWidth,
          height: 32,
          top: 1,
          left: 2,
          borderRadius: 16,
          backgroundColor: `${accentColor}30`,
          borderWidth: 1,
          borderColor: accentColor,
          transform: [{ translateX }],
        }}
      />

      {/* Practice button */}
      <Pressable
        onPress={() => !disabled && onModeChange('practice')}
        style={{
          width: practiceWidth,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          zIndex: 1,
        }}
      >
        <Brain
          size={14}
          color={mode === 'practice' ? accentColor : 'rgba(255,255,255,0.5)'}
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: mode === 'practice' ? accentColor : 'rgba(255,255,255,0.5)',
          }}
        >
          Practice
        </Text>
      </Pressable>

      {/* Q&A button */}
      <Pressable
        onPress={() => !disabled && onModeChange('question')}
        style={{
          width: qaWidth,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          zIndex: 1,
        }}
      >
        <HelpCircle
          size={14}
          color={mode === 'question' ? accentColor : 'rgba(255,255,255,0.5)'}
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: mode === 'question' ? accentColor : 'rgba(255,255,255,0.5)',
          }}
        >
          Q&A
        </Text>
      </Pressable>
    </View>
  );
}
