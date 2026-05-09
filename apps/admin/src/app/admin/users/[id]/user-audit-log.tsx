import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatDateTime } from "@/lib/format"

/**
 * Per-user audit-log slice — every action where target_id = userId.
 * Server component; pulls the latest 50 rows on render.
 *
 * Action labels are de-jargoned for the admin UI (`user.tier.update`
 * → "Tier changed"). Unknown actions fall back to the raw key.
 */
export async function UserAuditLog({ userId }: { userId: string }) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select(
      "id, actor_email, action, diff, ip, created_at"
    )
    .eq("target_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return (
      <Card>
        <CardContent className="text-destructive py-6 text-sm">
          Failed to load audit log: {error.message}
        </CardContent>
      </Card>
    )
  }

  const rows = data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit log</CardTitle>
        <CardDescription>
          Every admin action recorded against this user. Last 50 entries,
          newest first. Click an entry to inspect the full diff.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No audit entries for this user yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDateTime(r.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {ACTION_LABELS[r.action] ?? (
                      <span className="font-mono text-xs">{r.action}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {r.actor_email ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <DiffSummary action={r.action} diff={r.diff} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const ACTION_LABELS: Record<string, string> = {
  "user.role.update": "Role changed",
  "user.tier.update": "Tier changed",
  "user.disable": "Account suspended",
  "user.enable": "Account restored",
  "user.delete": "Account deleted",
  "user.invite": "Invite sent",
  "user.password_reset.send": "Password reset emailed",
  "user.notes.update": "Admin notes edited",
}

/** Render a one-line summary of the diff for the table row. Keeps the
 * table scannable; admins can copy the full row id and grep
 * admin_audit_log for the raw diff if they need it. */
function DiffSummary({
  action,
  diff,
}: {
  action: string
  diff: unknown
}) {
  if (!diff || typeof diff !== "object") return <span>—</span>
  const d = diff as { before?: Record<string, unknown>; after?: Record<string, unknown> }

  if (action === "user.role.update") {
    return (
      <span>
        {String(d.before?.role ?? "?")} →{" "}
        <span className="font-medium">{String(d.after?.role ?? "?")}</span>
      </span>
    )
  }
  if (action === "user.tier.update") {
    return (
      <span>
        {String(d.before?.subscription_tier ?? "?")} →{" "}
        <span className="font-medium">
          {String(d.after?.subscription_tier ?? "?")}
        </span>
      </span>
    )
  }
  if (action === "user.disable") {
    const reason = d.after?.reason
    return reason ? (
      <span className="text-muted-foreground italic">
        reason: {String(reason)}
      </span>
    ) : (
      <span className="text-muted-foreground">no reason given</span>
    )
  }
  if (action === "user.enable") return <span>Account re-enabled</span>
  if (action === "user.password_reset.send") {
    return (
      <span className="text-muted-foreground">
        recovery email queued
      </span>
    )
  }
  if (action === "user.invite") {
    return (
      <span>
        {String(d.after?.email ?? "")}
        {d.after?.role ? ` · ${String(d.after.role)}` : ""}
      </span>
    )
  }
  if (action === "user.notes.update") {
    const beforeLen = String(d.before?.admin_notes ?? "").length
    const afterLen = String(d.after?.admin_notes ?? "").length
    return (
      <span className="text-muted-foreground">
        notes {beforeLen}→{afterLen} chars
      </span>
    )
  }
  if (action === "user.delete") {
    return <span className="text-red-600 dark:text-red-400">deleted</span>
  }
  return <span className="font-mono text-[10px]">{JSON.stringify(d).slice(0, 80)}</span>
}
