import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  Award,
  CheckCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react-native';

/**
 * Formats response time in milliseconds to a readable format.
 */
function formatResponseTime(ms: number | null): string | null {
  if (!ms || ms <= 0) return null;
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
import { supabase } from '../../../../lib/supabase';
import { usePersonaStore } from '../../../../stores';
import { PersonaDisplay } from '../../../../types/persona';
import { SessionStats, PerformanceAnalysis } from '../../../../components/report';

interface SessionReport {
  tldr: string;
  strengths: string[];
  weaknesses: string[];
  detailed_analysis: string;
  overall_score: number;
  generated_at: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sequence: number;
  created_at: string;
  response_time_ms: number | null;
}

interface TimingMetrics {
  total_duration_ms: number;
  user_avg_response_ms: number;
  assistant_avg_response_ms: number;
  exchange_count: number;
  word_count_total: number;
  // Additional fields for SessionStats compatibility (optional for backward compat)
  user_word_count?: number;
  ai_word_count?: number;
  ai_avg_response_ms?: number;
}

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPersonaById } = usePersonaStore();

  const [report, setReport] = useState<SessionReport | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [persona, setPersona] = useState<PersonaDisplay | null>(null);
  const [sessionDate, setSessionDate] = useState<string>('');
  const [timingMetrics, setTimingMetrics] = useState<TimingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    if (!id) return;

    try {
      // Fetch conversation with report (timing_metrics may not exist until migration is run)
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('analysis_summary, overall_score, persona_id, ended_at, created_at')
        .eq('id', id)
        .single();

      if (convError) throw convError;

      if (conversation?.analysis_summary) {
        setReport(conversation.analysis_summary as SessionReport);
      }

      // Try to fetch timing_metrics separately (gracefully handle if column doesn't exist)
      try {
        const { data: timingData } = await supabase
          .from('conversations')
          .select('timing_metrics')
          .eq('id', id)
          .single();

        if (timingData?.timing_metrics) {
          setTimingMetrics(timingData.timing_metrics as TimingMetrics);
        }
      } catch {
        // timing_metrics column may not exist yet - that's ok
      }

      // Set session date
      const dateStr = conversation?.ended_at || conversation?.created_at;
      if (dateStr) {
        setSessionDate(new Date(dateStr).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }));
      }

      // Get full persona
      const personaData = getPersonaById(conversation?.persona_id);
      if (personaData) {
        setPersona(personaData);
      }

      // Fetch messages for transcript with timing data
      const { data: msgs, error: msgError } = await supabase
        .from('messages')
        .select('role, content, sequence, created_at, response_time_ms')
        .eq('conversation_id', id)
        .order('sequence', { ascending: true });

      if (!msgError && msgs) {
        setMessages(msgs.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          sequence: m.sequence,
          created_at: m.created_at,
          response_time_ms: m.response_time_ms ?? null,
        })));
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#4ade80';
    if (score >= 50) return '#fbbf24';
    return '#f87171';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 12 }}>
            Loading report...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#fff', fontSize: 18 }}>Report not found</Text>
          <Pressable
            onPress={() => router.navigate('/(tabs)/personas')}
            style={{
              marginTop: 16,
              paddingHorizontal: 20,
              paddingVertical: 12,
              backgroundColor: '#F59E0B',
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#0f0f12', fontWeight: '600' }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const scoreColor = getScoreColor(report.overall_score);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <ChevronLeft size={24} color="#F59E0B" />
        </Pressable>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 }}>
          Session Report
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Persona Hero Card */}
        {persona && (
          <View
            style={{
              borderRadius: 20,
              overflow: 'hidden',
              marginBottom: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              height: 550,
              position: 'relative',
            }}
          >
            {/* Persona Image - fills entire card */}
            <Image
              source={
                typeof persona.avatarUrl === 'string'
                  ? { uri: persona.avatarUrl }
                  : persona.avatarUrl as ImageSourcePropType
              }
              style={{ width: '100%', height: '100%', position: 'absolute' }}
              resizeMode="cover"
            />

            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '50%',
              }}
            />

            {/* Persona Info - positioned at bottom */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
            }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>
                {persona.name}
              </Text>
              {persona.tagline && (
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
                  {persona.tagline}
                </Text>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 12,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    backgroundColor: 'rgba(245, 158, 11, 0.3)',
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '500' }}>
                    {persona.challengeStyle.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                {sessionDate && (
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    {sessionDate}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* TLDR Card */}
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
            SUMMARY
          </Text>
          <Text style={{ color: '#fff', fontSize: 16, lineHeight: 24 }}>
            {report.tldr}
          </Text>
        </View>

        {/* Score Card */}
        <View
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 20,
            borderWidth: 1,
            borderColor: `${scoreColor}40`,
          }}
        >
          <LinearGradient
            colors={[`${scoreColor}20`, `${scoreColor}10`]}
            style={{
              padding: 24,
              alignItems: 'center',
            }}
          >
            <Award size={32} color={scoreColor} style={{ marginBottom: 12 }} />
            <Text
              style={{
                fontSize: 56,
                fontWeight: '800',
                color: scoreColor,
              }}
            >
              {report.overall_score}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>
              out of 100
            </Text>

            {/* Progress bar */}
            <View
              style={{
                width: '100%',
                height: 8,
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 4,
                marginTop: 20,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${report.overall_score}%`,
                  height: '100%',
                  backgroundColor: scoreColor,
                  borderRadius: 4,
                }}
              />
            </View>
          </LinearGradient>
        </View>

        {/* Session Stats */}
        {timingMetrics && <SessionStats timingMetrics={timingMetrics} />}

        {/* Performance Analysis */}
        {messages.length > 2 && <PerformanceAnalysis messages={messages} />}

        {/* Strengths */}
        <View
          style={{
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(74, 222, 128, 0.2)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <CheckCircle size={20} color="#4ade80" />
            <Text
              style={{
                color: '#4ade80',
                fontSize: 14,
                fontWeight: '600',
                letterSpacing: 0.5,
                marginLeft: 8,
              }}
            >
              STRENGTHS
            </Text>
          </View>
          {report.strengths.map((strength, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                marginBottom: index < report.strengths.length - 1 ? 12 : 0,
              }}
            >
              <Text style={{ color: '#4ade80', marginRight: 8 }}>•</Text>
              <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22, flex: 1 }}>
                {strength}
              </Text>
            </View>
          ))}
        </View>

        {/* Weaknesses */}
        <View
          style={{
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(251, 191, 36, 0.2)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <AlertTriangle size={20} color="#fbbf24" />
            <Text
              style={{
                color: '#fbbf24',
                fontSize: 14,
                fontWeight: '600',
                letterSpacing: 0.5,
                marginLeft: 8,
              }}
            >
              AREAS FOR IMPROVEMENT
            </Text>
          </View>
          {report.weaknesses.map((weakness, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                marginBottom: index < report.weaknesses.length - 1 ? 12 : 0,
              }}
            >
              <Text style={{ color: '#fbbf24', marginRight: 8 }}>•</Text>
              <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22, flex: 1 }}>
                {weakness}
              </Text>
            </View>
          ))}
        </View>

        {/* Detailed Analysis (Expandable) */}
        <Pressable
          onPress={() => setShowAnalysis(!showAnalysis)}
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FileText size={20} color="#F59E0B" />
              <Text
                style={{
                  color: '#F59E0B',
                  fontSize: 14,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                  marginLeft: 8,
                }}
              >
                DETAILED ANALYSIS
              </Text>
            </View>
            {showAnalysis ? (
              <ChevronUp size={20} color="rgba(255,255,255,0.5)" />
            ) : (
              <ChevronDown size={20} color="rgba(255,255,255,0.5)" />
            )}
          </View>
          {showAnalysis && (
            <Text style={{ color: '#fff', fontSize: 15, lineHeight: 24, marginTop: 16 }}>
              {report.detailed_analysis}
            </Text>
          )}
        </Pressable>

        {/* Transcript (Expandable) */}
        <Pressable
          onPress={() => setShowTranscript(!showTranscript)}
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 32,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MessageSquare size={20} color="#60a5fa" />
              <Text
                style={{
                  color: '#60a5fa',
                  fontSize: 14,
                  fontWeight: '600',
                  letterSpacing: 0.5,
                  marginLeft: 8,
                }}
              >
                TRANSCRIPT
              </Text>
            </View>
            {showTranscript ? (
              <ChevronUp size={20} color="rgba(255,255,255,0.5)" />
            ) : (
              <ChevronDown size={20} color="rgba(255,255,255,0.5)" />
            )}
          </View>
          {showTranscript && (
            <View style={{ marginTop: 16 }}>
              {messages.map((msg, index) => {
                const responseTime = formatResponseTime(msg.response_time_ms);
                const wordCount = countWords(msg.content);
                const timestamp = msg.created_at
                  ? new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : null;

                return (
                  <View
                    key={index}
                    style={{
                      marginBottom: index < messages.length - 1 ? 20 : 0,
                      paddingBottom: index < messages.length - 1 ? 20 : 0,
                      borderBottomWidth: index < messages.length - 1 ? 1 : 0,
                      borderBottomColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Header row with role and timing */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: msg.role === 'user' ? '#F59E0B' : '#60a5fa',
                          fontSize: 12,
                          fontWeight: '600',
                        }}
                      >
                        {msg.role === 'user' ? 'YOU' : 'COACH'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {timestamp && (
                          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                            {timestamp}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Message content */}
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22 }}>
                      {msg.content}
                    </Text>

                    {/* Message stats */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 10,
                        gap: 16,
                      }}
                    >
                      {/* Word count */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MessageSquare size={12} color="rgba(255,255,255,0.3)" />
                        <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                          {wordCount} words
                        </Text>
                      </View>

                      {/* Response time */}
                      {responseTime && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock
                            size={12}
                            color={msg.role === 'user' ? '#F59E0B80' : '#60a5fa80'}
                          />
                          <Text
                            style={{
                              color: msg.role === 'user' ? '#F59E0B80' : '#60a5fa80',
                              fontSize: 11,
                            }}
                          >
                            {msg.role === 'user' ? 'replied in ' : 'response in '}
                            {responseTime}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Pressable>

        {/* Bottom spacer for fixed button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingBottom: 20,
          paddingTop: 12,
          backgroundColor: '#0a0a0f',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Pressable onPress={() => router.navigate(persona?.personaType === 'coach' ? '/(tabs)/coaches' : '/(tabs)/personas')}>
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 18,
              borderRadius: 14,
            }}
          >
            <MessageSquare size={20} color="#0f0f12" />
            <Text
              style={{
                color: '#0f0f12',
                fontSize: 16,
                fontWeight: '600',
                marginLeft: 8,
              }}
            >
              {persona?.personaType === 'coach' ? 'Start New Session' : 'Start New Challenge'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
