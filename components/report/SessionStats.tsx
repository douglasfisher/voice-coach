import { View, Text } from 'react-native';
import { Clock, MessageCircle, FileText, Zap } from 'lucide-react-native';

interface TimingMetrics {
  total_duration_ms: number;
  user_avg_response_ms: number;
  assistant_avg_response_ms: number;
  exchange_count: number;
  word_count_total: number;
}

interface SessionStatsProps {
  timingMetrics: TimingMetrics;
}

/**
 * Formats milliseconds into a human-readable duration string.
 */
function formatDuration(ms: number): string {
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
function formatResponseTime(ms: number): string {
  if (ms === 0) return '-';
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
function formatNumber(num: number): string {
  return num.toLocaleString();
}

interface StatItemProps {
  icon: typeof Clock;
  label: string;
  value: string;
  color: string;
}

function StatItem({ icon: Icon, label, value, color }: StatItemProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: `${color}20`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Icon size={16} color={color} />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
          {label}
        </Text>
      </View>
      <Text
        style={{
          color: '#fff',
          fontSize: 16,
          fontWeight: '600',
          fontFamily: 'monospace',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Displays session timing statistics in a card format.
 */
export function SessionStats({ timingMetrics }: SessionStatsProps) {
  const stats = [
    {
      icon: Clock,
      label: 'Total Duration',
      value: formatDuration(timingMetrics.total_duration_ms),
      color: '#60a5fa',
    },
    {
      icon: MessageCircle,
      label: 'Your Avg Response',
      value: formatResponseTime(timingMetrics.user_avg_response_ms),
      color: '#F59E0B',
    },
    {
      icon: Zap,
      label: 'Coach Avg Response',
      value: formatResponseTime(timingMetrics.assistant_avg_response_ms),
      color: '#4ade80',
    },
    {
      icon: MessageCircle,
      label: 'Exchanges',
      value: formatNumber(timingMetrics.exchange_count),
      color: '#c084fc',
    },
    {
      icon: FileText,
      label: 'Total Words',
      value: formatNumber(timingMetrics.word_count_total),
      color: '#f472b6',
    },
  ];

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
          marginBottom: 8,
        }}
      >
        SESSION STATS
      </Text>
      <View>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={index === stats.length - 1 ? { borderBottomWidth: 0 } : {}}
          >
            <StatItem
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
