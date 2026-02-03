import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Award, Brain, Eye, Heart, Lightbulb } from 'lucide-react-native';
import { useAnalysis, useGrowthScores } from '../../hooks/useAnalysis';
import { ScoreCard } from '../../components/growth/ScoreCard';
import { BiasRadar } from '../../components/growth/BiasRadar';
import { TrendGraph } from '../../components/growth/TrendGraph';
import { PatternList } from '../../components/growth/PatternList';

// Dimension colors matching the BiasRadar
const DIMENSION_COLORS = {
  logical: '#60a5fa',
  biasAwareness: '#c084fc',
  perspective: '#f472b6',
  emotional: '#4ade80',
};

export default function GrowthScreen() {
  const { patterns, trend, isLoading, refresh } = useAnalysis();
  const scores = useGrowthScores();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor="#F59E0B"
          />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
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
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>
                Your Growth
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 2 }}>
                Track your thinking patterns over time
              </Text>
            </View>
          </View>
        </View>

        {/* Overall Score - Hero Card */}
        <View style={{ marginBottom: 20 }}>
          <View
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(245, 158, 11, 0.3)',
            }}
          >
            <LinearGradient
              colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: 24,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Award size={28} color="#F59E0B" />
              </View>

              <Text
                style={{
                  fontSize: 64,
                  fontWeight: '800',
                  color: '#F59E0B',
                  includeFontPadding: false,
                  lineHeight: 70,
                }}
              >
                {scores.overall ?? '--'}
              </Text>

              <Text
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 16,
                  fontWeight: '500',
                  marginTop: 8,
                }}
              >
                Overall Thinking Score
              </Text>

              {/* Trend badge */}
              {trend && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                    backgroundColor:
                      trend === 'improving'
                        ? 'rgba(74, 222, 128, 0.15)'
                        : trend === 'declining'
                        ? 'rgba(248, 113, 113, 0.15)'
                        : 'rgba(251, 191, 36, 0.15)',
                    borderWidth: 1,
                    borderColor:
                      trend === 'improving'
                        ? 'rgba(74, 222, 128, 0.3)'
                        : trend === 'declining'
                        ? 'rgba(248, 113, 113, 0.3)'
                        : 'rgba(251, 191, 36, 0.3)',
                  }}
                >
                  <TrendingUp
                    size={16}
                    color={
                      trend === 'improving'
                        ? '#4ade80'
                        : trend === 'declining'
                        ? '#f87171'
                        : '#fbbf24'
                    }
                  />
                  <Text
                    style={{
                      marginLeft: 6,
                      fontSize: 13,
                      fontWeight: '600',
                      color:
                        trend === 'improving'
                          ? '#4ade80'
                          : trend === 'declining'
                          ? '#f87171'
                          : '#fbbf24',
                      textTransform: 'capitalize',
                    }}
                  >
                    {trend.replace('_', ' ')}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>

        {/* Dimension Scores - 2x2 Grid */}
        <View style={{ marginBottom: 20 }}>
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
            DIMENSIONS
          </Text>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <ScoreCard
                score={scores.logical}
                label="Logic"
                size="sm"
                color={DIMENSION_COLORS.logical}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ScoreCard
                score={scores.biasAwareness}
                label="Bias Aware"
                size="sm"
                color={DIMENSION_COLORS.biasAwareness}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <ScoreCard
                score={scores.perspective}
                label="Perspective"
                size="sm"
                color={DIMENSION_COLORS.perspective}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ScoreCard
                score={scores.emotional}
                label="Emotional IQ"
                size="sm"
                color={DIMENSION_COLORS.emotional}
              />
            </View>
          </View>
        </View>

        {/* Radar Chart */}
        <View style={{ marginBottom: 20 }}>
          <BiasRadar
            logical={scores.logical}
            biasAwareness={scores.biasAwareness}
            perspective={scores.perspective}
            emotional={scores.emotional}
          />
        </View>

        {/* Trend Graph */}
        <View style={{ marginBottom: 20 }}>
          <TrendGraph data={scores.history} />
        </View>

        {/* Pattern List */}
        <View style={{ marginBottom: 40 }}>
          <PatternList patterns={patterns} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
