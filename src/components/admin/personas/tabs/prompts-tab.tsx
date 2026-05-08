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
import { Textarea } from "@/components/ui/textarea"
import {
  insertMissingTokens,
  type TraitToken,
} from "@/lib/personas/constants"
import type { PersonaFormValues } from "@/lib/personas/schema"

import { Section } from "./_shared"
import { TraitTokenBadges } from "../trait-token-badges"

export function PromptsTab({
  form,
}: {
  form: UseFormReturn<PersonaFormValues>
}) {
  const systemPrompt = form.watch("system_prompt") ?? ""
  const personaType = form.watch("persona_type")

  return (
    <>
      <Section
        title="System prompt"
        description="The persona's core instructions. Must include all 12 trait tokens — these are interpolated at runtime with the user's chosen trait values."
      >
        <FormField
          control={form.control}
          name="system_prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System prompt *</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  className="min-h-[420px] font-mono text-xs leading-relaxed"
                  placeholder="You are…"
                  spellCheck={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <TraitTokenBadges
          systemPrompt={systemPrompt}
          onInsertMissing={() =>
            form.setValue("system_prompt", insertMissingTokens(systemPrompt), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </Section>

      {personaType === "coach" || personaType === "challenger" ? (
        <Section
          title="Q&A mode prompts"
          description="Used when the user opens with a question. Per-persona override of the global scene wrapper."
        >
          <FormField
            control={form.control}
            name="qa_scenario_prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scenario generator</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    className="min-h-[180px] font-mono text-xs"
                    placeholder="Generates the opening scenario for Q&A mode. Tokens like {{character_demeanor}} are replaced before the request."
                    spellCheck={false}
                  />
                </FormControl>
                <FormDescription>
                  Tokens are replaced the same way as in the system prompt.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="qa_scene_template"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scene wrapper template</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    className="min-h-[140px] font-mono text-xs"
                    placeholder="Wrapping template that injects the scenario into the persona's context. Use {{scenario_prompt}} as the placeholder."
                    spellCheck={false}
                  />
                </FormControl>
                <FormDescription>
                  Use <code className="bg-muted rounded px-1 py-0.5">{`{{scenario_prompt}}`}</code>{" "}
                  as the placeholder for the generated scenario.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>
      ) : null}
    </>
  )
}

// Re-export so the consumer can keep imports tidy.
export type { TraitToken }
