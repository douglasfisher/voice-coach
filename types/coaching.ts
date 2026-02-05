/**
 * Coaching System Types
 *
 * Types for the practice coaching features (dating, interviews, presentations, etc.)
 * These work alongside existing ChallengeStyle types for debate-focused personas.
 */

// =============================================================================
// ENUMS & LITERALS
// =============================================================================

/**
 * Coaching approach style - how the coach interacts with the user
 */
export type CoachingStyle =
  | 'supportive_guide'    // Warm, encouraging, builds confidence gradually
  | 'tough_love'          // Direct, high standards, honest feedback
  | 'playful_mentor'      // Humor-driven, lighthearted but effective
  | 'expert_advisor'      // Domain expertise focus, professional guidance
  | 'confidence_builder'; // Self-esteem focused, celebrates progress

/**
 * Who leads the conversation
 */
export type InteractionMode =
  | 'coach_leads'    // Coach asks questions, user responds (current default for challengers)
  | 'user_leads'     // User initiates, coach plays the role (hot seat scenarios)
  | 'turn_taking'    // Back-and-forth, equal participation (negotiations)
  | 'question_mode'; // User asks questions, coach provides expert answers (Q&A mode)

/**
 * Feedback delivery style
 */
export type FeedbackStyle =
  | 'sandwich'        // Positive-constructive-positive
  | 'direct'          // Straightforward observations
  | 'question_based'  // Guides reflection through questions
  | 'observational';  // Neutral observations, user draws conclusions

/**
 * Session phase - roleplay vs coaching mode
 */
export type SessionPhase =
  | 'roleplay'   // Coach stays in character, no meta-feedback
  | 'feedback';  // Coach provides coaching analysis and guidance

/**
 * Domain slugs for coaching categories
 */
export type CoachingDomainSlug =
  | 'dating'
  | 'interviews'
  | 'presentations'
  | 'negotiations'
  | 'difficult_conversations'
  | 'networking';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Situation variant within a scenario
 */
export interface SituationVariant {
  name: string;
  context: string;
}

/**
 * Coaching domain (dating, interviews, etc.)
 */
export interface CoachingDomain {
  id: string;
  slug: string;  // Uses string to allow extensibility, CoachingDomainSlug for known values
  name: string;
  description: string | null;
  icon: string;
  color: string;
  tagline: string | null;
  isActive: boolean;
  isPremium: boolean;
  sortOrder: number;
}

/**
 * Practice scenario within a domain
 */
export interface Scenario {
  id: string;
  domainId: string;
  slug: string;
  name: string;
  description: string | null;
  interactionMode: InteractionMode;
  difficultyLevel: number;
  scenarioContext: string;
  userGoal: string | null;
  situationVariants: SituationVariant[];
  recommendedCoaches: string[];
  isActive: boolean;
  sortOrder: number;
}

/**
 * Coach-specific fields on a persona
 */
export interface CoachingPersonaFields {
  personaType: 'challenger' | 'coach';
  domainId: string | null;
  coachingStyle: CoachingStyle | null;
  defaultInteractionMode: InteractionMode;
  feedbackStyle: FeedbackStyle;
}

/**
 * Extended conversation context for coaching sessions
 */
export interface CoachingConversationContext {
  domainId: string | null;
  scenarioId: string | null;
  interactionMode: InteractionMode;
  currentPhase: SessionPhase;
  scenarioVariant: SituationVariant | null;
}

// =============================================================================
// DISPLAY TYPES (for UI components)
// =============================================================================

/**
 * Domain with scenario count for selection UI
 */
export interface CoachingDomainDisplay extends CoachingDomain {
  scenarioCount?: number;
  coachCount?: number;
}

/**
 * Scenario with domain info for selection UI
 */
export interface ScenarioDisplay extends Scenario {
  domainName?: string;
  domainColor?: string;
}

// =============================================================================
// LABELS & DESCRIPTIONS
// =============================================================================

export const COACHING_STYLE_LABELS: Record<CoachingStyle, string> = {
  supportive_guide: 'Supportive Guide',
  tough_love: 'Tough Love',
  playful_mentor: 'Playful Mentor',
  expert_advisor: 'Expert Advisor',
  confidence_builder: 'Confidence Builder',
};

export const COACHING_STYLE_DESCRIPTIONS: Record<CoachingStyle, string> = {
  supportive_guide: 'Warm and encouraging, builds confidence gradually',
  tough_love: 'Direct and honest, holds you to high standards',
  playful_mentor: 'Uses humor to make practice fun and memorable',
  expert_advisor: 'Shares domain expertise and professional strategies',
  confidence_builder: 'Focuses on building self-belief and celebrating progress',
};

export const INTERACTION_MODE_LABELS: Record<InteractionMode, string> = {
  coach_leads: 'Coach Leads',
  user_leads: 'You Lead',
  turn_taking: 'Back & Forth',
  question_mode: 'Q&A Mode',
};

export const INTERACTION_MODE_DESCRIPTIONS: Record<InteractionMode, string> = {
  coach_leads: 'The coach asks questions and guides the conversation',
  user_leads: 'You start the conversation and the coach responds in character',
  turn_taking: 'Equal participation with natural back-and-forth exchange',
  question_mode: 'Ask questions and get expert answers from your coach',
};

export const FEEDBACK_STYLE_LABELS: Record<FeedbackStyle, string> = {
  sandwich: 'Sandwich Method',
  direct: 'Direct Feedback',
  question_based: 'Question-Based',
  observational: 'Observational',
};

export const SESSION_PHASE_LABELS: Record<SessionPhase, string> = {
  roleplay: 'In Practice',
  feedback: 'Coaching Mode',
};

export const DOMAIN_ICONS: Record<CoachingDomainSlug, string> = {
  dating: 'Heart',
  interviews: 'Briefcase',
  presentations: 'Presentation',
  negotiations: 'Handshake',
  difficult_conversations: 'MessageSquare',
  networking: 'Users',
};
