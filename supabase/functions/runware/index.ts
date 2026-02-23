/**
 * Runware Edge Function — Proxy + Storage Upload
 *
 * Forwards requests to the Runware API and optionally uploads
 * resulting images to Supabase storage (using service role).
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

    if (requestBody?.tasks && requestBody?.uploadToStorage) {
      runwarePayload = requestBody.tasks;
      shouldUpload = true;
      storagePrefix = requestBody.storagePrefix || 'drafts';
    } else {
      runwarePayload = requestBody;
    }

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

    // Runware may return partial results (some images + some errors).
    // If we got any data, treat it as a partial success and process images.
    if (!response.ok && !runwareData?.data?.length) {
      return new Response(JSON.stringify(runwareData), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If not uploading, return as-is (with 200 even for partial results)
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

    return new Response(JSON.stringify({ data: enrichedImages }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Runware proxy error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
