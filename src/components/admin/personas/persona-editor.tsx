"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
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
import { Form } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/admin/page-header"
import {
  personaSchemaWithRefinements,
  type PersonaFormValues,
} from "@/lib/personas/schema"
import type { PersonaLookups } from "@/lib/personas/lookups"

import { IdentityTab } from "./tabs/identity-tab"
import { PersonalityTab } from "./tabs/personality-tab"
import { PromptsTab } from "./tabs/prompts-tab"
import { VoiceAiTab } from "./tabs/voice-ai-tab"
import { AvatarTab } from "./tabs/avatar-tab"

type Mode = "create" | "edit"

export function PersonaEditor({
  mode,
  personaId,
  initialValues,
  lookups,
  actorRole,
}: {
  mode: Mode
  personaId?: string
  initialValues: PersonaFormValues
  lookups: PersonaLookups
  actorRole: "admin" | "superadmin"
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState("identity")

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchemaWithRefinements),
    defaultValues: initialValues,
    mode: "onBlur",
  })

  const personaName = form.watch("name")
  const isActive = form.watch("is_active")

  function onSubmit(values: PersonaFormValues) {
    startTransition(async () => {
      const url =
        mode === "create"
          ? "/api/admin/personas"
          : `/api/admin/personas/${personaId}`
      const method = mode === "create" ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          body?.issues?.[0]?.message ?? body?.error ?? `HTTP ${res.status}`
        toast.error(`Save failed — ${message}`)
        // If a field-level zod issue, focus that tab to surface it.
        if (body?.issues?.[0]?.path?.length) {
          const path = body.issues[0].path[0]
          form.setError(path as keyof PersonaFormValues, {
            message: body.issues[0].message,
          })
          surfaceTabFor(path as string)
        }
        return
      }

      toast.success(
        mode === "create" ? "Persona created" : "Persona updated"
      )
      if (mode === "create" && body?.data?.id) {
        router.replace(`/admin/personas/${body.data.id}`)
      } else {
        router.refresh()
      }
    })
  }

  function onInvalid(errors: Record<string, unknown>) {
    const firstField = Object.keys(errors)[0]
    if (firstField) surfaceTabFor(firstField)
    toast.error("Fix the highlighted fields before saving.")
  }

  function surfaceTabFor(field: string) {
    if (FIELD_TO_TAB[field]) setActiveTab(FIELD_TO_TAB[field])
  }

  async function handleDelete(hard: boolean) {
    if (!personaId) return
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/personas/${personaId}?hard=${hard}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(`Delete failed — ${body?.error ?? res.status}`)
        return
      }
      toast.success(hard ? "Persona permanently deleted" : "Persona deactivated")
      router.replace("/admin/personas")
    })
  }

  const tabHasError = (fields: string[]) =>
    fields.some((f) => Boolean(form.formState.errors[f as keyof PersonaFormValues]))

  return (
    <div>
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/personas" />}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back to personas
        </Button>
      </div>

      <PageHeader
        title={mode === "create" ? "New persona" : personaName || "Persona"}
        description={
          mode === "create"
            ? "Configure a new coach, advisor, or challenger."
            : isActive
              ? "Active — visible to users."
              : "Inactive — hidden from users."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {mode === "edit" && personaId ? (
              <DeleteMenu
                actorRole={actorRole}
                onSoft={() => handleDelete(false)}
                onHard={() => handleDelete(true)}
                pending={pending}
              />
            ) : null}
            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit, onInvalid)}
              disabled={pending}
            >
              <Save className="mr-1 size-4" />
              {pending
                ? "Saving…"
                : mode === "create"
                  ? "Create persona"
                  : "Save changes"}
            </Button>
          </div>
        }
      />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onInvalid)}
          className="mt-6"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="identity">
                Identity{tabHasError(IDENTITY_FIELDS) ? " ●" : ""}
              </TabsTrigger>
              <TabsTrigger value="personality">
                Personality & Style{tabHasError(PERSONALITY_FIELDS) ? " ●" : ""}
              </TabsTrigger>
              <TabsTrigger value="prompts">
                Prompts{tabHasError(PROMPT_FIELDS) ? " ●" : ""}
              </TabsTrigger>
              <TabsTrigger value="voice">
                Voice & AI{tabHasError(VOICE_AI_FIELDS) ? " ●" : ""}
              </TabsTrigger>
              <TabsTrigger value="avatar">
                Avatar{tabHasError(AVATAR_FIELDS) ? " ●" : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="identity">
              <IdentityTab form={form} lookups={lookups} />
            </TabsContent>
            <TabsContent value="personality">
              <PersonalityTab form={form} />
            </TabsContent>
            <TabsContent value="prompts">
              <PromptsTab form={form} />
            </TabsContent>
            <TabsContent value="voice">
              <VoiceAiTab form={form} lookups={lookups} />
            </TabsContent>
            <TabsContent value="avatar">
              <AvatarTab form={form} />
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  )
}

const IDENTITY_FIELDS = [
  "name",
  "tagline",
  "persona_type",
  "gender",
  "age_range",
  "cultural_background",
  "sort_order",
  "is_active",
  "is_premium",
  "emotional_progression_enabled",
  "domain_id",
  "advisor_category_id",
]
const PERSONALITY_FIELDS = [
  "challenge_style",
  "coaching_style",
  "default_interaction_mode",
  "feedback_style",
  "warmth",
  "directness",
  "patience",
  "humor",
  "formality",
  "specialty_areas",
]
const PROMPT_FIELDS = [
  "system_prompt",
  "qa_scenario_prompt",
  "qa_scene_template",
]
const VOICE_AI_FIELDS = [
  "voice_provider",
  "voice_id",
  "voice_speed",
  "voice_pitch",
  "voice_stability",
  "ai_model",
  "ai_fallback_model",
  "ai_temperature",
  "ai_top_p",
  "ai_max_completion_tokens",
]
const AVATAR_FIELDS = ["avatar_url", "avatar_thumbnail_url"]

const FIELD_TO_TAB: Record<string, string> = Object.fromEntries([
  ...IDENTITY_FIELDS.map((f) => [f, "identity"]),
  ...PERSONALITY_FIELDS.map((f) => [f, "personality"]),
  ...PROMPT_FIELDS.map((f) => [f, "prompts"]),
  ...VOICE_AI_FIELDS.map((f) => [f, "voice"]),
  ...AVATAR_FIELDS.map((f) => [f, "avatar"]),
])

function DeleteMenu({
  actorRole,
  onSoft,
  onHard,
  pending,
}: {
  actorRole: "admin" | "superadmin"
  onSoft: () => void
  onHard: () => void
  pending: boolean
}) {
  const [confirmHard, setConfirmHard] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onSoft}
        disabled={pending}
      >
        <Trash2 className="mr-1 size-4" />
        Deactivate
      </Button>
      {actorRole === "superadmin" ? (
        <AlertDialog open={confirmHard} onOpenChange={setConfirmHard}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
              >
                Hard delete
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete persona?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the row from the database. Existing conversations
                that reference it will lose their persona link. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  onHard()
                  setConfirmHard(false)
                }}
                disabled={pending}
              >
                {pending ? "Deleting…" : "Permanently delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  )
}
