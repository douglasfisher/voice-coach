/**
 * Cost Trend Chart Component
 *
 * Displays a line chart of daily costs over time.
 * Uses SVG for rendering (no external chart library needed).
 */

import { View, Text, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { CostTrendPoint, CostPeriod, formatCostDollars } from '../../types/costs';

interface CostTrendChartProps {
  data: CostTrendPoint[];
  period: CostPeriod;
  onPeriodChange: (period: CostPeriod) => void;
  isLoading?: boolean;
}

const PERIODS: { label: string; value: CostPeriod }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
];

const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 20, right: 16, bottom: 30, left: 60 };

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CostTrendChart({
  data,
  period,
  onPeriodChange,
  isLoading,
}: CostTrendChartProps) {
  const screenWidth = Dimensions.get('window').width - 32;
  const chartWidth = screenWidth - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // Calculate min/max for scaling
  const costs = data.map((d) => d.costCents);
  const maxCost = Math.max(...costs, 1);
  const minCost = Math.min(...costs, 0);
  const range = maxCost - minCost || 1;

  // Generate path data
  const getX = (index: number) =>
    CHART_PADDING.left + (index / Math.max(data.length - 1, 1)) * chartWidth;

  const getY = (value: number) =>
    CHART_PADDING.top + chartHeight - ((value - minCost) / range) * chartHeight;

  const pathData = data
    .map((point, i) => {
      const x = getX(i);
      const y = getY(point.costCents);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Area path (for gradient fill)
  const areaPath =
    pathData +
    ` L ${getX(data.length - 1)} ${CHART_HEIGHT - CHART_PADDING.bottom} L ${CHART_PADDING.left} ${CHART_HEIGHT - CHART_PADDING.bottom} Z`;

  // Y-axis labels
  const yLabels = [
    { value: maxCost, y: getY(maxCost) },
    { value: (maxCost + minCost) / 2, y: getY((maxCost + minCost) / 2) },
    { value: minCost, y: getY(minCost) },
  ];

  // X-axis labels (show ~5 labels)
  const xLabelInterval = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data.filter((_, i) => i % xLabelInterval === 0 || i === data.length - 1);

  // Total for period
  const totalCost = data.reduce((sum, d) => sum + d.costCents, 0);
  const avgCost = data.length > 0 ? totalCost / data.length : 0;

  return (
    <View
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <LinearGradient
        colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
        style={{ padding: 16 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <View>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Cost Trend
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
              {formatCostDollars(totalCost)} total | {formatCostDollars(Math.round(avgCost))}/day avg
            </Text>
          </View>

          {/* Period Selector */}
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {PERIODS.map((p) => (
              <Pressable
                key={p.value}
                onPress={() => onPeriodChange(p.value)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor:
                    period === p.value
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor:
                    period === p.value
                      ? 'rgba(16, 185, 129, 0.5)'
                      : 'rgba(255,255,255,0.1)',
                }}
              >
                <Text
                  style={{
                    color: period === p.value ? '#10b981' : 'rgba(255,255,255,0.6)',
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Chart */}
        {isLoading ? (
          <View
            style={{
              height: CHART_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Loading...</Text>
          </View>
        ) : data.length === 0 ? (
          <View
            style={{
              height: CHART_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>No data available</Text>
          </View>
        ) : (
          <Svg width={screenWidth} height={CHART_HEIGHT}>
            <Defs>
              <SvgGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </SvgGradient>
            </Defs>

            {/* Grid lines */}
            {yLabels.map((label, i) => (
              <Line
                key={i}
                x1={CHART_PADDING.left}
                y1={label.y}
                x2={screenWidth - CHART_PADDING.right}
                y2={label.y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
            ))}

            {/* Y-axis labels */}
            {yLabels.map((label, i) => (
              <SvgText
                key={i}
                x={CHART_PADDING.left - 8}
                y={label.y + 4}
                fill="rgba(255,255,255,0.4)"
                fontSize={10}
                textAnchor="end"
              >
                {formatCostDollars(label.value)}
              </SvgText>
            ))}

            {/* Area fill */}
            <Path d={areaPath} fill="url(#areaGradient)" />

            {/* Line */}
            <Path
              d={pathData}
              fill="none"
              stroke="#10b981"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {data.map((point, i) => (
              <Circle
                key={i}
                cx={getX(i)}
                cy={getY(point.costCents)}
                r={3}
                fill="#10b981"
                stroke="#0a0a0f"
                strokeWidth={1}
              />
            ))}

            {/* X-axis labels */}
            {xLabels.map((point, i) => {
              const originalIndex = data.indexOf(point);
              return (
                <SvgText
                  key={i}
                  x={getX(originalIndex)}
                  y={CHART_HEIGHT - 8}
                  fill="rgba(255,255,255,0.4)"
                  fontSize={10}
                  textAnchor="middle"
                >
                  {formatShortDate(point.date)}
                </SvgText>
              );
            })}
          </Svg>
        )}
      </LinearGradient>
    </View>
  );
}
