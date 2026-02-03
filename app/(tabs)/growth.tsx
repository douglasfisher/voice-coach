import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAnalysis, useGrowthScores } from '../../hooks/useAnalysis';
import { ScoreCard } from '../../components/growth/ScoreCard';
import { BiasRadar } from '../../components/growth/BiasRadar';
import { TrendGraph } from '../../components/growth/TrendGraph';
import { PatternList } from '../../components/growth/PatternList';

export default function GrowthScreen() {
  const { patterns, trend, isLoading, refresh } = useAnalysis();
  const scores = useGrowthScores();

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-6"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor="#F59E0B"
          />
        }
      >
        <Text className="text-text-primary text-2xl font-bold mb-2">
          Your Growth
        </Text>
        <Text className="text-text-secondary mb-6">
          Track your thinking patterns and progress over time
        </Text>

        {/* Overall Score */}
        <View className="mb-6">
          <ScoreCard
            score={scores.overall}
            label="Overall Thinking Score"
            trend={trend}
            size="lg"
          />
        </View>

        {/* Score Cards Row */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1">
            <ScoreCard
              score={scores.logical}
              label="Logic"
              size="sm"
              color="#3B82F6"
            />
          </View>
          <View className="flex-1">
            <ScoreCard
              score={scores.biasAwareness}
              label="Bias Aware"
              size="sm"
              color="#A78BFA"
            />
          </View>
        </View>

        <View className="flex-row gap-3 mb-6">
          <View className="flex-1">
            <ScoreCard
              score={scores.perspective}
              label="Perspective"
              size="sm"
              color="#F472B6"
            />
          </View>
          <View className="flex-1">
            <ScoreCard
              score={scores.emotional}
              label="Emotional IQ"
              size="sm"
              color="#34D399"
            />
          </View>
        </View>

        {/* Radar Chart */}
        <View className="mb-6">
          <BiasRadar
            logical={scores.logical}
            biasAwareness={scores.biasAwareness}
            perspective={scores.perspective}
            emotional={scores.emotional}
          />
        </View>

        {/* Trend Graph */}
        <View className="mb-6">
          <TrendGraph data={scores.history} />
        </View>

        {/* Pattern List */}
        <PatternList patterns={patterns} />
      </ScrollView>
    </SafeAreaView>
  );
}
