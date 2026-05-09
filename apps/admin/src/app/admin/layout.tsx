import { requireAdminPage } from "@/lib/auth/require-admin"
import { AdminShell } from "@/components/admin/admin-shell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await requireAdminPage()
  return <AdminShell ctx={ctx}>{children}</AdminShell>
}
