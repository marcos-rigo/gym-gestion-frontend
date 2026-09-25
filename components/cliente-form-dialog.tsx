"use client"

import { useRef, useState, type FormEvent } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { Cliente } from "@/lib/types"
import { createCliente, updateCliente } from "@/services/clientes"

interface ClienteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: Cliente | null
}

type FormState = {
  nombre: string
  apellido: string
  dni: string
  telefono: string
  email: string
  direccion: string
  fechaNacimiento: string
  contactoEmergencia: string
  observaciones: string
  fotoUrl: string
}

const emptyForm: FormState = {
  nombre: "",
  apellido: "",
  dni: "",
  telefono: "",
  email: "",
  direccion: "",
  fechaNacimiento: "",
  contactoEmergencia: "",
  observaciones: "",
  fotoUrl: "",
}

function toFormState(cliente?: Cliente | null): FormState {
  if (!cliente) return emptyForm
  return {
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    dni: cliente.dni,
    telefono: cliente.telefono,
    email: cliente.email,
    direccion: cliente.direccion,
    // <input type="date"> necesita YYYY-MM-DD
    fechaNacimiento: cliente.fechaNacimiento ? cliente.fechaNacimiento.slice(0, 10) : "",
    contactoEmergencia: cliente.contactoEmergencia,
    observaciones: cliente.observaciones,
    fotoUrl: cliente.fotoUrl ?? "",
  }
}

export function ClienteFormDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: ClienteFormDialogProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<FormState>(() => toFormState(initialData))
  const [loading, setLoading] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  const isEdit = Boolean(initialData)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(initialData?.fotoUrl || null)
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  // Al abrir el dialog, (re)cargar el formulario con initialData o vacío
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setForm(toFormState(initialData))
      setFotoPreview(initialData?.fotoUrl || null)
      setCamaraActiva(false)
    }
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleActivarCamara() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCamaraActiva(true)
    } catch (err) {
      toast({
        title: "Error al acceder a la cámara",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
    }
  }

  function detenerCamara() {
    const stream = videoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach((track) => track.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setCamaraActiva(false)
  }

  function handleCapturarFoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    detenerCamara()

    canvas.toBlob(async (blob) => {
      if (!blob) return
      setSubiendoFoto(true)
      try {
        const formData = new FormData()
        formData.append("foto", blob)
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/foto`, {
          method: "POST",
          body: formData,
        })
        if (!res.ok) throw new Error("No se pudo subir la foto")
        const data = await res.json()
        setForm((prev) => ({ ...prev, fotoUrl: data.url }))
        setFotoPreview(data.url)
      } catch (err) {
        toast({
          title: "Error al subir la foto",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      } finally {
        setSubiendoFoto(false)
      }
    })
  }

  function handleVolverATomar() {
    setFotoPreview(null)
    setForm((prev) => ({ ...prev, fotoUrl: "" }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.apellido.trim() || !form.dni.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Nombre, apellido y DNI son obligatorios.",
        variant: "destructive",
      })
      return
    }

    // Los campos opcionales vacíos se envían como null (el backend no acepta "" en fechas)
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim() === "" ? null : value.trim()])
    )

    setLoading(true)
    try {
      if (initialData) {
        await updateCliente(initialData.idCliente, payload)
        toast({ title: "Cliente actualizado", description: `${form.apellido}, ${form.nombre}` })
      } else {
        await createCliente(payload)
        toast({ title: "Cliente creado", description: `${form.apellido}, ${form.nombre}` })
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast({
        title: isEdit ? "Error al actualizar el cliente" : "Error al crear el cliente",
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
          <DialogTitle>{isEdit ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modificá los datos del cliente y guardá los cambios."
              : "Completá los datos para registrar un nuevo cliente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="flex flex-col items-center gap-3">
            {fotoPreview ? (
              <>
                <img
                  src={fotoPreview}
                  alt="Foto del cliente"
                  className="size-20 rounded-full object-cover"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleVolverATomar}>
                  Volver a tomar
                </Button>
              </>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={camaraActiva ? "w-full max-w-xs rounded-lg" : "hidden"}
                />
                <canvas ref={canvasRef} className="hidden" />
                {!camaraActiva && (
                  <Button type="button" variant="outline" size="sm" onClick={handleActivarCamara}>
                    Activar cámara
                  </Button>
                )}
                {camaraActiva && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCapturarFoto}
                    disabled={subiendoFoto}
                  >
                    {subiendoFoto && <Loader2 className="animate-spin" />}
                    {subiendoFoto ? "Subiendo..." : "Capturar foto"}
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                value={form.apellido}
                onChange={(e) => handleChange("apellido", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dni">DNI *</Label>
              <Input
                id="dni"
                value={form.dni}
                onChange={(e) => handleChange("dni", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
              <Input
                id="fechaNacimiento"
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => handleChange("fechaNacimiento", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={form.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={form.direccion}
                onChange={(e) => handleChange("direccion", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactoEmergencia">Contacto de emergencia</Label>
              <Input
                id="contactoEmergencia"
                value={form.contactoEmergencia}
                onChange={(e) => handleChange("contactoEmergencia", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              rows={3}
              value={form.observaciones}
              onChange={(e) => handleChange("observaciones", e.target.value)}
            />
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
              {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
