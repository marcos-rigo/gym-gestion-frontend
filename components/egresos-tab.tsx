"use client"

import { useCallback, useEffect, useState } from "react"
import { Ban, Loader2, Plus } from "lucide-react"

import { AnularMovimientoCajaDialog } from "@/components/anular-movimiento-caja-dialog"
import { MovimientoCajaFormDialog } from "@/components/movimiento-caja-form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PERMISOS } from "@/lib/permissions"
import type { MovimientoCaja } from "@/lib/types"
import { hoyTucuman } from "@/lib/utils"
import { getMovimientosCaja } from "@/services/caja"

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

const metodoLabel: Record<string, string> = { efectivo: "Efectivo", transferencia: "Transferencia" }
const tipoLabel: Record<string, string> = { egreso: "Egreso", ingreso_extra: "Ingreso Extra" }

export function EgresosTab() {
  const { toast } = useToast()
  const { esAdmin, permisos } = useAuth()
  const puedeRegistrar = esAdmin || permisos.includes(PERMISOS.CAJA_MOVIMIENTOS)

  const [fecha, setFecha] = useState(hoyTucuman())
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState<"egreso" | "ingreso_extra" | null>(null)
  const [anulando, setAnulando] = useState<MovimientoCaja | null>(null)

  const fetchMovimientos = useCallback(() => {
    getMovimientosCaja({ fecha })
      .then(setMovimientos)
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar los movimientos",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
      .finally(() => setLoading(false))
  }, [fecha, toast])

  useEffect(() => {
    fetchMovimientos()
  }, [fetchMovimientos])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="fecha-egresos">Fecha</Label>
          <Input
            id="fecha-egresos"
            type="date"
            value={fecha}
            max={hoyTucuman()}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
        {puedeRegistrar && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCreate("ingreso_extra")}>
              <Plus />
              Ingreso Extra
            </Button>
            <Button onClick={() => setShowCreate("egreso")}>
              <Plus />
              Egreso
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : movimientos.length === 0 ? (
        <Card>
          <CardContent className="flex h-24 items-center justify-center text-center text-muted-foreground">
            No hay movimientos este día.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {movimientos.map((m) => (
              <Card key={m.id} className={m.anulado ? "opacity-60" : undefined}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.concepto}</p>
                      <p className="text-xs text-muted-foreground">
                        {tipoLabel[m.tipo]} · {metodoLabel[m.metodo]}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{currencyFormatter.format(m.monto)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {m.anulado ? (
                      <Badge className="border border-critical/20 bg-critical/15 text-red-600">Anulado</Badge>
                    ) : (
                      puedeRegistrar && (
                        <Button variant="ghost" size="icon-sm" aria-label="Anular movimiento" onClick={() => setAnulando(m)}>
                          <Ban className="text-destructive" />
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: tabla */}
          <Card className="hidden md:block">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Medio</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map((m) => (
                    <TableRow key={m.id} className={m.anulado ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">{m.concepto}</TableCell>
                      <TableCell>{tipoLabel[m.tipo]}</TableCell>
                      <TableCell>{metodoLabel[m.metodo]}</TableCell>
                      <TableCell>{currencyFormatter.format(m.monto)}</TableCell>
                      <TableCell>
                        {m.anulado ? (
                          <Badge className="border border-critical/20 bg-critical/15 text-red-600">Anulado</Badge>
                        ) : (
                          <Badge className="border border-success/20 bg-success/15 text-green-700">Vigente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!m.anulado && puedeRegistrar && (
                          <Button variant="ghost" size="icon-sm" aria-label="Anular movimiento" onClick={() => setAnulando(m)}>
                            <Ban className="text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <MovimientoCajaFormDialog
        open={showCreate !== null}
        onOpenChange={(open) => !open && setShowCreate(null)}
        onSuccess={fetchMovimientos}
        tipo={showCreate ?? "egreso"}
      />
      <AnularMovimientoCajaDialog
        movimiento={anulando}
        open={anulando !== null}
        onOpenChange={(open) => !open && setAnulando(null)}
        onSuccess={fetchMovimientos}
      />
    </div>
  )
}
