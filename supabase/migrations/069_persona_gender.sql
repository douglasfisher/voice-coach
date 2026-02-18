-- Migration: Add gender column to personas for native TTS voice selection

ALTER TABLE personas
ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'male'
CHECK (gender IN ('male', 'female'));

COMMENT ON COLUMN personas.gender IS 'Persona gender - used for native TTS voice selection';

-- Set female personas
UPDATE personas SET gender = 'female' WHERE name IN (
  'Adaeze Obi',
  'Ava Chen',
  'Catherine Blackwell',
  'Eva Lindqvist',
  'Fiona Gallagher',
  'Grace Williams',
  'Hannah Brooks',
  'Helen Crawford',
  'Ingrid Svensson',
  'Jessica Taylor',
  'Julia Kovacs',
  'Karen Whitfield',
  'Karin Lindberg',
  'Katarina Petrova',
  'Kelly Anderson',
  'Lisa Moretti',
  'Margaret Brennan',
  'Mia Chang',
  'Nadia Karim',
  'Natalie Winter',
  'Natasha Volkov',
  'Patricia Keane',
  'Professor Elena Volkov',
  'Rachel Stevens',
  'Sarah Mitchel',
  'Sarah Mitchell',
  'Sienna Donovan',
  'Sophia Adeyemi',
  'Tessa Grant',
  'Victoria Blackwell',
  'Yuki Tanaka',
  'Yumi Nakamura',
  'Zara Khoury'
);
