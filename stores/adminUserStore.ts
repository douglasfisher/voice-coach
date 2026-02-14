/**
 * Admin User Store
 *
 * User management operations for the admin panel.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { AdminUserView } from '../types/admin';

interface AdminUserState {
  users: AdminUserView[];
  selectedUser: AdminUserView | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  searchQuery: string;
  totalCount: number;
  page: number;
  pageSize: number;

  // Actions
  fetchUsers: (options?: { search?: string; page?: number }) => Promise<void>;
  fetchUser: (id: string) => Promise<void>;
  toggleAdmin: (id: string) => Promise<{ error: Error | null }>;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
  clearSelectedUser: () => void;
}

export const useAdminUserStore = create<AdminUserState>((set, get) => ({
  users: [],
  selectedUser: null,
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: '',
  totalCount: 0,
  page: 0,
  pageSize: 20,

  fetchUsers: async (options = {}) => {
    const { searchQuery: currentSearch, page: currentPage, pageSize } = get();
    const search = options.search ?? currentSearch;
    const page = options.page ?? currentPage;

    set({ isLoading: true, error: null, searchQuery: search, page });

    try {
      // Build query
      let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply search filter
      if (search.trim()) {
        query = query.or(`display_name.ilike.%${search}%`);
      }

      const { data: profiles, error, count } = await query;

      if (error) throw error;

      // Get usage stats for each user
      const userIds = (profiles || []).map((p) => p.id);

      // Get conversation counts
      const { data: convCounts } = await supabase
        .from('conversations')
        .select('user_id')
        .in('user_id', userIds);

      const convCountMap = (convCounts || []).reduce((acc, c) => {
        acc[c.user_id] = (acc[c.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get usage stats
      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('user_id, total_tokens, estimated_cost_cents')
        .in('user_id', userIds);

      const usageMap = (usageData || []).reduce((acc, u) => {
        if (!acc[u.user_id]) {
          acc[u.user_id] = { tokens: 0, cost: 0 };
        }
        acc[u.user_id].tokens += u.total_tokens;
        acc[u.user_id].cost += u.estimated_cost_cents;
        return acc;
      }, {} as Record<string, { tokens: number; cost: number }>);

      // Transform to AdminUserView
      const users: AdminUserView[] = (profiles || []).map((p) => ({
        ...p,
        conversation_count: convCountMap[p.id] || 0,
        total_tokens_used: usageMap[p.id]?.tokens || 0,
        total_cost_cents: usageMap[p.id]?.cost || 0,
      }));

      set({ users, totalCount: count || 0 });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUser: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get detailed stats
      const { count: conversationCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);

      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', supabase.rpc('get_user_conversation_ids', { uid: id }));

      const { data: usageData } = await supabase
        .from('ai_usage')
        .select('total_tokens, estimated_cost_cents')
        .eq('user_id', id);

      const totalTokens = (usageData || []).reduce((sum, u) => sum + u.total_tokens, 0);
      const totalCost = (usageData || []).reduce((sum, u) => sum + u.estimated_cost_cents, 0);

      set({
        selectedUser: {
          ...profile,
          conversation_count: conversationCount || 0,
          message_count: messageCount || 0,
          total_tokens_used: totalTokens,
          total_cost_cents: totalCost,
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  toggleAdmin: async (id: string) => {
    set({ isSaving: true, error: null });
    try {
      // Get current state
      const { users, selectedUser } = get();
      const user = users.find((u) => u.id === id) || selectedUser;
      if (!user) throw new Error('User not found');

      const newAdminState = !user.is_admin;

      const { error } = await supabase
        .from('user_profiles')
        .update({ is_admin: newAdminState })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      set({
        users: users.map((u) =>
          u.id === id ? { ...u, is_admin: newAdminState } : u
        ),
        selectedUser:
          selectedUser?.id === id
            ? { ...selectedUser, is_admin: newAdminState }
            : selectedUser,
      });

      return { error: null };
    } catch (error) {
      set({ error: (error as Error).message });
      return { error: error as Error };
    } finally {
      set({ isSaving: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setPage: (page: number) => {
    set({ page });
  },

  clearSelectedUser: () => {
    set({ selectedUser: null });
  },
}));
