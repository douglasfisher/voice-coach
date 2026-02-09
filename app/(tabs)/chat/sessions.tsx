import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, Image, ImageSourcePropType, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react-native';
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

export default function SessionsScreen() {
  const [sessions, setSessions] = useState<CompletedSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      ) : (
        <FlatList
          data={sessions}
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
          contentContainerStyle={sessions.length === 0 ? { flex: 1 } : undefined}
        />
      )}

      {/* Bottom padding for tab bar */}
      <View style={{ height: 20 }} />
    </SafeAreaView>
  );
}
