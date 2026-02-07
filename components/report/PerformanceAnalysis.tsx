import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Zap, Brain, Clock, AlertCircle } from 'lucide-react-native';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  response_time_ms: number | null;
  created_at: string;
}

interface PerformanceAnalysisProps {
  messages: Message[];
}

/**
 * Formats response time in milliseconds to a readable format.
 */
function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Counts words in a string.
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

interface PerformanceInsight {
  type: 'positive' | 'neutral' | 'attention';
  icon: typeof TrendingUp;
  title: string;
  description: string;
  color: string;
}

function analyzePerformance(messages: Message[]): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  const userMessages = messages.filter(m => m.role === 'user' && m.response_time_ms);
  const assistantMessages = messages.filter(m => m.role === 'assistant' && m.response_time_ms);

  if (userMessages.length < 2) {
    return [{
      type: 'neutral',
      icon: AlertCircle,
      title: 'Limited Data',
      description: 'Need more exchanges to analyze response patterns.',
      color: 'rgba(255,255,255,0.5)',
    }];
  }

  // Analyze response time trend
  const userTimes = userMessages.map(m => m.response_time_ms!);
  const firstHalf = userTimes.slice(0, Math.floor(userTimes.length / 2));
  const secondHalf = userTimes.slice(Math.floor(userTimes.length / 2));

  const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const timeTrendPct = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  if (timeTrendPct > 20) {
    insights.push({
      type: 'positive',
      icon: Brain,
      title: 'Deeper Thinking',
      description: `Your response time increased ${Math.abs(Math.round(timeTrendPct))}% as the conversation progressed, suggesting more thoughtful engagement.`,
      color: '#4ade80',
    });
  } else if (timeTrendPct < -20) {
    insights.push({
      type: 'neutral',
      icon: Zap,
      title: 'Quicker Responses',
      description: `Your responses got ${Math.abs(Math.round(timeTrendPct))}% faster over time. Consider taking more time to reflect.`,
      color: '#fbbf24',
    });
  } else {
    insights.push({
      type: 'neutral',
      icon: Minus,
      title: 'Consistent Pace',
      description: 'Your response time remained steady throughout the session.',
      color: '#60a5fa',
    });
  }

  // Analyze word count trend
  const userWordCounts = userMessages.map(m => countWords(m.content));
  const firstHalfWords = userWordCounts.slice(0, Math.floor(userWordCounts.length / 2));
  const secondHalfWords = userWordCounts.slice(Math.floor(userWordCounts.length / 2));

  const firstHalfWordsAvg = firstHalfWords.reduce((a, b) => a + b, 0) / firstHalfWords.length;
  const secondHalfWordsAvg = secondHalfWords.reduce((a, b) => a + b, 0) / secondHalfWords.length;

  const wordTrendPct = ((secondHalfWordsAvg - firstHalfWordsAvg) / firstHalfWordsAvg) * 100;

  if (wordTrendPct > 25) {
    insights.push({
      type: 'positive',
      icon: TrendingUp,
      title: 'Expanding Responses',
      description: `Your responses grew ${Math.abs(Math.round(wordTrendPct))}% longer, showing increasing engagement and depth.`,
      color: '#4ade80',
    });
  } else if (wordTrendPct < -25) {
    insights.push({
      type: 'attention',
      icon: TrendingDown,
      title: 'Shorter Responses',
      description: `Your responses got ${Math.abs(Math.round(wordTrendPct))}% shorter toward the end. You may have been losing interest.`,
      color: '#f87171',
    });
  }

  // Analyze AI response speed
  if (assistantMessages.length > 0) {
    const avgAITime = assistantMessages.reduce((a, m) => a + (m.response_time_ms || 0), 0) / assistantMessages.length;
    insights.push({
      type: 'neutral',
      icon: Zap,
      title: 'Coach Response Speed',
      description: `Average AI response: ${formatResponseTime(avgAITime)}. This is the thinking + generation time.`,
      color: '#c084fc',
    });
  }

  // Identify slowest/fastest responses
  const maxUserTime = Math.max(...userTimes);
  const minUserTime = Math.min(...userTimes);

  if (maxUserTime > 60000) {
    insights.push({
      type: 'positive',
      icon: Brain,
      title: 'Deep Reflection Moment',
      description: `You took ${formatResponseTime(maxUserTime)} on one response - a moment of genuine contemplation.`,
      color: '#4ade80',
    });
  }

  if (minUserTime < 3000 && userMessages.length > 2) {
    insights.push({
      type: 'attention',
      icon: Clock,
      title: 'Quick Response',
      description: `Your fastest response was ${formatResponseTime(minUserTime)}. Quick replies may miss nuance.`,
      color: '#fbbf24',
    });
  }

  return insights;
}

interface InsightCardProps {
  insight: PerformanceInsight;
  isLast?: boolean;
}

function InsightCard({ insight, isLast }: InsightCardProps) {
  const Icon = insight.icon;

  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${insight.color}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        <Icon size={20} color={insight.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: insight.color, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
          {insight.title}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 19 }}>
          {insight.description}
        </Text>
      </View>
    </View>
  );
}

/**
 * Displays detailed performance analysis based on timing data.
 */
export function PerformanceAnalysis({ messages }: PerformanceAnalysisProps) {
  const insights = analyzePerformance(messages);

  if (insights.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <Text
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        PERFORMANCE ANALYSIS
      </Text>

      {insights.map((insight, index) => (
        <InsightCard
          key={index}
          insight={insight}
          isLast={index === insights.length - 1}
        />
      ))}
    </View>
  );
}
