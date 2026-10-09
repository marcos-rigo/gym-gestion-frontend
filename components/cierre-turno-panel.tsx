"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PERMISOS } from "@/lib/permissions"
import type { EstadoTurno, TotalesTurno, Turno } from "@/lib/types"
import { cerrarTurno, getEstadoTurno } from "@/services/caja"

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })
const horaFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Tucuman",
})

const etiqueta = "text-xs font-normal text-muted-foreground"

function fechaCorta(iso: string) {
  const [anio, mes, dia] = iso.split("-")
  return `${dia}/${mes}/${anio}`
}

function nombreTurno(turno: Turno) {
  return turno === "mañana" ? "Mañana" : "Tarde"
}

function FilaComposicion({ nombre, valor, resta = false }: { nombre: string; valor: number; resta?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{nombre}</dt>
      <dd className={resta && valor > 0 ? "font-medium text-destructive" : "font-medium"}>
        {resta && valor > 0 ? "−" : ""}
        {currencyFormatter.format(valor)}
      </dd>
    </div>
  )
}

interface CierreTurnoPanelProps {
  fecha: string
}

export function CierreTurnoPanel({ fecha }: CierreTurnoPanelProps) {
  const { toast } = useToast()
  const { esAdmin, permisos } = useAuth()
  const puedeCerrar = esAdmin || permisos.includes(PERMISOS.CAJA_MOVIMIENTOS)

  // null = todavía no sabemos el turno actual; el backend lo resuelve en la primera consulta.
  const [turno, setTurno] = useState<Turno | null>(null)
  const [estado, setEstado] = useState<EstadoTurno | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const turnoActivo: Turno = turno ?? estado?.turno ?? "mañana"

  useEffect(() => {
    let cancelado = false
    getEstadoTurno({ fecha, turno: turno ?? undefined })
      .then((data: EstadoTurno) => {
        if (cancelado) return
        setEstado(data)
        setTurno(data.turno)
      })
      .catch((err: unknown) => {
        if (cancelado) return
        toast({
          title: "Error al cargar el turno",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
    return () => {
      cancelado = true
    }
  }, [fecha, turno, reloadKey, toast])

  // Solo mostramos datos que correspondan a la fecha y turno elegidos (evita mostrar lo anterior mientras carga).
  const vigente = estado && estado.fecha === fecha && estado.turno === turnoActivo ? estado : null
  const cerrado = vigente?.cerrado ?? null
  const totales: TotalesTurno | null = cerrado ?? vigente?.enVivo ?? null
  // Cierres previos a la migración integrada no tienen desglose: mostramos solo el total.
  const desglose = totales?.desglose?.cuotas ? totales.desglose : null

  async function ejecutarCierre() {
    if (!vigente || cerrado) return
    setCerrando(true)
    try {
      await cerrarTurno({ fecha: vigente.fecha, turno: vigente.turno })
      toast({
        title: "Turno cerrado",
        description: `${nombreTurno(vigente.turno)} del ${fechaCorta(vigente.fecha)}`,
      })
    } catch (err) {
      toast({
        title: "No se pudo cerrar el turno",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setCerrando(false)
      setConfirmando(false)
      // Refresca desde el backend: el estado "cerrado" no depende del navegador.
      setReloadKey((k) => k + 1)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1.5">
          <span className={etiqueta}>Turno</span>
          <Tabs value={turnoActivo} onValueChange={(v) => setTurno(v as Turno)}>
            <TabsList aria-label="Turno">
              <TabsTrigger value="mañana">Mañana</TabsTrigger>
              <TabsTrigger value="tarde">Tarde</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {vigente &&
          (cerrado ? (
            <Badge>Cerrado</Badge>
          ) : (
            <Badge variant="outline">En curso</Badge>
          ))}
      </CardHeader>

      <CardContent className="grid gap-4">
        {!totales ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {cerrado
                ? `Turno ${nombreTurno(turnoActivo).toLowerCase()} del ${fechaCorta(fecha)} cerrado a las ${horaFormatter.format(new Date(cerrado.createdAt))}${cerrado.creadoPorNombre ? ` por ${cerrado.creadoPorNombre}` : ""}.`
                : `Resumen en vivo de lo facturado en el turno ${nombreTurno(turnoActivo).toLowerCase()} del ${fechaCorta(fecha)}. Al cerrarlo, estos montos quedan congelados.`}
            </p>

            {desglose && (
              <div className="grid gap-1.5">
                <span className={etiqueta}>Composición del turno</span>
                <dl className="grid gap-1.5 rounded-md border p-3 text-sm">
                  <FilaComposicion nombre="Cuotas" valor={totales.totalCuotas} />
                  <FilaComposicion nombre="Ventas de kiosco" valor={totales.totalVentas} />
                  {totales.totalIngresosExtra > 0 && (
                    <FilaComposicion nombre="Ingresos extra" valor={totales.totalIngresosExtra} />
                  )}
                  <FilaComposicion nombre="Egresos" valor={totales.totalEgresos} resta />
                  <div className="flex justify-between gap-3 border-t pt-2 font-semibold">
                    <dt>Total neto</dt>
                    <dd>{currencyFormatter.format(totales.total)}</dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="grid gap-1.5">
              <span className={etiqueta}>Por método de pago (neto)</span>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Efectivo</p>
                  <p className="text-lg font-semibold">{currencyFormatter.format(totales.totalPorMetodo.efectivo)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Transferencia</p>
                  <p className="text-lg font-semibold">{currencyFormatter.format(totales.totalPorMetodo.transferencia)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Cobros mixtos</p>
                  <p className="text-lg font-semibold">{currencyFormatter.format(totales.totalPorMetodo.mixto)}</p>
                  <p className="text-xs text-muted-foreground">Ya incluidos arriba</p>
                </div>
                <div className="rounded-md border border-primary p-3">
                  <p className="text-xs text-muted-foreground">Total del turno</p>
                  <p className="text-lg font-bold">{currencyFormatter.format(totales.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {totales.cantidadPagos} cobro{totales.cantidadPagos === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <span className={etiqueta}>Empleados</span>
              {totales.empleados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin cobros en este turno.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {totales.empleados.map((e) => (
                    <Badge key={e.usuarioId} variant="secondary">
                      {e.usuarioNombre}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {!cerrado && !puedeCerrar ? "No tenés permiso para cerrar turnos." : ""}
              </p>
              <Button
                onClick={() => setConfirmando(true)}
                disabled={!vigente || !!cerrado || cerrando || !puedeCerrar}
              >
                {cerrado ? "Turno ya cerrado" : "Cerrar turno"}
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={confirmando} onOpenChange={(open) => !open && !cerrando && setConfirmando(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`¿Cerrar el turno ${vigente ? nombreTurno(vigente.turno).toLowerCase() : ""} del ${vigente ? fechaCorta(vigente.fecha) : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`Se registrará un total de ${currencyFormatter.format(totales?.total ?? 0)}. Esta acción no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cerrando}>Cancelar</AlertDialogCancel>
            <Button onClick={ejecutarCierre} disabled={cerrando}>
              {cerrando && <Loader2 className="animate-spin" />}
              Confirmar cierre
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
