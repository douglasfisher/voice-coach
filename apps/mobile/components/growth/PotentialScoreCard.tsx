import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Target, TrendingUp } from 'lucide-react-native';

interface PotentialScoreCardProps {
  currentScore: number | null;
  projectedScore: number | null;
  optimalScore: number | null;
  velocity: number | null;
  velocityTrend: 'accelerating' | 'stable' | 'decelerating' | null;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2 - 20;

export function PotentialScoreCard({
  currentScore,
  projectedScore,
  optimalScore,
  velocity,
  velocityTrend,
}: PotentialScoreCardProps) {
  const current = currentScore ?? 0;
  const projected = projectedScore ?? current;
  const optimal = optimalScore ?? 85;

  // Calculate circumference and dash offsets
  const circumference = 2 * Math.PI * RADIUS;
  const currentDash = (current / 100) * circumference;
  const _projectedDash = (projected / 100) * circumference;
  const optimalDash = (optimal / 100) * circumference;

  const velocityColor =
    velocityTrend === 'accelerating'
      ? '#4ade80'
      : velocityTrend === 'decelerating'
      ? '#f87171'
      : '#fbbf24';

  const velocityLabel =
    velocityTrend === 'accelerating'
      ? 'Accelerating'
      : velocityTrend === 'decelerating'
      ? 'Slowing'
      : 'Steady';

  return (
    <View
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
      }}
    >
      <LinearGradient
        colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 24, alignItems: 'center' }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Target size={20} color="#F59E0B" />
          </View>
          <View>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
              Your Potential
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
              Current vs projected growth
            </Text>
          </View>
        </View>

        {/* Concentric rings chart */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <SvgGradient id="currentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#F59E0B" />
                <Stop offset="100%" stopColor="#D97706" />
              </SvgGradient>
            </Defs>

            {/* Background rings */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={STROKE_WIDTH}
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS - 18}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={STROKE_WIDTH - 2}
            />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS - 34}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={STROKE_WIDTH - 4}
            />

            {/* Optimal potential (outermost, faint) */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS - 34}
              fill="none"
              stroke="#4ade80"
              strokeWidth={STROKE_WIDTH - 4}
              strokeDasharray={`${optimalDash} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              opacity={0.3}
            />

            {/* Projected score (middle, dashed) */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS - 18}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={STROKE_WIDTH - 2}
              strokeDasharray={`${(projected / 100) * (2 * Math.PI * (RADIUS - 18)) * 0.1} ${(2 * Math.PI * (RADIUS - 18)) * 0.02}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              opacity={0.5}
            />

            {/* Current score (innermost, solid) */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="url(#currentGradient)"
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={`${currentDash} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />
          </Svg>

          {/* Center content */}
          <View
            style={{
              position: 'absolute',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 48,
                fontWeight: '800',
                color: '#F59E0B',
                includeFontPadding: false,
              }}
            >
              {currentScore ?? '--'}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: 'rgba(255,255,255,0.5)',
                marginTop: 4,
              }}
            >
              Overall Score
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 20,
            marginTop: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#F59E0B',
                marginRight: 6,
              }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              Current
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: 'rgba(245, 158, 11, 0.5)',
                marginRight: 6,
              }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              30-Day: {projected}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: 'rgba(74, 222, 128, 0.3)',
                marginRight: 6,
              }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              Potential: {optimal}
            </Text>
          </View>
        </View>

        {/* Velocity indicator */}
        {velocity !== null && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 16,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: `${velocityColor}15`,
              borderWidth: 1,
              borderColor: `${velocityColor}30`,
            }}
          >
            <TrendingUp size={14} color={velocityColor} />
            <Text
              style={{
                color: velocityColor,
                fontSize: 12,
                fontWeight: '600',
                marginLeft: 6,
              }}
            >
              {velocity > 0 ? '+' : ''}
              {velocity.toFixed(1)} pts/week
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                marginLeft: 8,
              }}
            >
              {velocityLabel}
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}
