import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Award,
  Star,
  Flame,
  Trophy,
  Crown,
  Rocket,
  BookOpen,
  Zap,
  Brain,
  Eye,
  Heart,
  Lightbulb,
  Target,
  RefreshCw,
  Users,
  Moon,
  Sun,
  Sparkles,
  Circle,
  RotateCcw,
} from 'lucide-react-native';
import type { Achievement, AchievementRarity } from '../../types/gamification';
import { RARITY_COLORS, RARITY_LABELS } from '../../lib/gamification';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number; // 0-1 for locked achievements
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  award: Award,
  star: Star,
  flame: Flame,
  trophy: Trophy,
  crown: Crown,
  rocket: Rocket,
  'book-open': BookOpen,
  zap: Zap,
  brain: Brain,
  eye: Eye,
  heart: Heart,
  lightbulb: Lightbulb,
  target: Target,
  'refresh-cw': RefreshCw,
  'rotate-ccw': RotateCcw,
  users: Users,
  moon: Moon,
  sun: Sun,
  sparkles: Sparkles,
  circle: Circle,
  footprints: Rocket, // Fallback
};

export function AchievementBadge({
  achievement,
  unlocked,
  unlockedAt,
  progress,
  size = 'md',
  onPress,
}: AchievementBadgeProps) {
  const rarityColor = RARITY_COLORS[achievement.rarity];
  const Icon = ICON_MAP[achievement.icon] ?? Award;

  const sizeConfig = {
    sm: { badge: 48, icon: 20, text: 10, padding: 8 },
    md: { badge: 64, icon: 28, text: 12, padding: 12 },
    lg: { badge: 80, icon: 36, text: 14, padding: 16 },
  };

  const config = sizeConfig[size];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const content = (
    <View style={{ alignItems: 'center', opacity: unlocked ? 1 : 0.5 }}>
      {/* Badge circle */}
      <View
        style={{
          width: config.badge,
          height: config.badge,
          borderRadius: config.badge / 2,
          borderWidth: 3,
          borderColor: unlocked ? rarityColor : 'rgba(255,255,255,0.2)',
          backgroundColor: unlocked
            ? `${rarityColor}20`
            : 'rgba(255,255,255,0.05)',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Icon
          size={config.icon}
          color={unlocked ? rarityColor : 'rgba(255,255,255,0.3)'}
        />

        {/* Progress ring for locked */}
        {!unlocked && progress !== undefined && progress > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -3,
              left: -3,
              right: -3,
              bottom: -3,
              borderRadius: (config.badge + 6) / 2,
              borderWidth: 3,
              borderColor: 'transparent',
              borderTopColor: rarityColor,
              transform: [{ rotate: `${progress * 360}deg` }],
            }}
          />
        )}

        {/* Locked overlay */}
        {!unlocked && (
          <View
            style={{
              position: 'absolute',
              bottom: -4,
              backgroundColor: 'rgba(0,0,0,0.8)',
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>
              {progress !== undefined
                ? `${Math.round(progress * 100)}%`
                : 'Locked'}
            </Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text
        style={{
          color: unlocked ? '#fff' : 'rgba(255,255,255,0.5)',
          fontSize: config.text,
          fontWeight: '600',
          marginTop: 8,
          textAlign: 'center',
        }}
        numberOfLines={2}
      >
        {achievement.name}
      </Text>

      {/* Rarity label */}
      {size !== 'sm' && (
        <Text
          style={{
            color: unlocked ? rarityColor : 'rgba(255,255,255,0.3)',
            fontSize: config.text - 2,
            fontWeight: '500',
            marginTop: 2,
          }}
        >
          {RARITY_LABELS[achievement.rarity]}
        </Text>
      )}

      {/* Unlock date */}
      {unlocked && unlockedAt && size === 'lg' && (
        <Text
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 10,
            marginTop: 4,
          }}
        >
          {formatDate(unlockedAt)}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

// Grid display for achievements
interface AchievementGridProps {
  achievements: Achievement[];
  unlockedIds: Set<string>;
  unlockedDates: Map<string, string>;
  columns?: number;
  onAchievementPress?: (achievement: Achievement) => void;
}

export function AchievementGrid({
  achievements,
  unlockedIds,
  unlockedDates,
  columns = 4,
  onAchievementPress,
}: AchievementGridProps) {
  return (
    <View
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <LinearGradient
        colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(251, 191, 36, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Trophy size={20} color="#fbbf24" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
              Achievements
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
              {unlockedIds.size} of {achievements.length} unlocked
            </Text>
          </View>
        </View>

        {/* Grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: -8,
          }}
        >
          {achievements.map((achievement) => {
            const unlocked = unlockedIds.has(achievement.id);
            const unlockedAt = unlockedDates.get(achievement.id);

            return (
              <View
                key={achievement.id}
                style={{
                  width: `${100 / columns}%`,
                  padding: 8,
                  alignItems: 'center',
                }}
              >
                <AchievementBadge
                  achievement={achievement}
                  unlocked={unlocked}
                  unlockedAt={unlockedAt}
                  size="sm"
                  onPress={
                    onAchievementPress
                      ? () => onAchievementPress(achievement)
                      : undefined
                  }
                />
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}
