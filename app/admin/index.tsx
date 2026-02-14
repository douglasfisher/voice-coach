/**
 * Admin Dashboard Screen
 *
 * Overview of app statistics including users, conversations,
 * token usage, and costs.
 */

import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  MessageSquare,
  Zap,
  DollarSign,
  UserCheck,
  Bot,
  ArrowLeft,
} from 'lucide-react-native';
import { useAdminStatsStore } from '../../stores/adminStatsStore';

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatCost(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  onPress?: () => void;
}

function StatCard({ icon, label, value, subValue, color, onPress }: StatCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: '45%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${color}30`,
      }}
    >
      <LinearGradient
        colors={[`${color}15`, `${color}05`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: `${color}20`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          {icon}
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 }}>
          {label}
        </Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>
          {typeof value === 'number' ? formatNumber(value) : value}
        </Text>
        {subValue && (
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
            {subValue}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export default function AdminDashboardScreen() {
  const { dashboardStats, isLoadingDashboard: _isLoadingDashboard, fetchDashboardStats } = useAdminStatsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardStats();
    setRefreshing(false);
  };

  const stats = dashboardStats;

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
            tintColor="#F59E0B"
          />
        }
      >
        {/* Back to App */}
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
            paddingVertical: 8,
          }}
        >
          <ArrowLeft size={20} color="#F59E0B" />
          <Text style={{ color: '#F59E0B', fontSize: 15, fontWeight: '500', marginLeft: 8 }}>
            Back to App
          </Text>
        </Pressable>

        {/* User Stats */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 12,
            marginLeft: 4,
          }}
        >
          USERS
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <StatCard
            icon={<Users size={20} color="#60a5fa" />}
            label="Total Users"
            value={stats?.totalUsers || 0}
            color="#60a5fa"
            onPress={() => router.push('/admin/users')}
          />
          <StatCard
            icon={<UserCheck size={20} color="#4ade80" />}
            label="Active Today"
            value={stats?.activeUsersToday || 0}
            subValue={`${stats?.activeUsersWeek || 0} this week`}
            color="#4ade80"
          />
        </View>

        {/* Content Stats */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 12,
            marginLeft: 4,
          }}
        >
          CONTENT
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <StatCard
            icon={<MessageSquare size={20} color="#c084fc" />}
            label="Conversations"
            value={stats?.totalConversations || 0}
            color="#c084fc"
          />
          <StatCard
            icon={<Bot size={20} color="#fbbf24" />}
            label="Active Personas"
            value={stats?.activePersonas || 0}
            color="#fbbf24"
            onPress={() => router.push('/admin/personas')}
          />
        </View>

        {/* Usage Stats */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 12,
            marginLeft: 4,
          }}
        >
          AI USAGE (TOKENS)
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <StatCard
            icon={<Zap size={20} color="#f472b6" />}
            label="Today"
            value={stats?.tokensToday || 0}
            color="#f472b6"
            onPress={() => router.push('/admin/usage')}
          />
          <StatCard
            icon={<Zap size={20} color="#fb923c" />}
            label="This Week"
            value={stats?.tokensWeek || 0}
            color="#fb923c"
            onPress={() => router.push('/admin/usage')}
          />
          <StatCard
            icon={<Zap size={20} color="#a78bfa" />}
            label="This Month"
            value={stats?.tokensMonth || 0}
            color="#a78bfa"
            onPress={() => router.push('/admin/usage')}
          />
        </View>

        {/* Cost Stats */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 12,
            marginLeft: 4,
          }}
        >
          ESTIMATED COSTS
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <StatCard
            icon={<DollarSign size={20} color="#4ade80" />}
            label="Today"
            value={formatCost(stats?.costToday || 0)}
            color="#4ade80"
          />
          <StatCard
            icon={<DollarSign size={20} color="#60a5fa" />}
            label="This Week"
            value={formatCost(stats?.costWeek || 0)}
            color="#60a5fa"
          />
          <StatCard
            icon={<DollarSign size={20} color="#fbbf24" />}
            label="This Month"
            value={formatCost(stats?.costMonth || 0)}
            color="#fbbf24"
          />
        </View>

        {/* Quick Actions */}
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 1,
            marginBottom: 12,
            marginLeft: 4,
          }}
        >
          QUICK ACTIONS
        </Text>

        <View style={{ gap: 12 }}>
          <Pressable
            onPress={() => router.push('/admin/personas')}
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.3)',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Bot size={20} color="#F59E0B" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500', marginLeft: 12, flex: 1 }}>
              Manage Personas
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              {stats?.activePersonas || 0} active
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/admin/settings')}
            style={{
              backgroundColor: 'rgba(96, 165, 250, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(96, 165, 250, 0.3)',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Zap size={20} color="#60a5fa" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500', marginLeft: 12, flex: 1 }}>
              App Settings
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
