/**
 * Admin Users Screen
 *
 * User management with search, stats, and admin toggle.
 */

import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  User,
  MessageSquare,
  Zap,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useAdminUserStore } from '../../stores/adminUserStore';
import { AdminUserView } from '../../types/admin';

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

interface UserListItemProps {
  user: AdminUserView;
  onToggleAdmin: (id: string) => void;
  isSaving: boolean;
}

function UserListItem({ user, onToggleAdmin, isSaving }: UserListItemProps) {
  const lastActive = user.last_session_at
    ? new Date(user.last_session_at).toLocaleDateString()
    : 'Never';

  return (
    <View
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: user.is_admin ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.1)',
      }}
    >
      <LinearGradient
        colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Avatar */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: user.is_admin
                ? 'rgba(245, 158, 11, 0.2)'
                : 'rgba(96, 165, 250, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            {user.is_admin ? (
              <Shield size={22} color="#F59E0B" />
            ) : (
              <User size={22} color="#60a5fa" />
            )}
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                {user.display_name || 'Anonymous'}
              </Text>
              {user.is_admin && (
                <View
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    marginLeft: 8,
                  }}
                >
                  <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '600' }}>
                    ADMIN
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 6 }}>
              Level {user.current_level} · Last active: {lastActive}
            </Text>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MessageSquare size={12} color="rgba(255,255,255,0.4)" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 4 }}>
                  {user.conversation_count || 0}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Zap size={12} color="rgba(255,255,255,0.4)" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 4 }}>
                  {formatNumber(user.total_tokens_used || 0)}
                </Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                {formatCost(user.total_cost_cents || 0)}
              </Text>
            </View>
          </View>

          {/* Admin Toggle */}
          <View style={{ alignItems: 'center', marginLeft: 12 }}>
            <Switch
              value={user.is_admin}
              onValueChange={() => onToggleAdmin(user.id)}
              disabled={isSaving}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(245, 158, 11, 0.5)' }}
              thumbColor={user.is_admin ? '#F59E0B' : 'rgba(255,255,255,0.5)'}
              ios_backgroundColor="rgba(255,255,255,0.1)"
            />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4 }}>
              Admin
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export default function AdminUsersScreen() {
  const {
    users,
    isLoading,
    isSaving,
    searchQuery,
    totalCount,
    page,
    pageSize,
    fetchUsers,
    toggleAdmin,
    setSearchQuery: _setSearchQuery,
    setPage,
  } = useAdminUserStore();

  const [refreshing, setRefreshing] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleSearch = useCallback(() => {
    setPage(0);
    fetchUsers({ search: localSearch, page: 0 });
  }, [localSearch, fetchUsers, setPage]);

  const handleToggleAdmin = async (id: string) => {
    await toggleAdmin(id);
  };

  const handleNextPage = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUsers({ page: nextPage });
  };

  const handlePrevPage = () => {
    const prevPage = Math.max(0, page - 1);
    setPage(prevPage);
    fetchUsers({ page: prevPage });
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages - 1;
  const hasPrevPage = page > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      {/* Search Bar */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            paddingHorizontal: 14,
          }}
        >
          <Search size={18} color="rgba(255,255,255,0.4)" />
          <TextInput
            value={localSearch}
            onChangeText={setLocalSearch}
            onSubmitEditing={handleSearch}
            placeholder="Search users..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            returnKeyType="search"
            style={{
              flex: 1,
              color: '#fff',
              fontSize: 15,
              paddingVertical: 14,
              paddingHorizontal: 12,
            }}
          />
          {localSearch.length > 0 && (
            <Pressable
              onPress={() => {
                setLocalSearch('');
                setPage(0);
                fetchUsers({ search: '', page: 0 });
              }}
            >
              <Text style={{ color: '#F59E0B', fontSize: 13 }}>Clear</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Results count */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          {totalCount} users found
          {searchQuery && ` for "${searchQuery}"`}
        </Text>
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
        {isLoading && users.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : (
          <>
            {users.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                onToggleAdmin={handleToggleAdmin}
                isSaving={isSaving}
              />
            ))}

            {users.length === 0 && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
                  No users found
                </Text>
              </View>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: 16,
                  gap: 20,
                }}
              >
                <Pressable
                  onPress={handlePrevPage}
                  disabled={!hasPrevPage || isLoading}
                  style={{
                    opacity: hasPrevPage ? 1 : 0.3,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  }}
                >
                  <ChevronLeft size={20} color="#fff" />
                </Pressable>

                <Text style={{ color: '#fff', fontSize: 14 }}>
                  Page {page + 1} of {totalPages}
                </Text>

                <Pressable
                  onPress={handleNextPage}
                  disabled={!hasNextPage || isLoading}
                  style={{
                    opacity: hasNextPage ? 1 : 0.3,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                  }}
                >
                  <ChevronRight size={20} color="#fff" />
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
