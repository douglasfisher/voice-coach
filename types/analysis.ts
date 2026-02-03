export type AnalysisItemType =
  | 'fallacy'
  | 'bias'
  | 'gender_dynamic'
  | 'racial_assumption'
  | 'emotional'
  | 'strength';

export type AnalysisSeverity = 'minor' | 'moderate' | 'significant';

export interface AnalysisItemResult {
  type: AnalysisItemType;
  code: string;
  label: string;
  severity: AnalysisSeverity;
  excerpt: string;
  explanation: string;
  coaching: string;
}

export interface AnalysisResult {
  items: AnalysisItemResult[];
  overall_quality: number;
  encouragement: string;
}

export const ANALYSIS_COLORS: Record<AnalysisItemType, string> = {
  fallacy: '#F87171',
  bias: '#FBBF24',
  gender_dynamic: '#A78BFA',
  racial_assumption: '#F472B6',
  emotional: '#FB923C',
  strength: '#34D399',
};

export const ANALYSIS_LABELS: Record<AnalysisItemType, string> = {
  fallacy: 'Logical Fallacy',
  bias: 'Cognitive Bias',
  gender_dynamic: 'Gender Dynamic',
  racial_assumption: 'Cultural Assumption',
  emotional: 'Emotional Reasoning',
  strength: 'Strength',
};
