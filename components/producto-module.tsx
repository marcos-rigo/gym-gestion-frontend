"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, PackagePlus, Pencil, Plus, Search } from "lucide-react"

import { AjustarStockDialog } from "@/components/ajustar-stock-dialog"
import { ProductoFormDialog } from "@/components/producto-form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
import type { Producto } from "@/lib/types"
import { getProductos, toggleActivoProducto } from "@/services/productos"

const PAGE_SIZE = 20

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

export function ProductoModule() {
  const { toast } = useToast()
  const { esAdmin, permisos } = useAuth()
  const puedeCrear = esAdmin || permisos.includes(PERMISOS.PRODUCTOS_CREAR)
  const puedeEditar = esAdmin || permisos.includes(PERMISOS.PRODUCTOS_EDITAR)

  const [productos, setProductos] = useState<Producto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [queryInput, setQueryInput] = useState("")
  const [query, setQuery] = useState("")
  const [activo, setActivo] = useState<string>("activos")
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const [ajustando, setAjustando] = useState<Producto | null>(null)

  // Sin el early return, al montar se resetea a la página 1 a los 300 ms y pisa un "Siguiente" hecho antes.
  useEffect(() => {
    const next = queryInput.trim()
    if (next === query) return
    const t = setTimeout(() => {
      setQuery(next)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [queryInput, query])

  const fetchProductos = useCallback(() => {
    getProductos({
      query: query || undefined,
      activo: activo === "todos" ? undefined : activo === "activos",
      page,
      pageSize: PAGE_SIZE,
    })
      .then(({ data, meta }) => {
        setProductos(data)
        setTotal(meta?.total ?? data.length)
      })
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar los productos",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
      .finally(() => setLoading(false))
  }, [query, activo, page, toast])

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

  async function handleToggleActivo(producto: Producto) {
    setTogglingId(producto.id)
    try {
      await toggleActivoProducto(producto.id)
      fetchProductos()
    } catch (err) {
      toast({
        title: "Error al actualizar el producto",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function stockBadge(p: Producto) {
    if (!p.controlaStock) return null
    const bajo = p.stockMinimo !== null && (p.stockActual ?? 0) <= p.stockMinimo
    return (
      <Badge
        className={
          bajo
            ? "border border-critical/20 bg-critical/15 text-red-600"
            : "border border-gray-200 bg-gray-100 text-gray-700"
        }
      >
        Stock: {p.stockActual ?? 0}
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display uppercase tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">Catálogo del punto de venta.</p>
        </div>
        {puedeCrear && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus />
            Nuevo Producto
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={activo}
          onValueChange={(v) => {
            setActivo(v ?? "activos")
            setPage(1)
          }}
        >
          <SelectTrigger aria-label="Estado" className="w-full sm:w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activos">Activos</SelectItem>
            <SelectItem value="inactivos">Inactivos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : productos.length === 0 ? (
        <Card>
          <CardContent className="flex h-24 items-center justify-center text-center text-muted-foreground">
            No se encontraron productos.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {productos.map((p) => (
              <Card key={p.id} className={p.activo ? undefined : "opacity-60"}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.nombre}</p>
                      {p.categoria && <p className="text-xs text-muted-foreground">{p.categoria}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{currencyFormatter.format(p.precio)}</span>
                  </div>
                  <div className="flex items-center gap-2">{stockBadge(p)}</div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {puedeEditar && (
                        <Switch
                          checked={p.activo}
                          disabled={togglingId === p.id}
                          onCheckedChange={() => handleToggleActivo(p)}
                          aria-label={p.activo ? "Desactivar producto" : "Activar producto"}
                        />
                      )}
                      <span className="text-xs text-muted-foreground">{p.activo ? "Activo" : "Inactivo"}</span>
                    </div>
                    {puedeEditar && (
                      <div className="flex gap-1">
                        {p.controlaStock && (
                          <Button variant="ghost" size="icon-sm" aria-label="Ajustar stock" onClick={() => setAjustando(p)}>
                            <PackagePlus />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon-sm" aria-label="Editar producto" onClick={() => setEditing(p)}>
                          <Pencil />
                        </Button>
                      </div>
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((p) => (
                    <TableRow key={p.id} className={p.activo ? undefined : "opacity-60"}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell>{p.categoria || "—"}</TableCell>
                      <TableCell>{currencyFormatter.format(p.precio)}</TableCell>
                      <TableCell>{stockBadge(p) ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {puedeEditar && (
                            <Switch
                              checked={p.activo}
                              disabled={togglingId === p.id}
                              onCheckedChange={() => handleToggleActivo(p)}
                              aria-label={p.activo ? "Desactivar producto" : "Activar producto"}
                            />
                          )}
                          <span className="text-sm text-muted-foreground">{p.activo ? "Activo" : "Inactivo"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {puedeEditar && p.controlaStock && (
                            <Button variant="ghost" size="icon-sm" aria-label="Ajustar stock" onClick={() => setAjustando(p)}>
                              <PackagePlus />
                            </Button>
                          )}
                          {puedeEditar && (
                            <Button variant="ghost" size="icon-sm" aria-label="Editar producto" onClick={() => setEditing(p)}>
                              <Pencil />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages} · {total} producto{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <ProductoFormDialog open={showCreate} onOpenChange={setShowCreate} onSuccess={fetchProductos} />
      <ProductoFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        onSuccess={fetchProductos}
        initialData={editing}
      />
      <AjustarStockDialog
        producto={ajustando}
        open={ajustando !== null}
        onOpenChange={(open) => !open && setAjustando(null)}
        onSuccess={fetchProductos}
      />
    </div>
  )
}
