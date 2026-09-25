"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { Role } from "@/lib/types"
import { createRol, updateRol } from "@/services/roles"

const PERMISOS_GYM = [
  { id: "clientes_ver", label: "Ver Clientes", category: "Clientes" },
  { id: "clientes_crear", label: "Crear Clientes", category: "Clientes" },
  { id: "clientes_editar", label: "Editar Clientes", category: "Clientes" },
  { id: "clientes_eliminar", label: "Eliminar Clientes", category: "Clientes" },
  { id: "facturacion_ver", label: "Ver Facturación", category: "Facturación" },
  { id: "facturacion_cobrar", label: "Registrar Cobros", category: "Facturación" },
  { id: "usuarios_ver", label: "Ver Usuarios", category: "Usuarios" },
  { id: "usuarios_crear", label: "Crear Usuarios", category: "Usuarios" },
  { id: "usuarios_editar", label: "Editar Usuarios", category: "Usuarios" },
  { id: "usuarios_activar", label: "Activar/Desactivar Usuarios", category: "Usuarios" },
  { id: "roles_ver", label: "Ver Roles", category: "Roles" },
  { id: "roles_crear", label: "Crear Roles", category: "Roles" },
  { id: "roles_editar", label: "Editar Roles", category: "Roles" },
  { id: "roles_eliminar", label: "Eliminar Roles", category: "Roles" },
  { id: "estadisticas_ver", label: "Ver Estadísticas", category: "Estadísticas" },
]

const CATEGORIAS = Array.from(new Set(PERMISOS_GYM.map((p) => p.category)))

const roleSchema = z.object({
  descripcion: z.string().trim().min(3, "La descripción debe tener al menos 3 caracteres"),
  permissions: z.array(z.string()).min(1, "Seleccioná al menos un permiso"),
})

type RoleFormValues = z.infer<typeof roleSchema>

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: Role | null
}

function toDefaults(role?: Role | null): RoleFormValues {
  return {
    descripcion: role?.descripcion ?? "",
    permissions: role?.permissions ?? [],
  }
}

export function RoleFormDialog({ open, onOpenChange, onSuccess, initialData }: RoleFormDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const isEdit = Boolean(initialData)
  const isAdmin = initialData?.esAdmin === true

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: toDefaults(initialData),
  })

  const selected = watch("permissions")

  // Al abrir el dialog, (re)cargar el formulario con initialData o vacío
  useEffect(() => {
    if (open) reset(toDefaults(initialData))
  }, [open, initialData, reset])

  function togglePermiso(id: string, checked: boolean) {
    const next = checked ? [...selected, id] : selected.filter((p) => p !== id)
    setValue("permissions", next, { shouldValidate: true })
  }

  function toggleCategoria(category: string) {
    const ids = PERMISOS_GYM.filter((p) => p.category === category).map((p) => p.id)
    const allSelected = ids.every((id) => selected.includes(id))
    const next = allSelected
      ? selected.filter((id) => !ids.includes(id))
      : Array.from(new Set([...selected, ...ids]))
    setValue("permissions", next, { shouldValidate: true })
  }

  async function onSubmit(values: RoleFormValues) {
    setLoading(true)
    try {
      if (initialData) {
        await updateRol(initialData.idRol, values)
        toast({ title: "Rol actualizado", description: values.descripcion })
      } else {
        await createRol(values)
        toast({ title: "Rol creado", description: values.descripcion })
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({
        title: isEdit ? "Error al actualizar el rol" : "Error al crear el rol",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Rol" : "Nuevo Rol"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modificá el nombre y los permisos del rol."
              : "Definí el nombre del rol y los permisos que tendrá."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="descripcion">Nombre del rol *</Label>
            <Input id="descripcion" {...register("descripcion")} aria-invalid={!!errors.descripcion} />
            {errors.descripcion && (
              <p className="text-sm text-destructive">{errors.descripcion.message}</p>
            )}
          </div>

          <div className="grid gap-4">
            <Label>Permisos *</Label>
            {isAdmin && (
              <p className="text-sm text-muted-foreground">
                Este rol tiene acceso completo automático a todas las funciones del sistema,
                incluidas las que se agreguen en el futuro. No se puede modificar.
              </p>
            )}
            {CATEGORIAS.map((category) => {
              const permisos = PERMISOS_GYM.filter((p) => p.category === category)
              const allSelected = permisos.every((p) => selected.includes(p.id))
              return (
                <div key={category} className="grid gap-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{category}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={isAdmin}
                      onClick={() => toggleCategoria(category)}
                    >
                      {allSelected ? "Quitar todos" : "Seleccionar todos"}
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {permisos.map((permiso) => (
                      <div key={permiso.id} className="flex items-center gap-2">
                        <Checkbox
                          id={permiso.id}
                          checked={selected.includes(permiso.id)}
                          disabled={isAdmin}
                          onCheckedChange={(checked) => togglePermiso(permiso.id, checked === true)}
                        />
                        <Label htmlFor={permiso.id} className="font-normal">
                          {permiso.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {errors.permissions && (
              <p className="text-sm text-destructive">{errors.permissions.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear rol"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
