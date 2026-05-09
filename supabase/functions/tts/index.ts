/**
 * TTS Edge Function
 *
 * Server-side proxy for ElevenLabs text-to-speech. Replaces the
 * mobile client's previous direct call to api.elevenlabs.io which
 * required EXPO_PUBLIC_ELEVENLABS_API_KEY in the bundle (a leaked
 * secret). This function:
 *
 *   1. Reads the SECRET ElevenLabs key from Supabase secrets.
 *   2. Generates the audio.
 *   3. Uploads to the tts-audio bucket via service role.
 *   4. Records ai_usage so spoken-response spend is visible alongside
 *      Groq + Runware costs.
 *   5. Returns the public URL — same contract the mobile client
 *      expected from the old direct path, so the swap is drop-in.
 *
 * Deploy with --no-verify-jwt (mirrors the rest of the project — the
 * sb_publishable_* key the mobile client uses isn't a valid JWT).
 * The function reads the user_id from the request body for usage
 * attribution; clients that omit it just get null on the row, which
 * still tracks aggregate spend.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { recordAIUsage } from '../_shared/cost-calculator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';
const DEFAULT_MODEL_ID = 'eleven_turbo_v2_5';
const STORAGE_BUCKET = 'tts-audio';

interface TTSRequest {
  text: string;
  voiceId: string;
  // Optional voice overrides. Matches the shape of types/persona.ts
  // VoiceConfig so the mobile client doesn't have to flatten.
  voiceConfig?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
  };
  // Mobile sends the auth user_id so we attribute spend correctly.
  // Server doesn't trust this for authorisation — TTS is gated by
  // the function's existence behind the publishable key.
  userId?: string | null;
  conversationId?: string | null;
  personaId?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const elevenKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!elevenKey) {
    return new Response(
      JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let body: TTSRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!body.text || !body.voiceId) {
    return new Response(
      JSON.stringify({ error: 'missing_text_or_voice' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // 1. Generate audio
    const elevenResp = await fetch(`${ELEVENLABS_BASE}/${body.voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: body.text,
        model_id: DEFAULT_MODEL_ID,
        voice_settings: {
          stability: body.voiceConfig?.stability ?? 0.5,
          similarity_boost: body.voiceConfig?.similarityBoost ?? 0.75,
          style: body.voiceConfig?.style ?? 0.5,
        },
      }),
    });

    if (!elevenResp.ok) {
      const errText = await elevenResp.text();
      console.error('ElevenLabs error', elevenResp.status, errText);
      return new Response(
        JSON.stringify({
          error: 'tts_provider_failed',
          status: elevenResp.status,
          detail: errText.slice(0, 500),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const audioBuffer = await elevenResp.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    // 2. Upload to storage
    const fileName = `audio/${Date.now()}-${crypto.randomUUID()}.mp3`;
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, audioBytes, {
        contentType: 'audio/mpeg',
        upsert: false,
      });
    if (uploadErr) {
      console.error('upload failed', uploadErr);
      return new Response(
        JSON.stringify({ error: 'upload_failed', message: uploadErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    // 3. Record usage. ElevenLabs prices per character — use the
    // ai_models row keyed on 'elevenlabs:turbo_v2_5' (migration 083)
    // with cost_per_million_input expressing cents-per-million-chars.
    // prompt_tokens = character count, completion_tokens = 0.
    const characterCount = body.text.length;
    await recordAIUsage(supabase, {
      userId: body.userId ?? null,
      conversationId: body.conversationId ?? null,
      personaId: body.personaId ?? null,
      model: `elevenlabs:${DEFAULT_MODEL_ID}`,
      promptTokens: characterCount,
      completionTokens: 0,
      totalTokens: characterCount,
      taskType: 'tts',
    });

    // 4. Return same shape the old direct-call code expected: a public URL.
    return new Response(
      JSON.stringify({
        url: urlData.publicUrl,
        path: fileName,
        characters: characterCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('tts function error', err);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
