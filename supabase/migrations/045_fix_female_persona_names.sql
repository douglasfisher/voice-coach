-- Migration 045: Fix female persona name/image mismatches
-- 12 personas have names that don't match the appearance of the person in their photo.
-- This migration updates their names and cultural backgrounds to align with their images.
-- Fiona Gallagher: no DB changes needed (name stays, no "redhead" references found).

BEGIN;

-- 1. Dr. Maya Okonkwo → Dr. Maya Jensen
-- Image: Blonde, blue-green eyes, fair skin
UPDATE personas SET
  name = 'Dr. Maya Jensen',
  cultural_background = REPLACE(cultural_background, 'Nigerian-American', 'Scandinavian-American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Dr. Maya Okonkwo', 'Dr. Maya Jensen'),
    'Nigerian-American', 'Scandinavian-American'
  )
WHERE name = 'Dr. Maya Okonkwo';

-- 2. Dr. Sarah Kim → Dr. Sarah Bennett
-- Image: Brunette, fair skin, hazel eyes
UPDATE personas SET
  name = 'Dr. Sarah Bennett',
  cultural_background = REPLACE(cultural_background, 'Korean-American', 'American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Dr. Sarah Kim', 'Dr. Sarah Bennett'),
    'Korean-American', 'American'
  )
WHERE name = 'Dr. Sarah Kim';

-- 3. Priya Sharma → Erin Calloway
-- Image: Redhead, blue/green eyes, very fair skin
UPDATE personas SET
  name = 'Erin Calloway',
  cultural_background = REPLACE(cultural_background, 'Indian-American', 'Irish-American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Priya Sharma', 'Erin Calloway'),
    'Indian-American', 'Irish-American'
  )
WHERE name = 'Priya Sharma';

-- 4. Lisa Park → Lisa Moretti
-- Image: Dark-haired, olive skin, Mediterranean features
UPDATE personas SET
  name = 'Lisa Moretti',
  cultural_background = REPLACE(cultural_background, 'Korean-American', 'Italian-American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Lisa Park', 'Lisa Moretti'),
    'Korean-American', 'Italian-American'
  )
WHERE name = 'Lisa Park';

-- 5. Dr. Nina Patel → Dr. Nina Larsson
-- Image: Blonde, green/blue eyes, fair skin
UPDATE personas SET
  name = 'Dr. Nina Larsson',
  cultural_background = REPLACE(cultural_background, 'Indian-British', 'Swedish-British'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Dr. Nina Patel', 'Dr. Nina Larsson'),
    'Indian-British', 'Swedish-British'
  )
WHERE name = 'Dr. Nina Patel';

-- 6. Sophia Martinez → Sophia Adeyemi
-- Image: Black woman, dark skin, short dark hair
UPDATE personas SET
  name = 'Sophia Adeyemi',
  cultural_background = REPLACE(cultural_background, 'Mexican-American', 'Nigerian-American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Sophia Martinez', 'Sophia Adeyemi'),
    'Mexican-American', 'Nigerian-American'
  )
WHERE name = 'Sophia Martinez';

-- 7. Yuki Yamamoto → Karin Lindberg
-- Image: Blonde, mature, blue eyes, fair skin
UPDATE personas SET
  name = 'Karin Lindberg',
  cultural_background = REPLACE(cultural_background, 'Japanese-American', 'Swedish-American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Yuki Yamamoto', 'Karin Lindberg'),
    'Japanese-American', 'Swedish-American'
  )
WHERE name = 'Yuki Yamamoto';

-- 8. Rachel Santos → Rachel Stevens
-- Image: Young blonde, green/blue eyes, very fair skin
UPDATE personas SET
  name = 'Rachel Stevens',
  cultural_background = REPLACE(cultural_background, 'Brazilian-American', 'American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Rachel Santos', 'Rachel Stevens'),
    'Brazilian-American', 'American'
  )
WHERE name = 'Rachel Santos';

-- 9. Valentina Rossi → Adaeze Obi
-- Image: Black woman, dark skin, short hair, young
UPDATE personas SET
  name = 'Adaeze Obi',
  cultural_background = REPLACE(cultural_background, 'Italian-American', 'Nigerian-American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Valentina Rossi', 'Adaeze Obi'),
    'Italian-American', 'Nigerian-American'
  )
WHERE name = 'Valentina Rossi';

-- 10. Layla Hassan → Elsa Bergstrom
-- Image: Blonde, blue eyes, fair skin
UPDATE personas SET
  name = 'Elsa Bergstrom',
  cultural_background = REPLACE(cultural_background, 'Lebanese-American', 'Swedish-American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Layla Hassan', 'Elsa Bergstrom'),
    'Lebanese-American', 'Swedish-American'
  )
WHERE name = 'Layla Hassan';

-- 11. Andrea Moreno → Andrea Flynn
-- Image: Redhead, blue eyes, very fair skin
UPDATE personas SET
  name = 'Andrea Flynn',
  cultural_background = REPLACE(cultural_background, 'Colombian-American', 'Irish-American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Andrea Moreno', 'Andrea Flynn'),
    'Colombian-American', 'Irish-American'
  )
WHERE name = 'Andrea Moreno';

-- 12. Zara Okafor → Zara Khoury
-- Image: Dark-haired, olive/tan skin, Middle Eastern features
UPDATE personas SET
  name = 'Zara Khoury',
  cultural_background = REPLACE(cultural_background, 'Nigerian-British', 'Lebanese-British'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Zara Okafor', 'Zara Khoury'),
    'Nigerian-British', 'Lebanese-British'
  )
WHERE name = 'Zara Okafor';

COMMIT;
