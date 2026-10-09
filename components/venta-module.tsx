"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Ban, Loader2, Minus, Plus, Search, ShoppingCart, X } from "lucide-react"

import { AnularVentaDialog } from "@/components/anular-venta-dialog"
import { ReporteVentasTab } from "@/components/reporte-ventas-tab"
import { type MetodoPago, SelectorMedioPago } from "@/components/selector-medio-pago"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { TabsNav } from "@/components/tabs-nav"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PERMISOS } from "@/lib/permissions"
import type { Cliente, Producto, Venta } from "@/lib/types"
import { hoyTucuman } from "@/lib/utils"
import { getClientes } from "@/services/clientes"
import { getProductos } from "@/services/productos"
import { crearVenta, getVentas } from "@/services/ventas"

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

interface CartLine {
  producto: Producto
  cantidad: number
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function VentaModule() {
  const { toast } = useToast()
  const { esAdmin, permisos } = useAuth()
  const puedeAnular = esAdmin || permisos.includes(PERMISOS.VENTAS_ANULAR)

  const [productos, setProductos] = useState<Producto[]>([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map())
  const [tab, setTab] = useState<string>("vender")

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busquedaCliente, setBusquedaCliente] = useState("")
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)

  const [metodo, setMetodo] = useState<MetodoPago | undefined>(undefined)
  const [montoEfectivo, setMontoEfectivo] = useState<number | undefined>(undefined)
  const [montoTransferencia, setMontoTransferencia] = useState<number | undefined>(undefined)
  const [errorMetodo, setErrorMetodo] = useState<string | undefined>(undefined)
  const [errorMontoDividido, setErrorMontoDividido] = useState<string | undefined>(undefined)

  const [cobrando, setCobrando] = useState(false)

  const [historial, setHistorial] = useState<Venta[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const [anulando, setAnulando] = useState<Venta | null>(null)

  const fetchProductos = useCallback(() => {
    getProductos({ activo: true, pageSize: 100 })
      .then(({ data }) => setProductos(data))
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar los productos",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
      .finally(() => setLoadingProductos(false))
  }, [toast])

  const fetchHistorial = useCallback(() => {
    const hoy = hoyTucuman()
    getVentas({ desde: hoy, hasta: hoy, pageSize: 100 })
      .then(({ data }) => setHistorial(data))
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar el historial del día",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
      .finally(() => setLoadingHistorial(false))
  }, [toast])

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  useEffect(() => {
    fetchHistorial()
  }, [fetchHistorial])

  useEffect(() => {
    getClientes()
      .then(setClientes)
      .catch(() => setClientes([]))
  }, [])

  const resultadosCliente = useMemo(() => {
    const term = busquedaCliente.trim().toLowerCase()
    if (!term) return []
    return clientes
      .filter((c) => c.nombreCompleto.toLowerCase().includes(term) || c.dni.toLowerCase().includes(term))
      .slice(0, 6)
  }, [clientes, busquedaCliente])

  const lines = useMemo(() => Array.from(cart.values()), [cart])
  const total = useMemo(
    () => round2(lines.reduce((acc, l) => acc + l.producto.precio * l.cantidad, 0)),
    [lines]
  )

  function addToCart(producto: Producto) {
    setCart((prev) => {
      const next = new Map(prev)
      const existing = next.get(producto.id)
      next.set(producto.id, { producto, cantidad: (existing?.cantidad ?? 0) + 1 })
      return next
    })
  }

  function changeCantidad(productoId: string, delta: number) {
    setCart((prev) => {
      const next = new Map(prev)
      const existing = next.get(productoId)
      if (!existing) return prev
      const cantidad = existing.cantidad + delta
      if (cantidad <= 0) next.delete(productoId)
      else next.set(productoId, { ...existing, cantidad })
      return next
    })
  }

  function limpiarCarrito() {
    setCart(new Map())
    setClienteSeleccionado(null)
    setBusquedaCliente("")
    setMetodo(undefined)
    setMontoEfectivo(undefined)
    setMontoTransferencia(undefined)
    setErrorMetodo(undefined)
    setErrorMontoDividido(undefined)
  }

  async function handleCobrar() {
    if (lines.length === 0 || total <= 0) return
    if (!metodo) {
      setErrorMetodo("Seleccioná un método de pago")
      return
    }
    let pagos: { metodo: "efectivo" | "transferencia"; monto: number }[]
    if (metodo === "dividido") {
      const efectivo = montoEfectivo ?? 0
      const transferencia = montoTransferencia ?? 0
      if (efectivo <= 0 && transferencia <= 0) {
        setErrorMontoDividido("Ingresá al menos un monto")
        return
      }
      if (Math.abs(round2(efectivo + transferencia) - total) > 0.01) {
        setErrorMontoDividido("La suma de ambos montos debe ser igual al total")
        return
      }
      pagos = [
        ...(efectivo > 0 ? [{ metodo: "efectivo" as const, monto: efectivo }] : []),
        ...(transferencia > 0 ? [{ metodo: "transferencia" as const, monto: transferencia }] : []),
      ]
    } else {
      pagos = [{ metodo, monto: total }]
    }
    setErrorMetodo(undefined)
    setErrorMontoDividido(undefined)
    setCobrando(true)
    try {
      await crearVenta({
        items: lines.map((l) => ({ idProducto: l.producto.id, cantidad: l.cantidad })),
        pagos,
        ...(clienteSeleccionado ? { idCliente: clienteSeleccionado.idCliente } : {}),
      })
      toast({ title: "Venta registrada", description: currencyFormatter.format(total) })
      limpiarCarrito()
      fetchHistorial()
      fetchProductos()
    } catch (err) {
      toast({
        title: "Error al registrar la venta",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setCobrando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold font-display uppercase tracking-tight">Punto de Venta</h1>
        <p className="text-sm text-muted-foreground">Vendé productos del gimnasio.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsNav
          opciones={[
            { value: "vender", label: "Vender" },
            { value: "reportes", label: "Reportes" },
          ]}
          value={tab}
          onValueChange={setTab}
        />

        <TabsContent value="vender" className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-3">
          {loadingProductos ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : productos.length === 0 ? (
            <Card>
              <CardContent className="flex h-24 items-center justify-center text-center text-muted-foreground">
                No hay productos activos para vender.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {productos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={p.controlaStock && (p.stockActual ?? 0) <= 0}
                  className="flex flex-col items-center gap-1 rounded-lg border-2 border-border bg-card p-4 text-center transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="text-sm font-semibold">{p.nombre}</span>
                  <span className="text-lg font-bold text-primary">{currencyFormatter.format(p.precio)}</span>
                  {p.controlaStock && (
                    <span className="text-xs text-muted-foreground">Stock: {p.stockActual ?? 0}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingCart className="size-4" />
              Carrito
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">El carrito está vacío.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {lines.map((l) => (
                  <li key={l.producto.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.producto.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {currencyFormatter.format(l.producto.precio)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Quitar una unidad de ${l.producto.nombre}`}
                        onClick={() => changeCantidad(l.producto.id, -1)}
                      >
                        <Minus />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{l.cantidad}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Agregar una unidad de ${l.producto.nombre}`}
                        onClick={() => changeCantidad(l.producto.id, 1)}
                      >
                        <Plus />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-2xl font-bold">{currencyFormatter.format(total)}</span>
            </div>

            <div className="grid gap-2">
              {clienteSeleccionado ? (
                <div className="flex items-center justify-between rounded-md border p-2">
                  <span className="truncate text-sm">{clienteSeleccionado.nombreCompleto}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Quitar cliente"
                    onClick={() => setClienteSeleccionado(null)}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cliente (opcional)..."
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    className="pl-8"
                  />
                  {resultadosCliente.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {resultadosCliente.map((c) => (
                        <button
                          key={c.idCliente}
                          type="button"
                          onClick={() => {
                            setClienteSeleccionado(c)
                            setBusquedaCliente("")
                          }}
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted/50"
                        >
                          {c.nombreCompleto}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <SelectorMedioPago
              total={total}
              metodo={metodo}
              montoEfectivo={montoEfectivo}
              montoTransferencia={montoTransferencia}
              onMetodoChange={(m) => {
                setMetodo(m)
                setErrorMetodo(undefined)
              }}
              onMontoEfectivoChange={setMontoEfectivo}
              onMontoTransferenciaChange={setMontoTransferencia}
              errorMetodo={errorMetodo}
              errorMontoTransferencia={errorMontoDividido}
              disabled={cobrando}
            />

            <Button
              size="lg"
              className="w-full"
              disabled={cobrando || lines.length === 0}
              onClick={handleCobrar}
            >
              {cobrando && <Loader2 className="animate-spin" />}
              {cobrando ? "Cobrando..." : "Cobrar"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Ventas de hoy</h2>
        {loadingHistorial ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : historial.length === 0 ? (
          <Card>
            <CardContent className="flex h-16 items-center justify-center text-center text-muted-foreground">
              No hay ventas registradas hoy.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="flex flex-col gap-2 md:hidden">
              {historial.map((v) => (
                <Card key={v.id} className={v.anulada ? "opacity-60" : undefined}>
                  <CardContent className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{currencyFormatter.format(v.total)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {v.items.map((i) => `${i.cantidad}x ${i.nombreSnapshot}`).join(", ")}
                      </p>
                    </div>
                    {v.anulada ? (
                      <Badge className="border border-critical/20 bg-critical/15 text-red-600">Anulada</Badge>
                    ) : (
                      puedeAnular && (
                        <Button variant="ghost" size="icon-sm" aria-label="Anular venta" onClick={() => setAnulando(v)}>
                          <Ban className="text-destructive" />
                        </Button>
                      )
                    )}
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
                      <TableHead>Hora</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historial.map((v) => (
                      <TableRow key={v.id} className={v.anulada ? "opacity-60" : undefined}>
                        <TableCell>{new Date(v.fechaHora).toLocaleTimeString("es-AR")}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {v.items.map((i) => `${i.cantidad}x ${i.nombreSnapshot}`).join(", ")}
                        </TableCell>
                        <TableCell>{currencyFormatter.format(v.total)}</TableCell>
                        <TableCell>
                          {v.anulada ? (
                            <Badge className="border border-critical/20 bg-critical/15 text-red-600">Anulada</Badge>
                          ) : (
                            <Badge className="border border-success/20 bg-success/15 text-green-700">Vigente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!v.anulada && puedeAnular && (
                            <Button variant="ghost" size="icon-sm" aria-label="Anular venta" onClick={() => setAnulando(v)}>
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
      </div>

      <AnularVentaDialog
        venta={anulando}
        open={anulando !== null}
        onOpenChange={(open) => !open && setAnulando(null)}
        onSuccess={fetchHistorial}
      />
        </TabsContent>

        <TabsContent value="reportes">
          <ReporteVentasTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
