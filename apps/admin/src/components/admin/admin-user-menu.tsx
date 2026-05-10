import { LogOut, ShieldCheck } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOutAction } from "@/app/login/actions"

export function AdminUserMenu({
  email,
  role,
}: {
  email: string
  role: "admin" | "superadmin"
}) {
  const initials =
    email
      .split("@")[0]
      ?.split(/[._-]/)
      .map((s) => s[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-2 px-2">
            <Avatar className="size-6">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm sm:inline">{email}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        {/* DropdownMenuLabel is a Base UI Menu.GroupLabel under the hood
            and panics outside a Menu.Group. Wrap in DropdownMenuGroup
            so the role+email header renders cleanly. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span className="truncate text-sm">{email}</span>
            <Badge
              variant={role === "superadmin" ? "default" : "secondary"}
              className="ml-2"
            >
              <ShieldCheck className="mr-1 size-3" />
              {role}
            </Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem
            render={
              <button type="submit" className="w-full">
                <LogOut className="mr-2 size-4" />
                Sign out
              </button>
            }
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
