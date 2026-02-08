-- Migration 046: Fix male persona name/image mismatches
-- 3 personas have names that don't match the appearance of the person in their photo.

BEGIN;

-- 1. Kofi Asante → Henry Tanaka
-- Image: East Asian man, mature ~50s, dark hair, blazer
UPDATE personas SET
  name = 'Henry Tanaka',
  cultural_background = REPLACE(cultural_background, 'Ghanaian', 'Japanese-American'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Kofi Asante', 'Henry Tanaka'),
    'Ghanaian', 'Japanese-American'
  )
WHERE name = 'Kofi Asante';

-- 2. Father Thomas O'Brien → Cormac Brennan
-- Image: Young redhead, blue eyes, casual — doesn't look like a priest
-- Drop "Father" title, update from priest to secular ethics counselor framing
UPDATE personas SET
  name = 'Cormac Brennan',
  cultural_background = REPLACE(cultural_background, 'Irish, 65, Former Priest, now Secular Ethics Counselor', 'Irish, 30s, Secular Ethics Counselor and Philosophy Graduate'),
  system_prompt = REPLACE(
    REPLACE(system_prompt, 'Father Thomas O''Brien', 'Cormac Brennan'),
    'Though you left the priesthood, you retained the gift of patient spiritual inquiry',
    'Your philosophy training gave you a gift for patient ethical inquiry'
  )
WHERE name = 'Father Thomas O''Brien';

-- 3. Takeshi Yamada → Grant Lawson
-- Image: Western, dark-haired, chiseled, ~30s
UPDATE personas SET
  name = 'Grant Lawson',
  cultural_background = REPLACE(cultural_background, 'Japanese-American, 50, Former Management Consultant', 'American, 35, Former Management Consultant'),
  system_prompt = REPLACE(system_prompt, 'Takeshi Yamada', 'Grant Lawson')
WHERE name = 'Takeshi Yamada';

COMMIT;
