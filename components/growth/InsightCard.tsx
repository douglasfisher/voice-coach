import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles,
  Target,
  Lightbulb,
  AlertTriangle,
  Trophy,
  X,
  ChevronRight,
} from 'lucide-react-native';
import type { InsightType, UserInsight } from '../../types/gamification';

interface InsightCardProps {
  insight: UserInsight;
  onDismiss?: () => void;
  onAction?: () => void;
}

const INSIGHT_CONFIG: Record<
  InsightType,
  {
    icon: React.ComponentType<any>;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  celebration: {
    icon: Sparkles,
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.15)',
    label: 'Celebration',
  },
  focus: {
    icon: Target,
    color: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.15)',
    label: 'Focus Area',
  },
  recommendation: {
    icon: Lightbulb,
    color: '#4ade80',
    bgColor: 'rgba(74, 222, 128, 0.15)',
    label: 'Recommendation',
  },
  warning: {
    icon: AlertTriangle,
    color: '#f87171',
    bgColor: 'rgba(248, 113, 113, 0.15)',
    label: 'Heads Up',
  },
  milestone: {
    icon: Trophy,
    color: '#c084fc',
    bgColor: 'rgba(192, 132, 252, 0.15)',
    label: 'Milestone',
  },
};

export function InsightCard({ insight, onDismiss, onAction }: InsightCardProps) {
  const config = INSIGHT_CONFIG[insight.insight_type];
  const Icon = config.icon;
  const hasAction = insight.action_type !== null;

  return (
    <View
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${config.color}30`,
      }}
    >
      <LinearGradient
        colors={[config.bgColor, `${config.bgColor.replace('0.15', '0.05')}`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        {/* Header with dismiss */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 12,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: `${config.color}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Icon size={22} color={config.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: config.color,
                fontSize: 11,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 4,
              }}
            >
              {config.label}
            </Text>
            <Text
              style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: '600',
                lineHeight: 22,
              }}
            >
              {insight.title}
            </Text>
          </View>

          {onDismiss && (
            <Pressable
              onPress={onDismiss}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} color="rgba(255,255,255,0.5)" />
            </Pressable>
          )}
        </View>

        {/* Message */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 14,
            lineHeight: 20,
            marginBottom: hasAction ? 12 : 0,
          }}
        >
          {insight.message}
        </Text>

        {/* Action button */}
        {hasAction && onAction && (
          <Pressable
            onPress={onAction}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${config.color}20`,
              borderRadius: 12,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: `${config.color}30`,
            }}
          >
            <Text
              style={{
                color: config.color,
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              {getActionLabel(insight.action_type)}
            </Text>
            <ChevronRight size={18} color={config.color} style={{ marginLeft: 4 }} />
          </Pressable>
        )}
      </LinearGradient>
    </View>
  );
}

function getActionLabel(actionType: string | null): string {
  switch (actionType) {
    case 'start_session':
      return 'Start Session';
    case 'view_achievement':
      return 'View Achievement';
    case 'try_persona':
      return 'Try This Coach';
    case 'view_pattern':
      return 'View Pattern';
    case 'complete_challenge':
      return 'Take Challenge';
    default:
      return 'Learn More';
  }
}

// Compact version for inline display
interface InsightChipProps {
  insight: UserInsight;
  onPress?: () => void;
}

export function InsightChip({ insight, onPress }: InsightChipProps) {
  const config = INSIGHT_CONFIG[insight.insight_type];
  const Icon = config.icon;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: config.bgColor,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: `${config.color}30`,
      }}
    >
      <Icon size={16} color={config.color} />
      <Text
        style={{
          color: '#fff',
          fontSize: 13,
          fontWeight: '500',
          marginLeft: 8,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {insight.title}
      </Text>
      <ChevronRight size={16} color="rgba(255,255,255,0.4)" />
    </Pressable>
  );
}
