/**
 * Admin Personas Screen
 *
 * List and manage all personas with filtering, search, and quick actions.
 */

import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Switch,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  ChevronRight,
  User,
  Search,
  X,
} from 'lucide-react-native';
import { useAdminPersonaStore } from '../../stores/adminPersonaStore';
import { AdminPersonaView } from '../../types/admin';
import { resolvePersonaAvatarWithUrl } from '../../lib/personaImages';
import { supabase } from '../../lib/supabase';

// =============================================================================
// Types
// =============================================================================

type TypeFilter = 'all' | 'coach' | 'challenger';
type QuickFilter = 'active' | 'inactive' | 'premium' | 'mood';
type RecencyFilter = '1h' | '3h' | '8h' | '24h' | '48h' | '1w' | '1m' | null;

const RECENCY_OPTIONS: { key: NonNullable<RecencyFilter>; label: string; hours: number }[] = [
  { key: '1h', label: '1hr', hours: 1 },
  { key: '3h', label: '3hrs', hours: 3 },
  { key: '8h', label: '8hrs', hours: 8 },
  { key: '24h', label: '24hrs', hours: 24 },
  { key: '48h', label: '48hrs', hours: 48 },
  { key: '1w', label: 'Week', hours: 168 },
  { key: '1m', label: 'Month', hours: 720 },
];

interface PersonaListItemProps {
  persona: AdminPersonaView;
  domainName: string | null;
  onToggleActive: (id: string) => void;
  onToggleMoodShift: (id: string) => void;
  onTogglePremium: (id: string) => void;
  onEdit: (id: string) => void;
  isSaving: boolean;
}

// =============================================================================
// Filter Bar
// =============================================================================

function FilterBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  quickFilters,
  onQuickFilterToggle,
  recencyFilter,
  onRecencyFilterChange,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (t: TypeFilter) => void;
  quickFilters: Set<QuickFilter>;
  onQuickFilterToggle: (f: QuickFilter) => void;
  recencyFilter: RecencyFilter;
  onRecencyFilterChange: (f: RecencyFilter) => void;
}) {
  const typeOptions: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'coach', label: 'Coaches' },
    { key: 'challenger', label: 'Challengers' },
  ];

  const quickOptions: { key: QuickFilter; label: string; color: string }[] = [
    { key: 'active', label: 'Active', color: '#4ade80' },
    { key: 'inactive', label: 'Inactive', color: '#ef4444' },
    { key: 'premium', label: 'Premium', color: '#fbbf24' },
    { key: 'mood', label: 'Mood Shift', color: '#a855f7' },
  ];

  return (
    <View style={{ marginBottom: 16, gap: 12 }}>
      {/* Search */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 12,
          paddingHorizontal: 12,
          height: 44,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <Search size={18} color="rgba(255,255,255,0.4)" />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search by name or tagline..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          style={{
            flex: 1,
            color: '#fff',
            fontSize: 15,
            marginLeft: 8,
            paddingVertical: 0,
          }}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => onSearchChange('')} hitSlop={8}>
            <X size={18} color="rgba(255,255,255,0.4)" />
          </Pressable>
        )}
      </View>

      {/* Type Filter */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {typeOptions.map((opt) => {
          const isActive = typeFilter === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onTypeFilterChange(opt.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: isActive
                  ? 'rgba(245, 158, 11, 0.25)'
                  : 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: isActive
                  ? 'rgba(245, 158, 11, 0.5)'
                  : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text
                style={{
                  color: isActive ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Quick Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {quickOptions.map((opt) => {
          const isActive = quickFilters.has(opt.key);
          return (
            <Pressable
              key={opt.key}
              onPress={() => onQuickFilterToggle(opt.key)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: isActive
                  ? `${opt.color}20`
                  : 'rgba(255,255,255,0.04)',
                borderWidth: 1,
                borderColor: isActive
                  ? `${opt.color}50`
                  : 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  color: isActive ? opt.color : 'rgba(255,255,255,0.4)',
                  fontSize: 12,
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Created within */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginRight: 2 }}>
          Created:
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {RECENCY_OPTIONS.map((opt) => {
            const isActive = recencyFilter === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => onRecencyFilterChange(isActive ? null : opt.key)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 14,
                  backgroundColor: isActive
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: isActive
                    ? 'rgba(56, 189, 248, 0.5)'
                    : 'rgba(255,255,255,0.08)',
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#38bdf8' : 'rgba(255,255,255,0.4)',
                    fontSize: 11,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// =============================================================================
// Persona List Item
// =============================================================================

function PersonaListItem({
  persona,
  domainName,
  onToggleActive,
  onToggleMoodShift,
  onTogglePremium,
  onEdit,
  isSaving,
}: PersonaListItemProps) {
  const avatarSource = resolvePersonaAvatarWithUrl(persona.name, persona.avatar_url, persona.avatar_thumbnail_url);

  const isCoach = persona.persona_type === 'coach';
  const typeBadgeColor = isCoach ? '#3b82f6' : '#f97316';
  const typeBadgeBg = isCoach ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)';
  const typeLabel = isCoach ? 'Coach' : 'Challenger';

  const styleLabel = persona.coaching_style
    ? persona.coaching_style.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <Pressable
      onPress={() => onEdit(persona.id)}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: persona.is_active ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.08)',
      }}
    >
      <LinearGradient
        colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 14 }}
      >
        {/* Top row: Avatar + Info + Chevron */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Avatar - 3:4 portrait ratio */}
          <View
            style={{
              width: 60,
              height: 80,
              borderRadius: 10,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
              borderWidth: 2,
              borderColor: persona.is_active ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255,255,255,0.15)',
              overflow: 'hidden',
            }}
          >
            {avatarSource ? (
              <Image
                source={avatarSource}
                style={{ width: 56, height: 76, borderRadius: 8 }}
              />
            ) : (
              <User size={28} color="#F59E0B" />
            )}
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 3 }}
              numberOfLines={1}
            >
              {persona.name}
            </Text>
            <Text
              style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 6 }}
              numberOfLines={1}
            >
              {persona.tagline}
            </Text>

            {/* Type badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View
                style={{
                  backgroundColor: typeBadgeBg,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: typeBadgeColor, fontSize: 11, fontWeight: '600' }}>
                  {typeLabel}
                </Text>
              </View>
            </View>

            {/* Domain + Style */}
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }} numberOfLines={1}>
              {[domainName, styleLabel].filter(Boolean).join(' · ')}
            </Text>
          </View>

          {/* Chevron */}
          <ChevronRight size={20} color="rgba(255,255,255,0.25)" style={{ marginTop: 4 }} />
        </View>

        {/* Bottom row: Toggles + Sort order */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 12,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {/* Active toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            <Switch
              value={persona.is_active}
              onValueChange={() => onToggleActive(persona.id)}
              disabled={isSaving}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(74, 222, 128, 0.5)' }}
              thumbColor={persona.is_active ? '#4ade80' : 'rgba(255,255,255,0.5)'}
              ios_backgroundColor="rgba(255,255,255,0.1)"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 4 }}>
              Active
            </Text>
          </View>

          {/* Mood toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            <Switch
              value={persona.emotional_progression_enabled ?? false}
              onValueChange={() => onToggleMoodShift(persona.id)}
              disabled={isSaving}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(168, 85, 247, 0.5)' }}
              thumbColor={persona.emotional_progression_enabled ? '#a855f7' : 'rgba(255,255,255,0.5)'}
              ios_backgroundColor="rgba(255,255,255,0.1)"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 4 }}>
              Mood
            </Text>
          </View>

          {/* Premium toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            <Switch
              value={persona.is_premium}
              onValueChange={() => onTogglePremium(persona.id)}
              disabled={isSaving}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(251, 191, 36, 0.5)' }}
              thumbColor={persona.is_premium ? '#fbbf24' : 'rgba(255,255,255,0.5)'}
              ios_backgroundColor="rgba(255,255,255,0.1)"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 4 }}>
              Premium
            </Text>
          </View>

          {/* Sort order - right aligned */}
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginLeft: 'auto' }}>
            #{persona.sort_order}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// =============================================================================
// Main Screen
// =============================================================================

export default function AdminPersonasScreen() {
  const {
    personas,
    isLoading,
    isSaving,
    fetchPersonas,
    toggleActive,
    togglePremium,
    toggleEmotionalProgression,
  } = useAdminPersonaStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilter>>(new Set());
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>(null);
  const [domainMap, setDomainMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPersonas();
    // Fetch domain names for display
    supabase
      .from('coaching_domains')
      .select('id, name')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((d) => { map[d.id] = d.name; });
          setDomainMap(map);
        }
      });
  }, [fetchPersonas]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPersonas();
    setRefreshing(false);
  };

  const toggleQuickFilter = useCallback((filter: QuickFilter) => {
    setQuickFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        // active and inactive are mutually exclusive
        if (filter === 'active') next.delete('inactive');
        if (filter === 'inactive') next.delete('active');
        next.add(filter);
      }
      return next;
    });
  }, []);

  const isFiltered = searchQuery.length > 0 || typeFilter !== 'all' || quickFilters.size > 0 || recencyFilter !== null;

  const filteredPersonas = useMemo(() => {
    let result = personas;

    // Search filter
    if (searchQuery.length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.tagline?.toLowerCase().includes(q) ?? false)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((p) => p.persona_type === typeFilter);
    }

    // Quick filters (AND logic)
    if (quickFilters.has('active')) {
      result = result.filter((p) => p.is_active);
    }
    if (quickFilters.has('inactive')) {
      result = result.filter((p) => !p.is_active);
    }
    if (quickFilters.has('premium')) {
      result = result.filter((p) => p.is_premium);
    }
    if (quickFilters.has('mood')) {
      result = result.filter((p) => p.emotional_progression_enabled);
    }

    // Recency filter
    if (recencyFilter) {
      const opt = RECENCY_OPTIONS.find((o) => o.key === recencyFilter);
      if (opt) {
        const cutoff = new Date(Date.now() - opt.hours * 60 * 60 * 1000).toISOString();
        result = result.filter((p) => p.created_at >= cutoff);
      }
    }

    return result;
  }, [personas, searchQuery, typeFilter, quickFilters, recencyFilter]);

  const activePersonas = useMemo(
    () => filteredPersonas.filter((p) => p.is_active),
    [filteredPersonas]
  );
  const inactivePersonas = useMemo(
    () => filteredPersonas.filter((p) => !p.is_active),
    [filteredPersonas]
  );

  const handleToggleActive = async (id: string) => {
    await toggleActive(id);
  };

  const handleToggleMoodShift = async (id: string) => {
    await toggleEmotionalProgression(id);
  };

  const handleTogglePremium = async (id: string) => {
    await togglePremium(id);
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/persona/${id}`);
  };

  const handleCreateNew = () => {
    router.push('/admin/persona/wizard');
  };

  const renderPersonaList = (list: AdminPersonaView[]) =>
    list.map((persona) => (
      <PersonaListItem
        key={persona.id}
        persona={persona}
        domainName={persona.domain_id ? domainMap[persona.domain_id] ?? null : null}
        onToggleActive={handleToggleActive}
        onToggleMoodShift={handleToggleMoodShift}
        onTogglePremium={handleTogglePremium}
        onEdit={handleEdit}
        isSaving={isSaving}
      />
    ));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F59E0B"
          />
        }
      >
        {/* Create Button */}
        <Pressable
          onPress={handleCreateNew}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            borderRadius: 16,
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.3)',
            marginBottom: 16,
          }}
        >
          <Plus size={20} color="#F59E0B" />
          <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
            Create New Persona
          </Text>
        </Pressable>

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          quickFilters={quickFilters}
          onQuickFilterToggle={toggleQuickFilter}
          recencyFilter={recencyFilter}
          onRecencyFilterChange={setRecencyFilter}
        />

        {isLoading && personas.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : (
          <>
            {/* Section Header */}
            {isFiltered ? (
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
                SHOWING {filteredPersonas.length} OF {personas.length} PERSONAS
              </Text>
            ) : null}

            {/* Active Personas */}
            {activePersonas.length > 0 && (
              <>
                {!isFiltered && (
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
                    ACTIVE ({activePersonas.length})
                  </Text>
                )}
                {renderPersonaList(activePersonas)}
              </>
            )}

            {/* Inactive Personas */}
            {inactivePersonas.length > 0 && (
              <>
                {!isFiltered && (
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 12,
                      fontWeight: '600',
                      letterSpacing: 1,
                      marginBottom: 12,
                      marginLeft: 4,
                      marginTop: activePersonas.length > 0 ? 16 : 0,
                    }}
                  >
                    INACTIVE ({inactivePersonas.length})
                  </Text>
                )}
                {renderPersonaList(inactivePersonas)}
              </>
            )}

            {filteredPersonas.length === 0 && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>
                  {isFiltered ? 'No personas match your filters' : 'No personas found'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
