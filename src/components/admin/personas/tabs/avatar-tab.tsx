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

import { Section } from "./_shared"

export function AvatarTab({
  form,
}: {
  form: UseFormReturn<PersonaFormValues>
}) {
  const url = form.watch("avatar_url")

  return (
    <>
      <Section
        title="Avatar"
        description="Full-resolution image used in the persona detail view. Generation flow with parameter sliders + Runware/Google upscale will land in a follow-up — for now paste a URL or use one already in the avatar library."
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
                Auto-derived during avatar generation. Leave blank if there&apos;s
                no separate thumbnail.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {url ? (
          <div className="flex items-start gap-4 pt-2">
            <div className="bg-muted overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Avatar preview"
                className="size-40 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            </div>
            <p className="text-muted-foreground max-w-sm text-xs">
              Preview. If the image fails to load it&apos;ll be hidden — check
              the URL is correct and publicly accessible.
            </p>
          </div>
        ) : null}
      </Section>
    </>
  )
}
