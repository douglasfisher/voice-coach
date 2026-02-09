import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Cpu, ChevronDown, ChevronUp } from 'lucide-react-native';

interface AIUsageData {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_cents: number;
  model: string;
  task_type: string;
}

interface MessageWithMetadata {
  role: string;
  metadata?: {
    ai_usage?: AIUsageData;
    [key: string]: unknown;
  } | null;
}

interface AIStatsProps {
  messages: MessageWithMetadata[];
}

const ADMIN_RED = '#ef4444';

function formatCost(cents: number): string {
  return '$' + (cents / 100).toFixed(4);
}

function formatTokens(n: number): string {
  return n.toLocaleString();
}

export function AIStats({ messages }: AIStatsProps) {
  const [expanded, setExpanded] = useState(false);

  // Filter messages that have ai_usage metadata
  const messagesWithUsage = messages.filter(
    (m) => m.metadata?.ai_usage
  );

  // Nothing to show
  if (messagesWithUsage.length === 0) return null;

  // Split into chat turns vs non-chat
  const chatTurns: AIUsageData[] = [];
  const nonChatItems: { label: string; usage: AIUsageData }[] = [];

  for (const msg of messagesWithUsage) {
    const usage = msg.metadata!.ai_usage!;
    if (usage.task_type === 'chat' || usage.task_type === 'coaching') {
      chatTurns.push(usage);
    } else {
      const label = usage.task_type.charAt(0).toUpperCase() + usage.task_type.slice(1);
      nonChatItems.push({ label, usage });
    }
  }

  // Aggregates
  const totalPromptTokens = messagesWithUsage.reduce((s, m) => s + (m.metadata!.ai_usage!.prompt_tokens || 0), 0);
  const totalCompletionTokens = messagesWithUsage.reduce((s, m) => s + (m.metadata!.ai_usage!.completion_tokens || 0), 0);
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCostCents = messagesWithUsage.reduce((s, m) => s + (m.metadata!.ai_usage!.cost_cents || 0), 0);
  const apiCalls = messagesWithUsage.length;

  // Collect unique models
  const models = [...new Set(messagesWithUsage.map((m) => m.metadata!.ai_usage!.model))];

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
          <Cpu size={20} color={ADMIN_RED} />
          <Text
            style={{
              color: ADMIN_RED,
              fontSize: 14,
              fontWeight: '600',
              letterSpacing: 0.5,
              marginLeft: 8,
            }}
          >
            AI STATS
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

      {expanded && (
        <View style={{ marginTop: 16 }}>
          {/* Grand Total Hero */}
          <View
            style={{
              backgroundColor: `${ADMIN_RED}15`,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: `${ADMIN_RED}25`,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1 }}>
              TOTAL COST
            </Text>
            <Text
              style={{
                color: ADMIN_RED,
                fontSize: 32,
                fontWeight: '800',
                fontFamily: 'monospace',
                marginTop: 4,
              }}
            >
              {formatCost(totalCostCents)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 6 }}>
              {formatTokens(totalTokens)} tokens | {apiCalls} API calls
            </Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                In: {formatTokens(totalPromptTokens)}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                Out: {formatTokens(totalCompletionTokens)}
              </Text>
            </View>
          </View>

          {/* Chat Turns Table */}
          {chatTurns.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
                CHAT TURNS
              </Text>
              {/* Header row */}
              <View
                style={{
                  flexDirection: 'row',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600', width: 40 }}>#</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600', flex: 1 }}>PROMPT</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600', flex: 1 }}>COMPLETION</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600', width: 70, textAlign: 'right' }}>COST</Text>
              </View>
              {/* Data rows */}
              {chatTurns.map((turn, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 8,
                    borderBottomWidth: i < chatTurns.length - 1 ? 1 : 0,
                    borderBottomColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace', width: 40 }}>
                    {i + 1}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'monospace', flex: 1 }}>
                    {formatTokens(turn.prompt_tokens)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'monospace', flex: 1 }}>
                    {formatTokens(turn.completion_tokens)}
                  </Text>
                  <Text style={{ color: ADMIN_RED, fontSize: 12, fontFamily: 'monospace', width: 70, textAlign: 'right' }}>
                    {formatCost(turn.cost_cents)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Non-Chat Costs */}
          {nonChatItems.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>
                OTHER COSTS
              </Text>
              {nonChatItems.map((item, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderBottomWidth: i < nonChatItems.length - 1 ? 1 : 0,
                    borderBottomColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <View>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{item.label}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
                      {formatTokens(item.usage.total_tokens)} tokens
                    </Text>
                  </View>
                  <Text style={{ color: ADMIN_RED, fontSize: 13, fontFamily: 'monospace', fontWeight: '600' }}>
                    {formatCost(item.usage.cost_cents)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Model Footer */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.06)',
              paddingTop: 10,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
              Model: {models.join(', ')}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
