"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowLeft, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/admin/page-header"
import type { PersonaGeneratorConfig } from "@/lib/personas/generator-config"

/**
 * Editor for app_settings.ai_persona_generator. Saves the meta-prompts
 * that produce a full persona via AI. Mirror of the avatar-composition
 * editor pattern — minimal Cards, a Save + Revert pair, audit-logged
 * via the PATCH endpoint.
 *
 * Templates use {{token}} placeholders. The server-side renderer also
 * supports {{var|or 'fallback'}} for graceful empty-field handling.
 */
export function PersonaGeneratorEditor({
  initial,
}: {
  initial: PersonaGeneratorConfig
}) {
  const router = useRouter()
  const [temperature, setTemperature] = useState(
    initial.modelSettings.temperature
  )
  const [maxTokens, setMaxTokens] = useState(
    initial.modelSettings.max_completion_tokens
  )
  const [details, setDetails] = useState(initial.details)
  const [systemPrompt, setSystemPrompt] = useState(initial.systemPrompt)
  const [sections, setSections] = useState(initial.sections)
  const [personaContextTemplate, setPersonaContextTemplate] = useState(
    initial.personaContextTemplate
  )
  const [pending, startTransition] = useTransition()

  function reset() {
    setTemperature(initial.modelSettings.temperature)
    setMaxTokens(initial.modelSettings.max_completion_tokens)
    setDetails(initial.details)
    setSystemPrompt(initial.systemPrompt)
    setSections(initial.sections)
    setPersonaContextTemplate(initial.personaContextTemplate)
  }

  function save() {
    startTransition(async () => {
      const res = await fetch(
        "/api/admin/ai-config/persona-generator",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model_settings: {
              temperature,
              max_completion_tokens: maxTokens,
            },
            details: {
              system: details.system,
              user_template: details.userTemplate,
            },
            system_prompt: {
              system: systemPrompt.system,
              user_template: systemPrompt.userTemplate,
            },
            sections: {
              _system: sections.system,
              identity: sections.identity,
              character_traits: sections.character_traits,
              roleplay_behavior: sections.roleplay_behavior,
              coaching_approach: sections.coaching_approach,
            },
            persona_context_template: personaContextTemplate,
          }),
        }
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(
          `Save failed — ${body?.issues?.[0]?.message ?? body?.message ?? body?.error ?? res.status}`
        )
        return
      }
      toast.success("Persona generator config saved")
      router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/ai-config" />}
        >
          <ArrowLeft className="mr-1 size-4" />
          AI config
        </Button>
      </div>

      <PageHeader
        title="Persona generator"
        description="Meta-prompts driving the AI persona generation features. Same templates the mobile app will read once migrated. {{token}} placeholders are server-rendered with form values."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              disabled={pending}
            >
              <RotateCcw className="mr-1 size-4" />
              Revert
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              <Save className="mr-1 size-4" />
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Model settings</CardTitle>
            <CardDescription>
              Sent with every AI persona generation call. Higher temperature
              = more creative variation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="temp">Temperature (0–2)</Label>
              <Input
                id="temp"
                type="number"
                min={0}
                max={2}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max">Max completion tokens</Label>
              <Input
                id="max"
                type="number"
                min={64}
                max={4096}
                step={64}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity (JSON output)</CardTitle>
            <CardDescription>
              Produces the 11 identity fields. Available tokens:{" "}
              <code className="bg-muted rounded px-1 py-0.5">
                {`{{age_range}} {{ethnicity}} {{gender}} {{expression}} {{clothing}} {{accessories}}`}
              </code>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>System prompt</Label>
              <Textarea
                value={details.system}
                onChange={(e) =>
                  setDetails((s) => ({ ...s, system: e.target.value }))
                }
                className="min-h-20 font-mono text-xs"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label>User template</Label>
              <Textarea
                value={details.userTemplate}
                onChange={(e) =>
                  setDetails((s) => ({ ...s, userTemplate: e.target.value }))
                }
                className="min-h-72 font-mono text-xs"
                spellCheck={false}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System prompt (free-form text)</CardTitle>
            <CardDescription>
              Produces the full 200–400 word system prompt. Tokens:{" "}
              <code className="bg-muted rounded px-1 py-0.5">
                {`{{name}} {{tagline}} {{cultural_background}} {{persona_type}} {{coaching_style}} {{challenge_style}} {{feedback_style}}`}
              </code>{" "}
              + the 5 sliders + avatar fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>System prompt</Label>
              <Textarea
                value={systemPrompt.system}
                onChange={(e) =>
                  setSystemPrompt((s) => ({
                    ...s,
                    system: e.target.value,
                  }))
                }
                className="min-h-20 font-mono text-xs"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <Label>User template</Label>
              <Textarea
                value={systemPrompt.userTemplate}
                onChange={(e) =>
                  setSystemPrompt((s) => ({
                    ...s,
                    userTemplate: e.target.value,
                  }))
                }
                className="min-h-80 font-mono text-xs"
                spellCheck={false}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per-section prompts</CardTitle>
            <CardDescription>
              The 4 AI-generatable sections. Each template receives a{" "}
              <code className="bg-muted rounded px-1 py-0.5">
                {`{{persona_context}}`}
              </code>{" "}
              block rendered from the template below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Shared system prompt</Label>
              <Textarea
                value={sections.system}
                onChange={(e) =>
                  setSections((s) => ({ ...s, system: e.target.value }))
                }
                className="min-h-20 font-mono text-xs"
                spellCheck={false}
              />
            </div>
            {(
              [
                "identity",
                "character_traits",
                "roleplay_behavior",
                "coaching_approach",
              ] as const
            ).map((key) => (
              <div key={key} className="space-y-1.5">
                <Label className="capitalize">
                  {key.replace(/_/g, " ")}
                </Label>
                <Textarea
                  value={sections[key]}
                  onChange={(e) =>
                    setSections((s) => ({ ...s, [key]: e.target.value }))
                  }
                  className="min-h-40 font-mono text-xs"
                  spellCheck={false}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Persona context template</CardTitle>
            <CardDescription>
              Rendered once per section call and passed in as{" "}
              <code className="bg-muted rounded px-1 py-0.5">
                {`{{persona_context}}`}
              </code>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={personaContextTemplate}
              onChange={(e) => setPersonaContextTemplate(e.target.value)}
              className="min-h-40 font-mono text-xs"
              spellCheck={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
