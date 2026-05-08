import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AdminSidebar } from "./admin-sidebar"
import { AdminUserMenu } from "./admin-user-menu"
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
        <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="text-muted-foreground text-sm">Dialectica Admin</div>
          <div className="ml-auto">
            <AdminUserMenu email={ctx.email} role={ctx.role} />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
