import { View, Text } from 'react-native';
import { Card } from '../ui/Card';

interface ScoreCardProps {
  score: number | null;
  label: string;
  trend?: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

const trendIcons = {
  improving: '↑',
  stable: '→',
  declining: '↓',
  insufficient_data: '•',
};

const trendColors = {
  improving: '#34D399',
  stable: '#FBBF24',
  declining: '#F87171',
  insufficient_data: '#6E6E73',
};

export function ScoreCard({
  score,
  label,
  trend,
  color = '#F59E0B',
  size = 'md',
}: ScoreCardProps) {
  const scoreSize = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  const containerSize = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <Card variant="elevated" padding="none" className={containerSize[size]}>
      <View className="items-center">
        <View className="flex-row items-end">
          <Text
            className={`${scoreSize[size]} font-bold`}
            style={{ color }}
          >
            {score ?? '--'}
          </Text>
          {score !== null && (
            <Text className="text-text-muted text-lg mb-1 ml-1">/100</Text>
          )}
        </View>

        <Text className="text-text-secondary mt-2">{label}</Text>

        {trend && (
          <View
            className="flex-row items-center mt-2 px-3 py-1 rounded-full"
            style={{ backgroundColor: trendColors[trend] + '20' }}
          >
            <Text style={{ color: trendColors[trend] }}>
              {trendIcons[trend]}
            </Text>
            <Text
              className="text-sm ml-1 capitalize"
              style={{ color: trendColors[trend] }}
            >
              {trend.replace('_', ' ')}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}
