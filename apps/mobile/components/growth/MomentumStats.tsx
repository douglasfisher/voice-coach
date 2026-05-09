import { View, Text } from 'react-native';
import { Calendar, Flame, BarChart2 } from 'lucide-react-native';
import { getStreakEmoji } from '../../lib/gamification';

interface MomentumStatsProps {
  sessionsThisWeek: number;
  currentStreak: number;
  percentileRank: number;
}

export function MomentumStats({
  sessionsThisWeek,
  currentStreak,
  percentileRank,
}: MomentumStatsProps) {
  const stats = [
    {
      icon: Calendar,
      value: sessionsThisWeek.toString(),
      label: 'This Week',
      color: '#60a5fa',
    },
    {
      icon: Flame,
      value: `${currentStreak}${getStreakEmoji(currentStreak)}`,
      label: 'Day Streak',
      color: currentStreak >= 7 ? '#f87171' : currentStreak >= 3 ? '#fbbf24' : '#6E6E73',
    },
    {
      icon: BarChart2,
      value: `Top ${100 - percentileRank}%`,
      label: 'Ranking',
      color: '#c084fc',
    },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 8,
      }}
    >
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <View
            key={index}
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: `${stat.color}15`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <IconComponent size={16} color={stat.color} />
            </View>
            <Text
              style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              {stat.value}
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 11,
                marginTop: 2,
              }}
            >
              {stat.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
