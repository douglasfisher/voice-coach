import { View, Text, FlatList } from 'react-native';
import { Card } from '../ui/Card';
import { UserPattern } from '../../types/database';

interface PatternListProps {
  patterns: UserPattern[];
  maxItems?: number;
}

const trendIcons = {
  improving: '↑',
  stable: '→',
  worsening: '↓',
};

const trendColors = {
  improving: '#34D399',
  stable: '#FBBF24',
  worsening: '#F87171',
};

const typeLabels: Record<string, string> = {
  fallacy: 'Logical Fallacy',
  bias: 'Cognitive Bias',
  gender_dynamic: 'Gender Dynamic',
  racial_assumption: 'Cultural Assumption',
  emotional: 'Emotional Reasoning',
};

function formatPatternCode(code: string): string {
  return code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function PatternList({ patterns, maxItems = 10 }: PatternListProps) {
  const displayPatterns = patterns.slice(0, maxItems);

  if (displayPatterns.length === 0) {
    return (
      <Card variant="elevated" padding="md">
        <Text className="text-text-primary font-semibold mb-4">Your Patterns</Text>
        <View className="py-8 items-center">
          <Text className="text-text-muted">No patterns detected yet</Text>
          <Text className="text-text-muted text-sm mt-1 text-center">
            Complete more conversations to discover your thinking patterns
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="md">
      <Text className="text-text-primary font-semibold mb-4">Your Patterns</Text>

      <View className="space-y-3">
        {displayPatterns.map((pattern, index) => (
          <PatternItem key={pattern.id ?? index} pattern={pattern} />
        ))}
      </View>
    </Card>
  );
}

function PatternItem({ pattern }: { pattern: UserPattern }) {
  const trend = pattern.trend ?? 'stable';
  const trendColor = trendColors[trend];

  return (
    <View className="flex-row items-center p-3 rounded-xl bg-bg-secondary mb-2">
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-text-primary font-medium">
            {formatPatternCode(pattern.pattern_code)}
          </Text>
          {pattern.trend && (
            <View
              className="ml-2 flex-row items-center px-2 py-0.5 rounded-full"
              style={{ backgroundColor: trendColor + '20' }}
            >
              <Text style={{ color: trendColor }}>{trendIcons[trend]}</Text>
              <Text
                className="text-xs ml-1 capitalize"
                style={{ color: trendColor }}
              >
                {trend}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-text-muted text-sm mt-1">
          {typeLabels[pattern.pattern_type] ?? pattern.pattern_type}
        </Text>
      </View>

      <View className="items-end">
        <Text className="text-text-secondary font-semibold">
          {pattern.occurrence_count}×
        </Text>
        <Text className="text-text-muted text-xs">occurrences</Text>
      </View>
    </View>
  );
}
