import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  conversationId: string;
  userMessage: string;
  personaId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversationId, userMessage, personaId }: ChatRequest = await req.json();

    // Get persona
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .single();

    if (personaError || !persona) {
      throw new Error('Persona not found');
    }

    // Get conversation history
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('sequence', { ascending: true });

    if (messagesError) {
      throw new Error('Failed to fetch conversation history');
    }

    // Build messages array for Claude
    const conversationMessages = (messages || []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Add the new user message
    conversationMessages.push({
      role: 'user',
      content: userMessage,
    });

    // Get the next sequence number
    const nextSequence = (messages?.length || 0) + 1;

    // Save user message
    const { error: saveUserError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        sequence: nextSequence,
      });

    if (saveUserError) {
      throw new Error('Failed to save user message');
    }

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: persona.system_prompt,
      messages: conversationMessages,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Save assistant message
    const { error: saveAssistantError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage,
        sequence: nextSequence + 1,
      });

    if (saveAssistantError) {
      throw new Error('Failed to save assistant message');
    }

    // Analyze user message for biases/fallacies
    let analysis = null;
    try {
      const analysisResponse = await fetch(
        `${supabaseUrl}/functions/v1/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            message: userMessage,
            context: conversationMessages.slice(-5),
          }),
        }
      );

      if (analysisResponse.ok) {
        analysis = await analysisResponse.json();

        // Update user message with analysis
        await supabase
          .from('messages')
          .update({ analysis })
          .eq('conversation_id', conversationId)
          .eq('sequence', nextSequence);
      }
    } catch (analysisError) {
      console.error('Analysis failed:', analysisError);
    }

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        analysis,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
