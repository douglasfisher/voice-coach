import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Brain,
  Eye,
  Heart,
  Sparkles,
  Target,
} from 'lucide-react-native';
import { UserPattern } from '../../types/database';

interface PatternListProps {
  patterns: UserPattern[];
  maxItems?: number;
}

const trendConfig = {
  improving: {
    Icon: TrendingUp,
    color: '#4ade80',
    label: 'Improving',
  },
  stable: {
    Icon: Minus,
    color: '#fbbf24',
    label: 'Stable',
  },
  worsening: {
    Icon: TrendingDown,
    color: '#f87171',
    label: 'Worsening',
  },
};

const typeConfig: Record<string, { label: string; color: string; Icon: typeof Brain }> = {
  fallacy: { label: 'Logical Fallacy', color: '#f472b6', Icon: AlertTriangle },
  bias: { label: 'Cognitive Bias', color: '#fbbf24', Icon: Eye },
  gender_dynamic: { label: 'Gender Dynamic', color: '#c084fc', Icon: Heart },
  racial_assumption: { label: 'Cultural Assumption', color: '#60a5fa', Icon: Brain },
  emotional: { label: 'Emotional Reasoning', color: '#4ade80', Icon: Heart },
};

function formatPatternCode(code: string): string {
  return code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function PatternList({ patterns, maxItems = 10 }: PatternListProps) {
  const displayPatterns = patterns.slice(0, maxItems);

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
              backgroundColor: 'rgba(192, 132, 252, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Target size={20} color="#c084fc" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
              Your Patterns
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
              {displayPatterns.length > 0
                ? `${displayPatterns.length} patterns detected`
                : 'Track your thinking habits'}
            </Text>
          </View>
        </View>

        {displayPatterns.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: 'rgba(255,255,255,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Sparkles size={28} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              No patterns detected yet
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Complete more conversations to discover{'\n'}your thinking patterns
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {displayPatterns.map((pattern, index) => (
              <PatternItem key={pattern.id ?? index} pattern={pattern} />
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function PatternItem({ pattern }: { pattern: UserPattern }) {
  const trend = pattern.trend ?? 'stable';
  const trendInfo = trendConfig[trend];
  const TrendIcon = trendInfo.Icon;

  const typeInfo = typeConfig[pattern.pattern_type] || {
    label: pattern.pattern_type,
    color: '#9A9A9E',
    Icon: Brain,
  };
  const TypeIcon = typeInfo.Icon;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: `${typeInfo.color}20`,
      }}
    >
      {/* Icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${typeInfo.color}15`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <TypeIcon size={20} color={typeInfo.color} />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              color: '#fff',
              fontSize: 15,
              fontWeight: '600',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {formatPatternCode(pattern.pattern_code)}
          </Text>

          {/* Trend badge */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 10,
              backgroundColor: `${trendInfo.color}15`,
              borderWidth: 1,
              borderColor: `${trendInfo.color}30`,
            }}
          >
            <TrendIcon size={12} color={trendInfo.color} />
            <Text
              style={{
                color: trendInfo.color,
                fontSize: 10,
                fontWeight: '600',
                marginLeft: 3,
              }}
            >
              {trendInfo.label}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <Text style={{ color: typeInfo.color, fontSize: 12, fontWeight: '500' }}>
            {typeInfo.label}
          </Text>
          <View
            style={{
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: 'rgba(255,255,255,0.3)',
              marginHorizontal: 8,
            }}
          />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            {pattern.occurrence_count} occurrences
          </Text>
        </View>
      </View>
    </View>
  );
}
