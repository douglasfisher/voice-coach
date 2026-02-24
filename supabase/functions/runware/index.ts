/**
 * Runware Edge Function — Fast Proxy + Deferred Storage Upload
 *
 * Two modes:
 * 1. Proxy (default): Forwards to Runware API and returns URLs immediately.
 *    Also supports uploadToStorage for single-image flows (upscale).
 * 2. Upload: Accepts pre-generated image URLs and uploads them to storage.
 *    Called separately after client already has images displayed.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, corsPreflightResponse, errorResponse } from '../_shared/utils.ts';

async function uploadImagesToStorage(
  images: Array<{ url: string; id: string; format?: string }>,
  storagePrefix: string,
): Promise<Array<{ id: string; storageUrl: string; storagePath: string }>> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const results = await Promise.all(
    images.map(async (img, i) => {
      try {
        const imageResponse = await fetch(img.url);
        if (!imageResponse.ok) throw new Error(`Fetch failed: ${imageResponse.status}`);
        const blob = await imageResponse.blob();
        const ext = img.format === 'WEBP' ? 'webp' : 'jpg';
        const fileName = `${storagePrefix}/${img.id}_${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('persona-avatars')
          .upload(fileName, blob, {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            upsert: false,
          });

        if (uploadError) {
          console.error(`Upload error for image ${i}:`, uploadError);
          return null;
        }

        const { data: urlData } = supabase.storage
          .from('persona-avatars')
          .getPublicUrl(fileName);

        return { id: img.id, storageUrl: urlData.publicUrl, storagePath: fileName };
      } catch (err) {
        console.error(`Failed to upload image ${i}:`, err);
        return null;
      }
    }),
  );

  return results.filter(Boolean) as Array<{ id: string; storageUrl: string; storagePath: string }>;
}

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

    // Mode 2: Upload pre-generated images to storage (called after generation)
    if (requestBody?.action === 'uploadImages') {
      const uploaded = await uploadImagesToStorage(
        requestBody.images || [],
        requestBody.storagePrefix || 'drafts',
      );
      return new Response(JSON.stringify({ data: uploaded }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mode 1: Proxy to Runware API
    let runwarePayload: unknown;
    let shouldUpload = false;
    let storagePrefix = 'drafts';

    if (requestBody?.tasks && requestBody?.uploadToStorage) {
      runwarePayload = requestBody.tasks;
      shouldUpload = true;
      storagePrefix = requestBody.storagePrefix || 'drafts';
    } else if (requestBody?.tasks) {
      runwarePayload = requestBody.tasks;
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

    if (!response.ok && !runwareData?.data?.length) {
      return new Response(JSON.stringify(runwareData), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If not uploading, return Runware response immediately (fast path)
    if (!shouldUpload || !runwareData?.data) {
      return new Response(JSON.stringify(runwareData), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Inline upload (used by upscale — single image, worth waiting for)
    const images = runwareData.data.map((img: Record<string, unknown>, i: number) => ({
      url: (img.imageURL || img.imageUrl) as string,
      id: (img.imageUUID as string) || crypto.randomUUID(),
      format: img.outputFormat as string,
    })).filter((img: { url: string }) => img.url);

    const uploaded = await uploadImagesToStorage(images, storagePrefix);

    // Merge upload results back into Runware data
    const uploadMap = new Map(uploaded.map((u) => [u.id, u]));
    const enrichedImages = runwareData.data.map((img: Record<string, unknown>, i: number) => {
      const id = (img.imageUUID as string) || '';
      const u = uploadMap.get(id);
      return u ? { ...img, storageUrl: u.storageUrl, storagePath: u.storagePath } : img;
    });

    return new Response(JSON.stringify({ data: enrichedImages }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Runware proxy error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
