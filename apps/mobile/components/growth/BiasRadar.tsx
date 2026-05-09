import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon, Circle, Line, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Brain, Eye, Heart, Lightbulb } from 'lucide-react-native';

interface BiasRadarProps {
  logical: number | null;
  biasAwareness: number | null;
  perspective: number | null;
  emotional: number | null;
}

const DIMENSIONS = [
  { key: 'logical', label: 'Logic', color: '#60a5fa', Icon: Brain },
  { key: 'biasAwareness', label: 'Bias Aware', color: '#c084fc', Icon: Eye },
  { key: 'perspective', label: 'Perspective', color: '#f472b6', Icon: Lightbulb },
  { key: 'emotional', label: 'Emotional IQ', color: '#4ade80', Icon: Heart },
];

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 75;

function polarToCartesian(
  angle: number,
  radius: number,
  center: number
): { x: number; y: number } {
  const radian = ((angle - 90) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(radian),
    y: center + radius * Math.sin(radian),
  };
}

export function BiasRadar({
  logical,
  biasAwareness,
  perspective,
  emotional,
}: BiasRadarProps) {
  const values = [logical ?? 0, biasAwareness ?? 0, perspective ?? 0, emotional ?? 0];
  const hasData = values.some((v) => v > 0);

  const angles = [0, 90, 180, 270];

  // Generate polygon points for the data
  const dataPoints = angles.map((angle, i) => {
    const value = (values[i] / 100) * RADIUS;
    return polarToCartesian(angle, value, CENTER);
  });

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Grid levels
  const gridLevels = [0.25, 0.5, 0.75, 1];

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
              backgroundColor: 'rgba(96, 165, 250, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Brain size={20} color="#60a5fa" />
          </View>
          <View>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
              Thinking Dimensions
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
              Your cognitive profile
            </Text>
          </View>
        </View>

        {/* Radar Chart */}
        <View style={{ alignItems: 'center' }}>
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <SvgGradient id="dataFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                <Stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1} />
              </SvgGradient>
            </Defs>

            {/* Grid circles */}
            {gridLevels.map((level, i) => (
              <Circle
                key={i}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS * level}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
              />
            ))}

            {/* Axis lines */}
            {angles.map((angle, i) => {
              const end = polarToCartesian(angle, RADIUS, CENTER);
              return (
                <Line
                  key={i}
                  x1={CENTER}
                  y1={CENTER}
                  x2={end.x}
                  y2={end.y}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                />
              );
            })}

            {/* Data polygon */}
            {hasData && (
              <Polygon
                points={dataPolygon}
                fill="url(#dataFill)"
                stroke="#F59E0B"
                strokeWidth={2}
              />
            )}

            {/* Data points with glow */}
            {hasData &&
              dataPoints.map((point, i) => (
                <Circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r={6}
                  fill="#F59E0B"
                  stroke="#0a0a0f"
                  strokeWidth={2}
                />
              ))}

            {/* Dimension icons (positioned at corners) */}
            {angles.map((angle, i) => {
              const iconPos = polarToCartesian(angle, RADIUS + 28, CENTER);
              return (
                <SvgText
                  key={i}
                  x={iconPos.x}
                  y={iconPos.y + 4}
                  fill={DIMENSIONS[i].color}
                  fontSize={11}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {values[i]}%
                </SvgText>
              );
            })}
          </Svg>
        </View>

        {/* Legend */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 12,
            marginTop: 16,
          }}
        >
          {DIMENSIONS.map((dim, _i) => {
            const DimIcon = dim.Icon;
            return (
              <View
                key={dim.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  backgroundColor: `${dim.color}10`,
                  borderWidth: 1,
                  borderColor: `${dim.color}30`,
                }}
              >
                <DimIcon size={14} color={dim.color} />
                <Text
                  style={{
                    color: dim.color,
                    fontSize: 11,
                    fontWeight: '600',
                    marginLeft: 6,
                  }}
                >
                  {dim.label}
                </Text>
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}
