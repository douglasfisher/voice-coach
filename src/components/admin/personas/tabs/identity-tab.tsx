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
import { Switch } from "@/components/ui/switch"
import { GENDERS, PERSONA_TYPES } from "@/lib/personas/constants"
import { AGE_RANGE_OPTIONS } from "@/lib/avatars/constants"
import type { PersonaFormValues } from "@/lib/personas/schema"
import type { PersonaLookups } from "@/lib/personas/lookups"

import { Grid, Row, Section } from "./_shared"
import { IdentityAiFill } from "../identity-ai-fill"

export function IdentityTab({
  form,
  lookups,
}: {
  form: UseFormReturn<PersonaFormValues>
  lookups: PersonaLookups
}) {
  const personaType = form.watch("persona_type")

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <IdentityAiFill form={form} />
      </div>

      <Section title="Basics" description="The user-visible identity.">
        <Grid>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="e.g. Coach Maya"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tagline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tagline</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="One-line description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Grid>

        <Grid>
          <FormField
            control={form.control}
            name="persona_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
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
                    {PERSONA_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Coaches teach a domain. Challengers spar. Advisors give
                  category-specific guidance.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
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
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </Grid>

        <Grid>
          <FormField
            control={form.control}
            name="age_range"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age range</FormLabel>
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
                    {AGE_RANGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
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
            name="cultural_background"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cultural background</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="e.g. British, multicultural"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Grid>

        <FormField
          control={form.control}
          name="sort_order"
          render={({ field }) => (
            <FormItem className="max-w-32">
              <FormLabel>Sort order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={field.value ?? 0}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>Lower numbers appear first.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </Section>

      {personaType === "coach" ? (
        <Section
          title="Coaching domain"
          description="Which area this coach teaches."
        >
          <FormField
            control={form.control}
            name="domain_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domain *</FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a domain…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lookups.domains.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>
      ) : null}

      {personaType === "advisor" ? (
        <Section
          title="Advisor category"
          description="The subject-matter area this advisor covers."
        >
          <FormField
            control={form.control}
            name="advisor_category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v || null)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lookups.advisorCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>
      ) : null}

      <Section title="Visibility & flags">
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <Row label="Active" hint="When off, hidden from end users.">
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </Row>
          )}
        />
        <FormField
          control={form.control}
          name="is_premium"
          render={({ field }) => (
            <Row
              label="Premium"
              hint="Marks this persona as paid-tier only."
            >
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </Row>
          )}
        />
        <FormField
          control={form.control}
          name="emotional_progression_enabled"
          render={({ field }) => (
            <Row
              label="Emotional progression"
              hint="Persona's tone shifts with conversation context."
            >
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </Row>
          )}
        />
      </Section>
    </>
  )
}
