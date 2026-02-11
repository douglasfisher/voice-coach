import { View, Text, ScrollView, Modal, Pressable, Image, ImageSourcePropType, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Sparkles, Zap, Brain, Heart, Scale, Eye, Play, Volume2, ChevronRight, GraduationCap } from 'lucide-react-native';
import {
  PersonaDisplay,
  ChallengeStyle,
  CHALLENGE_STYLE_LABELS,
  CHALLENGE_STYLE_DESCRIPTIONS,
} from '../../types/persona';
import { ModeToggle } from '../chat/ModeToggle';
import { useChatStore } from '../../stores/chatStore';
import { useAppSetting } from '../../hooks';

// Coaching style labels for coaches
const COACHING_STYLE_LABELS: Record<string, string> = {
  'confidence_builder': 'Confidence Builder',
  'tough_love': 'Tough Love',
  'playful_mentor': 'Playful Mentor',
  'expert_advisor': 'Expert Advisor',
  'supportive_guide': 'Supportive Guide',
};

const COACHING_STYLE_DESCRIPTIONS: Record<string, string> = {
  'confidence_builder': 'Builds you up with encouragement',
  'tough_love': 'Direct feedback that pushes you',
  'playful_mentor': 'Uses humor to make learning fun',
  'expert_advisor': 'Strategic expertise and insights',
  'supportive_guide': 'Gentle guidance and support',
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.85;

const UNIFIED_GRADIENT: [string, string, string] = ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'];

// Challenge style colors and gradients
const STYLE_THEMES: Record<ChallengeStyle, {
  gradient: [string, string, string];
  accent: string;
  Icon: typeof Sparkles;
}> = {
  steelman: {
    gradient: ['transparent', 'rgba(16, 52, 96, 0.6)', '#0a0a0f'],
    accent: '#4ade80',
    Icon: Scale,
  },
  devils_advocate: {
    gradient: ['transparent', 'rgba(74, 25, 66, 0.6)', '#0a0a0f'],
    accent: '#f472b6',
    Icon: Zap,
  },
  socratic: {
    gradient: ['transparent', 'rgba(30, 58, 95, 0.6)', '#0a0a0f'],
    accent: '#60a5fa',
    Icon: Brain,
  },
  empathetic_probe: {
    gradient: ['transparent', 'rgba(61, 53, 32, 0.6)', '#0a0a0f'],
    accent: '#fbbf24',
    Icon: Heart,
  },
  logical_surgeon: {
    gradient: ['transparent', 'rgba(13, 68, 68, 0.6)', '#0a0a0f'],
    accent: '#2dd4bf',
    Icon: Sparkles,
  },
  perspective_shifter: {
    gradient: ['transparent', 'rgba(76, 29, 76, 0.6)', '#0a0a0f'],
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
  const { globalInteractionMode, setGlobalInteractionMode } = useChatStore();
  const { value: unifiedGradient, isLoading: isGradientLoading } = useAppSetting('unified_card_gradient');

  if (!persona) return null;
  const isCoach = persona.personaType === 'coach';
  const theme = STYLE_THEMES[persona.challengeStyle];
  const StyleIcon = isCoach ? GraduationCap : theme.Icon;
  const imageSource = typeof persona.avatarUrl === 'string'
    ? { uri: persona.avatarUrl }
    : persona.avatarUrl;

  // Get style label and description based on persona type
  const styleLabel = isCoach && persona.coachingStyle
    ? COACHING_STYLE_LABELS[persona.coachingStyle] || persona.coachingStyle
    : CHALLENGE_STYLE_LABELS[persona.challengeStyle];

  const styleDescription = isCoach && persona.coachingStyle
    ? COACHING_STYLE_DESCRIPTIONS[persona.coachingStyle] || 'Practice coach'
    : CHALLENGE_STYLE_DESCRIPTIONS[persona.challengeStyle];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
        <ScrollView
          style={{ flex: 1 }}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image Section */}
          <View style={{ height: HERO_HEIGHT, position: 'relative' }}>
            {/* Full bleed image */}
            <Image
              source={imageSource as ImageSourcePropType}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
              }}
              resizeMode="cover"
            />

            {/* Gradient overlay */}
            <LinearGradient
              colors={(unifiedGradient || isGradientLoading) ? UNIFIED_GRADIENT : theme.gradient}
              locations={(unifiedGradient || isGradientLoading) ? [0, 0.5, 1] : [0, 0.8, 1]}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
              }}
            />

            {/* Close button */}
            <Pressable
              onPress={onClose}
              style={{
                position: 'absolute',
                top: 60,
                right: 20,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(0,0,0,0.5)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <X size={22} color="#fff" />
            </Pressable>

            {/* Voice preview floating button */}
            {onPlayVoice && (
              <Pressable
                onPress={onPlayVoice}
                style={{
                  position: 'absolute',
                  top: 60,
                  left: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 24,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderWidth: 1,
                  borderColor: theme.accent,
                }}
              >
                {isPlayingVoice ? (
                  <Volume2 size={18} color={theme.accent} />
                ) : (
                  <Play size={18} color={theme.accent} />
                )}
                <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: theme.accent }}>
                  {isPlayingVoice ? 'Playing...' : 'Hear Voice'}
                </Text>
              </Pressable>
            )}

            {/* Hero text content */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24 }}>
              {/* Mode toggle for coaches */}
              {isCoach && (
                <View style={{ marginBottom: 12 }}>
                  <ModeToggle
                    mode={globalInteractionMode}
                    onModeChange={setGlobalInteractionMode}
                    accentColor="#10b981"
                  />
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 }}>
                    {globalInteractionMode === 'question'
                      ? 'You ask the questions — get direct, expert answers from your coach.'
                      : 'Your coach sets the scene and guides you through a realistic roleplay scenario.'}
                  </Text>
                </View>
              )}

              {/* Style badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: isCoach ? '#10b981' : theme.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    shadowColor: isCoach ? '#10b981' : theme.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 12,
                  }}
                >
                  <StyleIcon size={20} color="#0f0f12" />
                </View>
                <View>
                  <Text style={{ color: isCoach ? '#10b981' : theme.accent, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>
                    {styleLabel.toUpperCase()}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
                    {styleDescription}
                  </Text>
                </View>
              </View>

              {/* Name */}
              <Text style={{ color: '#fff', fontSize: 36, fontWeight: 'bold', marginBottom: 4 }}>
                {persona.name}
              </Text>

              {/* Tagline */}
              {persona.tagline && (
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, fontStyle: 'italic' }}>
                  "{persona.tagline}"
                </Text>
              )}
            </View>
          </View>

          {/* Content Section */}
          <View style={{ padding: 24 }}>
            {/* Specialty Areas */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10 }}>
                EXPERTISE
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {persona.specialtyAreas.map((area, index) => (
                  <View
                    key={index}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: `${theme.accent}15`,
                      borderWidth: 1,
                      borderColor: `${theme.accent}40`,
                    }}
                  >
                    <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '500' }}>{area}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Background */}
            {persona.culturalBackground && (
              <View
                style={{
                  marginBottom: 24,
                  padding: 20,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
                  BACKGROUND
                </Text>
                <Text style={{ color: '#fff', fontSize: 16, lineHeight: 24 }}>
                  {persona.culturalBackground}
                </Text>
              </View>
            )}

            {/* Personality Traits */}
            <View
              style={{
                marginBottom: 24,
                padding: 20,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 16 }}>
                PERSONALITY PROFILE
              </Text>
              <PersonalityBar label="Warmth" value={persona.personality.warmth} color={theme.accent} />
              <PersonalityBar label="Directness" value={persona.personality.directness} color={theme.accent} />
              <PersonalityBar label="Patience" value={persona.personality.patience} color={theme.accent} />
              <PersonalityBar label="Humor" value={persona.personality.humor} color={theme.accent} />
              <PersonalityBar label="Formality" value={persona.personality.formality} color={theme.accent} isLast />
            </View>

          </View>
        </ScrollView>

        {/* Fixed CTA Button */}
        <View
          style={{
            backgroundColor: '#0a0a0f',
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 50,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <Pressable
            onPress={() => onChallenge(persona)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 18,
              borderRadius: 16,
              backgroundColor: isCoach ? '#10b981' : theme.accent,
            }}
          >
            <StyleIcon size={22} color="#0f0f12" />
            <Text style={{ color: '#0f0f12', fontWeight: 'bold', fontSize: 18, marginLeft: 10 }}>
              {isCoach ? (globalInteractionMode === 'question' ? 'Start Q&A' : 'Start Practice') : 'Start Challenge'}
            </Text>
            <ChevronRight size={22} color="#0f0f12" style={{ marginLeft: 4 }} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PersonalityBar({
  label,
  value,
  color,
  isLast = false
}: {
  label: string;
  value: number;
  color: string;
  isLast?: boolean;
}) {
  return (
    <View style={{ marginBottom: isLast ? 0 : 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{label}</Text>
        <Text style={{ color: color, fontSize: 14, fontWeight: '600' }}>{value}%</Text>
      </View>
      <View style={{
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
      }}>
        <LinearGradient
          colors={[color, `${color}80`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: `${value}%`,
            height: '100%',
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}
