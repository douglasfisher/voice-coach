import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, ChevronRight } from 'lucide-react-native';
import type { Level } from '../../types/gamification';
import { getLevelProgress, formatXP, LEVELS } from '../../lib/gamification';

interface LevelProgressBarProps {
  level: Level;
  currentXP: number;
  xpForNextLevel: number;
}

export function LevelProgressBar({
  level,
  currentXP,
  xpForNextLevel,
}: LevelProgressBarProps) {
  const progress = getLevelProgress(currentXP);
  const nextLevel = LEVELS.find((l) => l.level === level.level + 1);
  const isMaxLevel = level.level >= 10;

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
        style={{ padding: 16 }}
      >
        {/* Level badge and info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          {/* Level badge */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              borderWidth: 2,
              borderColor: '#F59E0B',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '800',
                color: '#F59E0B',
              }}
            >
              {level.level}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              {level.title}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
              {formatXP(currentXP)} XP total
            </Text>
          </View>

          {/* XP to next level */}
          {!isMaxLevel && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#F59E0B', fontSize: 14, fontWeight: '600' }}>
                {formatXP(xpForNextLevel)} XP
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                to next level
              </Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 8,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              borderRadius: 4,
            }}
          />
        </View>

        {/* Next level preview */}
        {nextLevel && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Star size={14} color="rgba(255,255,255,0.4)" />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6 }}>
              Next: {nextLevel.title}
            </Text>
            {nextLevel.perks && nextLevel.perks.length > 0 && (
              <>
                <ChevronRight size={12} color="rgba(255,255,255,0.3)" style={{ marginHorizontal: 4 }} />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  {nextLevel.perks[0]}
                </Text>
              </>
            )}
          </View>
        )}

        {isMaxLevel && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Star size={14} color="#fbbf24" />
            <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
              Maximum level achieved!
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}
