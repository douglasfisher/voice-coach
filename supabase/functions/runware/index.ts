/**
 * Runware Edge Function — Proxy + Storage Upload + Usage Tracking
 *
 * Forwards requests to the Runware API and optionally uploads resulting
 * images to Supabase storage (using service role). Records ai_usage rows
 * after each successful generation so mobile-initiated avatar spend is
 * visible in /admin/usage alongside Groq + admin-side image gen.
 *
 * The web admin's avatar routes record their own usage rows (they call
 * Runware via this function but write usage server-side in the route).
 * To avoid double-counting, the web admin passes `skipUsageTracking: true`
 * in the request body.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, corsPreflightResponse, errorResponse } from '../_shared/utils.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    const apiKey = Deno.env.get('RUNWARE_API_KEY');
    if (!apiKey) {
      return errorResponse('RUNWARE_API_KEY not configured', 500);
    }

    const requestBody = await req.json();

    // Check for our custom wrapper: { tasks: [...], uploadToStorage: true }
    // Otherwise treat entire body as Runware payload
    let runwarePayload: unknown;
    let shouldUpload = false;
    let storagePrefix = 'drafts';
    let attribUserId: string | null = null;
    let attribPersonaId: string | null = null;
    // Web admin passes this so its server-side ai_usage write isn't
    // duplicated by ours. Mobile clients omit it (default false).
    let skipUsageTracking = false;

    if (requestBody?.tasks && requestBody?.uploadToStorage) {
      runwarePayload = requestBody.tasks;
      shouldUpload = true;
      storagePrefix = requestBody.storagePrefix || 'drafts';
      attribUserId = requestBody.userId ?? null;
      attribPersonaId = requestBody.personaId ?? null;
      skipUsageTracking = requestBody.skipUsageTracking === true;
    } else {
      runwarePayload = requestBody;
    }

    // Best-effort task model extraction for usage attribution. If the
    // payload is an array of tasks (our wrapper case), use the first
    // task's model — they're typically all the same in our flows.
    const taskModel: string | undefined = Array.isArray(runwarePayload)
      ? (runwarePayload[0] as { model?: string } | undefined)?.model
      : undefined;

    // Forward to Runware
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(runwarePayload),
    });

    const runwareData = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(runwareData), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If not uploading, return as-is
    if (!shouldUpload || !runwareData?.data) {
      return new Response(JSON.stringify(runwareData), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload images to Supabase storage using service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const enrichedImages = [];

    for (let i = 0; i < runwareData.data.length; i++) {
      const img = runwareData.data[i];
      const imageUrl = img.imageURL || img.imageUrl;

      if (!imageUrl) {
        enrichedImages.push(img);
        continue;
      }

      try {
        const imageResponse = await fetch(imageUrl);
        const blob = await imageResponse.blob();
        const ext = img.outputFormat === 'WEBP' ? 'webp' : 'jpg';
        const fileName = `${storagePrefix}/${Date.now()}_${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('persona-avatars')
          .upload(fileName, blob, {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            upsert: false,
          });

        if (uploadError) {
          console.error(`Upload error for image ${i}:`, uploadError);
          enrichedImages.push(img);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('persona-avatars')
          .getPublicUrl(fileName);

        enrichedImages.push({
          ...img,
          storageUrl: urlData.publicUrl,
          storagePath: fileName,
        });
      } catch (err) {
        console.error(`Failed to upload image ${i}:`, err);
        enrichedImages.push(img);
      }
    }

    // Record one ai_usage row per generate call (not per image) so the
    // dashboard's "requests" count reflects user actions, not image
    // multiplicity. completion_tokens = images produced gives a volume
    // axis. Cost is summed across all images from Runware's response
    // (Runware reports cost in USD per image; we store integer cents).
    if (!skipUsageTracking && enrichedImages.length > 0) {
      const totalCostUsd = enrichedImages.reduce(
        (sum: number, img: { cost?: number }) => sum + (img.cost ?? 0),
        0,
      );
      const { error: usageErr } = await supabase.from('ai_usage').insert({
        user_id: attribUserId,
        conversation_id: null,
        persona_id: attribPersonaId,
        model: taskModel ?? 'runware:unknown',
        prompt_tokens: 0,
        completion_tokens: enrichedImages.length,
        total_tokens: enrichedImages.length,
        estimated_cost_cents: Math.max(0, Math.round(totalCostUsd * 100)),
        task_type: 'image_generation',
      });
      if (usageErr) {
        // Tracking failure must never break the user request.
        console.error('ai_usage insert failed (runware)', usageErr);
      }
    }

    return new Response(JSON.stringify({ data: enrichedImages }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Runware proxy error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
