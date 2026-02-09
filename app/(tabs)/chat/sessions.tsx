import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, Image, ImageSourcePropType, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore, usePersonaStore } from '../../../stores';

interface CompletedSession {
  id: string;
  persona_id: string;
  overall_score: number | null;
  ended_at: string | null;
  created_at: string;
}

const getScoreColor = (score: number | null) => {
  if (!score) return 'rgba(255,255,255,0.3)';
  if (score >= 75) return '#4ade80';
  if (score >= 50) return '#fbbf24';
  return '#f87171';
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

type TimeFilter = 'today' | '7d' | '14d' | '30d' | '60d' | '90d' | 'all';
type ScoreSort = 'off' | 'desc' | 'asc';

const TIME_FILTERS: { key: TimeFilter; label: string; days: number | null }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7d', days: 7 },
  { key: '14d', label: '14d', days: 14 },
  { key: '30d', label: '30d', days: 30 },
  { key: '60d', label: '60d', days: 60 },
  { key: '90d', label: '90d', days: 90 },
  { key: 'all', label: 'All', days: null },
];

const SCORE_SORT_CYCLE: ScoreSort[] = ['off', 'desc', 'asc'];

export default function SessionsScreen() {
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [scoreSort, setScoreSort] = useState<ScoreSort>('off');

  const { user } = useAuthStore();
  const { getPersonaById } = usePersonaStore();

  const fetchSessions = useCallback(async (showRefresh = false) => {
    if (!user?.id) return;
    if (showRefresh) setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, persona_id, overall_score, ended_at, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('overall_score', 'is', null)
        .order('ended_at', { ascending: false });

      if (error) throw error;
      setSessions(data ?? []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = useMemo(() => {
    let result = sessions;

    // Time filter
    const filterConfig = TIME_FILTERS.find((f) => f.key === timeFilter);
    if (filterConfig?.days != null) {
      const cutoff = Date.now() - filterConfig.days * 86400000;
      result = result.filter((s) => {
        const ts = new Date(s.ended_at || s.created_at).getTime();
        return ts >= cutoff;
      });
    }

    // Score sort
    if (scoreSort !== 'off') {
      result = [...result].sort((a, b) => {
        if (a.overall_score == null && b.overall_score == null) return 0;
        if (a.overall_score == null) return 1;
        if (b.overall_score == null) return -1;
        return scoreSort === 'desc'
          ? b.overall_score - a.overall_score
          : a.overall_score - b.overall_score;
      });
    }

    return result;
  }, [sessions, timeFilter, scoreSort]);

  const toggleScoreSort = useCallback(() => {
    setScoreSort((prev) => {
      const idx = SCORE_SORT_CYCLE.indexOf(prev);
      return SCORE_SORT_CYCLE[(idx + 1) % SCORE_SORT_CYCLE.length];
    });
  }, []);

  const ScoreSortIcon = scoreSort === 'asc' ? ArrowUp : scoreSort === 'desc' ? ArrowDown : ArrowUpDown;

  const renderItem = useCallback(({ item }: { item: CompletedSession }) => {
    const persona = getPersonaById(item.persona_id);
    const scoreColor = getScoreColor(item.overall_score);
    const imageSource = persona
      ? typeof persona.avatarUrl === 'string'
        ? { uri: persona.avatarUrl }
        : persona.avatarUrl
      : null;

    return (
      <Pressable
        onPress={() => router.push(`/(tabs)/chat/report/${item.id}`)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            overflow: 'hidden',
            marginRight: 12,
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        >
          {imageSource && (
            <Image
              source={imageSource as ImageSourcePropType}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>
            {persona?.name || 'Unknown Coach'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Clock size={12} color="rgba(255,255,255,0.4)" />
            <Text
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 13,
                marginLeft: 4,
              }}
            >
              {formatDate(item.ended_at || item.created_at)}
            </Text>
          </View>
        </View>

        {/* Score Badge */}
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            backgroundColor: `${scoreColor}20`,
            marginRight: 8,
          }}
        >
          <Text
            style={{
              color: scoreColor,
              fontSize: 14,
              fontWeight: '700',
            }}
          >
            {item.overall_score ?? '--'}
          </Text>
        </View>

        <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
      </Pressable>
    );
  }, [getPersonaById]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <ChevronLeft size={20} color="#fff" />
        </Pressable>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
          Past Sessions
        </Text>
      </View>

      {/* Filter chips + score sort */}
      {!isLoading && sessions.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            marginBottom: 4,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 12 }}
            style={{ flex: 1 }}
          >
            {TIME_FILTERS.map((f) => {
              const active = timeFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setTimeFilter(f.key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: active ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    borderColor: active ? 'rgba(245,158,11,0.5)' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: active ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                      fontSize: 13,
                      fontWeight: active ? '600' : '400',
                    }}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={toggleScoreSort}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: scoreSort !== 'off' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: scoreSort !== 'off' ? 'rgba(245,158,11,0.5)' : 'transparent',
              marginLeft: 8,
              gap: 4,
            }}
          >
            <ScoreSortIcon
              size={14}
              color={scoreSort !== 'off' ? '#F59E0B' : 'rgba(255,255,255,0.5)'}
            />
            <Text
              style={{
                color: scoreSort !== 'off' ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: scoreSort !== 'off' ? '600' : '400',
              }}
            >
              Score
            </Text>
          </Pressable>
        </View>
      )}

      {/* Session count */}
      {!isLoading && sessions.length > 0 && (
        <Text
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 12,
            paddingHorizontal: 20,
            marginBottom: 8,
            marginTop: 4,
          }}
        >
          {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
        </Text>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : sessions.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '500' }}>
            No completed sessions yet
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            Complete a coaching session to see your results here
          </Text>
        </View>
      ) : filteredSessions.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '500' }}>
            No sessions in this period
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 14,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            Try a wider time range or clear your filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchSessions(true)}
              tintColor="#F59E0B"
            />
          }
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            marginHorizontal: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        />
      )}

      {/* Bottom padding for tab bar */}
      <View style={{ height: 20 }} />
    </SafeAreaView>
  );
}
