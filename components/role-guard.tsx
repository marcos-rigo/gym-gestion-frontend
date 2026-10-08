"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { puedeAcceder, type Permiso } from "@/lib/permissions"

interface RoleGuardProps {
  ruta: { href: string; permiso?: Permiso; soloAdmin?: boolean }
  children: React.ReactNode
}

export function RoleGuard({ ruta, children }: RoleGuardProps) {
  const { usuario, permisos, esAdmin, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const allowed = !!usuario && puedeAcceder(ruta, { esAdmin, permisos })
  // El fallback de todo el resto de las rutas es "/dashboard"; si la propia
  // ruta protegida ES "/dashboard" (ej. falta estadisticas_ver), no hay adónde
  // redirigir sin generar un loop, así que se muestra un mensaje en el lugar.
  const puedeRedirigir = pathname !== "/dashboard"

  useEffect(() => {
    if (isLoading || allowed || !puedeRedirigir) return
    router.replace("/dashboard")
  }, [allowed, isLoading, puedeRedirigir, router])

  if (isLoading) return null

  if (!allowed) {
    if (puedeRedirigir) return null
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1 p-8 text-center">
        <p className="text-lg font-medium">No tenés permiso para ver esta página</p>
        <p className="text-sm text-muted-foreground">
          Pedile a un administrador que te asigne el permiso correspondiente.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
