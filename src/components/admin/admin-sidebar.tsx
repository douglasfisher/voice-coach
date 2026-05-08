"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  UserCog,
  Sparkles,
  Settings2,
  CreditCard,
  Activity,
  Coins,
  Image as ImageIcon,
  MessageSquare,
  Trophy,
  ScrollText,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  superadminOnly?: boolean
}

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    label: "AI",
    items: [
      { href: "/admin/personas", label: "Personas", icon: UserCog },
      { href: "/admin/advisors", label: "Advisors", icon: Sparkles },
      { href: "/admin/ai-config", label: "AI config", icon: Settings2 },
      { href: "/admin/avatars", label: "Avatars", icon: ImageIcon },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/scenarios", label: "Scenarios", icon: ScrollText },
      { href: "/admin/challenges", label: "Daily challenges", icon: Trophy },
      {
        href: "/admin/conversations",
        label: "Conversations",
        icon: MessageSquare,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/usage", label: "Usage", icon: Activity },
      { href: "/admin/budgets", label: "Budgets", icon: Coins },
      {
        href: "/admin/audit-log",
        label: "Audit log",
        icon: ScrollText,
        superadminOnly: true,
      },
    ],
  },
]

export function AdminSidebar({ role }: { role: "admin" | "superadmin" }) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="px-2 py-1.5">
          <div className="text-sm font-semibold">Dialectica</div>
          <div className="text-muted-foreground text-xs">Admin console</div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                  .filter((i) => !i.superadminOnly || role === "superadmin")
                  .map((item) => {
                    const active =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href)
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={active}
                          render={<Link href={item.href} />}
                        >
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="text-muted-foreground px-2 py-1.5 text-xs">
          v0.1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
