import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { TrendingUp, BarChart3 } from 'lucide-react-native';

interface DataPoint {
  date: string;
  score: number | null;
}

interface TrendGraphProps {
  data: DataPoint[];
  title?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRAPH_WIDTH = SCREEN_WIDTH - 80;
const GRAPH_HEIGHT = 160;
const PADDING = { top: 20, right: 20, bottom: 35, left: 45 };

export function TrendGraph({ data, title = 'Progress Over Time' }: TrendGraphProps) {
  const validData = data.filter((d) => d.score !== null) as {
    date: string;
    score: number;
  }[];

  if (validData.length < 2) {
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
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <BarChart3 size={20} color="#F59E0B" />
            </View>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{title}</Text>
          </View>

          {/* Empty state */}
          <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}>
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
              <TrendingUp size={28} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              Not enough data yet
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Complete more conversations to see your progress
            </Text>
          </View>
        </LinearGradient>
      </View>
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

  // Create smooth curve path using bezier curves
  const createSmoothPath = () => {
    if (validData.length < 2) return '';

    const points = validData.map((d, i) => ({
      x: xScale(i),
      y: yScale(d.score),
    }));

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }

    return path;
  };

  // Create area fill path
  const createAreaPath = () => {
    const linePath = createSmoothPath();
    const lastPoint = validData[validData.length - 1];
    const firstPoint = validData[0];
    return `${linePath} L ${xScale(validData.length - 1)} ${PADDING.top + chartHeight} L ${PADDING.left} ${PADDING.top + chartHeight} Z`;
  };

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = minScore + (maxScore - minScore) * (1 - ratio);
    const y = PADDING.top + chartHeight * ratio;
    return { value: Math.round(value), y };
  });

  // Calculate trend
  const trend = scores[scores.length - 1] > scores[0] ? 'improving' : scores[scores.length - 1] < scores[0] ? 'declining' : 'stable';
  const trendColor = trend === 'improving' ? '#4ade80' : trend === 'declining' ? '#f87171' : '#fbbf24';

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <TrendingUp size={20} color="#F59E0B" />
            </View>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{title}</Text>
          </View>

          {/* Trend indicator */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 12,
              backgroundColor: `${trendColor}15`,
              borderWidth: 1,
              borderColor: `${trendColor}30`,
            }}
          >
            <TrendingUp size={14} color={trendColor} />
            <Text style={{ color: trendColor, fontSize: 11, fontWeight: '600', marginLeft: 4, textTransform: 'capitalize' }}>
              {trend}
            </Text>
          </View>
        </View>

        <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
          <Defs>
            <SvgGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
              <Stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
            </SvgGradient>
          </Defs>

          {/* Grid lines */}
          {gridLines.map((line, i) => (
            <React.Fragment key={i}>
              <Line
                x1={PADDING.left}
                y1={line.y}
                x2={GRAPH_WIDTH - PADDING.right}
                y2={line.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
              <SvgText
                x={PADDING.left - 10}
                y={line.y + 4}
                fill="rgba(255,255,255,0.4)"
                fontSize={10}
                textAnchor="end"
              >
                {line.value}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Area fill */}
          <Path
            d={createAreaPath()}
            fill="url(#areaGradient)"
          />

          {/* Line path */}
          <Path
            d={createSmoothPath()}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {validData.map((d, i) => (
            <React.Fragment key={i}>
              {/* Outer glow */}
              <Circle
                cx={xScale(i)}
                cy={yScale(d.score)}
                r={8}
                fill="#F59E0B"
                fillOpacity={0.2}
              />
              {/* Inner point */}
              <Circle
                cx={xScale(i)}
                cy={yScale(d.score)}
                r={5}
                fill="#F59E0B"
                stroke="#0a0a0f"
                strokeWidth={2}
              />
            </React.Fragment>
          ))}

          {/* X-axis labels */}
          <SvgText
            x={PADDING.left}
            y={GRAPH_HEIGHT - 8}
            fill="rgba(255,255,255,0.4)"
            fontSize={10}
            textAnchor="start"
          >
            {formatDate(validData[0].date)}
          </SvgText>
          <SvgText
            x={GRAPH_WIDTH - PADDING.right}
            y={GRAPH_HEIGHT - 8}
            fill="rgba(255,255,255,0.4)"
            fontSize={10}
            textAnchor="end"
          >
            {formatDate(validData[validData.length - 1].date)}
          </SvgText>
        </Svg>
      </LinearGradient>
    </View>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
