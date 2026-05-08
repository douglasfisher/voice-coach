"use client"

import { useTransition } from "react"
import type { UseFormReturn } from "react-hook-form"
import { Loader2, RefreshCw, Sparkles } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { insertMissingTokens } from "@/lib/personas/constants"
import {
  SECTION_KEYS,
  SECTION_META,
  compileSections,
  defaultTraitTokensSection,
  sectionPromptFor,
  type SectionKey,
} from "@/lib/personas/prompt-sections"
import type { PersonaFormValues } from "@/lib/personas/schema"

import { Section } from "./_shared"
import { TraitTokenBadges } from "../trait-token-badges"
import { SectionEditor } from "../section-editor"

export function PromptsTab({
  form,
}: {
  form: UseFormReturn<PersonaFormValues>
}) {
  const sections =
    form.watch("prompt_sections") ?? {
      identity: "",
      trait_tokens: "",
      character_traits: "",
      roleplay_behavior: "",
      coaching_approach: "",
    }
  const systemPrompt = form.watch("system_prompt") ?? ""
  const personaType = form.watch("persona_type")
  const [isGeneratingAll, startGenerateAll] = useTransition()
  const [isCompiling, startCompile] = useTransition()

  function setSection(key: SectionKey, value: string) {
    form.setValue(
      "prompt_sections",
      { ...sections, [key]: value },
      { shouldDirty: true, shouldValidate: true }
    )
  }

  async function callAi(key: SectionKey): Promise<string> {
    const { systemPrompt: sys, userPrompt } = sectionPromptFor(
      key,
      form.getValues()
    )
    const res = await fetch("/api/admin/ai/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: sys,
        userPrompt,
        context: { kind: "persona_section", sectionKey: key },
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(
        body?.message ?? body?.error ?? `HTTP ${res.status}`
      )
    }
    return (body.data?.content as string | undefined) ?? ""
  }

  function generateAll() {
    startGenerateAll(async () => {
      const next = { ...sections }
      let okCount = 0
      // Sequential — keeps the LLM endpoint from being hammered and lets
      // each section's persona context include the latest values.
      for (const key of SECTION_KEYS) {
        if (key === "trait_tokens") {
          next.trait_tokens = defaultTraitTokensSection()
          okCount++
          continue
        }
        try {
          const content = await callAi(key)
          next[key] = content
          okCount++
        } catch (err) {
          toast.error(
            `${SECTION_META[key].title}: ${
              err instanceof Error ? err.message : "failed"
            }`
          )
        }
      }
      form.setValue("prompt_sections", next, {
        shouldDirty: true,
        shouldValidate: true,
      })
      toast.success(`Generated ${okCount} / ${SECTION_KEYS.length} sections`)
    })
  }

  function compileToSystemPrompt() {
    startCompile(async () => {
      let compiled = compileSections(sections)
      // Auto-fill missing tokens so a freshly compiled prompt always
      // satisfies the trait-token contract used at runtime.
      compiled = insertMissingTokens(compiled)
      form.setValue("system_prompt", compiled, {
        shouldDirty: true,
        shouldValidate: true,
      })
      toast.success("Compiled — system prompt updated")
    })
  }

  return (
    <>
      <Section
        title="Prompt sections"
        description="Build the system prompt as 5 editable sections — each can be AI-written. Click Compile to join them into the final system prompt below."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={generateAll}
            disabled={isGeneratingAll}
          >
            {isGeneratingAll ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-4" />
            )}
            {isGeneratingAll ? "Generating…" : "AI write all sections"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={compileToSystemPrompt}
            disabled={isCompiling}
          >
            {isCompiling ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 size-4" />
            )}
            Compile final prompt
          </Button>
          <span className="text-muted-foreground ml-auto text-xs">
            Sections feed into{" "}
            <code className="bg-muted rounded px-1 py-0.5">system_prompt</code>{" "}
            on compile.
          </span>
        </div>

        <div className="space-y-3">
          {SECTION_KEYS.map((key) => (
            <SectionEditor
              key={key}
              sectionKey={key}
              value={sections[key] ?? ""}
              onChange={(v) => setSection(key, v)}
              disabled={isGeneratingAll}
              onAiWrite={
                SECTION_META[key].aiGeneratable
                  ? async () => callAi(key)
                  : undefined
              }
              onResetTokens={
                key === "trait_tokens"
                  ? () => setSection(key, defaultTraitTokensSection())
                  : undefined
              }
            />
          ))}
        </div>
      </Section>

      <Section
        title="Compiled system prompt"
        description="The final prompt sent to the model. Auto-filled by Compile, but you can hand-edit it; just be aware that re-compiling will overwrite your edits."
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
                  className="min-h-[360px] font-mono text-xs leading-relaxed"
                  placeholder="Compile the sections above to populate, or write here directly."
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
            form.setValue(
              "system_prompt",
              insertMissingTokens(systemPrompt),
              { shouldDirty: true, shouldValidate: true }
            )
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
                  Use{" "}
                  <code className="bg-muted rounded px-1 py-0.5">
                    {`{{scenario_prompt}}`}
                  </code>{" "}
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
