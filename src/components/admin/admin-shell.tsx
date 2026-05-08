import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AdminSidebar } from "./admin-sidebar"
import { AdminUserMenu } from "./admin-user-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import type { AdminContext } from "@/lib/auth/require-admin"

export function AdminShell({
  ctx,
  children,
}: {
  ctx: AdminContext
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AdminSidebar role={ctx.role} />
      <SidebarInset>
        <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Admin console
          </span>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <AdminUserMenu email={ctx.email} role={ctx.role} />
          </div>
        </header>
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
