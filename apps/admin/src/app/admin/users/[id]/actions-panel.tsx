"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  KeyRound,
  ShieldOff,
  ShieldCheck,
  Trash2,
  AlertTriangle,
} from "lucide-react"
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Account Actions panel — password reset, suspend/restore, hard delete.
 *
 * All actions confirm via AlertDialog, all hit audit-logged endpoints,
 * and all refresh the page on success so the disabled badge / state
 * update visibly. The delete path is gated to superadmins (server
 * enforces too) and shown last so it can't be misclicked.
 */
export function UserActionsPanel({
  userId,
  email,
  isSelf,
  isDisabled,
  targetRole,
  actorRole,
}: {
  userId: string
  email: string | null
  isSelf: boolean
  isDisabled: boolean
  targetRole: string | null
  actorRole: "admin" | "superadmin"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [reason, setReason] = useState("")

  // Server already enforces; mirror here for UX so the buttons look
  // disabled rather than failing on click.
  const isSuperadminTarget = targetRole === "superadmin"
  const isAdminTarget = targetRole === "admin"
  const canSuspend =
    !isSelf && !isSuperadminTarget && !(isAdminTarget && actorRole !== "superadmin")
  const canDelete = !isSelf && actorRole === "superadmin"

  function sendPasswordReset() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}/password-reset`, {
        method: "POST",
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Reset failed — ${body?.error ?? res.status}`)
        return
      }
      toast.success(
        email
          ? `Password reset email sent to ${email}`
          : "Password reset email sent"
      )
    })
  }

  function setDisabled(next: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}/disabled`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disabled: next,
          reason: reason.trim() || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Failed — ${body?.error ?? res.status}`)
        return
      }
      toast.success(next ? "Account suspended" : "Account restored")
      setReason("")
      router.refresh()
    })
  }

  function deleteUser() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Delete failed — ${body?.error ?? res.status}`)
        return
      }
      toast.success("User deleted")
      router.push("/admin/users")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account actions</CardTitle>
        <CardDescription>
          Password reset, suspension, and (for superadmins) hard delete.
          Every action is recorded in the audit log.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ActionRow
          icon={<KeyRound className="size-4" />}
          title="Send password reset"
          description={
            email
              ? `Emails a recovery link to ${email}.`
              : "User has no email on file."
          }
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending || !email}
            onClick={sendPasswordReset}
          >
            Send reset
          </Button>
        </ActionRow>

        {isDisabled ? (
          <ActionRow
            icon={
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            }
            title="Restore account"
            description="The user will be able to sign in again immediately."
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending || !canSuspend}
              onClick={() => setDisabled(false)}
            >
              Restore
            </Button>
          </ActionRow>
        ) : (
          <SuspendDialog
            disabled={!canSuspend || pending}
            pending={pending}
            reason={reason}
            setReason={setReason}
            onConfirm={() => setDisabled(true)}
            isSelf={isSelf}
            isSuperadminTarget={isSuperadminTarget}
            isAdminTarget={isAdminTarget && actorRole !== "superadmin"}
          />
        )}

        {actorRole === "superadmin" ? (
          <DeleteDialog
            disabled={!canDelete || pending}
            pending={pending}
            email={email}
            onConfirm={deleteUser}
            isSelf={isSelf}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

function ActionRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="bg-muted text-muted-foreground grid size-8 shrink-0 place-items-center rounded-md">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-muted-foreground text-xs">{description}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SuspendDialog({
  disabled,
  pending,
  reason,
  setReason,
  onConfirm,
  isSelf,
  isSuperadminTarget,
  isAdminTarget,
}: {
  disabled: boolean
  pending: boolean
  reason: string
  setReason: (v: string) => void
  onConfirm: () => void
  isSelf: boolean
  isSuperadminTarget: boolean
  isAdminTarget: boolean
}) {
  const reasonNote =
    isSelf
      ? "(you can't suspend your own account)"
      : isSuperadminTarget
        ? "(superadmins can't be suspended via this UI)"
        : isAdminTarget
          ? "(only superadmins can suspend admins)"
          : null

  return (
    <ActionRow
      icon={<ShieldOff className="size-4 text-amber-600 dark:text-amber-400" />}
      title="Suspend account"
      description="Soft-ban — the user can't sign in until restored. History is preserved."
    >
      <div className="flex items-center gap-2">
        {reasonNote ? (
          <span className="text-muted-foreground text-xs">{reasonNote}</span>
        ) : null}
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
              >
                Suspend
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suspend this account?</AlertDialogTitle>
              <AlertDialogDescription>
                The user will be unable to sign in until you restore the
                account. Existing data is preserved. This is reversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="suspend-reason" className="text-xs">
                Reason (optional, captured in audit log)
              </Label>
              <Input
                id="suspend-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. payment dispute, abuse report"
                maxLength={500}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  onConfirm()
                }}
                disabled={pending}
              >
                {pending ? "Suspending…" : "Suspend"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ActionRow>
  )
}

function DeleteDialog({
  disabled,
  pending,
  email,
  onConfirm,
  isSelf,
}: {
  disabled: boolean
  pending: boolean
  email: string | null
  onConfirm: () => void
  isSelf: boolean
}) {
  // Type-to-confirm: the admin must type the user's email exactly to
  // arm the delete button. Stops fat-finger deletes on the wrong account.
  const [typed, setTyped] = useState("")
  const armed = !!email && typed.trim() === email.trim()

  return (
    <ActionRow
      icon={<Trash2 className="size-4 text-red-600 dark:text-red-400" />}
      title="Delete user (irreversible)"
      description="Hard delete via auth.admin. Cascades through conversations, messages, ai_usage. Use only for GDPR / spam / test cleanup."
    >
      {isSelf ? (
        <span className="text-muted-foreground text-xs">
          (you can&apos;t delete your own account)
        </span>
      ) : (
        <AlertDialog
          onOpenChange={(open) => {
            if (!open) setTyped("")
          }}
        >
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={disabled}
              >
                Delete
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-500" />
                Permanently delete this account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. The user&apos;s auth record,
                profile, conversations, messages, and AI usage history
                will all be removed via cascade. Audit log entries
                referencing them are preserved (the rows just lose
                their FK target).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm" className="text-xs">
                Type the email{" "}
                <span className="bg-muted rounded px-1 font-mono">
                  {email ?? "(no email)"}
                </span>{" "}
                to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={email ?? ""}
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  onConfirm()
                }}
                disabled={pending || !armed}
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ActionRow>
  )
}
