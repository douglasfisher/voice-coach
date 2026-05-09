import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Activity, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

const ADMIN_RED = '#ef4444';

const STAGE_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#3b82f6',
};

function formatStageName(name: string): string {
  return name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

interface MessageWithMetadata {
  role: string;
  metadata?: {
    emotional_stage?: { number: number; name: string };
    [key: string]: unknown;
  } | null;
}

interface EmotionalJourneyProps {
  messages: MessageWithMetadata[];
}

export function EmotionalJourney({ messages }: EmotionalJourneyProps) {
  const [expanded, setExpanded] = useState(false);

  // Extract emotional stages from assistant messages
  const stages: { number: number; name: string }[] = [];
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.metadata?.emotional_stage) {
      stages.push(msg.metadata.emotional_stage);
    }
  }

  if (stages.length === 0) return null;

  const startStage = stages[0];
  const endStage = stages[stages.length - 1];
  const delta = endStage.number - startStage.number;

  // Stage distribution counts
  const stageCounts: Record<number, number> = {};
  for (const s of stages) {
    stageCounts[s.number] = (stageCounts[s.number] || 0) + 1;
  }

  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendLabel = delta > 0 ? `Warmed Up (+${delta})` : delta < 0 ? `Cooled Down (${delta})` : 'Stayed Flat';
  const trendColor = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#eab308';

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={{
        backgroundColor: `${ADMIN_RED}10`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: `${ADMIN_RED}30`,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Activity size={20} color={ADMIN_RED} />
          <Text
            style={{
              color: ADMIN_RED,
              fontSize: 14,
              fontWeight: '600',
              letterSpacing: 0.5,
              marginLeft: 8,
            }}
          >
            EMOTIONAL JOURNEY
          </Text>
          <View
            style={{
              marginLeft: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
              backgroundColor: `${ADMIN_RED}20`,
              borderRadius: 4,
            }}
          >
            <Text style={{ color: ADMIN_RED, fontSize: 10, fontWeight: '600' }}>ADMIN</Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={20} color="rgba(255,255,255,0.5)" />
        ) : (
          <ChevronDown size={20} color="rgba(255,255,255,0.5)" />
        )}
      </View>

      {/* Collapsed preview: start → end */}
      {!expanded && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: STAGE_COLORS[startStage.number] || '#666',
              }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {startStage.number}
            </Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>→</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: STAGE_COLORS[endStage.number] || '#666',
              }}
            />
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              {endStage.number}
            </Text>
          </View>
          <View style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TrendIcon size={14} color={trendColor} />
            <Text style={{ color: trendColor, fontSize: 12, fontWeight: '600' }}>
              {trendLabel}
            </Text>
          </View>
        </View>
      )}

      {expanded && (
        <View style={{ marginTop: 16 }}>
          {/* Journey arrow: Start → End */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: STAGE_COLORS[startStage.number] || '#666',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                  {startStage.number}
                </Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, textAlign: 'center', maxWidth: 80 }}>
                {formatStageName(startStage.name)}
              </Text>
            </View>

            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 24 }}>→</Text>

            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: STAGE_COLORS[endStage.number] || '#666',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                  {endStage.number}
                </Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4, textAlign: 'center', maxWidth: 80 }}>
                {formatStageName(endStage.name)}
              </Text>
            </View>
          </View>

          {/* Trend indicator */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginBottom: 20,
            }}
          >
            <TrendIcon size={18} color={trendColor} />
            <Text style={{ color: trendColor, fontSize: 14, fontWeight: '600' }}>
              {trendLabel}
            </Text>
          </View>

          {/* Stage distribution bar */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
              STAGE DISTRIBUTION
            </Text>
            <View
              style={{
                flexDirection: 'row',
                height: 12,
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              {Object.entries(stageCounts)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([stageNum, count]) => (
                  <View
                    key={stageNum}
                    style={{
                      flex: count,
                      backgroundColor: STAGE_COLORS[Number(stageNum)] || '#666',
                    }}
                  />
                ))}
            </View>
            {/* Legend */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
              {Object.entries(stageCounts)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([stageNum, count]) => (
                  <View key={stageNum} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: STAGE_COLORS[Number(stageNum)] || '#666',
                      }}
                    />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                      Stage {stageNum}: {count}x
                    </Text>
                  </View>
                ))}
            </View>
          </View>

          {/* Timeline dots */}
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
              TIMELINE
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {stages.map((stage, i) => (
                <View
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: STAGE_COLORS[stage.number] || '#666',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>
                    {stage.number}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}
