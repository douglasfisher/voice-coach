import { View, Text, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';

const TRAIT_TOKENS = [
  'character_demeanor',
  'conversation_register',
  'response_length',
  'response_depth',
  'humor_style',
  'challenge_intensity',
  'emotional_attunement',
  'directness',
  'topic_flexibility',
  'question_frequency',
  'energy_mirroring',
  'coaching_method',
];

interface TraitTokenBadgesProps {
  systemPrompt: string;
  onInsertMissing?: () => void;
}

export { TRAIT_TOKENS };

export function TraitTokenBadges({ systemPrompt, onInsertMissing }: TraitTokenBadgesProps) {
  const missingTokens = TRAIT_TOKENS.filter(
    (t) => !systemPrompt.includes(`{{${t}}}`)
  );

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {TRAIT_TOKENS.map((token) => {
          const present = systemPrompt.includes(`{{${token}}}`);
          return (
            <View
              key={token}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor: present
                  ? 'rgba(74, 222, 128, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
                borderWidth: 1,
                borderColor: present
                  ? 'rgba(74, 222, 128, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: present ? '#4ade80' : '#ef4444',
                }}
              >
                {`{{${token}}}`}
              </Text>
            </View>
          );
        })}
      </View>

      {missingTokens.length > 0 && onInsertMissing && (
        <Pressable
          onPress={onInsertMissing}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.25)',
            marginBottom: 12,
          }}
        >
          <Plus size={14} color="#F59E0B" />
          <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
            Insert Missing Tokens ({missingTokens.length})
          </Text>
        </Pressable>
      )}
    </>
  );
}

export function getMissingTokens(systemPrompt: string): string[] {
  return TRAIT_TOKENS.filter((t) => !systemPrompt.includes(`{{${t}}}`));
}
