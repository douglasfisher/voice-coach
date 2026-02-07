-- Migration: 019_create_growth_gamification.sql
-- Description: Add gamification system with XP, levels, achievements, projections, and insights

-- =============================================================================
-- USER_PROGRESS: XP and gamification tracking per user
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,

    -- XP System
    current_xp INTEGER NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 1,
    lifetime_xp INTEGER NOT NULL DEFAULT 0,

    -- Streak System
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_session_date DATE,
    streak_freeze_available INTEGER NOT NULL DEFAULT 1,
    streak_freeze_used_this_week BOOLEAN NOT NULL DEFAULT false,

    -- Growth Metrics
    growth_velocity NUMERIC(6,2) DEFAULT 0, -- points per week
    velocity_trend TEXT CHECK (velocity_trend IN ('accelerating', 'stable', 'decelerating')),
    projected_score_30day INTEGER,
    optimal_potential_score INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- ACHIEVEMENTS: Achievement definitions (reference table)
-- =============================================================================
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('milestone', 'streak', 'score', 'pattern', 'special')),
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    icon TEXT NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 100,
    requirement_type TEXT NOT NULL, -- e.g., 'sessions_completed', 'streak_days', 'score_threshold'
    requirement_value INTEGER NOT NULL,
    requirement_dimension TEXT, -- optional: specific dimension for score achievements
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- USER_ACHIEVEMENTS: Unlocked achievements per user
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xp_awarded INTEGER NOT NULL DEFAULT 0,

    -- Prevent duplicate achievements
    UNIQUE (user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
    ON user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- =============================================================================
-- XP_TRANSACTIONS: Audit log for XP awards
-- =============================================================================
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source TEXT NOT NULL, -- e.g., 'session_complete', 'achievement', 'streak_bonus', 'daily_first'
    source_id TEXT, -- optional: ID of related entity (conversation_id, achievement_id)
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for xp_transactions
CREATE POLICY "Users can view their own xp transactions"
    ON xp_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own xp transactions"
    ON xp_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON xp_transactions(created_at DESC);

-- =============================================================================
-- GROWTH_PROJECTIONS: Cached AI projections
-- =============================================================================
CREATE TABLE IF NOT EXISTS growth_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

    -- Current scores
    current_overall INTEGER,
    current_logical INTEGER,
    current_bias_awareness INTEGER,
    current_perspective INTEGER,
    current_emotional INTEGER,

    -- Projections
    projected_30_day INTEGER,
    optimal_potential INTEGER,

    -- Per-dimension projections stored as JSONB
    dimension_projections JSONB,
    -- Format: { logical: { current: 75, projected: 82, optimal: 95 }, ... }

    -- Analysis
    limiting_factor TEXT, -- e.g., 'consistency', 'bias_awareness', 'practice_frequency'
    confidence_level NUMERIC(3,2), -- 0.00 to 1.00

    -- Validity
    valid_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only one active projection per user
    UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE growth_projections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for growth_projections
CREATE POLICY "Users can view their own projections"
    ON growth_projections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own projections"
    ON growth_projections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projections"
    ON growth_projections FOR UPDATE
    USING (auth.uid() = user_id);

-- =============================================================================
-- USER_INSIGHTS: AI-generated personalized insights
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

    -- Insight details
    insight_type TEXT NOT NULL CHECK (insight_type IN ('celebration', 'focus', 'recommendation', 'warning', 'milestone')),
    trigger_event TEXT, -- what caused this insight (e.g., 'session_complete', 'streak_milestone', 'score_change')
    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Call to action
    action_type TEXT, -- e.g., 'start_session', 'view_achievement', 'try_persona', null
    action_data JSONB, -- e.g., { personaId: '...', challengeType: '...' }

    -- State
    dismissed BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Priority for ordering
    priority INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ -- optional expiry for time-sensitive insights
);

-- Enable RLS
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_insights
CREATE POLICY "Users can view their own insights"
    ON user_insights FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights"
    ON user_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
    ON user_insights FOR UPDATE
    USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_user_insights_user_id ON user_insights(user_id);
CREATE INDEX idx_user_insights_created_at ON user_insights(created_at DESC);
CREATE INDEX idx_user_insights_active ON user_insights(user_id, dismissed) WHERE NOT dismissed;

-- =============================================================================
-- SEED DATA: Achievement definitions
-- =============================================================================
INSERT INTO achievements (id, name, description, category, rarity, icon, xp_reward, requirement_type, requirement_value, sort_order) VALUES
    -- Milestone achievements
    ('first_steps', 'First Steps', 'Complete your first conversation', 'milestone', 'common', 'footprints', 100, 'sessions_completed', 1, 1),
    ('getting_started', 'Getting Started', 'Complete 10 conversations', 'milestone', 'common', 'rocket', 250, 'sessions_completed', 10, 2),
    ('dedicated_learner', 'Dedicated Learner', 'Complete 50 conversations', 'milestone', 'uncommon', 'book-open', 500, 'sessions_completed', 50, 3),
    ('centurion', 'Centurion', 'Complete 100 conversations', 'milestone', 'rare', 'crown', 1000, 'sessions_completed', 100, 4),

    -- Streak achievements
    ('three_day_streak', 'Getting Consistent', 'Maintain a 3-day streak', 'streak', 'common', 'flame', 100, 'streak_days', 3, 10),
    ('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', 'streak', 'uncommon', 'zap', 250, 'streak_days', 7, 11),
    ('monthly_master', 'Monthly Master', 'Maintain a 30-day streak', 'streak', 'rare', 'star', 500, 'streak_days', 30, 12),
    ('century_streak', 'Century Streak', 'Maintain a 100-day streak', 'streak', 'legendary', 'trophy', 2000, 'streak_days', 100, 13),

    -- Score achievements
    ('sharp_thinker', 'Sharp Thinker', 'Score 75 or higher in a conversation', 'score', 'common', 'brain', 100, 'score_threshold', 75, 20),
    ('excellent_mind', 'Excellent Mind', 'Score 90 or higher in a conversation', 'score', 'uncommon', 'sparkles', 250, 'score_threshold', 90, 21),
    ('near_perfect', 'Near Perfect', 'Score 95 or higher in a conversation', 'score', 'rare', 'award', 500, 'score_threshold', 95, 22),
    ('logic_master', 'Logic Master', 'Score 100 in Logical Reasoning', 'score', 'epic', 'brain', 750, 'dimension_max', 100, 23),
    ('bias_buster', 'Bias Buster', 'Score 100 in Bias Awareness', 'score', 'epic', 'eye', 750, 'dimension_max', 100, 24),
    ('perspective_pro', 'Perspective Pro', 'Score 100 in Perspective Taking', 'score', 'epic', 'lightbulb', 750, 'dimension_max', 100, 25),
    ('emotional_expert', 'Emotional Expert', 'Score 100 in Emotional Regulation', 'score', 'epic', 'heart', 750, 'dimension_max', 100, 26),

    -- Pattern achievements
    ('breaking_habits', 'Breaking Habits', 'Improve a declining pattern to stable', 'pattern', 'uncommon', 'rotate-ccw', 300, 'pattern_improved', 1, 30),
    ('pattern_breaker', 'Pattern Breaker', 'Improve 5 patterns', 'pattern', 'rare', 'target', 500, 'patterns_improved', 5, 31),
    ('well_rounded', 'Well Rounded', 'Score 70+ in all 4 dimensions simultaneously', 'pattern', 'rare', 'circle', 600, 'all_dimensions_above', 70, 32),

    -- Special achievements
    ('comeback_kid', 'Comeback Kid', 'Return after 7+ days away and complete a session', 'special', 'uncommon', 'refresh-cw', 200, 'comeback_days', 7, 40),
    ('social_butterfly', 'Social Butterfly', 'Practice with all available personas', 'special', 'rare', 'users', 500, 'all_personas', 1, 41),
    ('night_owl', 'Night Owl', 'Complete a session between 10 PM and 4 AM', 'special', 'common', 'moon', 100, 'night_session', 1, 42),
    ('early_bird', 'Early Bird', 'Complete a session between 5 AM and 7 AM', 'special', 'common', 'sun', 100, 'morning_session', 1, 43)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    rarity = EXCLUDED.rarity,
    icon = EXCLUDED.icon,
    xp_reward = EXCLUDED.xp_reward,
    requirement_type = EXCLUDED.requirement_type,
    requirement_value = EXCLUDED.requirement_value,
    sort_order = EXCLUDED.sort_order;

-- =============================================================================
-- HELPER FUNCTION: Award XP to user
-- =============================================================================
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_source TEXT,
    p_source_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_new_xp INTEGER;
    v_new_level INTEGER;
BEGIN
    -- Insert XP transaction
    INSERT INTO xp_transactions (user_id, amount, source, source_id, description)
    VALUES (p_user_id, p_amount, p_source, p_source_id, p_description);

    -- Update user progress (upsert)
    INSERT INTO user_progress (user_id, current_xp, lifetime_xp, current_level)
    VALUES (p_user_id, p_amount, p_amount, 1)
    ON CONFLICT (user_id) DO UPDATE SET
        current_xp = user_progress.current_xp + p_amount,
        lifetime_xp = user_progress.lifetime_xp + p_amount,
        updated_at = NOW()
    RETURNING current_xp INTO v_new_xp;

    -- Calculate new level based on XP thresholds
    -- Level thresholds: 1=0, 2=500, 3=1500, 4=3500, 5=7000, 6=12000, 7=20000, 8=32000, 9=50000, 10=75000
    v_new_level := CASE
        WHEN v_new_xp >= 75000 THEN 10
        WHEN v_new_xp >= 50000 THEN 9
        WHEN v_new_xp >= 32000 THEN 8
        WHEN v_new_xp >= 20000 THEN 7
        WHEN v_new_xp >= 12000 THEN 6
        WHEN v_new_xp >= 7000 THEN 5
        WHEN v_new_xp >= 3500 THEN 4
        WHEN v_new_xp >= 1500 THEN 3
        WHEN v_new_xp >= 500 THEN 2
        ELSE 1
    END;

    -- Update level if changed
    UPDATE user_progress
    SET current_level = v_new_level
    WHERE user_id = p_user_id AND current_level != v_new_level;

    RETURN v_new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- HELPER FUNCTION: Update streak
-- =============================================================================
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID) RETURNS INTEGER AS $$
DECLARE
    v_last_date DATE;
    v_today DATE := CURRENT_DATE;
    v_new_streak INTEGER;
BEGIN
    -- Get current streak info
    SELECT last_session_date, current_streak
    INTO v_last_date, v_new_streak
    FROM user_progress
    WHERE user_id = p_user_id;

    -- If no record exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_progress (user_id, current_streak, longest_streak, last_session_date)
        VALUES (p_user_id, 1, 1, v_today);
        RETURN 1;
    END IF;

    -- Calculate new streak
    IF v_last_date IS NULL THEN
        v_new_streak := 1;
    ELSIF v_last_date = v_today THEN
        -- Already had a session today, no change
        RETURN v_new_streak;
    ELSIF v_last_date = v_today - 1 THEN
        -- Consecutive day, increment streak
        v_new_streak := v_new_streak + 1;
    ELSE
        -- Streak broken, reset to 1
        v_new_streak := 1;
    END IF;

    -- Update the record
    UPDATE user_progress
    SET
        current_streak = v_new_streak,
        longest_streak = GREATEST(longest_streak, v_new_streak),
        last_session_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN v_new_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION award_xp TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_streak TO authenticated;
