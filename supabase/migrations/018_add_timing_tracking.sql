-- Add response_time_ms to messages table for tracking time between messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER DEFAULT NULL;

-- Add timing_metrics JSONB to conversations table for session analytics
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS timing_metrics JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.messages.response_time_ms IS 'Time in milliseconds since the previous message was created';
COMMENT ON COLUMN public.conversations.timing_metrics IS 'Session timing analytics: total_duration_ms, user_avg_response_ms, assistant_avg_response_ms, exchange_count, word_count_total';
