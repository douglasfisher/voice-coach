/**
 * Admin Usage Screen
 *
 * AI usage statistics and cost breakdown.
 */

import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Zap,
  DollarSign,
  Bot,
  User,
  TrendingUp,
} from 'lucide-react-native';
import { useAdminStatsStore } from '../../stores/adminStatsStore';
import { DateRangePreset } from '../../types/admin';

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatCost(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

const DATE_RANGES: { label: string; value: DateRangePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
  { label: 'All', value: 'all' },
];

interface StatRowProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  color?: string;
}

function StatRow({ label, value, subValue, icon, color = '#fff' }: StatRowProps) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon && <View style={{ marginRight: 12 }}>{icon}</View>}
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{label}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color, fontSize: 15, fontWeight: '600' }}>
          {typeof value === 'number' ? formatNumber(value) : value}
        </Text>
        {subValue && (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
            {subValue}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function AdminUsageScreen() {
  const {
    usageSummary,
    dateRange,
    isLoadingUsage,
    fetchUsageSummary,
    setDateRange,
  } = useAdminStatsStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUsageSummary();
  }, [fetchUsageSummary]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsageSummary();
    setRefreshing(false);
  };

  const summary = usageSummary;
  const activeRange = dateRange.preset || 'month';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      {/* Date Range Selector */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {DATE_RANGES.map((range) => (
            <Pressable
              key={range.value}
              onPress={() => setDateRange(range.value)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor:
                  activeRange === range.value
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor:
                  activeRange === range.value
                    ? 'rgba(245, 158, 11, 0.5)'
                    : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text
                style={{
                  color: activeRange === range.value ? '#F59E0B' : '#fff',
                  fontSize: 13,
                  fontWeight: '500',
                }}
              >
                {range.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F59E0B"
          />
        }
      >
        {isLoadingUsage && !summary ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : summary ? (
          <>
            {/* Summary Cards */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              >
                <LinearGradient
                  colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
                  style={{ padding: 16 }}
                >
                  <Zap size={24} color="#F59E0B" />
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 8 }}>
                    {formatNumber(summary.allTime.totalTokens)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                    Total Tokens
                  </Text>
                </LinearGradient>
              </View>

              <View
                style={{
                  flex: 1,
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(74, 222, 128, 0.3)',
                }}
              >
                <LinearGradient
                  colors={['rgba(74, 222, 128, 0.15)', 'rgba(74, 222, 128, 0.05)']}
                  style={{ padding: 16 }}
                >
                  <DollarSign size={24} color="#4ade80" />
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 8 }}>
                    {formatCost(summary.allTime.totalCostCents)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                    Total Cost
                  </Text>
                </LinearGradient>
              </View>
            </View>

            {/* Period Stats */}
            <Text
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12,
                fontWeight: '600',
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              USAGE BY PERIOD
            </Text>

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
                <StatRow
                  label="Today"
                  value={formatNumber(summary.today.totalTokens)}
                  subValue={formatCost(summary.today.totalCostCents)}
                />
                <StatRow
                  label="This Week"
                  value={formatNumber(summary.week.totalTokens)}
                  subValue={formatCost(summary.week.totalCostCents)}
                />
                <StatRow
                  label="This Month"
                  value={formatNumber(summary.month.totalTokens)}
                  subValue={formatCost(summary.month.totalCostCents)}
                />
                <StatRow
                  label="Total Requests"
                  value={summary.allTime.requestCount}
                />
              </LinearGradient>
            </View>

            {/* By Model */}
            {summary.byModel.length > 0 && (
              <>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontWeight: '600',
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  COST BY MODEL
                </Text>

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
                    {summary.byModel.map((model, _index) => (
                      <StatRow
                        key={model.model}
                        label={model.model}
                        value={formatCost(model.costCents)}
                        subValue={`${formatNumber(model.tokens)} tokens`}
                        icon={<TrendingUp size={16} color="#60a5fa" />}
                      />
                    ))}
                  </LinearGradient>
                </View>
              </>
            )}

            {/* By Persona */}
            {summary.byPersona.length > 0 && (
              <>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontWeight: '600',
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  COST BY PERSONA
                </Text>

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
                    {summary.byPersona.slice(0, 10).map((persona) => (
                      <StatRow
                        key={persona.personaId}
                        label={persona.personaName}
                        value={formatCost(persona.costCents)}
                        subValue={`${persona.requestCount} requests`}
                        icon={<Bot size={16} color="#c084fc" />}
                      />
                    ))}
                  </LinearGradient>
                </View>
              </>
            )}

            {/* Top Users */}
            {summary.topUsers.length > 0 && (
              <>
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontWeight: '600',
                    letterSpacing: 1,
                    marginBottom: 12,
                  }}
                >
                  TOP USERS BY USAGE
                </Text>

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
                    {summary.topUsers.map((user, index) => (
                      <StatRow
                        key={user.userId}
                        label={`${index + 1}. ${user.userName}`}
                        value={formatNumber(user.tokens)}
                        subValue={formatCost(user.costCents)}
                        icon={<User size={16} color="#fbbf24" />}
                      />
                    ))}
                  </LinearGradient>
                </View>
              </>
            )}
          </>
        ) : (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
              No usage data available
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
