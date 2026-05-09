"use client"

import type { UseFormReturn } from "react-hook-form"
import { ImageIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { PersonaFormValues } from "@/lib/personas/schema"

import type { AvatarConfig } from "@/lib/avatars/config"
import type { AvatarParams } from "@/lib/avatars/constants"

import { Section } from "./_shared"
import { PersonaAvatar } from "../persona-avatar"
import { AvatarGenerator } from "../avatar-generator"
import { AvatarLibraryPicker } from "../avatar-library-picker"

export function AvatarTab({
  form,
  avatarConfig,
  personaId,
}: {
  form: UseFormReturn<PersonaFormValues>
  avatarConfig: AvatarConfig
  /** Optional — when present, claim() is called after a pick so the
   * library row's used_by_persona_id reflects this assignment. */
  personaId?: string
}) {
  const url = form.watch("avatar_url")
  const thumb = form.watch("avatar_thumbnail_url")
  const name = form.watch("name")
  const gender = form.watch("gender")
  const savedAvatarParams = form.watch("avatar_params")

  return (
    <>
      <Section
        title="Current avatar"
        description="The image users see across the app. Generate a new one, paste a URL, or pick from the library."
      >
        <div className="flex flex-wrap items-start gap-4">
          <PersonaAvatar
            name={name}
            url={url}
            thumbnailUrl={thumb}
            className="w-32 rounded-lg text-3xl"
          />
          <div className="text-muted-foreground flex-1 space-y-1 text-xs">
            <div className="font-medium text-foreground">
              {name || "(unnamed)"}
            </div>
            {url ? (
              <div className="break-all">
                <span className="text-muted-foreground">URL:</span> {url}
              </div>
            ) : (
              <div>No avatar URL set yet.</div>
            )}
          </div>
          <AvatarLibraryPicker
            currentPersonaId={personaId}
            onPick={async (result) => {
              // Apply URL + params to the form. The form's dirty state then
              // includes the new values, so 'Save changes' persists them.
              const opts = { shouldDirty: true, shouldValidate: true }
              form.setValue("avatar_url", result.url, opts)
              form.setValue("avatar_thumbnail_url", result.thumbnailUrl, opts)
              if (result.params) {
                // The library row stores AvatarParams under params; cast at
                // the boundary since the form schema uses string-typed
                // values to tolerate option-list changes over time.
                form.setValue(
                  "avatar_params",
                  {
                    params: result.params as AvatarParams,
                    prompt: "",
                  },
                  opts
                )
                // Mirror gender to the Identity tab if the picked avatar
                // has one — keeps voice auto-fill in sync.
                const g = (result.params as { gender?: string }).gender
                if (g === "male" || g === "female") {
                  form.setValue(
                    "gender",
                    g as PersonaFormValues["gender"],
                    opts
                  )
                }
              }
              // Best-effort claim. If we don't have a persona ID yet
              // (creating a brand-new persona), skip — the claim happens
              // on save flow follow-up.
              if (personaId) {
                try {
                  await fetch("/api/admin/avatars/library/claim", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      avatarId: result.libraryId,
                      personaId,
                    }),
                  })
                } catch (err) {
                  console.warn("avatar claim failed", err)
                }
              }
              toast.success("Avatar applied — review and Save changes")
            }}
            trigger={
              <Button type="button" variant="outline">
                <ImageIcon className="mr-1 size-4" />
                Pick from library
              </Button>
            }
          />
        </div>
      </Section>

      <Section
        title="Generate new avatar"
        description="Two-stage generation: 4 quick concept drafts, then a photoreal upscale of the chosen concept. Same models, parameters, and dimensions as the mobile app."
      >
        <AvatarGenerator
          config={avatarConfig}
          initial={{
            avatar_url: url ?? "",
            avatar_thumbnail_url: thumb ?? null,
            // Cast: form schema stores params as plain strings so historical
            // values aren't rejected when option lists change; the generator
            // treats them as the active literal-union types.
            avatar_params: savedAvatarParams
              ? {
                  params: savedAvatarParams.params as AvatarParams,
                  prompt: savedAvatarParams.prompt,
                }
              : null,
          }}
          initialGenderHint={
            gender === "male" || gender === "female" ? gender : undefined
          }
          onChange={(next) => {
            form.setValue("avatar_url", next.avatar_url, {
              shouldDirty: true,
              shouldValidate: true,
            })
            form.setValue(
              "avatar_thumbnail_url",
              next.avatar_thumbnail_url,
              { shouldDirty: true, shouldValidate: true }
            )
            form.setValue("avatar_params", next.avatar_params, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }}
        />
      </Section>

      <Section
        title="Manual override"
        description="Paste an existing public URL (e.g. one from the avatar library). Leave alone if you used the generator above."
      >
        <FormField
          control={form.control}
          name="avatar_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="https://…"
                  className="font-mono text-xs"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="avatar_thumbnail_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail URL</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Optional smaller draft used in lists"
                  className="font-mono text-xs"
                />
              </FormControl>
              <FormDescription>
                Auto-set during generation. Leave blank if there&apos;s no
                separate thumbnail.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </Section>
    </>
  )
}
