import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Lightbulb, ChevronDown, ChevronRight, Brain, TrendingUp } from 'lucide-react-native';
import { AnalysisBadge } from '../ui/Badge';
import { AnalysisResult, AnalysisItemResult, AnalysisItemType } from '../../types/analysis';

interface AnalysisCardProps {
  analysis: AnalysisResult;
  expanded?: boolean;
}

export function AnalysisCard({ analysis, expanded: initialExpanded = false }: AnalysisCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded);

  const strengths = analysis.items.filter((i) => i.type === 'strength');
  const issues = analysis.items.filter((i) => i.type !== 'strength');

  // Determine color based on quality score
  const getQualityColor = (score: number) => {
    if (score >= 80) return '#4ade80'; // green
    if (score >= 60) return '#fbbf24'; // amber
    return '#f472b6'; // pink
  };

  const qualityColor = getQualityColor(analysis.overall_quality);

  return (
    <View
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <LinearGradient
        colors={['rgba(30, 30, 40, 0.8)', 'rgba(20, 20, 30, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        <Pressable onPress={() => setExpanded(!expanded)}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(96, 165, 250, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Brain size={18} color="#60a5fa" />
              </View>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                Thinking Analysis
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Quality score */}
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  backgroundColor: `${qualityColor}15`,
                  borderWidth: 1,
                  borderColor: `${qualityColor}40`,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: qualityColor, fontSize: 14, fontWeight: '700' }}>
                  {analysis.overall_quality}
                </Text>
              </View>
              {expanded ? (
                <ChevronDown size={20} color="#9A9A9E" />
              ) : (
                <ChevronRight size={20} color="#9A9A9E" />
              )}
            </View>
          </View>

          {/* Encouragement */}
          <Text
            style={{
              color: '#4ade80',
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 12,
            }}
          >
            {analysis.encouragement}
          </Text>

          {/* Badges preview */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {analysis.items.slice(0, expanded ? undefined : 4).map((item, index) => (
              <AnalysisBadge
                key={index}
                type={item.type as AnalysisItemType}
                label={item.label}
                size="sm"
              />
            ))}
            {!expanded && analysis.items.length > 4 && (
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Text style={{ fontSize: 11, color: '#9A9A9E' }}>
                  +{analysis.items.length - 4} more
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* Expanded content */}
        {expanded && (
          <View
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.1)',
            }}
          >
            {/* Issues / Areas for growth */}
            {issues.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TrendingUp size={14} color="#fbbf24" />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: 12,
                      fontWeight: '600',
                      letterSpacing: 0.5,
                      marginLeft: 6,
                    }}
                  >
                    AREAS FOR GROWTH
                  </Text>
                </View>
                {issues.map((item, index) => (
                  <AnalysisItemDetail key={index} item={item} />
                ))}
              </View>
            )}

            {/* Strengths */}
            {strengths.length > 0 && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Lightbulb size={14} color="#4ade80" />
                  <Text
                    style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: 12,
                      fontWeight: '600',
                      letterSpacing: 0.5,
                      marginLeft: 6,
                    }}
                  >
                    STRENGTHS
                  </Text>
                </View>
                {strengths.map((item, index) => (
                  <AnalysisItemDetail key={index} item={item} />
                ))}
              </View>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function AnalysisItemDetail({ item }: { item: AnalysisItemResult }) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'strength':
        return '#4ade80';
      case 'bias':
        return '#fbbf24';
      case 'fallacy':
        return '#f472b6';
      default:
        return '#60a5fa';
    }
  };

  const typeColor = getTypeColor(item.type);

  return (
    <View
      style={{
        marginBottom: 12,
        padding: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: `${typeColor}20`,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <AnalysisBadge type={item.type as AnalysisItemType} size="sm" />
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 8 }}>
          {item.label}
        </Text>
      </View>

      {/* Excerpt */}
      {item.excerpt && (
        <Text
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            fontStyle: 'italic',
            marginBottom: 10,
            paddingLeft: 12,
            borderLeftWidth: 2,
            borderLeftColor: 'rgba(255,255,255,0.2)',
          }}
        >
          "{item.excerpt}"
        </Text>
      )}

      {/* Explanation */}
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20, marginBottom: 10 }}>
        {item.explanation}
      </Text>

      {/* Coaching tip */}
      {item.coaching && (
        <View
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(245, 158, 11, 0.2)',
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
        >
          <Lightbulb size={16} color="#F59E0B" style={{ marginTop: 2 }} />
          <Text style={{ color: '#F59E0B', fontSize: 13, flex: 1, marginLeft: 10, lineHeight: 19 }}>
            {item.coaching}
          </Text>
        </View>
      )}
    </View>
  );
}
