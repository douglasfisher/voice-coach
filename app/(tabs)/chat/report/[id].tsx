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
} from 'lucide-react-native';
import { supabase } from '../../../../lib/supabase';
import { usePersonaStore } from '../../../../stores';
import { PersonaDisplay } from '../../../../types/persona';

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
}

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPersonaById } = usePersonaStore();

  const [report, setReport] = useState<SessionReport | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [persona, setPersona] = useState<PersonaDisplay | null>(null);
  const [sessionDate, setSessionDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    if (!id) return;

    try {
      // Fetch conversation with report
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('analysis_summary, overall_score, persona_id, ended_at, created_at')
        .eq('id', id)
        .single();

      if (convError) throw convError;

      if (conversation?.analysis_summary) {
        setReport(conversation.analysis_summary as SessionReport);
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

      // Fetch messages for transcript
      const { data: msgs, error: msgError } = await supabase
        .from('messages')
        .select('role, content, sequence')
        .eq('conversation_id', id)
        .order('sequence', { ascending: true });

      if (!msgError && msgs) {
        setMessages(msgs as Message[]);
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
            onPress={() => router.back()}
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
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Persona Hero Card */}
        {persona && (
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 20,
              overflow: 'hidden',
              marginBottom: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            {/* Persona Image */}
            <View style={{ height: 280, position: 'relative' }}>
              <Image
                source={
                  typeof persona.avatarUrl === 'string'
                    ? { uri: persona.avatarUrl }
                    : persona.avatarUrl as ImageSourcePropType
                }
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.9)']}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 120,
                }}
              />
            </View>

            {/* Persona Info */}
            <View style={{ padding: 16, marginTop: -40 }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>
                {persona.name}
              </Text>
              {persona.tagline && (
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>
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
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '500' }}>
                    {persona.challengeStyle.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                {sessionDate && (
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
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
              {messages.map((msg, index) => (
                <View
                  key={index}
                  style={{
                    marginBottom: index < messages.length - 1 ? 16 : 0,
                    paddingLeft: msg.role === 'user' ? 0 : 0,
                  }}
                >
                  <Text
                    style={{
                      color: msg.role === 'user' ? '#F59E0B' : '#60a5fa',
                      fontSize: 12,
                      fontWeight: '600',
                      marginBottom: 4,
                    }}
                  >
                    {msg.role === 'user' ? 'YOU' : 'COACH'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20 }}>
                    {msg.content}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        {/* Start New Challenge Button */}
        <Pressable
          onPress={() => router.push('/(tabs)/personas')}
          style={{ marginBottom: 20 }}
        >
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
              Start New Challenge
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
