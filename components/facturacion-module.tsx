"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Ban, Loader2, Plus, Search, TrendingDown, TrendingUp } from "lucide-react"

import { AnularPagoDialog } from "@/components/anular-pago-dialog"
import { CajaAperturaTab } from "@/components/caja-apertura-tab"
import { CierreCajaCuotasTab } from "@/components/cierre-caja-cuotas-tab"
import { CierreCajaTab } from "@/components/cierre-caja-tab"
import { EgresosTab } from "@/components/egresos-tab"
import { MorososTab } from "@/components/morosos-tab"
import { PorVencerTab } from "@/components/por-vencer-tab"
import { RegistrarPagoDialog } from "@/components/registrar-pago-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PERMISOS } from "@/lib/permissions"
import type { Pago, StatsFacturacion } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { getPagos, getStatsFacturacion } from "@/services/pagos"

const PAGE_SIZE = 20

// Estilo de la etiqueta encima de cada filtro de la fila
const etiquetaFiltro = "text-xs font-normal text-muted-foreground"

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })
const percentFormatter = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 0 })

// `items` en el Select hace que el trigger muestre el label (no el value crudo)
const opcionesMetodo = [
  { value: "todos", label: "Todos los métodos" },
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mixto", label: "Mixto" },
]

const opcionesTurno = [
  { value: "todos", label: "Todos los turnos" },
  { value: "mañana", label: "Mañana" },
  { value: "tarde", label: "Tarde" },
]

const opcionesEstado = [
  { value: "todos", label: "Todos los estados" },
  { value: "vigente", label: "Vigentes" },
  { value: "anulado", label: "Anulados" },
]

const metodoLabel: Record<Pago["metodo"], string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

function variacion(actual: number, anterior: number) {
  if (anterior === 0) return actual > 0 ? null : 0
  return (actual - anterior) / anterior
}

function VariacionBadge({ actual, anterior }: { actual: number; anterior: number }) {
  const delta = variacion(actual, anterior)
  if (delta === null) {
    return <span className="text-xs text-muted-foreground">sin período anterior</span>
  }
  const positivo = delta >= 0
  const Icon = positivo ? TrendingUp : TrendingDown
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${positivo ? "text-success" : "text-critical"}`}>
      <Icon className="size-3" />
      {percentFormatter.format(Math.abs(delta))} vs. período anterior
    </span>
  )
}

export function FacturacionModule() {
  const { toast } = useToast()
  const { esAdmin, permisos } = useAuth()
  const puedeCobrar = esAdmin || permisos.includes(PERMISOS.FACTURACION_COBRAR)
  const puedeAnular = esAdmin || permisos.includes(PERMISOS.FACTURACION_ANULAR)
  const puedeVerCaja = esAdmin || permisos.includes(PERMISOS.CAJA_VER)

  const [stats, setStats] = useState<StatsFacturacion | null>(null)
  const [pagos, setPagos] = useState<Pago[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [metodo, setMetodo] = useState<string>("todos")
  const [usuarioId, setUsuarioId] = useState<string>("todos")
  const [estado, setEstado] = useState<string>("todos")
  const [turno, setTurno] = useState<string>("todos")
  const [clienteQueryInput, setClienteQueryInput] = useState("")
  const [clienteQuery, setClienteQuery] = useState("")

  const [showRegistrar, setShowRegistrar] = useState(false)
  const [anulando, setAnulando] = useState<Pago | null>(null)
  const [empleadosVistos, setEmpleadosVistos] = useState<Map<string, string>>(new Map())

  // Debounce de la búsqueda por cliente: evita un request por cada tecla.
  // El early return evita que, al montar, se resetee a la página 1 a los 300 ms pisando un "Siguiente".
  useEffect(() => {
    const next = clienteQueryInput.trim()
    if (next === clienteQuery) return
    const t = setTimeout(() => {
      setClienteQuery(next)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [clienteQueryInput, clienteQuery])

  const fetchStats = useCallback(() => {
    getStatsFacturacion()
      .then(setStats)
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar la facturación",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
  }, [toast])

  const fetchPagos = useCallback(() => {
    getPagos({
      desde: desde || undefined,
      hasta: hasta || undefined,
      metodo: metodo === "todos" ? undefined : metodo,
      usuarioId: usuarioId === "todos" ? undefined : usuarioId,
      estado: estado === "todos" ? undefined : estado,
      turno: turno === "todos" ? undefined : turno,
      clienteQuery: clienteQuery || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(({ data, meta }) => {
        setPagos(data)
        setTotal(meta?.total ?? data.length)
        setEmpleadosVistos((prev) => {
          const next = new Map(prev)
          for (const pago of data) {
            if (pago.usuarioId && pago.usuarioNombre) next.set(pago.usuarioId, pago.usuarioNombre)
          }
          return next
        })
      })
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar los movimientos",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
      .finally(() => setLoading(false))
  }, [desde, hasta, metodo, usuarioId, estado, turno, clienteQuery, page, toast])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchPagos()
  }, [fetchPagos])

  function handleSuccess() {
    fetchStats()
    fetchPagos()
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // El back solo deja anular el pago vigente más reciente de cada cliente (409 si no).
  // `pagos` ya viene ordenado por fecha_pago DESC, así que la primera fila vigente que
  // aparece para un cliente es esa; evita mostrar un botón que siempre va a fallar.
  // Limitación conocida: si el pago vigente más reciente de un cliente quedó en otra
  // página (por el filtro/paginado actual), esta página no puede saberlo.
  const ultimoVigentePorCliente = useMemo(() => {
    const map = new Map<string, string>()
    for (const pago of pagos) {
      if (!pago.anulado && !map.has(pago.clienteId)) map.set(pago.clienteId, pago.id)
    }
    return map
  }, [pagos])

  const kpis = useMemo(() => {
    if (!stats) return []
    return [
      { title: "Facturación Hoy", value: stats.hoy, anterior: stats.ayer },
      { title: "Esta Semana", value: stats.semana, anterior: stats.semanaAnterior },
      { title: "Este Mes", value: stats.mes, anterior: stats.mesAnterior },
    ]
  }, [stats])

  const opcionesEmpleado = [
    { value: "todos", label: "Todos los empleados" },
    ...[...empleadosVistos.entries()].map(([id, nombre]) => ({ value: id, label: nombre })),
  ]

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display uppercase tracking-tight">Facturación</h1>
          <p className="text-sm text-muted-foreground">Movimientos, cobros y anulaciones.</p>
        </div>
        {puedeCobrar && (
          <Button onClick={() => setShowRegistrar(true)}>
            <Plus />
            Registrar Pago
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(kpis.length > 0
          ? kpis
          : [
              { title: "Facturación Hoy", value: undefined, anterior: undefined },
              { title: "Esta Semana", value: undefined, anterior: undefined },
              { title: "Este Mes", value: undefined, anterior: undefined },
            ]
        ).map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold">
                {kpi.value === undefined ? "—" : currencyFormatter.format(kpi.value)}
              </div>
              {kpi.value !== undefined && kpi.anterior !== undefined && (
                <VariacionBadge actual={kpi.value} anterior={kpi.anterior} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              Pagos este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats ? stats.cantidadPagosMes : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              Ticket Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? currencyFormatter.format(stats.ticketPromedioMes) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="movimientos">
        <TabsList>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="morosos">Morosos</TabsTrigger>
          <TabsTrigger value="por-vencer">Por Vencer</TabsTrigger>
          {puedeVerCaja && <TabsTrigger value="egresos">Egresos</TabsTrigger>}
          {puedeVerCaja && <TabsTrigger value="caja-inicial">Caja Inicial</TabsTrigger>}
          <TabsTrigger value="cierre-caja">Cierre de Caja</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos" className="flex flex-col gap-4">
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1.5 lg:col-span-2">
            <Label htmlFor="filtro-cliente" className={etiquetaFiltro}>Cliente o DNI</Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="filtro-cliente"
                placeholder="Buscar por cliente o DNI..."
                value={clienteQueryInput}
                onChange={(e) => setClienteQueryInput(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filtro-desde" className={etiquetaFiltro}>Desde</Label>
            <Input
              id="filtro-desde"
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filtro-hasta" className={etiquetaFiltro}>Hasta</Label>
            <Input
              id="filtro-hasta"
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filtro-metodo" className={etiquetaFiltro}>Método de pago</Label>
            <Select
              items={opcionesMetodo}
              value={metodo}
              onValueChange={(v) => {
                setMetodo(v ?? "todos")
                setPage(1)
              }}
            >
              <SelectTrigger id="filtro-metodo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opcionesMetodo.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="filtro-estado" className={etiquetaFiltro}>Estado</Label>
            <Select
              items={opcionesEstado}
              value={estado}
              onValueChange={(v) => {
                setEstado(v ?? "todos")
                setPage(1)
              }}
            >
              <SelectTrigger id="filtro-estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opcionesEstado.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {empleadosVistos.size > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="filtro-empleado" className={etiquetaFiltro}>Empleado</Label>
              <Select
                items={opcionesEmpleado}
                value={usuarioId}
                onValueChange={(v) => {
                  setUsuarioId(v ?? "todos")
                  setPage(1)
                }}
              >
                <SelectTrigger id="filtro-empleado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opcionesEmpleado.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="filtro-turno" className={etiquetaFiltro}>Turno</Label>
            <Select
              items={opcionesTurno}
              value={turno}
              onValueChange={(v) => {
                setTurno(v ?? "todos")
                setPage(1)
              }}
            >
              <SelectTrigger id="filtro-turno">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opcionesTurno.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : pagos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No se encontraron movimientos.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagos.map((pago) => (
                    <TableRow key={pago.id} className={pago.anulado ? "opacity-60" : undefined}>
                      <TableCell>{formatDate(pago.fechaPago)}</TableCell>
                      <TableCell className="font-medium">{pago.clienteNombreCompleto}</TableCell>
                      <TableCell>{currencyFormatter.format(pago.monto)}</TableCell>
                      <TableCell>
                        {pago.metodo === "mixto" ? (
                          <span title={pago.metodos.map((m) => `${metodoLabel[m.metodo]}: ${currencyFormatter.format(m.monto)}`).join(" · ")}>
                            Mixto ({pago.metodos.map((m) => currencyFormatter.format(m.monto)).join(" + ")})
                          </span>
                        ) : (
                          metodoLabel[pago.metodo]
                        )}
                      </TableCell>
                      <TableCell>{pago.usuarioNombre || "—"}</TableCell>
                      <TableCell>
                        {pago.anulado ? (
                          <Badge
                            className="border border-critical/20 bg-critical/15 text-red-600"
                            title={pago.motivoAnulacion}
                          >
                            Anulado
                          </Badge>
                        ) : (
                          <Badge className="border border-success/20 bg-success/15 text-green-700">
                            Vigente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          {puedeAnular &&
                            !pago.anulado &&
                            ultimoVigentePorCliente.get(pago.clienteId) === pago.id && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Anular pago"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setAnulando(pago)}
                            >
                              <Ban />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && total > 0 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages} · {total} movimiento{total === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="morosos">
          <MorososTab onCobroRegistrado={fetchStats} />
        </TabsContent>

        <TabsContent value="por-vencer">
          <PorVencerTab onCobroRegistrado={fetchStats} />
        </TabsContent>

        {puedeVerCaja && (
          <TabsContent value="egresos">
            <EgresosTab />
          </TabsContent>
        )}

        {puedeVerCaja && (
          <TabsContent value="caja-inicial">
            <CajaAperturaTab />
          </TabsContent>
        )}

        <TabsContent value="cierre-caja">
          {puedeVerCaja ? <CierreCajaTab /> : <CierreCajaCuotasTab />}
        </TabsContent>
      </Tabs>

      <RegistrarPagoDialog open={showRegistrar} onOpenChange={setShowRegistrar} onSuccess={handleSuccess} />

      <AnularPagoDialog
        pago={anulando}
        open={anulando !== null}
        onOpenChange={(open) => !open && setAnulando(null)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
