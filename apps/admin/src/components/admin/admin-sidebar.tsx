"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  UserCog,
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
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-md text-sm font-semibold">
            D
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">
              Dialectica
            </span>
            <span className="text-muted-foreground text-[11px]">
              Admin console
            </span>
          </div>
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
        <div className="text-muted-foreground px-2 py-1.5 text-[11px] tracking-wide group-data-[collapsible=icon]:hidden">
          v0.1.0 · Dialectica admin
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
