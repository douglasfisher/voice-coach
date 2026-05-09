"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Role = "user" | "admin"
type Tier =
  | "free"
  | "freemium"
  | "basic"
  | "pro"
  | "enterprise"
  | "team"

/**
 * "Invite user" button that opens a dialog with email + role + tier.
 * On submit, POSTs /api/admin/users which calls
 * supabase.auth.admin.inviteUserByEmail. Supabase mails the magic
 * link; we don't see it in the response (sensitive credential).
 *
 * Closing the dialog resets the form so reopening starts clean.
 */
export function InviteUserDialog() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState<Role>("user")
  const [tier, setTier] = useState<Tier>("free")

  function reset() {
    setEmail("")
    setDisplayName("")
    setRole("user")
    setTier("free")
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  function submit() {
    startTransition(async () => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          display_name: displayName.trim() || undefined,
          role,
          tier,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Invite failed — ${body?.error ?? res.status}`)
        return
      }
      toast.success(`Invite sent to ${email.trim()}`)
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  const canSubmit = email.trim().length > 3 && email.includes("@") && !pending

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={
          <Button size="sm">
            <UserPlus className="mr-1 size-4" />
            Invite user
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Invite a new user</AlertDialogTitle>
          <AlertDialogDescription>
            Sends a magic-link invite to the email below. The user clicks
            the link, sets a password, and lands signed in. Role and tier
            apply on first profile load.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Display name (optional)</Label>
            <Input
              id="invite-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Chen"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as Tier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="freemium">Freemium</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {pending ? "Sending…" : "Send invite"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
