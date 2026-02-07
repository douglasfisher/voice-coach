/**
 * Admin Cost Center Screen
 *
 * Comprehensive AI cost tracking and budget management dashboard.
 * Displays cost metrics, trends, breakdowns, and budget controls.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Zap,
  DollarSign,
  Bot,
  User,
  Cpu,
  RefreshCw,
  Layers,
} from 'lucide-react-native';
import { useAdminCostStore } from '../../stores/adminCostStore';
import { CostHeroCards } from '../../components/admin/CostHeroCards';
import { CostTrendChart } from '../../components/admin/CostTrendChart';
import { BudgetManager } from '../../components/admin/BudgetManager';
import { CostBreakdown, formatCostDollars } from '../../types/costs';

type BreakdownTab = 'model' | 'persona' | 'user' | 'task';

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

interface BreakdownRowProps {
  item: CostBreakdown;
  icon: React.ReactNode;
  rank?: number;
}

function BreakdownRow({ item, icon, rank }: BreakdownRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {rank !== undefined && (
          <Text
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 12,
              width: 24,
            }}
          >
            {rank}.
          </Text>
        )}
        <View style={{ marginRight: 12 }}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
            {formatNumber(item.tokens)} tokens | {item.requests} requests
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: '#10b981', fontSize: 15, fontWeight: '600' }}>
          {formatCostDollars(item.costCents)}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
          {item.percentOfTotal.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

function EfficiencyMetricsCard({
  metrics,
}: {
  metrics: {
    costPerConversation: number;
    costPerActiveUser: number;
    averageRequestCost: number;
    tokensPerDollar: number;
  } | null;
}) {
  if (!metrics) return null;

  const items = [
    {
      label: 'Cost per Conversation',
      value: formatCostDollars(metrics.costPerConversation),
      icon: <DollarSign size={16} color="#60a5fa" />,
    },
    {
      label: 'Cost per Active User',
      value: formatCostDollars(metrics.costPerActiveUser),
      icon: <User size={16} color="#c084fc" />,
    },
    {
      label: 'Avg Request Cost',
      value: formatCostDollars(metrics.averageRequestCost),
      icon: <Zap size={16} color="#f59e0b" />,
    },
    {
      label: 'Tokens per Dollar',
      value: formatNumber(metrics.tokensPerDollar),
      icon: <Cpu size={16} color="#10b981" />,
    },
  ];

  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        EFFICIENCY METRICS
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {items.map((item) => (
          <View
            key={item.label}
            style={{
              flex: 1,
              minWidth: 140,
              borderRadius: 12,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <LinearGradient
              colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
              style={{ padding: 14 }}
            >
              <View style={{ marginBottom: 8 }}>{item.icon}</View>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                {item.value}
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                {item.label}
              </Text>
            </LinearGradient>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AdminCostsScreen() {
  const {
    metrics,
    budgets,
    activeBudget,
    trendData,
    byModel,
    byPersona,
    byUser,
    byTaskType,
    filters,
    isLoadingMetrics,
    isLoadingBudgets,
    isLoadingTrend,
    isLoadingBreakdown,
    isSavingBudget,
    fetchMetrics,
    fetchBudgets,
    fetchTrendData,
    fetchBreakdowns,
    createBudget,
    updateBudget,
    deleteBudget,
    setPeriod,
    refreshAll,
  } = useAdminCostStore();

  const [refreshing, setRefreshing] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('model');

  useEffect(() => {
    refreshAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const breakdownData: Record<BreakdownTab, CostBreakdown[]> = {
    model: byModel,
    persona: byPersona,
    user: byUser,
    task: byTaskType,
  };

  const breakdownIcons: Record<BreakdownTab, React.ReactNode> = {
    model: <Cpu size={16} color="#60a5fa" />,
    persona: <Bot size={16} color="#c084fc" />,
    user: <User size={16} color="#fbbf24" />,
    task: <Layers size={16} color="#10b981" />,
  };

  const isLoading = isLoadingMetrics || isLoadingBudgets;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
        {isLoading && !metrics ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : (
          <>
            {/* Hero Cards */}
            <CostHeroCards
              metrics={metrics}
              activeBudget={activeBudget}
              isLoading={isLoadingMetrics}
            />

            {/* Trend Chart */}
            <CostTrendChart
              data={trendData}
              period={filters.period}
              onPeriodChange={setPeriod}
              isLoading={isLoadingTrend}
            />

            {/* Efficiency Metrics */}
            <EfficiencyMetricsCard metrics={metrics} />

            {/* Cost Breakdown */}
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontWeight: '600',
                    letterSpacing: 1,
                  }}
                >
                  COST BREAKDOWN
                </Text>
              </View>

              {/* Tab Selector */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {(['model', 'task', 'persona', 'user'] as BreakdownTab[]).map((tab) => (
                  <Pressable
                    key={tab}
                    onPress={() => setBreakdownTab(tab)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor:
                        breakdownTab === tab
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(255,255,255,0.05)',
                      borderWidth: 1,
                      borderColor:
                        breakdownTab === tab
                          ? 'rgba(16, 185, 129, 0.5)'
                          : 'rgba(255,255,255,0.1)',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color:
                          breakdownTab === tab ? '#10b981' : 'rgba(255,255,255,0.6)',
                        fontSize: 13,
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}
                    >
                      By {tab}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Breakdown Table */}
              <View
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <LinearGradient
                  colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
                  style={{ padding: 16 }}
                >
                  {isLoadingBreakdown ? (
                    <View style={{ padding: 32, alignItems: 'center' }}>
                      <ActivityIndicator color="#10b981" />
                    </View>
                  ) : breakdownData[breakdownTab].length === 0 ? (
                    <View style={{ padding: 32, alignItems: 'center' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)' }}>
                        No data available
                      </Text>
                    </View>
                  ) : (
                    breakdownData[breakdownTab].slice(0, 10).map((item, index) => (
                      <BreakdownRow
                        key={item.id}
                        item={item}
                        icon={breakdownIcons[breakdownTab]}
                        rank={breakdownTab === 'user' ? index + 1 : undefined}
                      />
                    ))
                  )}
                </LinearGradient>
              </View>
            </View>

            {/* Budget Manager */}
            <BudgetManager
              budgets={budgets}
              onCreateBudget={createBudget}
              onUpdateBudget={updateBudget}
              onDeleteBudget={deleteBudget}
              isSaving={isSavingBudget}
            />

            {/* Last Updated */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 24,
              }}
            >
              <RefreshCw size={12} color="rgba(255,255,255,0.3)" />
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                Last updated: {new Date().toLocaleTimeString()}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
