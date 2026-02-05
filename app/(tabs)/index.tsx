import { View, Text, ScrollView, Pressable, Image, ImageSourcePropType, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame,
  Target,
  ChevronRight,
  MessageCircle,
  Zap,
  TrendingUp,
  Award,
  Brain,
  Sparkles,
  Users,
  RefreshCw,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { usePersonaStore } from '../../stores/personaStore';

export default function HomeScreen() {
  const { profile, user } = useAuthStore();
  const {
    conversations,
    fetchConversations,
    dailyChallenge,
    isLoadingChallenge,
    fetchDailyChallenge,
    startChallengeChat,
  } = useChatStore();
  const { getPersonaById, personas } = usePersonaStore();
  const [isStartingChallenge, setIsStartingChallenge] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchConversations(user.id);
    }
  }, [user?.id, fetchConversations]);

  // Fetch daily challenge when personas are available
  useEffect(() => {
    if (personas.length > 0) {
      fetchDailyChallenge(personas);
    }
  }, [personas, fetchDailyChallenge]);

  const activeConversations = conversations.filter((c) => c.status === 'active');
  const recentConversations = conversations.slice(0, 5);

  const greeting = getGreeting();
  const displayName = profile?.display_name ?? 'Thinker';

  // Get the persona for the daily challenge
  const challengePersona = dailyChallenge
    ? getPersonaById(dailyChallenge.personaId)
    : null;

  const handleStartChallenge = async () => {
    if (!user?.id) return;

    // If no daily challenge loaded, go to personas page instead
    if (!dailyChallenge) {
      router.push('/(tabs)/personas');
      return;
    }

    setIsStartingChallenge(true);
    try {
      const conversationId = await startChallengeChat(
        user.id,
        dailyChallenge.personaId,
        dailyChallenge.question,
        dailyChallenge.topic
      );

      if (conversationId) {
        router.push(`/(tabs)/chat/${conversationId}`);
      }
    } catch (error) {
      console.error('Failed to start challenge:', error);
    } finally {
      setIsStartingChallenge(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>{greeting}</Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>
            {displayName}
          </Text>
        </View>

        {/* Stats Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          style={{ marginBottom: 20 }}
        >
          {/* Streak Card */}
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 120,
              padding: 16,
              borderRadius: 20,
            }}
          >
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Flame size={20} color="#fff" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' }}>
              Streak
            </Text>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
              {profile?.streak_days ?? 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>days</Text>
          </LinearGradient>

          {/* Sessions Card */}
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 120,
              padding: 16,
              borderRadius: 20,
            }}
          >
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <MessageCircle size={20} color="#fff" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' }}>
              Sessions
            </Text>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
              {profile?.total_sessions ?? 0}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>completed</Text>
          </LinearGradient>

          {/* Level Card */}
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 120,
              padding: 16,
              borderRadius: 20,
            }}
          >
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <Award size={20} color="#fff" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' }}>
              Level
            </Text>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
              {profile?.current_level ?? 1}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>thinker</Text>
          </LinearGradient>

          {/* Growth Card */}
          <LinearGradient
            colors={['#EC4899', '#DB2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 120,
              padding: 16,
              borderRadius: 20,
            }}
          >
            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              <TrendingUp size={20} color="#fff" />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' }}>
              Growth
            </Text>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
              +12
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>this week</Text>
          </LinearGradient>
        </ScrollView>

        {/* Daily Challenge */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Pressable
            onPress={handleStartChallenge}
            disabled={isLoadingChallenge || isStartingChallenge}
          >
            <LinearGradient
              colors={['#1e3a5f', '#1a1a2e', '#0a0a0f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(96, 165, 250, 0.3)',
              }}
            >
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#60a5fa',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}>
                      <Target size={20} color="#0f0f12" />
                    </View>
                    <View>
                      <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
                        TODAY'S CHALLENGE
                      </Text>
                      {challengePersona && (
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
                          with {challengePersona.name}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{
                    backgroundColor: 'rgba(96, 165, 250, 0.2)',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}>
                    <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '600' }}>NEW</Text>
                  </View>
                </View>

                {isLoadingChallenge ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color="#60a5fa" />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 }}>
                      Generating today's challenge...
                    </Text>
                  </View>
                ) : dailyChallenge ? (
                  <>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', lineHeight: 28, marginBottom: 16 }}>
                      "{dailyChallenge.question}"
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Brain size={16} color="rgba(255,255,255,0.5)" />
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6 }}>
                          {dailyChallenge.topic}
                        </Text>
                      </View>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#60a5fa',
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 14,
                        opacity: isStartingChallenge ? 0.7 : 1,
                      }}>
                        {isStartingChallenge ? (
                          <ActivityIndicator size="small" color="#0f0f12" />
                        ) : (
                          <>
                            <Text style={{ color: '#0f0f12', fontWeight: '600', fontSize: 14 }}>Start</Text>
                            <ChevronRight size={18} color="#0f0f12" style={{ marginLeft: 4 }} />
                          </>
                        )}
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                      Unable to load challenge
                    </Text>
                    <Pressable
                      onPress={() => fetchDailyChallenge(personas)}
                      style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}
                    >
                      <RefreshCw size={14} color="#60a5fa" />
                      <Text style={{ color: '#60a5fa', fontSize: 12, marginLeft: 6 }}>Retry</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Active Conversation */}
        {activeConversations.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12 }}>
              CONTINUE WHERE YOU LEFT OFF
            </Text>
            {activeConversations.slice(0, 1).map((conv) => {
              const persona = getPersonaById(conv.persona_id);
              const imageSource = persona?.avatarUrl
                ? (typeof persona.avatarUrl === 'string' ? { uri: persona.avatarUrl } : persona.avatarUrl)
                : null;

              return (
                <Pressable
                  key={conv.id}
                  onPress={() => router.push(`/(tabs)/chat/${conv.id}`)}
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                    {imageSource && (
                      <Image
                        source={imageSource as ImageSourcePropType}
                        style={{ width: 56, height: 56, borderRadius: 16 }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                        {persona?.name ?? 'Unknown'}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
                        {conv.topic ?? 'Conversation in progress'}
                      </Text>
                    </View>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#F59E0B',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ChevronRight size={22} color="#0f0f12" />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Recent Sessions */}
        {recentConversations.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12 }}>
              RECENT SESSIONS
            </Text>
            <View
              style={{
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
              }}
            >
              {recentConversations.map((conv, index) => {
                const persona = getPersonaById(conv.persona_id);
                const imageSource = persona?.avatarUrl
                  ? (typeof persona.avatarUrl === 'string' ? { uri: persona.avatarUrl } : persona.avatarUrl)
                  : null;

                return (
                  <Pressable
                    key={conv.id}
                    onPress={() => router.push(`/(tabs)/chat/${conv.id}`)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderBottomWidth: index < recentConversations.length - 1 ? 1 : 0,
                      borderBottomColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {imageSource && (
                      <Image
                        source={imageSource as ImageSourcePropType}
                        style={{ width: 56, height: 56, borderRadius: 16 }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                        {persona?.name}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 3 }}>
                        {formatDate(conv.created_at)}
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 10,
                      backgroundColor: conv.status === 'active'
                        ? 'rgba(74, 222, 128, 0.15)'
                        : 'rgba(255,255,255,0.06)',
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '500',
                        color: conv.status === 'active' ? '#4ade80' : 'rgba(255,255,255,0.4)',
                      }}>
                        {conv.status === 'active' ? 'Active' : 'Completed'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Empty State */}
        {recentConversations.length === 0 && (
          <View style={{ paddingHorizontal: 16 }}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)', 'transparent']}
              style={{
                borderRadius: 24,
                padding: 32,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(139, 92, 246, 0.2)',
              }}
            >
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Users size={36} color="#8B5CF6" />
              </View>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                Ready to think sharper?
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
                Challenge your assumptions with our AI personas. Each one brings a unique perspective.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/personas')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#8B5CF6',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderRadius: 16,
                }}
              >
                <Sparkles size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                  Meet the Challengers
                </Text>
              </Pressable>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}
