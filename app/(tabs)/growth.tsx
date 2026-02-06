import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Image, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Award, ChevronRight, Clock, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { useGrowthMetrics } from '../../hooks/useGrowthMetrics';
import { SegmentControl } from '../../components/ui/SegmentControl';
import {
  ScoreCard,
  TrendGraph,
  PatternList,
  PotentialScoreCard,
  LevelProgressBar,
  MomentumStats,
  GhostRadar,
  StreakCalendar,
  AchievementGrid,
  MilestoneTimeline,
  InsightCard,
  InsightChip,
  FocusAreaList,
} from '../../components/growth';
import { useChatStore, usePersonaStore } from '../../stores';

// Dimension colors matching the BiasRadar
const DIMENSION_COLORS = {
  logical: '#60a5fa',
  biasAwareness: '#c084fc',
  perspective: '#f472b6',
  emotional: '#4ade80',
};

type TabKey = 'overview' | 'journey' | 'insights';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'journey', label: 'Journey' },
  { key: 'insights', label: 'Insights' },
];

export default function GrowthScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const {
    scores,
    level,
    xp,
    streak,
    velocity,
    projectedScore,
    optimalPotential,
    trend,
    history,
    achievements,
    allAchievements,
    recentAchievements,
    nextMilestone,
    focusAreas,
    currentInsight,
    insights,
    dimensionProjections,
    sessionsThisWeek,
    percentileRank,
    isLoading,
    refresh,
    dismissInsight,
  } = useGrowthMetrics();

  const { completedConversations } = useChatStore();
  const { getPersonaById } = usePersonaStore();

  // Build session data for streak calendar
  const calendarSessions = useMemo(() => {
    return history.map((h) => ({
      date: h.date,
      score: h.score,
      count: 1,
    }));
  }, [history]);

  // Build achievement maps
  const unlockedIds = useMemo(
    () => new Set(achievements.map((a) => a.achievement_id)),
    [achievements]
  );

  const unlockedDates = useMemo(
    () => new Map(achievements.map((a) => [a.achievement_id, a.unlocked_at])),
    [achievements]
  );

  // Build milestones from achievements
  const milestones = useMemo(() => {
    const milestoneAchievements = allAchievements.filter((a) => a.category === 'milestone');
    return milestoneAchievements.slice(0, 5).map((a) => {
      const unlocked = unlockedIds.has(a.id);
      const unlockedAt = unlockedDates.get(a.id);
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        target: a.requirement_value,
        current: unlocked ? a.requirement_value : Math.min(xp.lifetime / 100, a.requirement_value),
        unit: 'sessions',
        completed: unlocked,
        completedAt: unlockedAt,
        icon: a.icon,
        category: 'sessions' as const,
      };
    });
  }, [allAchievements, unlockedIds, unlockedDates, xp.lifetime]);

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

  const handleInsightAction = useCallback((insight: typeof currentInsight) => {
    if (!insight) return;
    // Handle different action types
    switch (insight.action_type) {
      case 'start_session':
        router.push('/(tabs)/chat');
        break;
      case 'try_persona':
        if (insight.action_data?.personaId) {
          router.push(`/(tabs)/chat?personaId=${insight.action_data.personaId}`);
        }
        break;
      default:
        break;
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor="#F59E0B" />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <TrendingUp size={24} color="#F59E0B" />
            </View>
            <View>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>Your Growth</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 2 }}>
                Track your thinking patterns over time
              </Text>
            </View>
          </View>
        </View>

        {/* Segment Control */}
        <View style={{ marginBottom: 20 }}>
          <SegmentControl tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab
            scores={scores}
            level={level}
            xp={xp}
            streak={streak}
            velocity={velocity}
            projectedScore={projectedScore}
            optimalPotential={optimalPotential}
            dimensionProjections={dimensionProjections}
            sessionsThisWeek={sessionsThisWeek}
            percentileRank={percentileRank}
            currentInsight={currentInsight}
            recentAchievements={recentAchievements}
            allAchievements={allAchievements}
            unlockedIds={unlockedIds}
            onInsightDismiss={currentInsight ? () => dismissInsight(currentInsight.id) : undefined}
            onInsightAction={() => handleInsightAction(currentInsight)}
          />
        )}

        {activeTab === 'journey' && (
          <JourneyTab
            history={history}
            calendarSessions={calendarSessions}
            currentStreak={streak.current}
            milestones={milestones}
            allAchievements={allAchievements}
            unlockedIds={unlockedIds}
            unlockedDates={unlockedDates}
            completedConversations={completedConversations}
            getPersonaById={getPersonaById}
            getScoreColor={getScoreColor}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsTab
            currentInsight={currentInsight}
            insights={insights}
            focusAreas={focusAreas}
            patterns={[]} // Will be populated from useGrowthMetrics patterns
            scores={scores}
            onInsightDismiss={dismissInsight}
            onInsightAction={handleInsightAction}
          />
        )}

        {/* Bottom padding for absolute tab bar */}
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// OVERVIEW TAB
// =============================================================================

interface OverviewTabProps {
  scores: {
    overall: number | null;
    logical: number | null;
    biasAwareness: number | null;
    perspective: number | null;
    emotional: number | null;
  };
  level: { level: number; title: string; minXP: number; maxXP: number };
  xp: { current: number; forNextLevel: number; lifetime: number };
  streak: { current: number; longest: number; freezeAvailable: boolean };
  velocity: { overall: number; trend: 'accelerating' | 'stable' | 'decelerating' } | null;
  projectedScore: number | null;
  optimalPotential: number | null;
  dimensionProjections: any;
  sessionsThisWeek: number;
  percentileRank: number;
  currentInsight: any;
  recentAchievements: any[];
  allAchievements: any[];
  unlockedIds: Set<string>;
  onInsightDismiss?: () => void;
  onInsightAction?: () => void;
}

function OverviewTab({
  scores,
  level,
  xp,
  streak,
  velocity,
  projectedScore,
  optimalPotential,
  dimensionProjections,
  sessionsThisWeek,
  percentileRank,
  currentInsight,
  recentAchievements,
  allAchievements,
  unlockedIds,
  onInsightDismiss,
  onInsightAction,
}: OverviewTabProps) {
  return (
    <View style={{ gap: 20 }}>
      {/* Hero: Potential Score Card */}
      <PotentialScoreCard
        currentScore={scores.overall}
        projectedScore={projectedScore}
        optimalScore={optimalPotential}
        velocity={velocity?.overall ?? null}
        velocityTrend={velocity?.trend ?? null}
      />

      {/* Level Progress */}
      <LevelProgressBar level={level} currentXP={xp.current} xpForNextLevel={xp.forNextLevel} />

      {/* Momentum Stats */}
      <MomentumStats
        sessionsThisWeek={sessionsThisWeek}
        currentStreak={streak.current}
        percentileRank={percentileRank}
      />

      {/* Ghost Radar with projections */}
      <GhostRadar
        logical={scores.logical}
        biasAwareness={scores.biasAwareness}
        perspective={scores.perspective}
        emotional={scores.emotional}
        projections={dimensionProjections}
        showProjection={!!dimensionProjections}
      />

      {/* Current Insight */}
      {currentInsight && (
        <InsightCard
          insight={currentInsight}
          onDismiss={onInsightDismiss}
          onAction={onInsightAction}
        />
      )}

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <View>
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
            RECENT ACHIEVEMENTS
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {recentAchievements.slice(0, 5).map((ua) => {
                const achievement = allAchievements.find((a) => a.id === ua.achievement_id);
                if (!achievement) return null;
                return (
                  <View key={ua.id} style={{ alignItems: 'center', width: 80 }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: 'rgba(251, 191, 36, 0.15)',
                        borderWidth: 2,
                        borderColor: '#fbbf24',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Award size={24} color="#fbbf24" />
                    </View>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: '500',
                        marginTop: 8,
                        textAlign: 'center',
                      }}
                      numberOfLines={2}
                    >
                      {achievement.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// JOURNEY TAB
// =============================================================================

interface JourneyTabProps {
  history: { date: string; score: number | null }[];
  calendarSessions: { date: string; score: number | null; count: number }[];
  currentStreak: number;
  milestones: any[];
  allAchievements: any[];
  unlockedIds: Set<string>;
  unlockedDates: Map<string, string>;
  completedConversations: any[];
  getPersonaById: (id: string) => any;
  getScoreColor: (score: number | null) => string;
  formatDate: (dateStr: string | null) => string;
}

function JourneyTab({
  history,
  calendarSessions,
  currentStreak,
  milestones,
  allAchievements,
  unlockedIds,
  unlockedDates,
  completedConversations,
  getPersonaById,
  getScoreColor,
  formatDate,
}: JourneyTabProps) {
  return (
    <View style={{ gap: 20 }}>
      {/* Trend Graph with projection line */}
      <TrendGraph data={history} title="Progress Over Time" />

      {/* Streak Calendar */}
      <StreakCalendar sessions={calendarSessions} weeks={12} currentStreak={currentStreak} />

      {/* Milestones */}
      {milestones.length > 0 && <MilestoneTimeline milestones={milestones} />}

      {/* Achievement Grid */}
      <AchievementGrid
        achievements={allAchievements}
        unlockedIds={unlockedIds}
        unlockedDates={unlockedDates}
        columns={4}
      />

      {/* Past Sessions */}
      {completedConversations.length > 0 && (
        <View>
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
            PAST SESSIONS
          </Text>

          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            {completedConversations.slice(0, 5).map((conv, index) => {
              const persona = getPersonaById(conv.persona_id);
              const scoreColor = getScoreColor(conv.overall_score);
              const imageSource = persona
                ? typeof persona.avatarUrl === 'string'
                  ? { uri: persona.avatarUrl }
                  : persona.avatarUrl
                : null;

              return (
                <Pressable
                  key={conv.id}
                  onPress={() => router.push(`/(tabs)/chat/report/${conv.id}`)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderBottomWidth: index < Math.min(completedConversations.length, 5) - 1 ? 1 : 0,
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
                        {formatDate(conv.ended_at || conv.created_at)}
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
                      {conv.overall_score ?? '--'}
                    </Text>
                  </View>

                  <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// INSIGHTS TAB
// =============================================================================

interface InsightsTabProps {
  currentInsight: any;
  insights: any[];
  focusAreas: any[];
  patterns: any[];
  scores: {
    overall: number | null;
    logical: number | null;
    biasAwareness: number | null;
    perspective: number | null;
    emotional: number | null;
  };
  onInsightDismiss: (id: string) => void;
  onInsightAction: (insight: any) => void;
}

function InsightsTab({
  currentInsight,
  insights,
  focusAreas,
  patterns,
  scores,
  onInsightDismiss,
  onInsightAction,
}: InsightsTabProps) {
  return (
    <View style={{ gap: 20 }}>
      {/* Primary Insight Card */}
      {currentInsight && (
        <View>
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
            AI COACH SAYS
          </Text>
          <InsightCard
            insight={currentInsight}
            onDismiss={() => onInsightDismiss(currentInsight.id)}
            onAction={() => onInsightAction(currentInsight)}
          />
        </View>
      )}

      {/* Focus Areas */}
      <FocusAreaList focusAreas={focusAreas} />

      {/* More Insights */}
      {insights.length > 1 && (
        <View>
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
            MORE INSIGHTS
          </Text>
          <View style={{ gap: 8 }}>
            {insights.slice(1, 5).map((insight) => (
              <InsightChip
                key={insight.id}
                insight={insight}
                onPress={() => onInsightAction(insight)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Comparison Card - vs past self */}
      <View
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <LinearGradient
          colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(192, 132, 252, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Sparkles size={20} color="#c084fc" />
            </View>
            <View>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
                Your Progress
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
                Compared to when you started
              </Text>
            </View>
          </View>

          {/* Dimension comparison */}
          <View style={{ gap: 12 }}>
            {[
              { label: 'Logic', score: scores.logical, color: DIMENSION_COLORS.logical },
              { label: 'Bias Aware', score: scores.biasAwareness, color: DIMENSION_COLORS.biasAwareness },
              { label: 'Perspective', score: scores.perspective, color: DIMENSION_COLORS.perspective },
              { label: 'Emotional IQ', score: scores.emotional, color: DIMENSION_COLORS.emotional },
            ].map((dim) => (
              <View key={dim.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, width: 90 }}>
                  {dim.label}
                </Text>
                <View
                  style={{
                    flex: 1,
                    height: 8,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    marginHorizontal: 12,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${dim.score ?? 0}%`,
                      height: '100%',
                      backgroundColor: dim.color,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <Text style={{ color: dim.color, fontSize: 14, fontWeight: '600', width: 40 }}>
                  {dim.score ?? '--'}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Empty state if no insights */}
      {!currentInsight && insights.length === 0 && focusAreas.length === 0 && (
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 20,
            padding: 40,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: 'rgba(255,255,255,0.05)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Sparkles size={28} color="rgba(255,255,255,0.3)" />
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '500' }}>
            No insights yet
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 13,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            Complete more sessions to get personalized insights
          </Text>
        </View>
      )}
    </View>
  );
}
