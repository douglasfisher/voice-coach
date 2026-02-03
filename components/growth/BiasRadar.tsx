import { View, Text } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Card } from '../ui/Card';

interface BiasRadarProps {
  logical: number | null;
  biasAwareness: number | null;
  perspective: number | null;
  emotional: number | null;
}

const LABELS = ['Logic', 'Bias Aware', 'Perspective', 'Emotional IQ'];
const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 70;

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

  // Grid lines (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <Card variant="elevated" padding="md">
      <Text className="text-text-primary font-semibold mb-4">
        Thinking Dimensions
      </Text>

      <View className="items-center">
        <Svg width={SIZE} height={SIZE}>
          {/* Grid circles */}
          {gridLevels.map((level, i) => (
            <Circle
              key={i}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS * level}
              fill="none"
              stroke="#252529"
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
                stroke="#252529"
                strokeWidth={1}
              />
            );
          })}

          {/* Data polygon */}
          {hasData && (
            <Polygon
              points={dataPolygon}
              fill="#F59E0B"
              fillOpacity={0.3}
              stroke="#F59E0B"
              strokeWidth={2}
            />
          )}

          {/* Data points */}
          {hasData &&
            dataPoints.map((point, i) => (
              <Circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={4}
                fill="#F59E0B"
              />
            ))}

          {/* Labels */}
          {angles.map((angle, i) => {
            const labelPos = polarToCartesian(angle, RADIUS + 20, CENTER);
            return (
              <SvgText
                key={i}
                x={labelPos.x}
                y={labelPos.y}
                fill="#A1A1A6"
                fontSize={10}
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {LABELS[i]}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      <View className="flex-row flex-wrap justify-center gap-4 mt-4">
        {LABELS.map((label, i) => (
          <View key={i} className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-accent-primary mr-2" />
            <Text className="text-text-muted text-xs">{label}: {values[i]}%</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
