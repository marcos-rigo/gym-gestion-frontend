"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

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
import type { VentaReporte } from "@/lib/types"
import { formatDate, hoyTucuman } from "@/lib/utils"
import { getReporteVentas } from "@/services/ventas"

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

function hace7Dias() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

export function ReporteVentasTab() {
  const { toast } = useToast()
  const [desde, setDesde] = useState(hace7Dias())
  const [hasta, setHasta] = useState(hoyTucuman())
  const [reporte, setReporte] = useState<VentaReporte | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReporte = useCallback(() => {
    getReporteVentas({ desde, hasta })
      .then(setReporte)
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar el reporte",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
      .finally(() => setLoading(false))
  }, [desde, hasta, toast])

  useEffect(() => {
    fetchReporte()
  }, [fetchReporte])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="grid gap-2">
          <Label htmlFor="reporte-desde">Desde</Label>
          <Input id="reporte-desde" type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reporte-hasta">Hasta</Label>
          <Input
            id="reporte-hasta"
            type="date"
            value={hasta}
            max={hoyTucuman()}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Productos más vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {!reporte || reporte.porProducto.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin ventas en el período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Unidades</TableHead>
                      <TableHead className="text-right">Ingreso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reporte.porProducto.map((p) => (
                      <TableRow key={p.idProducto}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell>{p.unidades}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(p.ingreso)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Ventas por día</CardTitle>
            </CardHeader>
            <CardContent>
              {!reporte || reporte.porDia.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin ventas en el período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reporte.porDia.map((d) => (
                      <TableRow key={d.fecha}>
                        <TableCell>{formatDate(d.fecha)}</TableCell>
                        <TableCell>{d.cantidad}</TableCell>
                        <TableCell className="text-right">{currencyFormatter.format(d.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
