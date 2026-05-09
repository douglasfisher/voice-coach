"use client"

import { useEffect, useState, useTransition } from "react"
import { Check, ImageIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type LibraryRow = {
  id: string
  storage_path: string
  public_url: string
  prompt: string | null
  params: Record<string, unknown> | null
  gender: string | null
  ethnicity: string | null
  generation_batch_id: string | null
  is_hi_res: boolean
  used_by_persona_id: string | null
  created_at: string
}

export type AvatarPickResult = {
  url: string
  thumbnailUrl: string
  params: Record<string, unknown> | null
  libraryId: string
}

/**
 * Modal that lets an admin pick an existing avatar from avatar_library
 * and apply it to the current persona. Filters by gender / ethnicity /
 * unused / hi-res. Selecting an avatar applies its URL + params back to
 * the form via the parent's onPick callback; the parent decides whether
 * to also call /api/admin/avatars/library/claim to mark it in use.
 */
export function AvatarLibraryPicker({
  onPick,
  trigger,
  /** When provided, the picker filters to "unused or already used by this
   * persona" so admins don't accidentally see avatars that other personas
   * already claimed. */
  currentPersonaId,
}: {
  onPick: (result: AvatarPickResult) => void
  trigger: React.ReactNode
  currentPersonaId?: string
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<LibraryRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, startLoading] = useTransition()

  const [q, setQ] = useState("")
  const [gender, setGender] = useState<string>("any")
  const [kind, setKind] = useState<"any" | "hires" | "draft">("any")
  const [status, setStatus] = useState<"any" | "unused" | "used">("unused")

  // Load on open and on filter change.
  useEffect(() => {
    if (!open) return
    startLoading(async () => {
      const params = new URLSearchParams()
      if (q) params.set("q", q)
      if (gender !== "any") params.set("gender", gender)
      if (kind !== "any") params.set("kind", kind)
      if (status !== "any") params.set("status", status)
      params.set("pageSize", "60")
      const res = await fetch(`/api/admin/avatars/library?${params}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Library load failed — ${body?.error ?? res.status}`)
        return
      }
      const all = (body.data?.rows as LibraryRow[]) ?? []
      // Client-side filter: hide rows used by OTHER personas. Server
      // status=unused already does this, but we want to also include
      // rows already used by *this* persona (so re-applying is fine).
      const filtered = currentPersonaId
        ? all.filter(
            (r) =>
              !r.used_by_persona_id ||
              r.used_by_persona_id === currentPersonaId
          )
        : all
      setRows(filtered)
      setTotal(body.data?.total ?? filtered.length)
    })
  }, [open, q, gender, kind, status, currentPersonaId])

  function pick(row: LibraryRow) {
    onPick({
      url: row.public_url,
      thumbnailUrl: row.public_url,
      params: row.params,
      libraryId: row.id,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-hidden p-0 sm:max-w-5xl">
        <div className="flex max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              Pick from avatar library
            </DialogTitle>
            <DialogDescription>
              Browse previously generated avatars. Selecting one applies
              its URL and parameters to the persona form. Hidden by
              default: avatars used by other personas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-end gap-2 border-b px-6 pt-3 pb-4">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Search</Label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="prompt or path…"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gender</Label>
              <Select value={gender} onValueChange={(v) => v && setGender(v)}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kind</Label>
              <Select
                value={kind}
                onValueChange={(v) =>
                  v && setKind(v as "any" | "hires" | "draft")
                }
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All</SelectItem>
                  <SelectItem value="hires">Hi-res only</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  v && setStatus(v as "any" | "unused" | "used")
                }
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unused">Unused</SelectItem>
                  <SelectItem value="used">In use</SelectItem>
                  <SelectItem value="any">Any</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grow overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border py-12 text-center text-sm">
                No avatars match this filter.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {rows.map((row) => {
                  const isUsedByThis =
                    row.used_by_persona_id === currentPersonaId
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => pick(row)}
                      className={cn(
                        "group bg-muted relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition-all",
                        "hover:border-muted-foreground/40 border-transparent"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.public_url}
                        alt={row.prompt ?? row.storage_path}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                      <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                        {row.is_hi_res ? (
                          <Badge className="bg-amber-500/90 text-amber-950 hover:bg-amber-500 text-[10px]">
                            Hi-res
                          </Badge>
                        ) : null}
                        {isUsedByThis ? (
                          <Badge className="bg-emerald-500/85 text-emerald-950 hover:bg-emerald-500/85 text-[10px]">
                            <Check className="mr-0.5 size-2.5" />
                            Current
                          </Badge>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="border-t bg-muted/40 px-6 py-3">
            <p className="text-muted-foreground mr-auto text-xs">
              Showing {rows.length} of {total.toLocaleString()}.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
