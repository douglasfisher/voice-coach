import { View, Text } from 'react-native';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { PersonaDisplay, CHALLENGE_STYLE_LABELS } from '../../types/persona';

interface PersonaCardProps {
  persona: PersonaDisplay;
  onPress: () => void;
  selected?: boolean;
}

export function PersonaCard({ persona, onPress, selected = false }: PersonaCardProps) {
  return (
    <Card
      onPress={onPress}
      variant={selected ? 'elevated' : 'default'}
      padding="md"
      className={`
        ${selected ? 'border-2 border-accent-primary' : 'border border-transparent'}
      `}
    >
      <View className="items-center">
        <Avatar
          source={persona.avatarUrl}
          fallback={persona.name}
          size="lg"
        />
        <Text className="text-text-primary font-semibold text-center mt-3">
          {persona.name}
        </Text>
        <Text className="text-text-secondary text-sm text-center mt-1">
          {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
        </Text>
        {persona.tagline && (
          <Text
            className="text-text-muted text-xs text-center mt-2"
            numberOfLines={2}
          >
            {persona.tagline}
          </Text>
        )}
      </View>

      <View className="flex-row flex-wrap gap-1 mt-3 justify-center">
        {persona.specialtyAreas.slice(0, 2).map((area, index) => (
          <View key={index} className="px-2 py-1 rounded-md bg-bg-tertiary">
            <Text className="text-text-muted text-xs">{area}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
