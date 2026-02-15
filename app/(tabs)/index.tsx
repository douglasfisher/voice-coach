import { View, Text, ScrollView, Pressable, Image, ImageSourcePropType, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { HEADER_TOP_PADDING } from '../../constants/layout';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame,
  Target,
  ChevronRight,
  MessageCircle,
  Zap,
  TrendingUp,
  Brain,
  RefreshCw,
  GraduationCap,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { usePersonaStore } from '../../stores/personaStore';
import { PersonaCard } from '../../components/personas/PersonaCard';
import { PersonaModal } from '../../components/personas/PersonaModal';
import { PersonaDisplay } from '../../types/persona';
import { resolvePersonaAvatar } from '../../lib/personaImages';
import { useAppSetting } from '../../hooks/useAppSetting';
import { LevelBadge } from '../../components/growth/LevelBadge';
import { getBadgeForLevel, LEVELS } from '../../lib/gamification';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 16;

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const conversations = useChatStore((s) => s.conversations);
  const fetchConversations = useChatStore((s) => s.fetchConversations);
  const createConversation = useChatStore((s) => s.createConversation);
  const dailyChallenges = useChatStore((s) => s.dailyChallenges);
  const activeChallengeIndex = useChatStore((s) => s.activeChallengeIndex);
  const setActiveChallengeIndex = useChatStore((s) => s.setActiveChallengeIndex);
  const isLoadingChallenge = useChatStore((s) => s.isLoadingChallenge);
  const fetchDailyChallenges = useChatStore((s) => s.fetchDailyChallenges);
  const startChallengeChat = useChatStore((s) => s.startChallengeChat);
  const getPersonaById = usePersonaStore((s) => s.getPersonaById);
  const personas = usePersonaStore((s) => s.personas);
  const { value: showPersonaImage } = useAppSetting('challenge_show_persona_image');
  const [isStartingChallenge, setIsStartingChallenge] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaDisplay | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveChallengeIndex(viewableItems[0].index);
      }
    },
    [setActiveChallengeIndex]
  );
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  useEffect(() => {
    if (user?.id) {
      fetchConversations(user.id);
    }
  }, [user?.id, fetchConversations]);

  // Fetch daily challenges batch
  useEffect(() => {
    if (user?.id) {
      fetchDailyChallenges();
    }
  }, [user?.id, fetchDailyChallenges]);

  // Shuffle coaches and challengers once per mount
  const shuffledCoaches = useMemo(
    () => shuffle(personas.filter((p) => p.personaType === 'coach')),
    [personas]
  );
  const shuffledChallengers = useMemo(
    () => shuffle(personas.filter((p) => p.personaType === 'challenger')),
    [personas]
  );

  const featuredCoach = shuffledCoaches[0] ?? null;
  const scrollCoaches = shuffledCoaches.slice(1, 7);
  const featuredChallenger = shuffledChallengers[0] ?? null;
  const scrollChallengers = shuffledChallengers.slice(1, 7);

  const activeConversations = conversations.filter((c) => c.status === 'active');
  const recentConversations = conversations.slice(0, 5);

  const greeting = getGreeting();
  const displayName = profile?.display_name ?? 'Thinker';

  const handleStartChallenge = async (index: number) => {
    if (!user?.id) return;

    const challenge = dailyChallenges[index];
    if (!challenge) {
      router.push('/(tabs)/personas');
      return;
    }

    setIsStartingChallenge(true);
    try {
      const conversationId = await startChallengeChat(
        user.id,
        challenge.personaId,
        challenge.question,
        challenge.topic
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

  const handlePersonaChallenge = async (persona: PersonaDisplay) => {
    if (!user?.id) return;

    setIsCreatingSession(true);
    try {
      const conversationId = await createConversation(user.id, persona.id);
      if (conversationId) {
        setSelectedPersona(null);
        router.push(`/(tabs)/chat/${conversationId}`);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: HEADER_TOP_PADDING, paddingBottom: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>{greeting}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <LevelBadge level={profile?.current_level ?? 1} size="md" />
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginLeft: 8 }}>
              {displayName}
            </Text>
          </View>
        </View>

        {/* Daily Challenges Carousel */}
        <View style={{ marginBottom: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Target size={16} color="#60a5fa" />
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginLeft: 8 }}>
                TODAY'S CHALLENGES
              </Text>
            </View>
            {dailyChallenges.length > 1 && (
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                {activeChallengeIndex + 1}/{dailyChallenges.length}
              </Text>
            )}
          </View>

          {isLoadingChallenge ? (
            <View style={{ paddingHorizontal: 8 }}>
              <LinearGradient
                colors={['#1e3a5f', '#1a1a2e', '#0a0a0f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: 'rgba(96, 165, 250, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 40,
                }}
              >
                <ActivityIndicator size="small" color="#60a5fa" />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 }}>
                  Generating today's challenges...
                </Text>
              </LinearGradient>
            </View>
          ) : dailyChallenges.length > 0 ? (
            <>
              <FlatList
                data={dailyChallenges}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + 8}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: 8 }}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                keyExtractor={(_, i) => `challenge-${i}`}
                renderItem={({ item: challenge, index }) => {
                  const hasImage = showPersonaImage !== false && !!challenge.personaName;
                  const avatarSource = hasImage
                    ? resolvePersonaAvatar(challenge.personaName)
                    : null;

                  return (
                    <Pressable
                      onPress={() => handleStartChallenge(index)}
                      disabled={isStartingChallenge}
                      style={{ width: CARD_WIDTH, marginRight: 8 }}
                    >
                      <View style={{
                        borderRadius: 24,
                        overflow: 'hidden',
                        height: hasImage ? 552 : undefined,
                        borderWidth: 1,
                        borderColor: 'rgba(96, 165, 250, 0.3)',
                      }}>
                        {/* Full-bleed background image */}
                        {avatarSource && (
                          <Image
                            source={avatarSource}
                            style={{ position: 'absolute', width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        )}

                        {/* Gradient overlay — bottom half only when image shown */}
                        <LinearGradient
                          colors={hasImage
                            ? ['transparent', 'rgba(10,10,15,0.7)', 'rgba(10,10,15,0.97)']
                            : ['#1e3a5f', '#1a1a2e', '#0a0a0f']}
                          locations={hasImage ? [0, 0.35, 1] : undefined}
                          start={hasImage ? { x: 0, y: 0.5 } : { x: 0, y: 0 }}
                          end={{ x: hasImage ? 0 : 1, y: 1 }}
                          style={hasImage
                            ? { position: 'absolute', width: '100%', height: '100%' }
                            : { flex: 1 }}
                        />

                        {/* Content */}
                        <View style={{ flex: 1, justifyContent: 'space-between', padding: 20 }}>
                          {/* Top row: label + NEW badge */}
                          <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: hasImage ? 0 : 16,
                          }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {!hasImage && (
                                <View style={{
                                  width: 40, height: 40, borderRadius: 20,
                                  backgroundColor: '#60a5fa',
                                  alignItems: 'center', justifyContent: 'center',
                                  marginRight: 12,
                                }}>
                                  <Target size={20} color="#0f0f12" />
                                </View>
                              )}
                              <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
                                CHALLENGE
                              </Text>
                            </View>
                            <View style={{
                              backgroundColor: 'rgba(96, 165, 250, 0.2)',
                              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                            }}>
                              <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '600' }}>NEW</Text>
                            </View>
                          </View>

                          {/* Bottom content — pushed to bottom by flex space-between when image shown */}
                          <View>
                            {challenge.personaName ? (
                              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 6 }} numberOfLines={1}>
                                with {challenge.personaName}
                              </Text>
                            ) : null}

                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', lineHeight: 28, marginBottom: 16 }}>
                              "{challenge.question}"
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <Brain size={16} color="rgba(255,255,255,0.5)" />
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 6 }}>
                                  {challenge.topic}
                                </Text>
                              </View>
                              <View style={{
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: '#60a5fa',
                                paddingHorizontal: 8, paddingVertical: 10,
                                borderRadius: 14,
                                opacity: isStartingChallenge ? 0.7 : 1,
                              }}>
                                {isStartingChallenge ? (
                                  <ActivityIndicator size="small" color="#0f0f12" />
                                ) : (
                                  <>
                                    <Text style={{ color: '#0f0f12', fontWeight: '600', fontSize: 14, paddingLeft: 12 }}>Start</Text>
                                    <ChevronRight size={18} color="#0f0f12" style={{ marginLeft: 4 }} />
                                  </>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                }}
              />

              {/* Pagination dots */}
              {dailyChallenges.length > 1 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
                  {dailyChallenges.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: i === activeChallengeIndex ? 20 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: i === activeChallengeIndex ? '#60a5fa' : 'rgba(255,255,255,0.2)',
                        marginHorizontal: 3,
                      }}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={{ paddingHorizontal: 8 }}>
              <LinearGradient
                colors={['#1e3a5f', '#1a1a2e', '#0a0a0f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: 'rgba(96, 165, 250, 0.3)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 30,
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                  Unable to load challenges
                </Text>
                <Pressable
                  onPress={() => fetchDailyChallenges()}
                  style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}
                >
                  <RefreshCw size={14} color="#60a5fa" />
                  <Text style={{ color: '#60a5fa', fontSize: 12, marginLeft: 6 }}>Retry</Text>
                </Pressable>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, gap: 8 }}
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
          {(() => {
            const lvl = profile?.current_level ?? 1;
            const badge = getBadgeForLevel(lvl);
            const levelTitle = LEVELS[Math.max(0, Math.min(9, lvl - 1))]?.title ?? 'Novice Thinker';
            return (
              <LinearGradient
                colors={[badge.color, `${badge.color}CC`]}
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
                  <LevelBadge level={lvl} size="sm" />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' }}>
                  Level
                </Text>
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
                  {lvl}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }} numberOfLines={1}>
                  {levelTitle}
                </Text>
              </LinearGradient>
            );
          })()}

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

        {/* Meet the Coaches */}
        {shuffledCoaches.length > 0 && (
          <View style={{ paddingHorizontal: 8, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <GraduationCap size={16} color="#10b981" />
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginLeft: 8 }}>
                MEET THE COACHES
              </Text>
            </View>

            {/* Featured Coach */}
            {featuredCoach && (
              <PersonaCard
                persona={featuredCoach}
                onPress={() => setSelectedPersona(featuredCoach)}
                featured
              />
            )}

            {/* Coach Scroll Row */}
            {scrollCoaches.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 0, gap: 12 }}
              >
                {scrollCoaches.map((coach) => (
                  <View key={coach.id} style={{ width: 200 }}>
                    <PersonaCard
                      persona={coach}
                      onPress={() => setSelectedPersona(coach)}
                      size="sm"
                      height={300}
                    />
                  </View>
                ))}
              </ScrollView>
            )}

            {/* See All Coaches */}
            <Pressable
              onPress={() => router.push('/(tabs)/coaches')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                marginTop: 8,
                borderRadius: 14,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(16, 185, 129, 0.2)',
              }}
            >
              <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '600' }}>
                See All Coaches
              </Text>
              <ChevronRight size={16} color="#10b981" style={{ marginLeft: 4 }} />
            </Pressable>
          </View>
        )}

        {/* Meet the Challengers */}
        {shuffledChallengers.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 12 }}>
              <Zap size={16} color="#8B5CF6" />
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginLeft: 8 }}>
                MEET THE CHALLENGERS
              </Text>
            </View>

            {/* Featured Challenger */}
            {featuredChallenger && (
              <View style={{ paddingHorizontal: 8, marginBottom: 12 }}>
                <PersonaCard
                  persona={featuredChallenger}
                  onPress={() => setSelectedPersona(featuredChallenger)}
                  featured
                />
              </View>
            )}

            {/* Challenger Scroll Row */}
            {scrollChallengers.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 8, gap: 12 }}
              >
                {scrollChallengers.map((challenger) => (
                  <View key={challenger.id} style={{ width: 200 }}>
                    <PersonaCard
                      persona={challenger}
                      onPress={() => setSelectedPersona(challenger)}
                      size="sm"
                      height={300}
                    />
                  </View>
                ))}
              </ScrollView>
            )}

            {/* See All Challengers */}
            <Pressable
              onPress={() => router.push('/(tabs)/personas')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 14,
                marginTop: 12,
                marginHorizontal: 16,
                borderRadius: 14,
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(139, 92, 246, 0.2)',
              }}
            >
              <Text style={{ color: '#8B5CF6', fontSize: 14, fontWeight: '600' }}>
                See All Challengers
              </Text>
              <ChevronRight size={16} color="#8B5CF6" style={{ marginLeft: 4 }} />
            </Pressable>
          </View>
        )}

        {/* Active Conversation */}
        {activeConversations.length > 0 && (
          <View style={{ paddingHorizontal: 8, marginBottom: 20 }}>
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
                        style={{ width: 56, height: 56, borderRadius: 8 }}
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
          <View style={{ paddingHorizontal: 8, marginBottom: 20 }}>
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
                        style={{ width: 56, height: 56, borderRadius: 8 }}
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
      </ScrollView>

      {/* Persona Modal */}
      <PersonaModal
        persona={selectedPersona}
        visible={selectedPersona !== null}
        onClose={() => setSelectedPersona(null)}
        onChallenge={handlePersonaChallenge}
      />

      {/* Creating session overlay */}
      {isCreatingSession && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={{ borderRadius: 16, padding: 24, alignItems: 'center' }}
          >
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={{ color: '#fff', marginTop: 16, fontSize: 14 }}>
              Starting session...
            </Text>
          </LinearGradient>
        </View>
      )}
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
