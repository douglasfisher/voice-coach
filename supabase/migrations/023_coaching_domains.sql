-- Migration: Add coaching domains and scenarios
-- Expands Dialectica to support coaching practice alongside existing challengers

-- =============================================================================
-- NEW TABLES
-- =============================================================================

-- Coaching domains (dating, interviews, presentations, etc.)
CREATE TABLE IF NOT EXISTS coaching_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,                          -- Lucide icon name
  color TEXT DEFAULT '#6366f1',                -- Hex color for theming
  tagline TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Practice scenarios within domains
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES coaching_domains(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  interaction_mode TEXT NOT NULL DEFAULT 'coach_leads',  -- 'coach_leads' | 'user_leads' | 'turn_taking'
  difficulty_level INTEGER DEFAULT 5 CHECK (difficulty_level BETWEEN 1 AND 10),
  scenario_context TEXT NOT NULL,              -- Injected into system prompt
  user_goal TEXT,                              -- What the user should practice
  situation_variants JSONB DEFAULT '[]'::jsonb, -- Array of {name, context} for variations
  recommended_coaches UUID[],                  -- References to personas
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(domain_id, slug)
);

-- =============================================================================
-- ALTER EXISTING TABLES
-- =============================================================================

-- Add coaching fields to personas
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS persona_type TEXT DEFAULT 'challenger',  -- 'challenger' | 'coach'
  ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES coaching_domains(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coaching_style TEXT,  -- 'supportive_guide' | 'tough_love' | 'playful_mentor' | 'expert_advisor' | 'confidence_builder'
  ADD COLUMN IF NOT EXISTS default_interaction_mode TEXT DEFAULT 'coach_leads',
  ADD COLUMN IF NOT EXISTS feedback_style TEXT DEFAULT 'sandwich';  -- 'sandwich' | 'direct' | 'question_based' | 'observational'

-- Add coaching context to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES coaching_domains(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interaction_mode TEXT DEFAULT 'coach_leads',
  ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'roleplay',  -- 'roleplay' | 'feedback'
  ADD COLUMN IF NOT EXISTS scenario_variant JSONB;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_coaching_domains_active ON coaching_domains(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_scenarios_domain ON scenarios(domain_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_personas_type ON personas(persona_type, is_active);
CREATE INDEX IF NOT EXISTS idx_personas_domain ON personas(domain_id) WHERE domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_domain ON conversations(domain_id) WHERE domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_scenario ON conversations(scenario_id) WHERE scenario_id IS NOT NULL;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE coaching_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- Coaching domains: public read for active domains
CREATE POLICY "Coaching domains are viewable by everyone"
  ON coaching_domains FOR SELECT
  USING (is_active = true);

CREATE POLICY "Coaching domains are manageable by admins"
  ON coaching_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Scenarios: public read for active scenarios
CREATE POLICY "Scenarios are viewable by everyone"
  ON scenarios FOR SELECT
  USING (is_active = true);

CREATE POLICY "Scenarios are manageable by admins"
  ON scenarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- =============================================================================
-- SEED COACHING DOMAINS
-- =============================================================================

INSERT INTO coaching_domains (slug, name, description, icon, color, tagline, sort_order) VALUES
(
  'dating',
  'Dating & Romance',
  'Practice conversations for dating scenarios - from first dates to relationship milestones',
  'Heart',
  '#ec4899',
  'Build confidence in romantic conversations',
  1
),
(
  'interviews',
  'Job Interviews',
  'Prepare for behavioral, technical, and situational interview questions',
  'Briefcase',
  '#3b82f6',
  'Ace your next interview',
  2
),
(
  'presentations',
  'Public Speaking',
  'Practice pitches, Q&A sessions, and impromptu speaking',
  'Presentation',
  '#8b5cf6',
  'Command the room with confidence',
  3
),
(
  'negotiations',
  'Negotiations',
  'Master salary discussions, vendor talks, and conflict resolution',
  'Handshake',
  '#10b981',
  'Get what you deserve',
  4
),
(
  'difficult_conversations',
  'Difficult Conversations',
  'Practice setting boundaries, giving feedback, and having tough talks',
  'MessageSquare',
  '#f59e0b',
  'Navigate challenging discussions with grace',
  5
),
(
  'networking',
  'Professional Networking',
  'Practice mingling, cold outreach, and maintaining professional relationships',
  'Users',
  '#06b6d4',
  'Build meaningful professional connections',
  6
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  tagline = EXCLUDED.tagline,
  sort_order = EXCLUDED.sort_order;

-- =============================================================================
-- SEED SCENARIOS
-- =============================================================================

-- Dating scenarios
INSERT INTO scenarios (domain_id, slug, name, description, interaction_mode, difficulty_level, scenario_context, user_goal, situation_variants) VALUES
(
  (SELECT id FROM coaching_domains WHERE slug = 'dating'),
  'first-date',
  'First Date Conversation',
  'Practice keeping a first date conversation flowing naturally',
  'user_leads',
  4,
  'You are on a first date at a casual coffee shop. The other person seems friendly but a bit nervous. Keep the conversation light, interesting, and help build connection.',
  'Practice asking engaging questions, sharing about yourself authentically, and creating comfortable conversation flow',
  '[{"name": "Coffee Shop Meet", "context": "Casual daytime coffee date"}, {"name": "Dinner Date", "context": "Evening dinner at a nice restaurant"}, {"name": "Activity Date", "context": "Meeting at a mini-golf course"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'dating'),
  'asking-for-number',
  'Asking for Their Number',
  'Practice confidently asking for someones contact information',
  'user_leads',
  5,
  'You have had a great brief conversation with someone attractive at a social event. You want to get their number to continue the connection.',
  'Practice expressing interest genuinely, making a clear ask, and handling various responses gracefully',
  '[{"name": "Party", "context": "At a friends birthday party"}, {"name": "Coffee Shop", "context": "Casual chat at a local cafe"}, {"name": "Bookstore", "context": "Browsing the same section"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'dating'),
  'dtr-conversation',
  'Defining the Relationship',
  'Practice having the DTR (Define The Relationship) conversation',
  'user_leads',
  7,
  'You have been seeing someone for a few months and want to discuss where the relationship is heading. The other person seems happy but hasnt brought up exclusivity.',
  'Practice expressing your needs clearly, asking about their feelings, and navigating potential uncertainty',
  '[{"name": "Ready to Commit", "context": "You want exclusivity"}, {"name": "Taking it Slow", "context": "You want to continue casually but be honest"}, {"name": "Uncertain", "context": "You are not sure what you want but need clarity"}]'::jsonb
)
ON CONFLICT (domain_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  interaction_mode = EXCLUDED.interaction_mode,
  difficulty_level = EXCLUDED.difficulty_level,
  scenario_context = EXCLUDED.scenario_context,
  user_goal = EXCLUDED.user_goal,
  situation_variants = EXCLUDED.situation_variants;

-- Interview scenarios
INSERT INTO scenarios (domain_id, slug, name, description, interaction_mode, difficulty_level, scenario_context, user_goal, situation_variants) VALUES
(
  (SELECT id FROM coaching_domains WHERE slug = 'interviews'),
  'behavioral-interview',
  'Behavioral Interview',
  'Practice answering "Tell me about a time when..." questions using the STAR method',
  'coach_leads',
  5,
  'You are in a behavioral interview. The interviewer will ask about past experiences to predict future performance. Use specific examples and the STAR method (Situation, Task, Action, Result).',
  'Practice structuring stories using STAR, providing concrete examples, and demonstrating relevant competencies',
  '[{"name": "Leadership", "context": "Focus on leadership and team management scenarios"}, {"name": "Conflict Resolution", "context": "Focus on handling disagreements and difficult situations"}, {"name": "Problem Solving", "context": "Focus on analytical and creative problem-solving examples"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'interviews'),
  'technical-interview',
  'Technical Interview',
  'Practice explaining technical concepts and walking through problem-solving',
  'coach_leads',
  7,
  'You are in a technical interview. The interviewer wants to understand your technical depth, problem-solving approach, and communication skills when discussing complex topics.',
  'Practice explaining technical concepts clearly, thinking out loud while problem-solving, and asking clarifying questions',
  '[{"name": "System Design", "context": "Discussing architecture and scalability"}, {"name": "Coding Discussion", "context": "Explaining code decisions and trade-offs"}, {"name": "Debugging", "context": "Walking through how you would debug an issue"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'interviews'),
  'salary-negotiation',
  'Salary Negotiation',
  'Practice negotiating compensation after receiving an offer',
  'turn_taking',
  8,
  'You have received a job offer and want to negotiate the salary. The offer is below your expectations but the role is exciting. The recruiter seems open to discussion.',
  'Practice stating your value confidently, making a counter-offer, and navigating back-and-forth negotiation',
  '[{"name": "First Job", "context": "Entry-level position, limited leverage"}, {"name": "Senior Role", "context": "Senior position with competitive offers"}, {"name": "Startup", "context": "Lower salary but equity on the table"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'interviews'),
  'be-the-interviewer',
  'Be the Interviewer',
  'Practice asking good questions when you are interviewing someone',
  'user_leads',
  6,
  'You are interviewing a candidate for your team. Practice asking insightful questions that reveal both competence and culture fit.',
  'Practice asking open-ended questions, following up effectively, and evaluating responses objectively',
  '[{"name": "Peer Interview", "context": "Interviewing for a role at your level"}, {"name": "Hiring Report", "context": "Interviewing someone who would report to you"}, {"name": "Culture Fit", "context": "Assessing team fit and values alignment"}]'::jsonb
)
ON CONFLICT (domain_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  interaction_mode = EXCLUDED.interaction_mode,
  difficulty_level = EXCLUDED.difficulty_level,
  scenario_context = EXCLUDED.scenario_context,
  user_goal = EXCLUDED.user_goal,
  situation_variants = EXCLUDED.situation_variants;

-- Presentation scenarios
INSERT INTO scenarios (domain_id, slug, name, description, interaction_mode, difficulty_level, scenario_context, user_goal, situation_variants) VALUES
(
  (SELECT id FROM coaching_domains WHERE slug = 'presentations'),
  'pitch-practice',
  'Pitch Practice',
  'Practice delivering a pitch while handling interruptions and questions',
  'user_leads',
  6,
  'You are pitching an idea to stakeholders who may interrupt with questions. Practice delivering your key points while staying adaptable.',
  'Practice clear value proposition delivery, handling interruptions gracefully, and staying on message',
  '[{"name": "Startup Pitch", "context": "Pitching to potential investors"}, {"name": "Internal Proposal", "context": "Pitching a new initiative to leadership"}, {"name": "Sales Pitch", "context": "Pitching a product to a potential client"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'presentations'),
  'qa-session',
  'Q&A Session',
  'Practice fielding challenging questions after a presentation',
  'coach_leads',
  7,
  'You have just finished a presentation and are now taking questions. The audience includes skeptics and people who may challenge your conclusions.',
  'Practice handling tough questions, admitting unknowns gracefully, and defending your position',
  '[{"name": "Technical Audience", "context": "Deep technical questions from experts"}, {"name": "Executive Audience", "context": "Business impact and ROI questions"}, {"name": "Mixed Audience", "context": "Varying levels of expertise"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'presentations'),
  'impromptu-speaking',
  'Impromptu Speaking',
  'Practice organizing your thoughts and speaking on random topics',
  'coach_leads',
  8,
  'You will be given a random topic and must speak about it coherently for 1-2 minutes with minimal preparation time.',
  'Practice quick thinking, structured responses, and confident delivery under pressure',
  '[{"name": "Meeting Context", "context": "Asked to share your thoughts in a meeting"}, {"name": "Toast", "context": "Asked to give an impromptu toast or speech"}, {"name": "Expert Opinion", "context": "Asked about your area of expertise unexpectedly"}]'::jsonb
)
ON CONFLICT (domain_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  interaction_mode = EXCLUDED.interaction_mode,
  difficulty_level = EXCLUDED.difficulty_level,
  scenario_context = EXCLUDED.scenario_context,
  user_goal = EXCLUDED.user_goal,
  situation_variants = EXCLUDED.situation_variants;

-- Negotiation scenarios
INSERT INTO scenarios (domain_id, slug, name, description, interaction_mode, difficulty_level, scenario_context, user_goal, situation_variants) VALUES
(
  (SELECT id FROM coaching_domains WHERE slug = 'negotiations'),
  'salary-negotiation',
  'Salary Negotiation',
  'Practice negotiating your compensation package',
  'turn_taking',
  7,
  'You are in a salary negotiation. Practice advocating for yourself while maintaining a positive relationship.',
  'Practice anchoring, making counter-offers, and negotiating non-salary benefits',
  '[{"name": "Annual Review", "context": "Negotiating a raise at your current job"}, {"name": "New Offer", "context": "Negotiating salary for a new position"}, {"name": "Promotion", "context": "Negotiating compensation for a new role"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'negotiations'),
  'vendor-negotiation',
  'Vendor Negotiation',
  'Practice negotiating terms with a vendor or supplier',
  'turn_taking',
  6,
  'You are negotiating a contract with a vendor. You need to get better terms while maintaining a good working relationship.',
  'Practice identifying leverage points, creating win-win outcomes, and handling hardball tactics',
  '[{"name": "Software Contract", "context": "Negotiating a SaaS agreement"}, {"name": "Service Provider", "context": "Negotiating with a consulting firm"}, {"name": "Supplier", "context": "Negotiating with a physical goods supplier"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'negotiations'),
  'conflict-resolution',
  'Conflict Resolution',
  'Practice finding middle ground in a dispute',
  'turn_taking',
  8,
  'You and another party have conflicting interests or perspectives. Practice finding common ground and reaching a resolution.',
  'Practice active listening, reframing positions as interests, and proposing creative solutions',
  '[{"name": "Workplace Conflict", "context": "Disagreement with a colleague"}, {"name": "Client Dispute", "context": "Resolving an issue with a client"}, {"name": "Partnership Issue", "context": "Disagreement with a business partner"}]'::jsonb
)
ON CONFLICT (domain_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  interaction_mode = EXCLUDED.interaction_mode,
  difficulty_level = EXCLUDED.difficulty_level,
  scenario_context = EXCLUDED.scenario_context,
  user_goal = EXCLUDED.user_goal,
  situation_variants = EXCLUDED.situation_variants;

-- Difficult conversations scenarios
INSERT INTO scenarios (domain_id, slug, name, description, interaction_mode, difficulty_level, scenario_context, user_goal, situation_variants) VALUES
(
  (SELECT id FROM coaching_domains WHERE slug = 'difficult_conversations'),
  'setting-boundaries',
  'Setting Boundaries',
  'Practice asserting your boundaries in a relationship or workplace',
  'user_leads',
  6,
  'Someone has been overstepping your boundaries. Practice clearly communicating your limits while maintaining the relationship.',
  'Practice using I-statements, being specific about the boundary, and handling pushback',
  '[{"name": "Work Boundaries", "context": "Colleague asking too much of your time"}, {"name": "Family Boundaries", "context": "Family member being intrusive"}, {"name": "Friend Boundaries", "context": "Friend not respecting your limits"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'difficult_conversations'),
  'giving-feedback',
  'Giving Constructive Feedback',
  'Practice delivering difficult feedback while being supportive',
  'user_leads',
  7,
  'You need to give someone feedback about their performance or behavior. The person may be defensive or emotional.',
  'Practice being specific, focusing on behavior not character, and offering support',
  '[{"name": "Direct Report", "context": "Giving feedback to someone you manage"}, {"name": "Peer Feedback", "context": "Giving feedback to a colleague"}, {"name": "Upward Feedback", "context": "Giving feedback to your manager"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'difficult_conversations'),
  'asking-for-raise',
  'Asking for a Raise',
  'Practice advocating for yourself in a compensation discussion',
  'user_leads',
  7,
  'You believe you deserve a raise and need to make your case to your manager. They may push back or say the budget is limited.',
  'Practice quantifying your value, making a clear ask, and handling objections',
  '[{"name": "Strong Performance", "context": "You have had a great year with clear wins"}, {"name": "Market Adjustment", "context": "You are underpaid relative to market"}, {"name": "Expanded Role", "context": "Your responsibilities have grown significantly"}]'::jsonb
)
ON CONFLICT (domain_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  interaction_mode = EXCLUDED.interaction_mode,
  difficulty_level = EXCLUDED.difficulty_level,
  scenario_context = EXCLUDED.scenario_context,
  user_goal = EXCLUDED.user_goal,
  situation_variants = EXCLUDED.situation_variants;

-- Networking scenarios
INSERT INTO scenarios (domain_id, slug, name, description, interaction_mode, difficulty_level, scenario_context, user_goal, situation_variants) VALUES
(
  (SELECT id FROM coaching_domains WHERE slug = 'networking'),
  'conference-mingling',
  'Conference Mingling',
  'Practice working a room and making connections at events',
  'user_leads',
  5,
  'You are at a professional conference or networking event. Practice approaching strangers, making conversation, and building connections.',
  'Practice opening conversations, finding common ground, and gracefully exiting conversations',
  '[{"name": "Industry Conference", "context": "Large conference in your industry"}, {"name": "Company Event", "context": "Internal networking event"}, {"name": "Meetup", "context": "Smaller professional meetup group"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'networking'),
  'cold-outreach',
  'Cold Outreach',
  'Practice reaching out to someone you admire or want to connect with',
  'user_leads',
  6,
  'You want to reach out to someone you dont know but would like to connect with. Practice crafting your message and follow-up.',
  'Practice being specific about why you are reaching out, providing value, and making a clear ask',
  '[{"name": "LinkedIn Message", "context": "Reaching out on LinkedIn"}, {"name": "Email Introduction", "context": "Cold emailing someone"}, {"name": "Referral Request", "context": "Asking for an intro through a mutual connection"}]'::jsonb
),
(
  (SELECT id FROM coaching_domains WHERE slug = 'networking'),
  'follow-up-conversation',
  'Follow-up Conversation',
  'Practice maintaining professional relationships after initial contact',
  'user_leads',
  4,
  'You met someone interesting at an event and want to follow up to build the relationship. Practice maintaining connection without being pushy.',
  'Practice referencing your previous conversation, providing value, and suggesting next steps',
  '[{"name": "Post-Conference", "context": "Following up after meeting at an event"}, {"name": "After Intro", "context": "Following up after being introduced"}, {"name": "Reconnecting", "context": "Reaching back out after some time has passed"}]'::jsonb
)
ON CONFLICT (domain_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  interaction_mode = EXCLUDED.interaction_mode,
  difficulty_level = EXCLUDED.difficulty_level,
  scenario_context = EXCLUDED.scenario_context,
  user_goal = EXCLUDED.user_goal,
  situation_variants = EXCLUDED.situation_variants;
