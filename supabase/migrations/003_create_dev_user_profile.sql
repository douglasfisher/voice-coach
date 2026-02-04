-- Create profile and preferences for dev user
-- User ID: 18ae692a-7538-49fd-9062-65c4ff4ad328

INSERT INTO public.user_profiles (id, display_name, onboarding_completed)
VALUES ('18ae692a-7538-49fd-9062-65c4ff4ad328', 'Douglas Fisher', true)
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO public.user_preferences (user_id)
VALUES ('18ae692a-7538-49fd-9062-65c4ff4ad328')
ON CONFLICT (user_id) DO NOTHING;
