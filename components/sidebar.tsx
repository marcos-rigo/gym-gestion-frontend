"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, LogOut, Menu, Shield, UserCog, Users, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { puedeAcceder, RUTAS_PROTEGIDAS } from "@/lib/permissions"
import { cn } from "@/lib/utils"

const menuItems: {
  label: string
  href: string
  icon: typeof Users
  ruta?: (typeof RUTAS_PROTEGIDAS)[keyof typeof RUTAS_PROTEGIDAS]
}[] = [
  { label: "Dashboard", href: RUTAS_PROTEGIDAS.DASHBOARD.href, icon: LayoutDashboard, ruta: RUTAS_PROTEGIDAS.DASHBOARD },
  { label: "Clientes", href: RUTAS_PROTEGIDAS.CLIENTES.href, icon: Users, ruta: RUTAS_PROTEGIDAS.CLIENTES },
  { label: "Usuarios", href: RUTAS_PROTEGIDAS.USUARIOS.href, icon: UserCog, ruta: RUTAS_PROTEGIDAS.USUARIOS },
  { label: "Roles", href: RUTAS_PROTEGIDAS.ROLES.href, icon: Shield, ruta: RUTAS_PROTEGIDAS.ROLES },
]

export function Sidebar() {
  const { usuario, permisos, esAdmin, logout } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const items = menuItems.filter(
    (item) => !item.ruta || puedeAcceder(item.ruta, { esAdmin, permisos: permisos ?? [] })
  )

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-3 border-b border-white/10 bg-deep/95 px-4 backdrop-blur-sm md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10 hover:text-lime"
          aria-label="Abrir menú"
          onClick={() => setMobileOpen(true)}
        >
          <Menu />
        </Button>
        <img
          src="/logo.png"
          alt="Colosseo Gym Barrio Norte"
          className="h-8 w-auto max-w-[150px] object-contain sm:h-9 sm:max-w-[170px]"
        />
      </header>

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
        <div className="mb-6 flex items-center justify-between gap-2">
          <img
            src="/logo.png"
            alt="Colosseo Gym Barrio Norte"
            className="h-10 w-auto max-w-[170px] object-contain"
          />
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
