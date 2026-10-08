"use client"

import { useEffect, useState } from "react"
import { Controller, useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { Role, Usuario } from "@/lib/types"
import {
  aplicarErrorBackend,
  letrasFilter,
  usuarioCreateSchema,
  usuarioEditSchema,
  withCharFilter,
} from "@/lib/validations"
import { getRoles } from "@/services/roles"
import { createUsuario, updateUsuario } from "@/services/usuarios"

interface UsuarioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: Usuario | null
}

// Forma unificada: en modo edición password/confirmPassword simplemente no se
// renderizan ni se validan (usuarioEditSchema no los exige), pero el tipo los
// declara opcionales para que el mismo formulario sirva en los dos modos.
interface FormValues {
  nombre: string
  email: string
  idRol: string
  password?: string
  confirmPassword?: string
}

function toDefaults(isEdit: boolean, usuario?: Usuario | null): FormValues {
  if (isEdit && usuario) {
    return { nombre: usuario.nombre, email: usuario.email, idRol: usuario.idRol }
  }
  return { nombre: "", email: "", idRol: "", password: "", confirmPassword: "" }
}

export function UsuarioFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: UsuarioFormDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  const [roles, setRoles] = useState<Role[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // isEdit queda fijo por instancia: usuario-module.tsx renderiza un dialog
  // separado para crear y otro para editar, nunca el mismo con initialData cambiante.
  const isEdit = Boolean(initialData)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? usuarioEditSchema : usuarioCreateSchema) as Resolver<FormValues>,
    defaultValues: toDefaults(isEdit, initialData),
  })

  // Al abrir el dialog, (re)cargar el formulario con initialData o vacío
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      reset(toDefaults(isEdit, initialData))
      setShowPassword(false)
      setShowConfirmPassword(false)
    }
  }

  // Los roles se cargan dinámicamente cada vez que se abre el dialog
  useEffect(() => {
    if (!open) return
    getRoles()
      .then(setRoles)
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar los roles",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
  }, [open, toast])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      if (initialData) {
        await updateUsuario(initialData.id, {
          nombre: values.nombre,
          email: values.email,
          idRol: values.idRol,
        })
        toast({ title: "Usuario actualizado", description: values.nombre })
      } else {
        await createUsuario({
          nombre: values.nombre,
          email: values.email,
          idRol: values.idRol,
          password: values.password as string,
        })
        toast({ title: "Usuario creado", description: values.nombre })
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      aplicarErrorBackend(
        err,
        setError,
        toast,
        isEdit ? "Error al actualizar el usuario" : "Error al crear el usuario"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modificá los datos del usuario y guardá los cambios."
              : "Completá los datos para dar de alta un nuevo usuario."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              {...withCharFilter(register("nombre"), letrasFilter)}
              aria-invalid={!!errors.nombre}
            />
            {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          {!isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pr-9"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
          )}
          {!isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="pr-9"
                  {...register("confirmPassword")}
                  aria-invalid={!!errors.confirmPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="rol">Rol *</Label>
            <Controller
              name="idRol"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="rol" className="w-full" aria-invalid={!!errors.idRol}>
                    <SelectValue placeholder="Seleccioná un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.idRol} value={r.idRol}>
                        {r.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.idRol && <p className="text-sm text-destructive">{errors.idRol.message}</p>}
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
              {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
