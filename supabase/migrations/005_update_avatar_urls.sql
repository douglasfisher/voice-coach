-- Update avatar URLs to use compatible image formats
-- Using UI Faces and Unsplash for realistic portrait images

UPDATE public.personas SET avatar_url = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face' WHERE name = 'Dr. Maya Chen';
UPDATE public.personas SET avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face' WHERE name = 'Marcus Webb';
UPDATE public.personas SET avatar_url = 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face' WHERE name = 'Professor Elena Volkov';
UPDATE public.personas SET avatar_url = 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=400&h=400&fit=crop&crop=face' WHERE name = 'Kofi Asante';
UPDATE public.personas SET avatar_url = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face' WHERE name = 'Sarah Mitchell';
UPDATE public.personas SET avatar_url = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face' WHERE name = 'Dr. Raj Patel';
UPDATE public.personas SET avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face' WHERE name = 'Yuki Tanaka';
UPDATE public.personas SET avatar_url = 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&crop=face' WHERE name LIKE '%Thomas O''Brien%';
