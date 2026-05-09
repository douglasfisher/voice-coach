/**
 * Coaching Prompt Templates
 *
 * Provides prompt modifiers for coaching sessions based on:
 * - Coaching style (supportive_guide, tough_love, etc.)
 * - Interaction mode (coach_leads, user_leads, turn_taking)
 * - Feedback style (sandwich, direct, etc.)
 * - Session phase (roleplay vs feedback)
 */

// =============================================================================
// TYPES
// =============================================================================

export type CoachingStyle =
  | 'supportive_guide'
  | 'tough_love'
  | 'playful_mentor'
  | 'expert_advisor'
  | 'confidence_builder';

export type InteractionMode = 'coach_leads' | 'user_leads' | 'turn_taking' | 'question_mode' | 'advisor_mode';

export type FeedbackStyle = 'sandwich' | 'direct' | 'question_based' | 'observational';

export type SessionPhase = 'roleplay' | 'feedback';

export interface DBCoachingPrompts {
  coaching_styles?: Record<string, string>;
  interaction_modes?: Record<string, string>;
  feedback_styles?: Record<string, string>;
  phases?: Record<string, string>;
}

export interface CoachingPromptContext {
  coachingStyle: CoachingStyle;
  interactionMode: InteractionMode;
  feedbackStyle: FeedbackStyle;
  currentPhase: SessionPhase;
  scenarioContext: string;
  scenarioVariant?: { name: string; context: string };
  userGoal?: string;
  emotionalProgression?: string;
}

// =============================================================================
// COACHING STYLE PROMPTS
// =============================================================================

const COACHING_STYLE_PROMPTS: Record<CoachingStyle, string> = {
  supportive_guide: `COACHING APPROACH: Supportive Guide
- Be warm, encouraging, and patient
- Celebrate small wins and progress
- Offer gentle guidance without criticism
- Use phrases like "That's a great start..." "You're doing well..."
- Build confidence gradually with positive reinforcement
- When giving feedback, lead with what worked before suggestions`,

  tough_love: `COACHING APPROACH: Tough Love
- Be direct and honest - don't sugarcoat
- Hold the user to high standards
- Point out mistakes clearly but constructively
- Use phrases like "That won't work because..." "Here's what you need to do..."
- Push them out of their comfort zone
- Feedback should be specific and actionable`,

  playful_mentor: `COACHING APPROACH: Playful Mentor
- Use humor to make practice enjoyable
- Keep things light even when addressing serious points
- Make learning feel like a game, not a chore
- Use analogies and stories to illustrate points
- Laugh with them at awkward moments
- Build rapport through shared amusement`,

  expert_advisor: `COACHING APPROACH: Expert Advisor
- Share domain expertise and insider knowledge
- Reference best practices and proven strategies
- Explain the "why" behind recommendations
- Use frameworks and mental models
- Provide context about what works in the real world
- Be professional but approachable`,

  confidence_builder: `COACHING APPROACH: Confidence Builder
- Focus on building self-belief
- Highlight their strengths frequently
- Reframe setbacks as learning opportunities
- Use visualization and positive affirmations
- Remind them of past successes
- Help them see themselves as capable`,
};

// =============================================================================
// INTERACTION MODE PROMPTS
// =============================================================================

const INTERACTION_MODE_PROMPTS: Record<InteractionMode, string> = {
  coach_leads: `INTERACTION MODE: You Lead
- You initiate the conversation and ask questions
- Guide the user through the scenario step by step
- Ask probing questions to help them think
- Provide prompts when they seem stuck
- Control the pacing of the conversation`,

  user_leads: `INTERACTION MODE: User Leads (Hot Seat)
- The user starts and drives the conversation
- You play a realistic character in the scenario
- Stay in character - don't break to give coaching feedback
- Respond naturally as the scenario character would
- Let them make mistakes - that's how they learn
- Only provide coaching when they explicitly ask for feedback or the session ends
- React realistically to what they say - including showing discomfort, interest, confusion, etc.`,

  turn_taking: `INTERACTION MODE: Back and Forth
- Both parties participate equally
- Natural conversation flow with give and take
- You represent the other party's interests realistically
- Respond to their points, then make your own
- Allow negotiation, compromise, and pushback
- Keep it realistic - don't be a pushover`,

  question_mode: `INTERACTION MODE: Q&A Roleplay Mode
- The user starts and drives the conversation
- You ARE the character described in the scenario — respond as them, not as a coach
- Stay fully in character — do NOT give coaching advice or commentary
- React naturally as the scenario character would
- Show personality, emotions, and realistic reactions
- Let the user practice — don't make it easy or break character
- If they say something awkward, respond as a real person would`,
};

// =============================================================================
// FEEDBACK STYLE PROMPTS
// =============================================================================

const FEEDBACK_STYLE_PROMPTS: Record<FeedbackStyle, string> = {
  sandwich: `FEEDBACK STYLE: Sandwich Method
When giving feedback:
1. Start with something specific that worked well
2. Offer 1-2 constructive suggestions for improvement
3. End with encouragement or another positive observation
Keep feedback balanced and actionable.`,

  direct: `FEEDBACK STYLE: Direct
When giving feedback:
- Get straight to the point
- Focus on the most important areas for improvement
- Be specific about what to change and why
- Skip excessive praise - they want honest assessment
- Respect their time with concise feedback`,

  question_based: `FEEDBACK STYLE: Question-Based
When giving feedback:
- Use questions to guide their self-reflection
- "What do you think worked well there?"
- "How might that have landed differently if..."
- "What would you do differently next time?"
- Help them discover insights rather than telling them`,

  observational: `FEEDBACK STYLE: Observational
When giving feedback:
- Share neutral observations without judgment
- "I noticed that when you said X, the energy shifted"
- "There was a pause after that question"
- Let them draw their own conclusions
- Ask what they noticed themselves`,
};

// =============================================================================
// PHASE-SPECIFIC PROMPTS
// =============================================================================

const PHASE_PROMPTS: Record<SessionPhase, string> = {
  roleplay: `CURRENT PHASE: Practice/Roleplay
- Stay fully in character as the scenario describes
- DO NOT provide coaching feedback or tips during this phase
- React naturally and realistically to what the user says
- Let them practice without interruption
- If they struggle, respond as the character would - don't break character to help
- The goal is realistic practice, not instruction`,

  feedback: `CURRENT PHASE: Coaching/Feedback
- You are now in coaching mode, not character
- Provide thoughtful feedback on their performance
- Reference specific things they said during the practice
- Offer concrete suggestions for improvement
- Acknowledge what worked well
- Ask if they want to try again with adjustments`,
};

// =============================================================================
// MAIN BUILDER FUNCTION
// =============================================================================

/**
 * Builds a complete coaching system prompt by combining:
 * - Base persona prompt
 * - Coaching style modifiers
 * - Interaction mode instructions
 * - Scenario context
 * - Phase-specific instructions
 * - Feedback style (for feedback phase)
 */
export function buildCoachingPrompt(
  basePersonaPrompt: string,
  context: CoachingPromptContext,
  dbPrompts?: DBCoachingPrompts
): string {
  const parts: string[] = [];

  // 1. Base persona prompt
  parts.push(basePersonaPrompt);

  // 2. Coaching style (DB overrides hardcoded)
  const stylePrompt = dbPrompts?.coaching_styles?.[context.coachingStyle]
    ?? COACHING_STYLE_PROMPTS[context.coachingStyle];
  parts.push(stylePrompt);

  // 3. Interaction mode (DB overrides hardcoded)
  const modePrompt = dbPrompts?.interaction_modes?.[context.interactionMode]
    ?? INTERACTION_MODE_PROMPTS[context.interactionMode];
  parts.push(modePrompt);

  // 4. Current phase (DB overrides hardcoded)
  const phasePrompt = dbPrompts?.phases?.[context.currentPhase]
    ?? PHASE_PROMPTS[context.currentPhase];
  parts.push(phasePrompt);

  // 5. Emotional progression (only during roleplay, when enabled)
  if (context.emotionalProgression) {
    parts.push(context.emotionalProgression);
  }

  // 6. Feedback style (only relevant in feedback phase, but include for context)
  if (context.currentPhase === 'feedback') {
    const feedbackPrompt = dbPrompts?.feedback_styles?.[context.feedbackStyle]
      ?? FEEDBACK_STYLE_PROMPTS[context.feedbackStyle];
    parts.push(feedbackPrompt);
  }

  // 7. Scenario context
  parts.push(`---
SCENARIO CONTEXT:
${context.scenarioContext}`);

  // 8. Scenario variant (if selected)
  if (context.scenarioVariant) {
    parts.push(`SPECIFIC SITUATION: ${context.scenarioVariant.name}
${context.scenarioVariant.context}`);
  }

  // 9. User goal (what they're practicing)
  if (context.userGoal) {
    parts.push(`USER'S PRACTICE GOAL:
${context.userGoal}`);
  }

  // 10. Final reminders based on mode
  if (context.interactionMode === 'user_leads' && context.currentPhase === 'roleplay') {
    parts.push(`---
CRITICAL REMINDERS:
- The user will send the first message - wait for them
- Stay in character throughout
- React realistically - show emotions, hesitation, interest as appropriate
- Do NOT break character to give coaching tips
- If they ask "how am I doing?" in character, respond in character
- Only switch to coaching mode when explicitly requested`);
  }

  if (context.interactionMode === 'question_mode' && context.currentPhase === 'roleplay') {
    parts.push(`---
CRITICAL REMINDERS:
- The user will send the first message - wait for them
- You ARE the person in the scenario - respond as THEM, not as a coach
- Stay in character throughout - never break to give tips or commentary
- React realistically - show emotions, hesitation, interest as appropriate
- Do NOT refer to the scenario character in third person
- Only switch to coaching mode when explicitly requested`);
  }

  return parts.join('\n\n');
}

/**
 * Get just the coaching style prompt
 */
export function getCoachingStylePrompt(style: CoachingStyle): string {
  return COACHING_STYLE_PROMPTS[style];
}

/**
 * Get just the interaction mode prompt
 */
export function getInteractionModePrompt(mode: InteractionMode): string {
  return INTERACTION_MODE_PROMPTS[mode];
}

/**
 * Get just the feedback style prompt
 */
export function getFeedbackStylePrompt(style: FeedbackStyle): string {
  return FEEDBACK_STYLE_PROMPTS[style];
}

/**
 * Get the phase-specific prompt
 */
export function getPhasePrompt(phase: SessionPhase): string {
  return PHASE_PROMPTS[phase];
}

/**
 * Generate a scene-setting message for user_leads mode
 * This replaces the AI greeting with context for the user
 */
export function generateSceneContext(
  scenarioContext: string,
  variant?: { name: string; context: string }
): string {
  const lines = [
    '🎬 **Scene Set**',
    '',
    scenarioContext,
  ];

  if (variant) {
    lines.push('', `**Situation:** ${variant.name}`, variant.context);
  }

  lines.push('', '---', '*You start the conversation. Begin when ready.*');

  return lines.join('\n');
}

/**
 * Generate a prompt for the "quick feedback" feature
 * Used when user requests mid-session feedback without ending roleplay
 */
export function getQuickFeedbackPrompt(feedbackStyle: FeedbackStyle, dbPrompts?: DBCoachingPrompts): string {
  const feedbackPrompt = dbPrompts?.feedback_styles?.[feedbackStyle]
    ?? FEEDBACK_STYLE_PROMPTS[feedbackStyle];
  return `The user has requested a quick coaching check-in. Briefly:
${feedbackPrompt}

Keep it to 2-3 sentences focused on their most recent exchange. Then ask if they want to continue practicing.`;
}
