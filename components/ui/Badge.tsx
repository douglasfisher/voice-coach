import { View, Text } from 'react-native';
import { AnalysisItemType, ANALYSIS_COLORS, ANALYSIS_LABELS } from '../../types/analysis';

type BadgeVariant = 'default' | 'analysis';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  color?: string;
  analysisType?: AnalysisItemType;
  size?: 'sm' | 'md';
}

export function Badge({
  label,
  variant = 'default',
  color,
  analysisType,
  size = 'md',
}: BadgeProps) {
  const bgColor = analysisType
    ? ANALYSIS_COLORS[analysisType]
    : color ?? '#6E6E73';

  const displayLabel = analysisType && !label
    ? ANALYSIS_LABELS[analysisType]
    : label;

  const sizeStyles = size === 'sm'
    ? 'px-2 py-0.5 rounded-md'
    : 'px-3 py-1 rounded-lg';

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View
      className={sizeStyles}
      style={{ backgroundColor: bgColor + '20' }}
    >
      <Text
        className={`${textSize} font-medium`}
        style={{ color: bgColor }}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

interface AnalysisBadgeProps {
  type: AnalysisItemType;
  label?: string;
  size?: 'sm' | 'md';
}

export function AnalysisBadge({ type, label, size = 'sm' }: AnalysisBadgeProps) {
  return (
    <Badge
      label={label ?? ANALYSIS_LABELS[type]}
      analysisType={type}
      size={size}
    />
  );
}
