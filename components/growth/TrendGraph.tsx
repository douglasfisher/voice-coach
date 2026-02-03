import { View, Text, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Card } from '../ui/Card';

interface DataPoint {
  date: string;
  score: number | null;
}

interface TrendGraphProps {
  data: DataPoint[];
  title?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_WIDTH = SCREEN_WIDTH - 64;
const GRAPH_HEIGHT = 150;
const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };

export function TrendGraph({ data, title = 'Progress Over Time' }: TrendGraphProps) {
  const validData = data.filter((d) => d.score !== null) as {
    date: string;
    score: number;
  }[];

  if (validData.length < 2) {
    return (
      <Card variant="elevated" padding="md">
        <Text className="text-text-primary font-semibold mb-4">{title}</Text>
        <View className="h-40 items-center justify-center">
          <Text className="text-text-muted">Not enough data yet</Text>
          <Text className="text-text-muted text-sm mt-1">
            Complete more conversations to see your progress
          </Text>
        </View>
      </Card>
    );
  }

  const scores = validData.map((d) => d.score);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);

  const chartWidth = GRAPH_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = GRAPH_HEIGHT - PADDING.top - PADDING.bottom;

  const xScale = (index: number) =>
    PADDING.left + (index / (validData.length - 1)) * chartWidth;

  const yScale = (value: number) =>
    PADDING.top + chartHeight - ((value - minScore) / (maxScore - minScore)) * chartHeight;

  // Create path
  const pathData = validData
    .map((d, i) => {
      const x = xScale(i);
      const y = yScale(d.score);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = minScore + (maxScore - minScore) * (1 - ratio);
    const y = PADDING.top + chartHeight * ratio;
    return { value: Math.round(value), y };
  });

  return (
    <Card variant="elevated" padding="md">
      <Text className="text-text-primary font-semibold mb-4">{title}</Text>

      <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <React.Fragment key={i}>
            <Line
              x1={PADDING.left}
              y1={line.y}
              x2={GRAPH_WIDTH - PADDING.right}
              y2={line.y}
              stroke="#252529"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <SvgText
              x={PADDING.left - 8}
              y={line.y + 4}
              fill="#6E6E73"
              fontSize={10}
              textAnchor="end"
            >
              {line.value}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Line path */}
        <Path
          d={pathData}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {validData.map((d, i) => (
          <Circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.score)}
            r={4}
            fill="#F59E0B"
          />
        ))}

        {/* X-axis labels (first and last date) */}
        <SvgText
          x={PADDING.left}
          y={GRAPH_HEIGHT - 5}
          fill="#6E6E73"
          fontSize={10}
          textAnchor="start"
        >
          {formatDate(validData[0].date)}
        </SvgText>
        <SvgText
          x={GRAPH_WIDTH - PADDING.right}
          y={GRAPH_HEIGHT - 5}
          fill="#6E6E73"
          fontSize={10}
          textAnchor="end"
        >
          {formatDate(validData[validData.length - 1].date)}
        </SvgText>
      </Svg>
    </Card>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Need to import React for JSX fragments
import React from 'react';
