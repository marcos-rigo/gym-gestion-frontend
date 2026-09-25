"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, LogOut, Menu, Shield, UserCog, Users, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const menuItems: { label: string; href: string; icon: typeof Users; requiredPermission?: string }[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users, requiredPermission: "clientes_ver" },
  { label: "Usuarios", href: "/dashboard/usuarios", icon: UserCog, requiredPermission: "usuarios_ver" },
  { label: "Roles", href: "/dashboard/roles", icon: Shield, requiredPermission: "roles_ver" },
]

export function Sidebar() {
  const { usuario, permisos, esAdmin, logout } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const items = menuItems.filter(
    (item) => !item.requiredPermission || esAdmin || (permisos ?? []).includes(item.requiredPermission)
  )

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        aria-label="Abrir menú"
        onClick={() => setMobileOpen(true)}
      >
        <Menu />
      </Button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-white/10 bg-deep p-4 transition-transform md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="font-display text-2xl tracking-[0.15em] text-lime">COLOSSEO</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-lime bg-lime/10 text-white"
                    : "border-transparent text-[#a0a0a0] hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className={cn("size-4", active && "text-lime")} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="truncate text-sm font-medium text-white">{usuario?.nombre}</p>
          <p className="truncate text-xs text-[#a0a0a0]">{usuario?.email}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full justify-start text-white"
            onClick={logout}
          >
            <LogOut />
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  )
}
