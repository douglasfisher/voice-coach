-- Migration 066: Add age_range column to personas
-- Stores the persona's age range for avatar generation and AI prompt token {{age_range}}

ALTER TABLE personas ADD COLUMN age_range TEXT DEFAULT NULL;
