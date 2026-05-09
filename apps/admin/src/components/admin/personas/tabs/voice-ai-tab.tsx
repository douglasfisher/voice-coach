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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VOICE_PROVIDERS } from "@/lib/personas/constants"
import type { PersonaFormValues } from "@/lib/personas/schema"
import type { PersonaLookups } from "@/lib/personas/lookups"

import { Grid, Section } from "./_shared"
import { SliderField } from "../slider-field"

export function VoiceAiTab({
  form,
  lookups,
}: {
  form: UseFormReturn<PersonaFormValues>
  lookups: PersonaLookups
}) {
  return (
    <>
      <Section
        title="Voice"
        description="Used for spoken responses. Voice IDs are provider-specific — copy from your provider dashboard."
      >
        <Grid>
          <FormField
            control={form.control}
            name="voice_provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VOICE_PROVIDERS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="voice_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voice ID *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="e.g. EXAVITQu4vr4xnSDxMaL"
                    className="font-mono text-xs"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Grid>

        <FormField
          control={form.control}
          name="voice_speed"
          render={({ field }) => (
            <SliderField
              label="Speed"
              value={field.value}
              onChange={field.onChange}
              min={0.5}
              max={2}
              step={0.05}
              format={(v) => `${(v * 100).toFixed(0)}%`}
            />
          )}
        />
        <FormField
          control={form.control}
          name="voice_pitch"
          render={({ field }) => (
            <SliderField
              label="Pitch"
              value={field.value}
              onChange={field.onChange}
              min={0.5}
              max={2}
              step={0.05}
              format={(v) => v.toFixed(2)}
            />
          )}
        />
        <FormField
          control={form.control}
          name="voice_stability"
          render={({ field }) => (
            <SliderField
              label="Stability"
              hint="Higher = more consistent, less expressive."
              value={field.value}
              onChange={field.onChange}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${(v * 100).toFixed(0)}%`}
            />
          )}
        />
      </Section>

      <Section
        title="AI model"
        description="Stored in personas.ai_config and resolved at request time by the chat edge function."
      >
        <Grid>
          <FormField
            control={form.control}
            name="ai_model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lookups.aiModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col">
                          <span>{m.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {m.id} · {m.provider}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ai_fallback_model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fallback model</FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lookups.aiModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Used if the primary model is unavailable.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </Grid>

        <FormField
          control={form.control}
          name="ai_temperature"
          render={({ field }) => (
            <SliderField
              label="Temperature"
              hint="Lower = more deterministic, higher = more creative."
              value={field.value}
              onChange={field.onChange}
              min={0}
              max={1}
              step={0.05}
              format={(v) => v.toFixed(2)}
            />
          )}
        />
        <FormField
          control={form.control}
          name="ai_top_p"
          render={({ field }) => (
            <SliderField
              label="Top-p"
              hint="Nucleus sampling threshold."
              value={field.value}
              onChange={field.onChange}
              min={0}
              max={1}
              step={0.05}
              format={(v) => v.toFixed(2)}
            />
          )}
        />

        <FormField
          control={form.control}
          name="ai_max_completion_tokens"
          render={({ field }) => (
            <FormItem className="max-w-40">
              <FormLabel>Max completion tokens</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={64}
                  max={8192}
                  step={64}
                  value={field.value ?? 1024}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Section>
    </>
  )
}
