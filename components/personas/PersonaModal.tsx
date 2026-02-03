import { View, Text, ScrollView, Modal, Pressable, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Sparkles, Zap, Brain, Heart, Scale, Eye, Play, Volume2 } from 'lucide-react-native';
import {
  PersonaDisplay,
  ChallengeStyle,
  CHALLENGE_STYLE_LABELS,
  CHALLENGE_STYLE_DESCRIPTIONS,
} from '../../types/persona';

// Challenge style colors and gradients (same as PersonaCard)
const STYLE_THEMES: Record<ChallengeStyle, {
  gradient: [string, string, string];
  accent: string;
  Icon: typeof Sparkles;
}> = {
  steelman: {
    gradient: ['#1a1a2e', '#16213e', '#0f3460'],
    accent: '#4ade80',
    Icon: Scale,
  },
  devils_advocate: {
    gradient: ['#1a1a2e', '#2d1b3d', '#4a1942'],
    accent: '#f472b6',
    Icon: Zap,
  },
  socratic: {
    gradient: ['#1a1a2e', '#1e293b', '#1e3a5f'],
    accent: '#60a5fa',
    Icon: Brain,
  },
  empathetic_probe: {
    gradient: ['#1a1a2e', '#2d2b1b', '#3d3520'],
    accent: '#fbbf24',
    Icon: Heart,
  },
  logical_surgeon: {
    gradient: ['#1a1a2e', '#1b2d2d', '#0d4444'],
    accent: '#2dd4bf',
    Icon: Sparkles,
  },
  perspective_shifter: {
    gradient: ['#1a1a2e', '#2e1a2e', '#4c1d4c'],
    accent: '#c084fc',
    Icon: Eye,
  },
};

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

  const theme = STYLE_THEMES[persona.challengeStyle];
  const StyleIcon = theme.Icon;
  const imageSource = typeof persona.avatarUrl === 'string'
    ? { uri: persona.avatarUrl }
    : persona.avatarUrl;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-bg-primary">
        {/* Header with gradient */}
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingBottom: 32 }}
        >
          {/* Close Button */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16 }}>
            <Pressable
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <X size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Avatar and Name */}
          <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
            <View style={{ position: 'relative' }}>
              <View
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 3,
                  borderColor: theme.accent,
                  shadowColor: theme.accent,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 20,
                }}
              >
                <Image
                  source={imageSource as ImageSourcePropType}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
              <View
                style={{
                  position: 'absolute',
                  bottom: -8,
                  right: -8,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.accent,
                }}
              >
                <StyleIcon size={20} color="#0f0f12" />
              </View>
            </View>

            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 16 }}>
              {persona.name}
            </Text>

            {persona.tagline && (
              <Text style={{ color: '#d1d5db', textAlign: 'center', marginTop: 4 }}>
                {persona.tagline}
              </Text>
            )}

            {/* Voice Preview Button */}
            {onPlayVoice && (
              <Pressable
                onPress={onPlayVoice}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: `${theme.accent}20`,
                  borderWidth: 1,
                  borderColor: theme.accent,
                }}
              >
                {isPlayingVoice ? (
                  <Volume2 size={18} color={theme.accent} />
                ) : (
                  <Play size={18} color={theme.accent} />
                )}
                <Text style={{ marginLeft: 8, fontWeight: '500', color: theme.accent }}>
                  {isPlayingVoice ? 'Playing...' : 'Hear my voice'}
                </Text>
              </Pressable>
            )}
          </View>
        </LinearGradient>

        <ScrollView className="flex-1" contentContainerClassName="p-6">
          {/* Challenge Style */}
          <View
            style={{
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              backgroundColor: `${theme.accent}10`,
              borderWidth: 1,
              borderColor: `${theme.accent}30`,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <StyleIcon size={18} color={theme.accent} />
              <Text style={{ marginLeft: 8, fontWeight: '600', color: theme.accent }}>
                {CHALLENGE_STYLE_LABELS[persona.challengeStyle]}
              </Text>
            </View>
            <Text className="text-text-secondary text-sm">
              {CHALLENGE_STYLE_DESCRIPTIONS[persona.challengeStyle]}
            </Text>
          </View>

          {/* Specialty Areas */}
          <View className="bg-bg-secondary rounded-2xl p-4 mb-4">
            <Text className="text-text-secondary text-sm mb-3">Specialty Areas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {persona.specialtyAreas.map((area, index) => (
                <View
                  key={index}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: `${theme.accent}15`,
                  }}
                >
                  <Text style={{ color: theme.accent, fontSize: 14 }}>{area}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Background */}
          {persona.culturalBackground && (
            <View className="bg-bg-secondary rounded-2xl p-4 mb-4">
              <Text className="text-text-secondary text-sm mb-1">Background</Text>
              <Text className="text-text-primary">{persona.culturalBackground}</Text>
            </View>
          )}

          {/* Personality Traits */}
          <View className="bg-bg-secondary rounded-2xl p-4 mb-4">
            <Text className="text-text-secondary text-sm mb-4">Personality</Text>
            <PersonalityBar label="Warmth" value={persona.personality.warmth} color={theme.accent} />
            <PersonalityBar label="Directness" value={persona.personality.directness} color={theme.accent} />
            <PersonalityBar label="Patience" value={persona.personality.patience} color={theme.accent} />
            <PersonalityBar label="Humor" value={persona.personality.humor} color={theme.accent} />
            <PersonalityBar label="Formality" value={persona.personality.formality} color={theme.accent} />
          </View>
        </ScrollView>

        {/* CTA Button */}
        <LinearGradient
          colors={['transparent', '#0f0f12']}
          style={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 16 }}
        >
          <Pressable
            onPress={() => onChallenge(persona)}
            style={{
              paddingVertical: 16,
              borderRadius: 12,
              alignItems: 'center',
              backgroundColor: theme.accent,
            }}
          >
            <Text style={{ color: '#0f0f12', fontWeight: 'bold', fontSize: 18 }}>Challenge Me</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function PersonalityBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text className="text-text-muted text-sm">{label}</Text>
        <Text className="text-text-muted text-sm">{value}%</Text>
      </View>
      <View className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
        <View
          style={{
            width: `${value}%`,
            height: '100%',
            borderRadius: 100,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}
