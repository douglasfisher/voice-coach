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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CHALLENGE_STYLES,
  COACHING_STYLES,
  FEEDBACK_STYLES,
  INTERACTION_MODES,
} from "@/lib/personas/constants"
import type { PersonaFormValues } from "@/lib/personas/schema"

import { Grid, Section } from "./_shared"
import { SliderField } from "../slider-field"

export function PersonalityTab({
  form,
}: {
  form: UseFormReturn<PersonaFormValues>
}) {
  const personaType = form.watch("persona_type")
  const showCoachingFields = personaType === "coach" || personaType === "advisor"

  return (
    <>
      <Section title="Conversational style">
        <Grid>
          <FormField
            control={form.control}
            name="challenge_style"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Challenge style{personaType === "challenger" ? " *" : ""}
                </FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CHALLENGE_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {showCoachingFields ? (
            <FormField
              control={form.control}
              name="coaching_style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coaching style</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COACHING_STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </Grid>

        {showCoachingFields ? (
          <Grid>
            <FormField
              control={form.control}
              name="default_interaction_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default interaction mode</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INTERACTION_MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex flex-col">
                            <span>{m.label}</span>
                            <span className="text-muted-foreground text-xs">
                              {m.hint}
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
              name="feedback_style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback style</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FEEDBACK_STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Grid>
        ) : null}
      </Section>

      <Section
        title="Personality traits"
        description="0–100 sliders mapped to the trait tokens used in the prompt."
      >
        <FormField
          control={form.control}
          name="warmth"
          render={({ field }) => (
            <SliderField
              label="Warmth"
              hint="How emotionally present and caring."
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <FormField
          control={form.control}
          name="directness"
          render={({ field }) => (
            <SliderField
              label="Directness"
              hint="Bluntness vs. softening."
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <FormField
          control={form.control}
          name="patience"
          render={({ field }) => (
            <SliderField
              label="Patience"
              hint="Tolerance for slow exploration."
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <FormField
          control={form.control}
          name="humor"
          render={({ field }) => (
            <SliderField
              label="Humor"
              hint="Willingness to be playful."
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <FormField
          control={form.control}
          name="formality"
          render={({ field }) => (
            <SliderField
              label="Formality"
              hint="Casual vs. professional register."
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Section>

      <Section
        title="Specialty areas"
        description="Free-text tags. Comma-separated entries become an array."
      >
        <FormField
          control={form.control}
          name="specialty_areas"
          render={({ field }) => {
            const text = (field.value ?? []).join(", ")
            return (
              <FormItem>
                <FormControl>
                  <input
                    className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                    value={text}
                    onChange={(e) => {
                      const arr = e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                      field.onChange(arr)
                    }}
                    placeholder="e.g. interview prep, salary negotiation"
                  />
                </FormControl>
                <FormDescription>
                  {(field.value ?? []).length} tag
                  {(field.value ?? []).length === 1 ? "" : "s"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      </Section>
    </>
  )
}
