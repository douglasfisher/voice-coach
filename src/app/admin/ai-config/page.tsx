import Link from "next/link"
import { ArrowRight, AudioLines, ImageIcon, Sparkles } from "lucide-react"

import { PageHeader } from "@/components/admin/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireAdminPage } from "@/lib/auth/require-admin"

export const metadata = { title: "AI config · Dialectica Admin" }

const PANELS = [
  {
    href: "/admin/ai-config/persona-generator",
    title: "Persona generator",
    description:
      "Meta-prompts that produce a full persona via AI. Used by the 'Generate persona' button and the per-section AI write actions.",
    Icon: Sparkles,
  },
  {
    href: "/admin/ai-config/avatar-composition",
    title: "Avatar composition",
    description:
      "Silhouette and safe-zone overlay used on persona drafts and inside the crop modal.",
    Icon: ImageIcon,
  },
  {
    href: "/admin/ai-config/voice-defaults",
    title: "Voice defaults",
    description:
      "Voice IDs auto-picked when a persona is created. Per-gender, with manual-override preservation.",
    Icon: AudioLines,
  },
]

export default async function AiConfigPage() {
  await requireAdminPage()
  return (
    <div>
      <PageHeader
        title="AI config"
        description="Database-driven settings for AI-powered features. Changes apply on the next request — no redeploy."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PANELS.map((p) => (
          <Card key={p.href} className="group transition-colors hover:bg-muted/40">
            <Link href={p.href} className="block">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <p.Icon className="text-primary size-4" />
                  <CardTitle className="text-base">{p.title}</CardTitle>
                </div>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-muted-foreground inline-flex items-center text-xs group-hover:text-foreground">
                  Edit <ArrowRight className="ml-1 size-3" />
                </span>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
