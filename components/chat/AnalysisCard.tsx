import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronRight } from 'lucide-react-native';
import { Card } from '../ui/Card';
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

  return (
    <Card variant="elevated" padding="md">
      <Pressable onPress={() => setExpanded(!expanded)}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-text-primary font-semibold">Analysis</Text>
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-bg-secondary items-center justify-center mr-2">
              <Text className="text-accent-primary font-bold">
                {analysis.overall_quality}
              </Text>
            </View>
            {expanded ? (
              <ChevronDown size={20} color="#6E6E73" />
            ) : (
              <ChevronRight size={20} color="#6E6E73" />
            )}
          </View>
        </View>

        <Text className="text-success text-sm mb-3">{analysis.encouragement}</Text>

        <View className="flex-row flex-wrap gap-1">
          {analysis.items.slice(0, expanded ? undefined : 4).map((item, index) => (
            <AnalysisBadge
              key={index}
              type={item.type as AnalysisItemType}
              label={item.label}
              size="sm"
            />
          ))}
          {!expanded && analysis.items.length > 4 && (
            <View className="px-2 py-0.5 rounded-md bg-bg-secondary">
              <Text className="text-xs text-text-muted">
                +{analysis.items.length - 4} more
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {expanded && (
        <View className="mt-4 pt-4 border-t border-bg-secondary">
          {issues.length > 0 && (
            <View className="mb-4">
              <Text className="text-text-secondary text-sm font-medium mb-2">
                Areas for Growth
              </Text>
              {issues.map((item, index) => (
                <AnalysisItemDetail key={index} item={item} />
              ))}
            </View>
          )}

          {strengths.length > 0 && (
            <View>
              <Text className="text-text-secondary text-sm font-medium mb-2">
                Strengths
              </Text>
              {strengths.map((item, index) => (
                <AnalysisItemDetail key={index} item={item} />
              ))}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

function AnalysisItemDetail({ item }: { item: AnalysisItemResult }) {
  return (
    <View className="mb-3 p-3 rounded-xl bg-bg-secondary">
      <View className="flex-row items-center mb-2">
        <AnalysisBadge type={item.type} size="sm" />
        <Text className="text-text-primary font-medium ml-2">{item.label}</Text>
      </View>

      {item.excerpt && (
        <Text className="text-text-muted text-sm italic mb-2">"{item.excerpt}"</Text>
      )}

      <Text className="text-text-secondary text-sm mb-2">{item.explanation}</Text>

      {item.coaching && (
        <View className="p-2 rounded-lg bg-accent-muted/20 flex-row items-start">
          <Lightbulb size={16} color="#F59E0B" />
          <Text className="text-accent-primary text-sm flex-1 ml-2">{item.coaching}</Text>
        </View>
      )}
    </View>
  );
}
