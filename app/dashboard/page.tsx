"use client"

import { DashboardOverview } from "@/components/dashboard-overview"
import { RoleGuard } from "@/components/role-guard"
import { useAuth } from "@/contexts/auth-context"
import { RUTAS_PROTEGIDAS } from "@/lib/permissions"

export default function DashboardPage() {
  const { usuario } = useAuth()

  return (
    <RoleGuard ruta={RUTAS_PROTEGIDAS.DASHBOARD}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold font-display">DASHBOARD</h1>
        <p className="text-muted-foreground">Bienvenido, {usuario?.nombre}</p>
      </div>
      <DashboardOverview />
    </RoleGuard>
  )
}
