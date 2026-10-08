"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"

import { ClienteDetailDialog } from "@/components/cliente-detail-dialog"
import { ClienteFormDialog } from "@/components/cliente-form-dialog"
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
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PERMISOS } from "@/lib/permissions"
import type { Cliente } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { deleteCliente, getClientes } from "@/services/clientes"

const PAGE_SIZE = 10

export function ClienteModule() {
  const { toast } = useToast()
  const { esAdmin, permisos } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const puedeCrear = esAdmin || permisos.includes(PERMISOS.CLIENTES_CREAR)
  const puedeEditar = esAdmin || permisos.includes(PERMISOS.CLIENTES_EDITAR)
  const puedeEliminar = esAdmin || permisos.includes(PERMISOS.CLIENTES_ELIMINAR)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showCreateCliente, setShowCreateCliente] = useState(false)

  // loading arranca en true; los refrescos posteriores no vuelven a mostrar el spinner
  const fetchAll = useCallback(
    () =>
      getClientes()
        .then(setClientes)
        .catch((err: unknown) => {
          toast({
            title: "Error al cargar los clientes",
            description: err instanceof Error ? err.message : "Error desconocido",
            variant: "destructive",
          })
        })
        .finally(() => setLoading(false)),
    [toast]
  )

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Soporta el deep-link que genera "Próximos Vencimientos" del dashboard
  // (/dashboard/clientes?ver=<id>): abre el detalle y limpia el query param.
  useEffect(() => {
    const verId = searchParams.get("ver")
    if (!verId || clientes.length === 0) return
    const cliente = clientes.find((c) => c.idCliente === verId)
    // Sincroniza el diálogo con el query param que llega desde afuera (dashboard);
    // no es una cascada de estado derivado de este mismo componente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cliente) setViewingCliente(cliente)
    router.replace("/dashboard/clientes")
  }, [searchParams, clientes, router])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return clientes
    return clientes.filter(
      (c) => c.nombreCompleto.toLowerCase().includes(term) || c.dni.toLowerCase().includes(term)
    )
  }, [clientes, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(
    () => ({
      total: clientes.length,
      activos: clientes.filter((c) => c.estado === "activo").length,
      vencidos: clientes.filter((c) => c.estado === "vencido").length,
    }),
    [clientes]
  )

  async function handleDelete() {
    if (!deletingCliente) return
    setDeleteLoading(true)
    try {
      await deleteCliente(deletingCliente.idCliente)
      toast({ title: "Cliente eliminado", description: deletingCliente.nombreCompleto })
      setDeletingCliente(null)
      await fetchAll()
    } catch (err) {
      toast({
        title: "Error al eliminar el cliente",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const statCards = [
    { title: "Total Clientes", value: stats.total, icon: Users, color: "text-primary" },
    { title: "Activos", value: stats.activos, icon: UserCheck, color: "text-green-600" },
    { title: "Vencidos", value: stats.vencidos, icon: UserX, color: "text-red-600" },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gestioná los socios del gimnasio.</p>
        </div>
        {puedeCrear && (
          <Button onClick={() => setShowCreateCliente(true)}>
            <Plus />
            Nuevo Cliente
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={`size-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "—" : value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o DNI..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          className="pl-8"
        />
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vencimiento</TableHead>
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
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {searchTerm ? "No se encontraron clientes." : "Todavía no hay clientes cargados."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((cliente) => (
                  <TableRow key={cliente.idCliente}>
                    <TableCell className="font-medium">{cliente.nombreCompleto}</TableCell>
                    <TableCell>{cliente.dni}</TableCell>
                    <TableCell>{cliente.telefono || "—"}</TableCell>
                    <TableCell>{cliente.email || "—"}</TableCell>
                    <TableCell>{formatDate(cliente.fechaVencimiento)}</TableCell>
                    <TableCell>
                      {cliente.estadoCuota === "al_dia" && (
                        <Badge className="border border-success/20 bg-success/15 text-green-700">
                          Al día
                        </Badge>
                      )}
                      {cliente.estadoCuota === "por_vencer" && (
                        <Badge className="border border-warning/20 bg-warning/20 text-amber-700">
                          Por vencer
                        </Badge>
                      )}
                      {cliente.estadoCuota === "moroso" && (
                        <Badge className="border border-critical/20 bg-critical/15 text-red-600">
                          Moroso
                        </Badge>
                      )}
                      {cliente.estadoCuota === null && (
                        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400">
                          {cliente.estado.charAt(0).toUpperCase() + cliente.estado.slice(1)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Ver cliente"
                          onClick={() => setViewingCliente(cliente)}
                        >
                          <Eye />
                        </Button>
                        {puedeEditar && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Editar cliente"
                            onClick={() => setEditingCliente(cliente)}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {puedeEliminar && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Eliminar cliente"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingCliente(cliente)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages} · {filtered.length} cliente
                {filtered.length === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setCurrentPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setCurrentPage(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ClienteFormDialog
        open={showCreateCliente}
        onOpenChange={setShowCreateCliente}
        onSuccess={fetchAll}
      />

      <ClienteFormDialog
        open={editingCliente !== null}
        onOpenChange={(open) => !open && setEditingCliente(null)}
        onSuccess={fetchAll}
        initialData={editingCliente}
      />

      <ClienteDetailDialog
        cliente={viewingCliente}
        open={viewingCliente !== null}
        onOpenChange={(open) => !open && setViewingCliente(null)}
        onClienteActualizado={fetchAll}
      />

      <AlertDialog
        open={deletingCliente !== null}
        onOpenChange={(open) => !open && !deleteLoading && setDeletingCliente(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deletingCliente?.nombreCompleto}</strong> de forma
              permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="animate-spin" />}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
