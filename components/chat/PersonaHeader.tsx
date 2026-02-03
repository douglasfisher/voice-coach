import { View, Text, Pressable } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { PersonaDisplay, CHALLENGE_STYLE_LABELS } from '../../types/persona';

interface PersonaHeaderProps {
  persona: PersonaDisplay;
  onInfoPress?: () => void;
}

export function PersonaHeader({ persona, onInfoPress }: PersonaHeaderProps) {
  return (
    <Pressable
      onPress={onInfoPress}
      className="flex-row items-center p-4 bg-bg-secondary border-b border-bg-tertiary"
    >
      <Avatar
        source={persona.avatarUrl}
        fallback={persona.name}
        size="md"
      />
      <View className="ml-3 flex-1">
        <Text className="text-text-primary text-lg font-semibold">
          {persona.name}
        </Text>
        <Text className="text-text-secondary text-sm">
          {persona.tagline ?? CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
        </Text>
      </View>
      {onInfoPress && (
        <View className="w-8 h-8 rounded-full bg-bg-tertiary items-center justify-center">
          <Text className="text-text-secondary">i</Text>
        </View>
      )}
    </Pressable>
  );
}
