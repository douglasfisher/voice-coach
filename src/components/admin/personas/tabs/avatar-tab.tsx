"use client"

import type { UseFormReturn } from "react-hook-form"

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

export function AvatarTab({
  form,
  avatarConfig,
}: {
  form: UseFormReturn<PersonaFormValues>
  avatarConfig: AvatarConfig
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
        description="The image users see across the app. Generate a new one below or paste a URL manually."
      >
        <div className="flex items-start gap-4">
          <PersonaAvatar
            name={name}
            url={url}
            thumbnailUrl={thumb}
            className="w-32 rounded-lg text-3xl"
          />
          <div className="text-muted-foreground space-y-1 text-xs">
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
