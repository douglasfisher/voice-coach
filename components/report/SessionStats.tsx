import { View, Text } from 'react-native';
import { Clock, MessageCircle, FileText, Zap, TrendingUp, Timer } from 'lucide-react-native';

interface TimingMetrics {
  total_duration_ms: number;
  exchange_count: number;
  // User metrics
  user_word_count: number;
  user_avg_response_ms: number;
  user_avg_words_per_response?: number;
  // AI metrics (not displayed, just for completeness)
  ai_word_count: number;
  ai_avg_response_ms: number;
}

interface SessionStatsProps {
  timingMetrics: TimingMetrics;
}

/**
 * Formats milliseconds into a human-readable duration string.
 */
function formatDuration(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/**
 * Formats response time in milliseconds to a readable format.
 */
function formatResponseTime(ms: number | undefined | null): string {
  if (ms === undefined || ms === null || ms === 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Formats a large number with commas for readability.
 */
function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString();
}

interface StatRowProps {
  icon: typeof Clock;
  label: string;
  value: string;
  subValue?: string;
  color: string;
  isLast?: boolean;
}

function StatRow({ icon: Icon, label, value, subValue, color, isLast }: StatRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: `${color}20`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Icon size={18} color={color} />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
          {label}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: '700',
            fontFamily: 'monospace',
          }}
        >
          {value}
        </Text>
        {subValue && (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
            {subValue}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * Displays user-focused session statistics.
 * All metrics are based on user performance, not AI.
 */
export function SessionStats({ timingMetrics }: SessionStatsProps) {
  // Safely extract USER metrics with defaults
  const totalDuration = timingMetrics?.total_duration_ms ?? 0;
  const userAvgResponse = timingMetrics?.user_avg_response_ms ?? 0;
  const exchangeCount = timingMetrics?.exchange_count ?? 0;
  const userWordCount = timingMetrics?.user_word_count ?? 0;

  // Calculate derived metrics (USER ONLY)
  const durationMinutes = totalDuration / 60000;
  const userWordsPerMinute = durationMinutes > 0
    ? Math.round(userWordCount / durationMinutes)
    : 0;

  const avgWordsPerResponse = exchangeCount > 0
    ? Math.round(userWordCount / exchangeCount)
    : 0;

  // Engagement score (based on user's response time and word depth)
  const engagementScore = Math.min(100, Math.round(
    (Math.min(avgWordsPerResponse, 50) / 50) * 50 + // Up to 50 points for word depth
    (Math.min(userAvgResponse, 60000) / 60000) * 50 // Up to 50 points for thoughtful responses
  ));

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Main Duration Card */}
      <View
        style={{
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: 'rgba(96, 165, 250, 0.2)',
          alignItems: 'center',
        }}
      >
        <Clock size={24} color="#60a5fa" style={{ marginBottom: 8 }} />
        <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 4 }}>
          SESSION DURATION
        </Text>
        <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800', fontFamily: 'monospace' }}>
          {formatDuration(totalDuration)}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
          {exchangeCount} exchanges • {formatNumber(userWordCount)} words spoken
        </Text>
      </View>

      {/* Your Performance Stats */}
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
          YOUR PERFORMANCE
        </Text>

        <StatRow
          icon={Timer}
          label="Avg Response Time"
          value={formatResponseTime(userAvgResponse)}
          subValue="time to respond"
          color="#F59E0B"
        />

        <StatRow
          icon={MessageCircle}
          label="Exchanges"
          value={formatNumber(exchangeCount)}
          subValue="back-and-forth"
          color="#c084fc"
        />

        <StatRow
          icon={FileText}
          label="Your Words"
          value={formatNumber(userWordCount)}
          subValue={`~${avgWordsPerResponse} per response`}
          color="#f472b6"
        />

        <StatRow
          icon={Zap}
          label="Your Pace"
          value={`${userWordsPerMinute}`}
          subValue="words per minute"
          color="#2dd4bf"
        />

        <StatRow
          icon={TrendingUp}
          label="Engagement"
          value={`${engagementScore}%`}
          subValue="thoughtfulness score"
          color="#fbbf24"
          isLast
        />
      </View>
    </View>
  );
}
