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
import { CierreTurnoPanel } from "@/components/cierre-turno-panel"
import { useToast } from "@/hooks/use-toast"
import type { CierreCajaCompleto } from "@/lib/types"
import { hoyTucuman } from "@/lib/utils"
import { getCierreCajaCompleto } from "@/services/caja"

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

const tipoLabel: Record<string, string> = {
  cuotas: "Cuotas",
  ventas: "Ventas",
  egresos: "Egresos",
  ingresosExtra: "Ingresos Extra",
}

export function CierreCajaTab() {
  const { toast } = useToast()
  const [fecha, setFecha] = useState(hoyTucuman())
  const [cierre, setCierre] = useState<CierreCajaCompleto | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCierre = useCallback(() => {
    getCierreCajaCompleto(fecha)
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

  const hayAnulados = cierre && (cierre.anulados.cuotas.cantidad > 0 || cierre.anulados.ventas.cantidad > 0)

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

      <CierreTurnoPanel fecha={fecha} />

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : !cierre ? null : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Efectivo Esperado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold">{currencyFormatter.format(cierre.efectivoEsperado)}</div>
                <p className="text-xs text-muted-foreground">
                  Inicio ({currencyFormatter.format(cierre.aperturaInicialEfectivo)}) + cuotas (
                  {currencyFormatter.format(cierre.porTipo.cuotas.efectivo)}) + ventas (
                  {currencyFormatter.format(cierre.porTipo.ventas.efectivo)}) + ingresos extra (
                  {currencyFormatter.format(cierre.porTipo.ingresosExtra.efectivo)}) − egresos (
                  {currencyFormatter.format(cierre.porTipo.egresos.efectivo)})
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Transferencias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold">{currencyFormatter.format(cierre.transferenciasTotal)}</div>
                <p className="text-xs text-muted-foreground">Cuotas + ventas + ingresos extra − egresos por transferencia</p>
              </CardContent>
            </Card>
          </div>

          {hayAnulados && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Anulados del Día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Cuotas</p>
                    <p className="text-lg font-semibold text-critical">
                      {currencyFormatter.format(cierre.anulados.cuotas.monto)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cierre.anulados.cuotas.cantidad} pago{cierre.anulados.cuotas.cantidad === 1 ? "" : "s"} (no suman al total)
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Ventas</p>
                    <p className="text-lg font-semibold text-critical">
                      {currencyFormatter.format(cierre.anulados.ventas.monto)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cierre.anulados.ventas.cantidad} venta{cierre.anulados.ventas.cantidad === 1 ? "" : "s"} (no suman al total)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(cierre.porTipo) as (keyof typeof cierre.porTipo)[]).map((tipo) => {
                  const d = cierre.porTipo[tipo]
                  return (
                    <div key={tipo} className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">{tipoLabel[tipo]}</p>
                      <p className="text-sm">Efectivo: {currencyFormatter.format(d.efectivo)}</p>
                      <p className="text-sm">Transferencia: {currencyFormatter.format(d.transferencia)}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.cantidad} movimiento{d.cantidad === 1 ? "" : "s"}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Por Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              {cierre.porEmpleado.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin movimientos por empleado.</p>
              ) : (
                <>
                  {/* Mobile: acordeón */}
                  <Accordion className="md:hidden">
                    {cierre.porEmpleado.map((emp) => (
                      <AccordionItem key={emp.usuarioId} value={emp.usuarioId}>
                        <AccordionTrigger>
                          <span className="flex w-full items-center justify-between pr-2">
                            <span>{emp.usuarioNombre}</span>
                            <span className="font-semibold">
                              {currencyFormatter.format(emp.cuotas.monto + emp.ventas.monto)}
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <ul className="flex flex-col gap-1">
                            <li className="flex justify-between text-muted-foreground">
                              <span>Cuotas ({emp.cuotas.cantidad})</span>
                              <span>{currencyFormatter.format(emp.cuotas.monto)}</span>
                            </li>
                            <li className="flex justify-between text-muted-foreground">
                              <span>Ventas ({emp.ventas.cantidad})</span>
                              <span>{currencyFormatter.format(emp.ventas.monto)}</span>
                            </li>
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
                          <TableHead>Cuotas</TableHead>
                          <TableHead>Ventas</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cierre.porEmpleado.map((emp) => (
                          <TableRow key={emp.usuarioId}>
                            <TableCell className="font-medium">{emp.usuarioNombre}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {currencyFormatter.format(emp.cuotas.monto)} ({emp.cuotas.cantidad})
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {currencyFormatter.format(emp.ventas.monto)} ({emp.ventas.cantidad})
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {currencyFormatter.format(emp.cuotas.monto + emp.ventas.monto)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
