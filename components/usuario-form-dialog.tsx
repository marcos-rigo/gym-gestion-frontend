"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

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
import { getRoles } from "@/services/roles"
import { createUsuario, updateUsuario } from "@/services/usuarios"

interface UsuarioFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: Usuario | null
}

type FormState = {
  nombre: string
  email: string
  password: string
  confirmPassword: string
  rol: string
}

const emptyForm: FormState = {
  nombre: "",
  email: "",
  password: "",
  confirmPassword: "",
  rol: "",
}

function toFormState(usuario?: Usuario | null): FormState {
  if (!usuario) return emptyForm
  return {
    nombre: usuario.nombre,
    email: usuario.email,
    password: "",
    confirmPassword: "",
    rol: usuario.rol,
  }
}

export function UsuarioFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: UsuarioFormDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<FormState>(() => toFormState(initialData))
  const [loading, setLoading] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  const [roles, setRoles] = useState<Role[]>([])
  const isEdit = Boolean(initialData)

  // Al abrir el dialog, (re)cargar el formulario con initialData o vacío
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setForm(toFormState(initialData))
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

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.email.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Nombre y email son obligatorios.",
        variant: "destructive",
      })
      return
    }
    if (!isEdit && !form.password.trim()) {
      toast({
        title: "Campos requeridos",
        description: "La contraseña es obligatoria para un usuario nuevo.",
        variant: "destructive",
      })
      return
    }
    if (!isEdit && form.password !== form.confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Verificá que la contraseña y su confirmación sean iguales.",
        variant: "destructive",
      })
      return
    }
    if (!form.rol) {
      toast({
        title: "Campos requeridos",
        description: "Seleccioná un rol.",
        variant: "destructive",
      })
      return
    }

    const payload: Record<string, string> = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      rol: form.rol,
    }
    if (!isEdit) payload.password = form.password

    setLoading(true)
    try {
      if (initialData) {
        await updateUsuario(initialData.id, payload)
        toast({ title: "Usuario actualizado", description: form.nombre })
      } else {
        await createUsuario(payload)
        toast({ title: "Usuario creado", description: form.nombre })
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({
        title: isEdit ? "Error al actualizar el usuario" : "Error al crear el usuario",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
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

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => handleChange("nombre", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />
          </div>
          {!isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
              />
            </div>
          )}
          {!isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                required
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="rol">Rol *</Label>
            <Select
              value={form.rol}
              onValueChange={(value) => handleChange("rol", value as string)}
            >
              <SelectTrigger id="rol" className="w-full">
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
