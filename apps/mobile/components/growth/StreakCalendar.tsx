import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Calendar } from 'lucide-react-native';

interface SessionData {
  date: string;
  score: number | null;
  count: number;
}

interface StreakCalendarProps {
  sessions: SessionData[];
  weeks?: number;
  currentStreak: number;
}

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakCalendar({
  sessions,
  weeks = 12,
  currentStreak,
}: StreakCalendarProps) {
  // Create a map of dates to session data
  const sessionMap = new Map<string, SessionData>();
  sessions.forEach((s) => {
    const dateKey = s.date.split('T')[0];
    sessionMap.set(dateKey, s);
  });

  // Generate grid data for the last N weeks
  const today = new Date();
  const cells: { date: string; hasSession: boolean; score: number | null }[] = [];

  // Start from (weeks * 7) days ago, aligned to Sunday
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7) + 1);
  // Align to the nearest Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];
    const session = sessionMap.get(dateKey);

    cells.push({
      date: dateKey,
      hasSession: !!session,
      score: session?.score ?? null,
    });
  }

  // Group into weeks (columns)
  const weekColumns: typeof cells[] = [];
  for (let i = 0; i < weeks; i++) {
    weekColumns.push(cells.slice(i * 7, (i + 1) * 7));
  }

  const getIntensityColor = (score: number | null, hasSession: boolean) => {
    if (!hasSession) return 'rgba(255,255,255,0.05)';
    if (score === null) return 'rgba(245, 158, 11, 0.3)';
    if (score >= 80) return 'rgba(245, 158, 11, 0.9)';
    if (score >= 60) return 'rgba(245, 158, 11, 0.6)';
    if (score >= 40) return 'rgba(245, 158, 11, 0.4)';
    return 'rgba(245, 158, 11, 0.25)';
  };

  return (
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
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(248, 113, 113, 0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Calendar size={20} color="#f87171" />
            </View>
            <View>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
                Activity
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
                Last {weeks} weeks
              </Text>
            </View>
          </View>

          {/* Streak badge */}
          {currentStreak > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: 'rgba(248, 113, 113, 0.15)',
                borderWidth: 1,
                borderColor: 'rgba(248, 113, 113, 0.3)',
              }}
            >
              <Flame size={16} color="#f87171" />
              <Text
                style={{
                  color: '#f87171',
                  fontSize: 14,
                  fontWeight: '700',
                  marginLeft: 6,
                }}
              >
                {currentStreak} day streak
              </Text>
            </View>
          )}
        </View>

        {/* Calendar grid */}
        <View style={{ flexDirection: 'row' }}>
          {/* Day labels */}
          <View style={{ marginRight: 8, justifyContent: 'flex-start', paddingTop: 2 }}>
            {DAYS_OF_WEEK.map((day, i) => (
              <View
                key={i}
                style={{
                  height: 14,
                  marginBottom: 2,
                  justifyContent: 'center',
                }}
              >
                {i % 2 === 1 && (
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: 10,
                      fontWeight: '500',
                    }}
                  >
                    {day}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Week columns */}
          <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
            {weekColumns.map((week, weekIndex) => (
              <View key={weekIndex} style={{ flex: 1, gap: 2 }}>
                {week.map((cell, dayIndex) => {
                  const isToday = cell.date === today.toISOString().split('T')[0];
                  const isFuture = new Date(cell.date) > today;

                  return (
                    <View
                      key={`${weekIndex}-${dayIndex}`}
                      style={{
                        aspectRatio: 1,
                        backgroundColor: isFuture
                          ? 'transparent'
                          : getIntensityColor(cell.score, cell.hasSession),
                        borderRadius: 3,
                        borderWidth: isToday ? 1 : 0,
                        borderColor: '#F59E0B',
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Legend */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: 12,
            gap: 4,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginRight: 4 }}>
            Less
          </Text>
          {[0.05, 0.25, 0.5, 0.75, 0.9].map((opacity, i) => (
            <View
              key={i}
              style={{
                width: 12,
                height: 12,
                backgroundColor:
                  i === 0
                    ? 'rgba(255,255,255,0.05)'
                    : `rgba(245, 158, 11, ${opacity})`,
                borderRadius: 2,
              }}
            />
          ))}
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginLeft: 4 }}>
            More
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
