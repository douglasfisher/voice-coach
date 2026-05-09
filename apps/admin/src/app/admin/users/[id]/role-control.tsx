"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Role = "user" | "admin" | "superadmin"

export function RoleControl({
  userId,
  currentRole,
  isSelf,
  actorRole,
}: {
  userId: string
  currentRole: Role | string | null
  isSelf: boolean
  actorRole: "admin" | "superadmin"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [target, setTarget] = useState<Role>(
    currentRole === "admin" ? "admin" : "user"
  )
  const [open, setOpen] = useState(false)

  // Cases the UI must refuse to act on:
  //   1. You can't change your own role (server enforces too).
  //   2. Superadmin demotion is allowed only by another superadmin.
  //   3. Promoting to superadmin from this UI is never allowed — direct SQL only.
  const isSuperadmin = currentRole === "superadmin"
  const disabled =
    isSelf || pending || (isSuperadmin && actorRole !== "superadmin")
  const wouldChange = target !== (currentRole === "admin" ? "admin" : "user")

  if (isSuperadmin) {
    return (
      <Button variant="outline" size="sm" disabled>
        Superadmin (SQL only)
      </Button>
    )
  }

  function submit() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: target }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(`Failed: ${body?.error ?? res.status}`)
        return
      }
      toast.success(`Role updated to ${target}`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={target}
        onValueChange={(v) => setTarget(v as Role)}
        disabled={disabled}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button
              size="sm"
              disabled={disabled || !wouldChange}
              variant={target === "admin" ? "default" : "secondary"}
            >
              {pending ? "Saving…" : "Apply"}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target === "admin" ? "Promote to admin?" : "Demote to user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target === "admin"
                ? "This user will gain access to the admin console and can edit personas, prompts, and other users. The change is logged in the audit trail."
                : "This user will lose access to the admin console. Existing audit entries are preserved."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                submit()
              }}
              disabled={pending}
            >
              {pending ? "Saving…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isSelf ? (
        <span className="text-muted-foreground text-xs">
          (you can&apos;t change your own role)
        </span>
      ) : null}
    </div>
  )
}
