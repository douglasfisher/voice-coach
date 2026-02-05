import { View, Text, Pressable, Image, ImageSourcePropType, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Zap, Brain, Heart, Scale, Eye, RefreshCw, GraduationCap, HelpCircle } from 'lucide-react-native';
import { PersonaDisplay, ChallengeStyle, CHALLENGE_STYLE_LABELS } from '../../types/persona';
import { useChatStore } from '../../stores/chatStore';

// Coaching style labels for coaches
const COACHING_STYLE_LABELS: Record<string, string> = {
  'confidence_builder': 'Confidence Builder',
  'tough_love': 'Tough Love',
  'playful_mentor': 'Playful Mentor',
  'expert_advisor': 'Expert Advisor',
  'supportive_guide': 'Supportive Guide',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Scene descriptions for Q&A mode based on domain/specialty
function getQAModeScene(specialtyAreas: string[]): string {
  const areas = specialtyAreas.join(' ').toLowerCase();

  // Dating
  if (areas.includes('date') || areas.includes('dating') || areas.includes('romance') || areas.includes('flirt') || areas.includes('connection') || areas.includes('confidence building')) {
    return "You're at a cozy bar on a Friday night. You notice someone interesting across the room — they catch your eye and smile. This is your moment. You walk over and take the lead...";
  }

  // Interviews
  if (areas.includes('interview') || areas.includes('hiring') || areas.includes('career') || areas.includes('job')) {
    return "You're in the interview room. The interviewer sits across from you, ready to assess you. But today, you're driving this conversation. Ask what you need to know...";
  }

  // Presentations
  if (areas.includes('presentation') || areas.includes('speaking') || areas.includes('stage') || areas.includes('audience')) {
    return "You're backstage, about to step into the spotlight. The audience is waiting. This is your chance to command the room. Take a breath and begin...";
  }

  // Negotiations
  if (areas.includes('negotiat') || areas.includes('deal') || areas.includes('contract') || areas.includes('salary')) {
    return "You're at the negotiating table. The other party is across from you, papers ready. The stakes are high. You make the opening move...";
  }

  // Difficult conversations
  if (areas.includes('difficult') || areas.includes('conflict') || areas.includes('feedback') || areas.includes('boundary')) {
    return "The moment has come for that conversation you've been putting off. They're sitting across from you, waiting. You take a breath and begin...";
  }

  // Networking
  if (areas.includes('network') || areas.includes('connect') || areas.includes('linkedin') || areas.includes('professional')) {
    return "You're at an industry event, drink in hand. You spot someone you've been wanting to meet. This is your chance to make an impression. You approach...";
  }

  // Default
  return "The scene is set. You're in the moment, ready to take the lead. The other person is waiting for you to make your move...";
}

// Challenge style themes
const STYLE_THEMES: Record<ChallengeStyle, {
  gradient: [string, string, string];
  accent: string;
  Icon: typeof Sparkles;
}> = {
  steelman: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#4ade80',
    Icon: Scale,
  },
  devils_advocate: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#f472b6',
    Icon: Zap,
  },
  socratic: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#60a5fa',
    Icon: Brain,
  },
  empathetic_probe: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#fbbf24',
    Icon: Heart,
  },
  logical_surgeon: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#2dd4bf',
    Icon: Sparkles,
  },
  perspective_shifter: {
    gradient: ['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)'],
    accent: '#c084fc',
    Icon: Eye,
  },
};

interface ChatHeroEmptyStateProps {
  persona: PersonaDisplay;
  questionMessage: string | null;
  refreshCount: number;
  maxRefreshes: number;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefreshQuestion: () => void;
  onStartChat: () => void;
  isStarting?: boolean;
}

export function ChatHeroEmptyState({
  persona,
  questionMessage,
  refreshCount,
  maxRefreshes,
  isLoading,
  isRefreshing,
  onRefreshQuestion,
  onStartChat,
  isStarting = false,
}: ChatHeroEmptyStateProps) {
  const { globalInteractionMode } = useChatStore();
  const isQAMode = globalInteractionMode === 'question';
  const isCoach = persona.personaType === 'coach';
  const theme = STYLE_THEMES[persona.challengeStyle];
  const StyleIcon = isCoach ? GraduationCap : theme.Icon;
  const accentColor = isCoach ? '#10b981' : theme.accent;
  const imageSource = typeof persona.avatarUrl === 'string'
    ? { uri: persona.avatarUrl }
    : persona.avatarUrl;

  // Get style label based on persona type
  const styleLabel = isCoach && persona.coachingStyle
    ? COACHING_STYLE_LABELS[persona.coachingStyle] || persona.coachingStyle
    : CHALLENGE_STYLE_LABELS[persona.challengeStyle];

  const refreshesRemaining = maxRefreshes - refreshCount;
  const canRefresh = refreshesRemaining > 0 && !isRefreshing && !isLoading && questionMessage;
  const hasPreview = !!questionMessage;

  return (
    <View style={{ flex: 1 }}>
      {/* Full bleed background image */}
      <Image
        source={imageSource as ImageSourcePropType}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
        resizeMode="cover"
      />

      {/* Gradient overlay - stronger at bottom for text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.95)']}
        locations={[0, 0.35, 0.6, 1]}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
        }}
      />

      {/* Content overlay */}
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 24 }}>
        {/* Persona name */}
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
          {persona.name}
        </Text>

        {/* Style badge and mode badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: accentColor,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StyleIcon size={14} color="#0f0f12" />
            </View>
            <Text style={{ color: accentColor, fontSize: 13, fontWeight: '600', marginLeft: 8 }}>
              {styleLabel}
            </Text>
          </View>

          {/* Q&A Mode badge */}
          {isQAMode && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(96, 165, 250, 0.2)',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#60a5fa',
              }}
            >
              <HelpCircle size={12} color="#60a5fa" />
              <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '600', marginLeft: 4 }}>
                Q&A Mode
              </Text>
            </View>
          )}
        </View>

        {/* Q&A Mode: Show scene-setting intro based on domain */}
        {isQAMode && isCoach ? (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              The Scene
            </Text>
            <Text
              style={{
                color: '#fff',
                fontSize: 16,
                lineHeight: 24,
                fontStyle: 'italic',
              }}
            >
              {getQAModeScene(persona.specialtyAreas)}
            </Text>
          </View>
        ) : isLoading && !hasPreview ? (
          /* Loading skeleton */
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                height: 18,
                width: '90%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 8,
                marginBottom: 8,
              }}
            />
            <View
              style={{
                height: 18,
                width: '70%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 8,
              }}
            />
          </View>
        ) : questionMessage ? (
          /* Practice mode: Show question */
          <Text
            style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: '600',
              lineHeight: 24,
              marginBottom: 20,
            }}
          >
            {questionMessage}
          </Text>
        ) : null}

        {/* New Question/Prompt button - hide in Q&A mode */}
        {!(isQAMode && isCoach) && (
          <Pressable
            onPress={onRefreshQuestion}
            disabled={!canRefresh}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
              marginBottom: 12,
              opacity: canRefresh ? 1 : 0.4,
            }}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <RefreshCw size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
                  {isCoach ? 'New Scenario' : 'New Question'}
                </Text>
                {refreshesRemaining > 0 && (
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginLeft: 8 }}>
                    ({refreshesRemaining} left)
                  </Text>
                )}
              </>
            )}
          </Pressable>
        )}

        {/* Start CTA button */}
        <Pressable
          onPress={onStartChat}
          disabled={isStarting || (isLoading && !isQAMode) || (!hasPreview && !isQAMode)}
          style={{
            paddingVertical: 16,
            borderRadius: 16,
            backgroundColor: accentColor,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (isStarting || (isLoading && !isQAMode) || (!hasPreview && !isQAMode)) ? 0.5 : 1,
          }}
        >
          {isStarting ? (
            <ActivityIndicator color="#0f0f12" />
          ) : (
            <Text style={{ color: '#0f0f12', fontWeight: '700', fontSize: 18 }}>
              {isCoach ? (isQAMode ? 'You Start' : 'Start Practice') : 'Start Challenge'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
