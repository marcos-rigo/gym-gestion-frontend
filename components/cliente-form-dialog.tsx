"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import {
  aplicarErrorBackend,
  clienteSchema,
  digitosFilter,
  letrasFilter,
  telefonoFilter,
  withCharFilter,
  type ClienteFormValues,
} from "@/lib/validations"
import { createCliente, updateCliente, uploadFotoCliente } from "@/services/clientes"

interface ClienteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: Cliente | null
}

function toDefaults(cliente?: Cliente | null): ClienteFormValues {
  if (!cliente) {
    return {
      nombre: "",
      apellido: "",
      dni: "",
      telefono: "",
      email: "",
      direccion: "",
      // <input type="date"> necesita YYYY-MM-DD
      fechaNacimiento: "",
      contactoEmergencia: "",
      observaciones: "",
      fotoUrl: "",
    }
  }
  return {
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    dni: cliente.dni,
    telefono: cliente.telefono,
    email: cliente.email,
    direccion: cliente.direccion,
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
  const [loading, setLoading] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  const isEdit = Boolean(initialData)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(initialData?.fotoUrl || null)
  const [camaraActiva, setCamaraActiva] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: toDefaults(initialData),
  })

  // Al abrir el dialog, (re)cargar el formulario con initialData o vacío
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      reset(toDefaults(initialData))
      setFotoPreview(initialData?.fotoUrl || null)
      setCamaraActiva(false)
    }
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
        const data = await uploadFotoCliente(blob)
        setValue("fotoUrl", data.url)
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
    setValue("fotoUrl", "")
  }

  async function onSubmit(values: ClienteFormValues) {
    // Los campos opcionales vacíos se envían como null (el backend no acepta "" en fechas)
    const payload = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        typeof value === "string" && value.trim() === "" ? null : value,
      ])
    )

    setLoading(true)
    try {
      if (initialData) {
        await updateCliente(initialData.idCliente, payload)
        toast({ title: "Cliente actualizado", description: `${values.apellido}, ${values.nombre}` })
      } else {
        await createCliente(payload)
        toast({ title: "Cliente creado", description: `${values.apellido}, ${values.nombre}` })
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      aplicarErrorBackend(
        err,
        setError,
        toast,
        isEdit ? "Error al actualizar el cliente" : "Error al crear el cliente"
      )
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

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
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
                {...withCharFilter(register("nombre"), letrasFilter)}
                aria-invalid={!!errors.nombre}
              />
              {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apellido">Apellido *</Label>
              <Input
                id="apellido"
                {...withCharFilter(register("apellido"), letrasFilter)}
                aria-invalid={!!errors.apellido}
              />
              {errors.apellido && <p className="text-sm text-destructive">{errors.apellido.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dni">DNI *</Label>
              <Input
                id="dni"
                inputMode="numeric"
                {...withCharFilter(register("dni"), digitosFilter)}
                aria-invalid={!!errors.dni}
              />
              {errors.dni && <p className="text-sm text-destructive">{errors.dni.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
              <Input
                id="fechaNacimiento"
                type="date"
                {...register("fechaNacimiento")}
                aria-invalid={!!errors.fechaNacimiento}
              />
              {errors.fechaNacimiento && (
                <p className="text-sm text-destructive">{errors.fechaNacimiento.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                inputMode="tel"
                {...withCharFilter(register("telefono"), telefonoFilter)}
                aria-invalid={!!errors.telefono}
              />
              {errors.telefono && <p className="text-sm text-destructive">{errors.telefono.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" {...register("direccion")} aria-invalid={!!errors.direccion} />
              {errors.direccion && <p className="text-sm text-destructive">{errors.direccion.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactoEmergencia">Contacto de emergencia</Label>
              <Input
                id="contactoEmergencia"
                {...register("contactoEmergencia")}
                aria-invalid={!!errors.contactoEmergencia}
              />
              {errors.contactoEmergencia && (
                <p className="text-sm text-destructive">{errors.contactoEmergencia.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              rows={3}
              {...register("observaciones")}
              aria-invalid={!!errors.observaciones}
            />
            {errors.observaciones && (
              <p className="text-sm text-destructive">{errors.observaciones.message}</p>
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
              {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
