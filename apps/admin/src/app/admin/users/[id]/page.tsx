import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/admin/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatDateTime, formatRelative } from "@/lib/format"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { RoleControl } from "./role-control"
import { TierControl } from "./tier-control"
import { UserSpendTab } from "./spend-tab"
import { UserActionsPanel } from "./actions-panel"
import { AdminNotesEditor } from "./admin-notes"
import { UserAuditLog } from "./user-audit-log"

export const metadata = { title: "User · Dialectica Admin" }
export const dynamic = "force-dynamic"

async function loadUser(id: string) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("admin_users_overview")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

async function loadRecentConversations(id: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("conversations")
    .select("id, persona_id, title, status, started_at, ended_at, overall_score")
    .eq("user_id", id)
    .order("started_at", { ascending: false })
    .limit(20)
  return data ?? []
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const ctx = await requireAdminPage()
  const { id } = await params
  const user = await loadUser(id)
  if (!user) notFound()

  const conversations = await loadRecentConversations(id)
  const initials =
    (user.display_name || user.email || "?")
      .split(/[\s._-]/)
      .map((s) => s[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "?"

  return (
    <div>
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/users" />}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back to users
        </Button>
      </div>

      <PageHeader
        title={user.display_name || user.email || "User"}
        description={user.email ?? undefined}
        actions={
          user.id ? (
            <RoleControl
              userId={user.id}
              currentRole={user.role}
              isSelf={user.id === ctx.userId}
              actorRole={ctx.role}
            />
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar className="size-14">
          {user.avatar_url ? <AvatarImage src={user.avatar_url} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              user.role === "superadmin"
                ? "default"
                : user.role === "admin"
                  ? "secondary"
                  : "outline"
            }
          >
            {user.role}
          </Badge>
          <Badge
            variant="outline"
            className={
              user.subscription_tier === "pro" ||
              user.subscription_tier === "enterprise" ||
              user.subscription_tier === "team"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : ""
            }
          >
            tier: {user.subscription_tier ?? "free"}
          </Badge>
          {user.disabled ? (
            <Badge
              variant="outline"
              className="border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
            >
              suspended
            </Badge>
          ) : null}
          <span className="text-muted-foreground text-sm">
            Level {user.current_level ?? 1} · {user.total_sessions ?? 0}{" "}
            sessions · {user.streak_days ?? 0}-day streak
          </span>
        </div>
        {user.id ? (
          <div className="ml-auto">
            <TierControl
              userId={user.id}
              currentTier={user.subscription_tier ?? "free"}
            />
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="spend">Spend</TabsTrigger>
          <TabsTrigger value="conversations">
            Conversations ({conversations.length})
          </TabsTrigger>
          <TabsTrigger value="auth">Auth</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="notes-audit">Notes &amp; audit</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name" value={user.display_name} />
            <Field label="Email" value={user.email} />
            <Field
              label="Onboarding"
              value={user.onboarding_completed ? "Complete" : "Incomplete"}
            />
            <Field label="Role" value={user.role} />
            <Field
              label="Last session"
              value={formatRelative(user.last_session_at)}
            />
            <Field
              label="Created"
              value={formatDateTime(user.auth_created_at)}
            />
          </div>
        </TabsContent>

        <TabsContent value="spend" className="pt-4">
          {user.id ? <UserSpendTab userId={user.id} /> : null}
        </TabsContent>

        <TabsContent value="conversations" className="pt-4">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((c) => (
                <Card key={c.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {c.title ?? c.persona_id ?? "(untitled)"}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-3 text-xs">
                      <span>{c.status}</span>
                      {c.overall_score != null ? (
                        <>
                          <span>·</span>
                          <span>score {c.overall_score}</span>
                        </>
                      ) : null}
                      <span>·</span>
                      <span>started {formatRelative(c.started_at)}</span>
                      {c.ended_at ? (
                        <>
                          <span>·</span>
                          <span>ended {formatRelative(c.ended_at)}</span>
                        </>
                      ) : null}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="auth" className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Email confirmed"
              value={
                user.email_confirmed_at
                  ? formatDateTime(user.email_confirmed_at)
                  : "Not confirmed"
              }
            />
            <Field
              label="Last sign-in"
              value={formatRelative(user.last_sign_in_at)}
            />
            <Field label="User ID" value={user.id} />
          </div>
        </TabsContent>

        <TabsContent value="actions" className="pt-4">
          {user.id ? (
            <UserActionsPanel
              userId={user.id}
              email={user.email ?? null}
              isSelf={user.id === ctx.userId}
              isDisabled={Boolean(user.disabled)}
              targetRole={user.role}
              actorRole={ctx.role}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="notes-audit" className="space-y-4 pt-4">
          {user.id ? (
            <>
              <AdminNotesEditor
                userId={user.id}
                initialNotes={user.admin_notes ?? null}
              />
              <UserAuditLog userId={user.id} />
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-base font-medium break-all">
          {value || "—"}
        </CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  )
}
