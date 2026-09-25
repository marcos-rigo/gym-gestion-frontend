"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"

import { RoleFormDialog } from "@/components/role-form-dialog"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import type { Role } from "@/lib/types"
import { cn } from "@/lib/utils"
import { deleteRol, getRoles } from "@/services/roles"

export function RolesModule() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showCreateRole, setShowCreateRole] = useState(false)

  // loading arranca en true; los refrescos posteriores no vuelven a mostrar el spinner
  const fetchAll = useCallback(
    () =>
      getRoles()
        .then(setRoles)
        .catch((err: unknown) => {
          toast({
            title: "Error al cargar los roles",
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
    if (!term) return roles
    return roles.filter((r) => r.descripcion.toLowerCase().includes(term))
  }, [roles, searchTerm])

  async function handleDelete() {
    if (!deletingRole) return
    setDeleteLoading(true)
    try {
      await deleteRol(deletingRole.idRol)
      toast({ title: "Rol eliminado", description: deletingRole.descripcion })
      setDeletingRole(null)
      await fetchAll()
    } catch (err) {
      const status = (err as { status?: number }).status
      toast({
        title: status === 409 ? "No se puede eliminar el rol" : "Error al eliminar el rol",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
      if (status === 409) setDeletingRole(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">Definí los roles y sus permisos de acceso.</p>
        </div>
        <Button onClick={() => setShowCreateRole(true)}>
          <Plus />
          Nuevo Rol
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre de rol..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Rol</TableHead>
                <TableHead>Cantidad de Permisos</TableHead>
                <TableHead>Usuarios Asignados</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {searchTerm ? "No se encontraron roles." : "Todavía no hay roles cargados."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((role) => (
                  <TableRow key={role.idRol}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {role.descripcion}
                        {role.esAdmin && (
                          <Badge className="border border-gray-200 bg-gray-100 text-gray-700">
                            Protegido
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="border border-gray-200 bg-gray-100 text-gray-700">
                        {role.permissions.length}
                      </Badge>
                    </TableCell>
                    <TableCell>{role.userCount}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar rol"
                          onClick={() => setEditingRole(role)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Eliminar rol"
                          className={cn(
                            "text-destructive hover:text-destructive",
                            role.esAdmin && "opacity-50"
                          )}
                          disabled={role.esAdmin}
                          title={role.esAdmin ? "El rol Admin no se puede eliminar" : undefined}
                          onClick={() => setDeletingRole(role)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleFormDialog
        open={showCreateRole}
        onOpenChange={setShowCreateRole}
        onSuccess={fetchAll}
      />

      <RoleFormDialog
        open={editingRole !== null}
        onOpenChange={(open) => !open && setEditingRole(null)}
        onSuccess={fetchAll}
        initialData={editingRole}
      />

      <AlertDialog
        open={deletingRole !== null}
        onOpenChange={(open) => !open && !deleteLoading && setDeletingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el rol <strong>{deletingRole?.descripcion}</strong> de forma
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
