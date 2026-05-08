"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import { CompositionOverlay } from "./composition-overlay"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  draftUrl: string | null
  silhouetteSvg: string
  /** Aspect ratio numerator/denominator e.g. "3:4". */
  targetAspect: string
  /** Called with the uploaded cropped URL after Apply succeeds. */
  onApply: (croppedUrl: string) => Promise<void> | void
}

function parseAspect(value: string): number {
  const [w, h] = value.split(":").map(Number)
  if (!w || !h) return 3 / 4
  return w / h
}

const MIN_ZOOM = 0.4
const MAX_ZOOM = 3

/** Default fallback background fill, used until the source image loads
 * and we can sample its actual backdrop colour. Studio drafts are a dark
 * charcoal so this blends in even before sampling. */
const FALLBACK_PAD_FILL = "#0a0a0a"

/**
 * Modal that wraps the selected draft in a draggable, aspect-locked crop
 * frame with the silhouette overlay drawn on top of the visible crop area.
 *
 * Render pipeline on Apply:
 *   1. Use react-easy-crop's cropAreaPixels to know the source rectangle.
 *   2. Draw that rectangle to an in-memory canvas at the source pixel
 *      dimensions (no upscaling here — we want to feed nano-banana a
 *      clean reference, not a synthesised one).
 *   3. Encode JPEG @0.95.
 *   4. POST as multipart/form-data to /api/admin/avatars/crop.
 *   5. Hand the returned public URL to the parent onApply, which kicks
 *      off the existing hi-res upscale flow with the cropped URL.
 */
export function AvatarCropper({
  open,
  onOpenChange,
  draftUrl,
  silhouetteSvg,
  targetAspect,
  onApply,
}: Props) {
  const aspect = parseAspect(targetAspect)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropAreaPixels, setCropAreaPixels] = useState<Area | null>(null)
  const [pending, startTransition] = useTransition()
  const [padFill, setPadFill] = useState<string>(FALLBACK_PAD_FILL)

  const onCropComplete = useCallback(
    (_area: Area, areaPixels: Area) => setCropAreaPixels(areaPixels),
    []
  )

  // Sample the source image's edge colour as soon as we know its URL — the
  // padding shown around an under-1× zoomed image then blends with the
  // actual backdrop instead of fighting against a hardcoded charcoal.
  useEffect(() => {
    if (!open || !draftUrl) return
    let cancelled = false
    void (async () => {
      try {
        const img = await loadImage(draftUrl)
        const colour = sampleEdgeColour(img)
        if (!cancelled) setPadFill(colour)
      } catch {
        // Network / CORS failure → keep the fallback charcoal.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, draftUrl])

  function applyCrop() {
    if (!draftUrl || !cropAreaPixels) return
    startTransition(async () => {
      try {
        const blob = await renderCropToJpeg(draftUrl, cropAreaPixels, padFill)
        const form = new FormData()
        form.set("file", blob, "cropped.jpg")
        form.set("sourceUrl", draftUrl)

        const res = await fetch("/api/admin/avatars/crop", {
          method: "POST",
          body: form,
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(`Crop failed — ${body?.message ?? body?.error ?? res.status}`)
          return
        }
        const url = body.data?.url as string | undefined
        if (!url) {
          toast.error("Crop returned no URL")
          return
        }
        await onApply(url)
        onOpenChange(false)
      } catch (err) {
        toast.error(
          `Crop failed — ${err instanceof Error ? err.message : "see console"}`
        )
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[95vw] overflow-hidden p-0 sm:max-w-4xl">
        <div className="flex max-h-[95vh] flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Crop draft for hi-res</DialogTitle>
            <DialogDescription>
              Position the silhouette over the head and shoulders. The crop
              is locked to {targetAspect} so the hi-res result fits the
              persona tile uniformly. Drag to move; scroll or use the slider
              below to zoom — under 1× adds padding around the head.
            </DialogDescription>
          </DialogHeader>

          <div className="grow overflow-y-auto px-6 py-4">
            <div
              className="relative mx-auto aspect-[3/4] overflow-hidden rounded-lg border"
              style={{
                maxHeight: "min(72vh, 760px)",
                height: "min(72vh, 760px)",
                width: "auto",
              }}
            >
          {draftUrl ? (
            <>
              <Cropper
                image={draftUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                /* Allow the image to be moved beyond the crop bounds and
                 * to be smaller than the crop frame — this is what gives
                 * the user "room around" the head and full left/right
                 * positioning. The exposed area is filled with PAD_FILL
                 * during canvas render. */
                restrictPosition={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
                showGrid={false}
                style={{
                  cropAreaStyle: {
                    border: "2px solid rgba(255,255,255,0.85)",
                    color: "rgba(0,0,0,0.55)",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  },
                  containerStyle: {
                    background: padFill,
                  },
                }}
              />
              {/* SVG overlay rendered above the cropper at the same crop
                  rect — it tracks the moving crop area visually because
                  react-easy-crop centers the crop area in the container,
                  so an inset overlay matches the crop frame after zoom. */}
              <CompositionOverlay
                svg={silhouetteSvg}
                opacity={0.45}
                className="text-amber-300"
              />
            </>
          ) : (
            <div className="text-muted-foreground grid size-full place-items-center text-sm">
              No draft selected
            </div>
          )}
            </div>

            <div className="mx-auto mt-4 max-w-xl space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-14 text-xs">
                  Zoom
                </span>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
                <span className="w-12 text-right font-mono text-xs tabular-nums">
                  {zoom.toFixed(2)}×
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Zoom below 1× to add padding around the head; drag to
                position left/right. Padding takes the sampled backdrop
                colour from the draft.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t bg-muted/40 px-6 py-4">
            <p className="text-muted-foreground mr-auto text-xs">
              Hi-res upscale typically takes 15–25 seconds.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={applyCrop}
              disabled={pending || !cropAreaPixels}
            >
              {pending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 size-4" />
              )}
              {pending ? "Applying…" : "Apply crop & upscale"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Render the cropped pixel rectangle of a remote image into a JPEG Blob.
 *
 * The crop rect can extend beyond the source image when the user has
 * zoomed below 1× — those exposed regions are filled with PAD_FILL so the
 * hi-res model sees a clean dark backdrop instead of garbage / black bars
 * from drawImage's clipping behaviour.
 *
 * Drawing happens at 1:1 with the source rectangle so the hi-res model
 * gets a clean reference, not an interpolated one.
 */
async function renderCropToJpeg(
  src: string,
  rect: Area,
  padFill: string
): Promise<Blob> {
  const img = await loadImage(src)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(rect.width)
  canvas.height = Math.round(rect.height)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas 2d context unavailable")

  // Pre-fill the entire canvas with the sampled padding colour so any
  // region outside the source image keeps a clean backdrop that matches
  // the original draft instead of a hardcoded charcoal.
  ctx.fillStyle = padFill
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Compute the visible intersection between the crop rect (in source
  // image coords) and the source image bounds. Negative rect.x/y means
  // the crop extends past the left/top of the image.
  const srcX = Math.max(0, rect.x)
  const srcY = Math.max(0, rect.y)
  const srcW = Math.max(
    0,
    Math.min(img.width, rect.x + rect.width) - srcX
  )
  const srcH = Math.max(
    0,
    Math.min(img.height, rect.y + rect.height) - srcY
  )
  if (srcW > 0 && srcH > 0) {
    const dstX = srcX - rect.x
    const dstY = srcY - rect.y
    ctx.drawImage(img, srcX, srcY, srcW, srcH, dstX, dstY, srcW, srcH)
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/jpeg",
      0.95
    )
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(new Error(`failed to load image: ${src}`))
    img.src = src
  })
}

/**
 * Average a strip down each side of the image and return whichever side
 * is darkest — studio portraits typically have the cleanest backdrop on
 * the left or right edge (the sides), not the top (which often has the
 * lighter top-of-head). Returns an `rgb()` string ready for fillStyle.
 */
function sampleEdgeColour(img: HTMLImageElement): string {
  const c = document.createElement("canvas")
  // Downsample to keep the work cheap. 32×32 of each side strip is plenty.
  const w = 32
  const h = 32
  c.width = w
  c.height = h
  const ctx = c.getContext("2d")
  if (!ctx) return FALLBACK_PAD_FILL
  const ctx2d = ctx

  // Sample a thin vertical strip on each side: 5% of image width.
  const stripW = Math.max(1, Math.floor(img.width * 0.05))
  const samples: Array<[number, number, number]> = []

  function sampleStrip(srcX: number) {
    ctx2d.clearRect(0, 0, w, h)
    ctx2d.drawImage(img, srcX, 0, stripW, img.height, 0, 0, w, h)
    const data = ctx2d.getImageData(0, 0, w, h).data
    let r = 0,
      g = 0,
      b = 0,
      n = 0
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]!
      g += data[i + 1]!
      b += data[i + 2]!
      n++
    }
    return [r / n, g / n, b / n] as [number, number, number]
  }

  samples.push(sampleStrip(0))
  samples.push(sampleStrip(img.width - stripW))

  // Pick the darker of the two strips — that's almost always the actual
  // backdrop rather than spill from face/body lighting.
  const luminance = ([r, g, b]: [number, number, number]) =>
    0.2126 * r + 0.7152 * g + 0.0722 * b
  const darkest = samples.reduce((acc, s) =>
    luminance(s) < luminance(acc) ? s : acc
  )

  return `rgb(${Math.round(darkest[0])}, ${Math.round(darkest[1])}, ${Math.round(darkest[2])})`
}
