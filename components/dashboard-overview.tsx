"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle, Clock, UserPlus, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import type { Cliente } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { getDashboardStats } from "@/services/dashboard"
import { getStatsFacturacion } from "@/services/pagos"

interface ProximoVencimiento {
  id: string
  nombreCompleto: string
  telefono?: string
  fechaVencimiento: string
  estadoCuota: Cliente["estadoCuota"]
}

interface DashboardStats {
  total: number
  activos: number
  porVencer: number
  morosos: number
  nuevosMes: number
  proximosVencimientos: ProximoVencimiento[]
}

interface FacturacionStats {
  hoy: number
  semana: number
  mes: number
}

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

function EstadoCuotaBadge({ estadoCuota }: { estadoCuota: Cliente["estadoCuota"] }) {
  if (estadoCuota === "al_dia") {
    return (
      <Badge className="border border-success/20 bg-success/15 text-green-700">Al día</Badge>
    )
  }
  if (estadoCuota === "por_vencer") {
    return (
      <Badge className="border border-warning/20 bg-warning/20 text-amber-700">Por vencer</Badge>
    )
  }
  if (estadoCuota === "moroso") {
    return (
      <Badge className="border border-critical/20 bg-critical/15 text-red-600">Moroso</Badge>
    )
  }
  return null
}

export function DashboardOverview() {
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [facturacion, setFacturacion] = useState<FacturacionStats | null>(null)

  useEffect(() => {
    getStatsFacturacion()
      .then(setFacturacion)
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar la facturación",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
  }, [toast])

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar el dashboard",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
      .finally(() => setLoading(false))
  }, [toast])

  const facturacionCards = (
    <div className="grid grid-cols-3 gap-4">
      {[
        { title: "Facturación Hoy", value: facturacion?.hoy },
        { title: "Esta Semana", value: facturacion?.semana },
        { title: "Este Mes", value: facturacion?.mes },
      ].map(({ title, value }) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {value === undefined ? "—" : currencyFormatter.format(value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {facturacionCards}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    { title: "Total Clientes", value: stats.total, icon: Users, color: "text-primary" },
    { title: "Activos", value: stats.activos, icon: CheckCircle, color: "text-success" },
    { title: "Por Vencer (7 días)", value: stats.porVencer, icon: Clock, color: "text-amber-600" },
    { title: "Morosos", value: stats.morosos, icon: AlertTriangle, color: "text-critical" },
  ]

  const vencimientos = stats.proximosVencimientos ?? []

  return (
    <div className="flex flex-col gap-6">
      {facturacionCards}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={`size-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="max-w-xs">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Nuevos este mes
          </CardTitle>
          <UserPlus className="size-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.nuevosMes}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximos Vencimientos</CardTitle>
        </CardHeader>
        <CardContent>
          {vencimientos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <CheckCircle className="size-6" />
              No hay vencimientos próximos
            </div>
          ) : (
            <ul className="divide-y">
              {vencimientos.map((c) => (
                <li
                  key={c.id}
                  className="flex cursor-pointer items-center justify-between gap-4 py-3 hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/clientes?ver=${c.id}`)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.nombreCompleto}</p>
                    <p className="text-xs text-muted-foreground">{c.telefono || "—"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(c.fechaVencimiento)}
                    </span>
                    <EstadoCuotaBadge estadoCuota={c.estadoCuota} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
