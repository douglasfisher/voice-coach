/**
 * Cost Hero Cards Component
 *
 * Displays key cost metrics in a grid of hero cards:
 * - Total Spend (All Time)
 * - This Month's Spend
 * - Month-over-Month Change
 * - Budget Status
 */

import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
} from 'lucide-react-native';
import { CostMetrics, BudgetProgress, formatCostDollars, getChangeIndicator, getBudgetStatusColor } from '../../types/costs';

interface CostHeroCardsProps {
  metrics: CostMetrics | null;
  activeBudget: BudgetProgress | null;
  isLoading?: boolean;
}

interface HeroCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  gradientColors: [string, string];
  borderColor: string;
  valueColor?: string;
}

function HeroCard({
  icon,
  title,
  value,
  subtitle,
  gradientColors,
  borderColor,
  valueColor = '#fff',
}: HeroCardProps) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 150,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor,
      }}
    >
      <LinearGradient colors={gradientColors} style={{ padding: 16 }}>
        <View style={{ marginBottom: 8 }}>{icon}</View>
        <Text
          style={{
            color: valueColor,
            fontSize: 22,
            fontWeight: '700',
            marginBottom: 4,
          }}
        >
          {value}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' }}>
          {title}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
          {subtitle}
        </Text>
      </LinearGradient>
    </View>
  );
}

function BudgetCard({ budget }: { budget: BudgetProgress }) {
  const statusColor = getBudgetStatusColor(budget.percentUsed);
  const progressWidth = Math.min(100, budget.percentUsed);

  return (
    <View
      style={{
        flex: 1,
        minWidth: 150,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${statusColor}50`,
      }}
    >
      <LinearGradient
        colors={[`${statusColor}20`, `${statusColor}10`]}
        style={{ padding: 16 }}
      >
        <View style={{ marginBottom: 8 }}>
          <Target size={24} color={statusColor} />
        </View>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 }}>
          {Math.round(budget.percentUsed)}%
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' }}>
          Budget Used
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
          {budget.periodLabel}
        </Text>

        {/* Progress bar */}
        <View
          style={{
            height: 4,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
            marginTop: 12,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${progressWidth}%`,
              backgroundColor: statusColor,
              borderRadius: 2,
            }}
          />
        </View>

        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 6 }}>
          {formatCostDollars(budget.remainingCents)} remaining of{' '}
          {formatCostDollars(budget.budget.limit_cents)}
        </Text>
      </LinearGradient>
    </View>
  );
}

export function CostHeroCards({ metrics, activeBudget, isLoading }: CostHeroCardsProps) {
  if (isLoading || !metrics) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              minWidth: 150,
              height: 120,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          />
        ))}
      </View>
    );
  }

  const changeIndicator = getChangeIndicator(metrics.monthOverMonthChange);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
      {/* Total Spend - All Time */}
      <HeroCard
        icon={<DollarSign size={24} color="#10b981" />}
        title="Total Spend"
        value={formatCostDollars(metrics.totalAllTime)}
        subtitle="All time"
        gradientColors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
        borderColor="rgba(16, 185, 129, 0.3)"
      />

      {/* This Month */}
      <HeroCard
        icon={<Calendar size={24} color="#60a5fa" />}
        title="This Month"
        value={formatCostDollars(metrics.totalThisMonth)}
        subtitle={new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}
        gradientColors={['rgba(96, 165, 250, 0.15)', 'rgba(96, 165, 250, 0.05)']}
        borderColor="rgba(96, 165, 250, 0.3)"
      />

      {/* Month-over-Month Change */}
      <HeroCard
        icon={
          changeIndicator.isPositive ? (
            <TrendingUp size={24} color={changeIndicator.color} />
          ) : (
            <TrendingDown size={24} color={changeIndicator.color} />
          )
        }
        title="vs Last Month"
        value={changeIndicator.text}
        subtitle={`${formatCostDollars(metrics.totalLastMonth)} prev`}
        gradientColors={[`${changeIndicator.color}20`, `${changeIndicator.color}10`]}
        borderColor={`${changeIndicator.color}50`}
        valueColor={changeIndicator.color}
      />

      {/* Budget Status */}
      {activeBudget ? (
        <BudgetCard budget={activeBudget} />
      ) : (
        <HeroCard
          icon={<Target size={24} color="#6b7280" />}
          title="No Budget"
          value="--"
          subtitle="Set a budget"
          gradientColors={['rgba(107, 114, 128, 0.15)', 'rgba(107, 114, 128, 0.05)']}
          borderColor="rgba(107, 114, 128, 0.3)"
          valueColor="#6b7280"
        />
      )}
    </View>
  );
}
