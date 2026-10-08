"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Lock, Pencil, Plus, Search, Trash2 } from "lucide-react"

import { UsuarioFormDialog } from "@/components/usuario-form-dialog"
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
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import type { Usuario } from "@/lib/types"
import { deleteUsuario, getUsuarios, toggleActivoUsuario } from "@/services/usuarios"

const PAGE_SIZE = 10

const adminBadgeClass = "border border-lime/30 bg-lime/15 text-lime-dark"
const rolBadgeClass = "border border-gray-200 bg-gray-100 text-gray-700"

export function UsuarioModule() {
  const { toast } = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [showCreateUsuario, setShowCreateUsuario] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingUsuario, setDeletingUsuario] = useState<Usuario | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // loading arranca en true; los refrescos posteriores no vuelven a mostrar el spinner
  const fetchAll = useCallback(
    () =>
      getUsuarios()
        .then(setUsuarios)
        .catch((err: unknown) => {
          toast({
            title: "Error al cargar los usuarios",
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

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return usuarios
    return usuarios.filter(
      (u) => u.nombre.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    )
  }, [usuarios, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleToggleActivo(usuario: Usuario) {
    if (usuario.protegido) return
    setTogglingId(usuario.id)
    try {
      await toggleActivoUsuario(usuario.id)
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, activo: !u.activo } : u))
      )
    } catch (err) {
      toast({
        title: "Error al actualizar el usuario",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deletingUsuario) return
    setDeleteLoading(true)
    try {
      await deleteUsuario(deletingUsuario.id)
      toast({ title: "Usuario eliminado", description: deletingUsuario.nombre })
      setDeletingUsuario(null)
      await fetchAll()
    } catch (err) {
      toast({
        title: "No se pudo eliminar el usuario",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
      setDeletingUsuario(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Gestioná el personal con acceso al sistema.</p>
        </div>
        <Button onClick={() => setShowCreateUsuario(true)}>
          <Plus />
          Nuevo Usuario
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
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
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {searchTerm ? "No se encontraron usuarios." : "Todavía no hay usuarios cargados."}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {usuario.nombre}
                        {usuario.protegido && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-gray-200 bg-gray-100 text-gray-600"
                          >
                            <Lock className="size-3" />
                            Protegido
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <Badge className={usuario.esAdmin ? adminBadgeClass : rolBadgeClass}>
                        {usuario.rolDescripcion}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!usuario.protegido && (
                          <Switch
                            checked={usuario.activo}
                            disabled={togglingId === usuario.id}
                            onCheckedChange={() => handleToggleActivo(usuario)}
                            aria-label={usuario.activo ? "Desactivar usuario" : "Activar usuario"}
                          />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {!usuario.protegido && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Editar usuario"
                              onClick={() => setEditingUsuario(usuario)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Eliminar usuario"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingUsuario(usuario)}
                            >
                              <Trash2 />
                            </Button>
                          </>
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
                Página {page} de {totalPages} · {filtered.length} usuario
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

      <UsuarioFormDialog
        open={showCreateUsuario}
        onOpenChange={setShowCreateUsuario}
        onSuccess={fetchAll}
      />

      <UsuarioFormDialog
        open={editingUsuario !== null}
        onOpenChange={(open) => !open && setEditingUsuario(null)}
        onSuccess={fetchAll}
        initialData={editingUsuario}
      />

      <AlertDialog
        open={deletingUsuario !== null}
        onOpenChange={(open) => !open && !deleteLoading && setDeletingUsuario(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deletingUsuario?.nombre}</strong> de forma permanente.
              Esta acción no se puede deshacer.
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
