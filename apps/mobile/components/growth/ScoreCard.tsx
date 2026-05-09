import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react-native';

interface ScoreCardProps {
  score: number | null;
  label: string;
  trend?: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  gradient?: [string, string];
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
  declining: {
    Icon: TrendingDown,
    color: '#f87171',
    label: 'Declining',
  },
  insufficient_data: {
    Icon: HelpCircle,
    color: '#6E6E73',
    label: 'Need more data',
  },
};

export function ScoreCard({
  score,
  label,
  trend,
  color = '#F59E0B',
  size = 'md',
  gradient,
}: ScoreCardProps) {
  const sizeConfig = {
    sm: {
      padding: 14,
      scoreSize: 32,
      labelSize: 12,
      trendSize: 10,
    },
    md: {
      padding: 18,
      scoreSize: 42,
      labelSize: 14,
      trendSize: 11,
    },
    lg: {
      padding: 24,
      scoreSize: 56,
      labelSize: 16,
      trendSize: 12,
    },
  };

  const config = sizeConfig[size];
  const trendInfo = trend ? trendConfig[trend] : null;
  const TrendIcon = trendInfo?.Icon;

  // Default gradient based on color
  const cardGradient: [string, string] = gradient || [
    `${color}15`,
    `${color}08`,
  ];

  return (
    <View
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${color}30`,
      }}
    >
      <LinearGradient
        colors={cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: config.padding,
          alignItems: 'center',
        }}
      >
        {/* Score */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            style={{
              fontSize: config.scoreSize,
              fontWeight: '800',
              color: color,
              includeFontPadding: false,
            }}
          >
            {score ?? '--'}
          </Text>
          {score !== null && (
            <Text
              style={{
                fontSize: config.scoreSize * 0.35,
                fontWeight: '500',
                color: 'rgba(255,255,255,0.4)',
                marginLeft: 4,
                marginBottom: 4,
              }}
            >
              /100
            </Text>
          )}
        </View>

        {/* Label */}
        <Text
          style={{
            fontSize: config.labelSize,
            fontWeight: '500',
            color: 'rgba(255,255,255,0.7)',
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>

        {/* Trend badge */}
        {trendInfo && TrendIcon && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 10,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 12,
              backgroundColor: `${trendInfo.color}15`,
              borderWidth: 1,
              borderColor: `${trendInfo.color}30`,
            }}
          >
            <TrendIcon size={config.trendSize + 2} color={trendInfo.color} />
            <Text
              style={{
                fontSize: config.trendSize,
                fontWeight: '600',
                color: trendInfo.color,
                marginLeft: 4,
              }}
            >
              {trendInfo.label}
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}
