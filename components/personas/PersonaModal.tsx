import { View, Text, ScrollView, Modal, Pressable } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { VoiceButton } from '../chat/VoiceButton';
import {
  PersonaDisplay,
  CHALLENGE_STYLE_LABELS,
  CHALLENGE_STYLE_DESCRIPTIONS,
} from '../../types/persona';

interface PersonaModalProps {
  persona: PersonaDisplay | null;
  visible: boolean;
  onClose: () => void;
  onChallenge: (persona: PersonaDisplay) => void;
  onPlayVoice?: () => void;
  isPlayingVoice?: boolean;
}

export function PersonaModal({
  persona,
  visible,
  onClose,
  onChallenge,
  onPlayVoice,
  isPlayingVoice = false,
}: PersonaModalProps) {
  if (!persona) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-bg-primary">
        <View className="flex-row justify-between items-center p-4 border-b border-bg-tertiary">
          <View className="w-10" />
          <Text className="text-text-primary font-semibold text-lg">
            Meet {persona.name}
          </Text>
          <Pressable onPress={onClose} className="w-10 h-10 items-center justify-center">
            <Text className="text-text-secondary text-2xl">×</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="p-6">
          <View className="items-center mb-6">
            <Avatar
              source={persona.avatarUrl}
              fallback={persona.name}
              size="xl"
            />
            <Text className="text-text-primary text-2xl font-bold mt-4">
              {persona.name}
            </Text>
            {persona.tagline && (
              <Text className="text-text-secondary text-center mt-2">
                {persona.tagline}
              </Text>
            )}

            {onPlayVoice && (
              <View className="flex-row items-center mt-4">
                <VoiceButton
                  onPress={onPlayVoice}
                  isPlaying={isPlayingVoice}
                  size="lg"
                />
                <Text className="text-text-muted ml-3">
                  {isPlayingVoice ? 'Playing voice preview...' : 'Hear my voice'}
                </Text>
              </View>
            )}
          </View>

          <View className="bg-bg-secondary rounded-2xl p-4 mb-4">
            <Text className="text-text-secondary text-sm mb-1">Challenge Style</Text>
            <Text className="text-text-primary font-semibold">
              {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
            </Text>
            <Text className="text-text-muted text-sm mt-1">
              {CHALLENGE_STYLE_DESCRIPTIONS[persona.challengeStyle]}
            </Text>
          </View>

          <View className="bg-bg-secondary rounded-2xl p-4 mb-4">
            <Text className="text-text-secondary text-sm mb-2">Specialty Areas</Text>
            <View className="flex-row flex-wrap gap-2">
              {persona.specialtyAreas.map((area, index) => (
                <View key={index} className="px-3 py-1.5 rounded-lg bg-bg-tertiary">
                  <Text className="text-text-primary text-sm">{area}</Text>
                </View>
              ))}
            </View>
          </View>

          {persona.culturalBackground && (
            <View className="bg-bg-secondary rounded-2xl p-4 mb-4">
              <Text className="text-text-secondary text-sm mb-1">Background</Text>
              <Text className="text-text-primary">{persona.culturalBackground}</Text>
            </View>
          )}

          <View className="bg-bg-secondary rounded-2xl p-4 mb-4">
            <Text className="text-text-secondary text-sm mb-3">Personality</Text>
            <PersonalityBar label="Warmth" value={persona.personality.warmth} />
            <PersonalityBar label="Directness" value={persona.personality.directness} />
            <PersonalityBar label="Patience" value={persona.personality.patience} />
            <PersonalityBar label="Humor" value={persona.personality.humor} />
            <PersonalityBar label="Formality" value={persona.personality.formality} />
          </View>
        </ScrollView>

        <View className="p-4 border-t border-bg-tertiary">
          <Button
            onPress={() => onChallenge(persona)}
            size="lg"
            fullWidth
          >
            Challenge Me
          </Button>
        </View>
      </View>
    </Modal>
  );
}

function PersonalityBar({ label, value }: { label: string; value: number }) {
  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-text-muted text-sm">{label}</Text>
        <Text className="text-text-muted text-sm">{value}%</Text>
      </View>
      <View className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
        <View
          className="h-full rounded-full bg-accent-primary"
          style={{ width: `${value}%` }}
        />
      </View>
    </View>
  );
}
