import Link from "next/link"

import { PageHeader } from "@/components/admin/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatDateTime, formatRelative } from "@/lib/format"
import { requireAdminPage } from "@/lib/auth/require-admin"

export const metadata = { title: "Audit log · Dialectica Admin" }

const PAGE_SIZE = 50

async function loadEntries(page: number) {
  const supabase = await createSupabaseServerClient()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data, count, error } = await supabase
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)
  if (error) throw new Error(error.message)
  return { rows: data ?? [], total: count ?? 0 }
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdminPage()
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? 1) || 1)
  const { rows, total } = await loadEntries(page)
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Append-only record of every admin mutation. Cannot be edited or deleted."
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Diff</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  No audit entries yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="align-top">
                  <TableCell className="text-muted-foreground text-xs">
                    <div title={formatDateTime(row.created_at)}>
                      {formatRelative(row.created_at)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.actor_email || row.actor_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {row.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.target_table ? (
                      <>
                        {row.target_table}
                        {row.target_id ? (
                          <span className="text-muted-foreground">
                            {" "}#{row.target_id.slice(0, 8)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {row.diff ? (
                      <DiffSummary diff={row.diff} />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {(row.ip as string | null) ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {total === 0
            ? "No entries"
            : `${total.toLocaleString()} total entries`}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            render={
              <Link
                href={`/admin/audit-log?page=${Math.max(1, page - 1)}`}
              />
            }
          >
            Previous
          </Button>
          <div className="text-muted-foreground self-center px-2 text-sm tabular-nums">
            {page} / {pageCount}
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= pageCount}
            render={
              <Link
                href={`/admin/audit-log?page=${Math.min(pageCount, page + 1)}`}
              />
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function DiffSummary({ diff }: { diff: unknown }) {
  // Render any { before: {k:v}, after: {k:v} } shape concisely. Falls back
  // to a JSON snippet for free-form payloads.
  if (
    diff &&
    typeof diff === "object" &&
    "before" in diff &&
    "after" in diff
  ) {
    const before = (diff as Record<string, Record<string, unknown>>).before
    const after = (diff as Record<string, Record<string, unknown>>).after
    const keys = Array.from(
      new Set([
        ...Object.keys(before ?? {}),
        ...Object.keys(after ?? {}),
      ])
    )
    return (
      <div className="space-y-1">
        {keys.map((k) => {
          const a = JSON.stringify(before?.[k])
          const b = JSON.stringify(after?.[k])
          if (a === b) return null
          return (
            <div
              key={k}
              className="font-mono text-xs"
              title={`${k}: ${a} → ${b}`}
            >
              <span className="text-muted-foreground">{k}:</span>{" "}
              <span className="text-destructive line-through">{a}</span>{" "}
              <span className="text-foreground">→ {b}</span>
            </div>
          )
        })}
      </div>
    )
  }
  return (
    <pre className="text-muted-foreground max-w-md overflow-auto text-xs">
      {JSON.stringify(diff, null, 2)}
    </pre>
  )
}
