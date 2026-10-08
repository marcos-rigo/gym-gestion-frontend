"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useToast } from "@/hooks/use-toast"
import type { CierreCaja } from "@/lib/types"
import { hoyTucuman } from "@/lib/utils"
import { getCierreCaja } from "@/services/pagos"

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

const metodoLabel: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
}

export function CierreCajaTab() {
  const { toast } = useToast()
  const [fecha, setFecha] = useState(hoyTucuman())
  const [cierre, setCierre] = useState<CierreCaja | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCierre = useCallback(() => {
    getCierreCaja(fecha)
      .then(setCierre)
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar el cierre de caja",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
      .finally(() => setLoading(false))
  }, [fecha, toast])

  useEffect(() => {
    fetchCierre()
  }, [fetchCierre])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid max-w-xs gap-2">
        <Label htmlFor="fecha-cierre">Fecha</Label>
        <Input
          id="fecha-cierre"
          type="date"
          value={fecha}
          max={hoyTucuman()}
          onChange={(e) => setFecha(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : !cierre ? null : cierre.general.cantidad === 0 && cierre.anulados.cantidad === 0 ? (
        <Card>
          <CardContent className="flex h-24 items-center justify-center text-center text-muted-foreground">
            No hubo movimientos este día.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Total del Día
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold">{currencyFormatter.format(cierre.general.monto)}</div>
                <p className="text-xs text-muted-foreground">
                  {cierre.general.cantidad} pago{cierre.general.cantidad === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
            {cierre.anulados.cantidad > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Anulados del Día
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-2xl font-bold text-critical">
                    {currencyFormatter.format(cierre.anulados.monto)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cierre.anulados.cantidad} pago{cierre.anulados.cantidad === 1 ? "" : "s"} (no suman al total)
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Por Método de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {cierre.porMetodo.map((m) => (
                  <div key={m.metodo} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{metodoLabel[m.metodo] ?? m.metodo}</p>
                    <p className="text-lg font-semibold">{currencyFormatter.format(m.monto)}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.cantidad} pago{m.cantidad === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Por Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile: acordeón */}
              <Accordion className="md:hidden">
                {cierre.porEmpleado.map((emp) => (
                  <AccordionItem key={emp.usuarioId ?? "sin-empleado"} value={emp.usuarioId ?? "sin-empleado"}>
                    <AccordionTrigger>
                      <span className="flex w-full items-center justify-between pr-2">
                        <span>{emp.usuarioNombre}</span>
                        <span className="font-semibold">{currencyFormatter.format(emp.monto)}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="flex flex-col gap-1">
                        {emp.porMetodo.map((m) => (
                          <li key={m.metodo} className="flex justify-between text-muted-foreground">
                            <span>{metodoLabel[m.metodo] ?? m.metodo}</span>
                            <span>{currencyFormatter.format(m.monto)}</span>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Desktop: tabla */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Desglose por método</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cierre.porEmpleado.map((emp) => (
                      <TableRow key={emp.usuarioId ?? "sin-empleado"}>
                        <TableCell className="font-medium">{emp.usuarioNombre}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {emp.porMetodo
                            .map((m) => `${metodoLabel[m.metodo] ?? m.metodo}: ${currencyFormatter.format(m.monto)}`)
                            .join(" · ")}
                        </TableCell>
                        <TableCell>{emp.cantidad}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {currencyFormatter.format(emp.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
