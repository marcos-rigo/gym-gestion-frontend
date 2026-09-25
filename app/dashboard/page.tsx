"use client"

import { DashboardOverview } from "@/components/dashboard-overview"
import { useAuth } from "@/contexts/auth-context"

export default function DashboardPage() {
  const { usuario } = useAuth()

  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold font-display">DASHBOARD</h1>
        <p className="text-muted-foreground">Bienvenido, {usuario?.nombre}</p>
      </div>
      <DashboardOverview />
    </>
  )
}
