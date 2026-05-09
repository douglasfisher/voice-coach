import React from 'react';
import { View, Text } from 'react-native';
import {
  Sprout,
  Search,
  Puzzle,
  BookOpen,
  Crosshair,
  Eye,
  Heart,
  Scale,
  Crown,
  Gem,
} from 'lucide-react-native';
import { getBadgeForLevel, LEVELS } from '../../lib/gamification';

const ICON_MAP: Record<string, typeof Sprout> = {
  Sprout,
  Search,
  Puzzle,
  BookOpen,
  Crosshair,
  Eye,
  Heart,
  Scale,
  Crown,
  Gem,
};

const SIZES = {
  sm: { container: 24, icon: 12, fontSize: 11 },
  md: { container: 36, icon: 18, fontSize: 13 },
  lg: { container: 48, icon: 24, fontSize: 15 },
} as const;

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
}

export function LevelBadge({ level, size = 'md', showTitle = false }: LevelBadgeProps) {
  const badge = getBadgeForLevel(level);
  const dims = SIZES[size];
  const Icon = ICON_MAP[badge.icon] ?? Sprout;
  const title = LEVELS[Math.max(0, Math.min(9, level - 1))]?.title ?? 'Novice Thinker';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: dims.container,
          height: dims.container,
          borderRadius: dims.container / 2,
          borderWidth: 1.5,
          borderColor: badge.color,
          backgroundColor: `${badge.color}26`,
          alignItems: 'center',
          justifyContent: 'center',
          ...(badge.glowOpacity > 0
            ? {
                shadowColor: badge.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: badge.glowOpacity,
                shadowRadius: badge.glowOpacity > 0.3 ? 10 : 6,
                elevation: badge.glowOpacity > 0.3 ? 8 : 4,
              }
            : {}),
        }}
      >
        <Icon size={dims.icon} color={badge.color} />
      </View>
      {showTitle && (
        <Text
          style={{
            color: badge.color,
            fontSize: dims.fontSize,
            fontWeight: '600',
            marginLeft: 6,
          }}
        >
          {title}
        </Text>
      )}
    </View>
  );
}
