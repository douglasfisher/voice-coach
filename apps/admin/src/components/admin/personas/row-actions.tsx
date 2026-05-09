"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

/**
 * Row-level icon actions: Edit, and (superadmin only) Hard delete.
 *
 * Active/Inactive toggling is handled by the clickable status pill in the
 * Status column rather than living here — fewer redundant icons, status
 * is more visible and discoverable.
 */
export function PersonaRowActions({
  personaId,
  personaName,
  actorRole,
}: {
  personaId: string
  personaName: string
  actorRole: "admin" | "superadmin"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function hardDelete() {
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/personas/${personaId}?hard=true`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(`Delete failed — ${body?.error ?? res.status}`)
        return
      }
      toast.success(`${personaName} permanently deleted`)
      setConfirmDelete(false)
      router.refresh()
    })
  }

  return (
    <div
      className="flex items-center justify-end gap-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        render={<Link href={`/admin/personas/${personaId}`} />}
        aria-label="Edit"
        title="Edit"
      >
        <Pencil className="size-3.5" />
      </Button>

      {actorRole === "superadmin" ? (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                aria-label="Hard delete"
                title="Hard delete"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Permanently delete {personaName}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This removes the row from the database. Existing
                conversations that reference it will lose their persona
                link. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  hardDelete()
                }}
                disabled={pending}
              >
                {pending ? "Deleting…" : "Permanently delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  )
}
