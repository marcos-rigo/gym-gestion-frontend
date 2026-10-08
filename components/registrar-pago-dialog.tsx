"use client"

import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronLeft, Loader2, Search } from "lucide-react"

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
import type { Cliente } from "@/lib/types"
import { aplicarErrorBackend, cobroSchema, montoFilter, withCharFilter, type CobroFormValues } from "@/lib/validations"
import { getClientes } from "@/services/clientes"
import { registrarPago } from "@/services/pagos"

const DEFAULT_MONTO = 45000

const metodoOptions = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
]

interface RegistrarPagoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RegistrarPagoDialog({ open, onOpenChange, onSuccess }: RegistrarPagoDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null)
  const [prevOpen, setPrevOpen] = useState(open)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<CobroFormValues>({
    resolver: zodResolver(cobroSchema),
    defaultValues: { monto: DEFAULT_MONTO, metodo: "efectivo" },
  })

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setBusqueda("")
      setSeleccionado(null)
      reset({ monto: DEFAULT_MONTO, metodo: "efectivo" })
    }
  }

  useEffect(() => {
    if (!open) return
    getClientes().catch((err: unknown) => {
      toast({
        title: "Error al cargar los clientes",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
    }).then((data) => {
      if (data) setClientes(data)
    })
  }, [open, toast])

  const resultados = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return []
    return clientes
      .filter((c) => c.nombreCompleto.toLowerCase().includes(term) || c.dni.toLowerCase().includes(term))
      .slice(0, 8)
  }, [clientes, busqueda])

  async function onSubmit(values: CobroFormValues) {
    if (!seleccionado) return
    setLoading(true)
    try {
      await registrarPago({ clienteId: seleccionado.idCliente, monto: values.monto, metodo: values.metodo })
      toast({ title: "Pago registrado", description: seleccionado.nombreCompleto })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      aplicarErrorBackend(err, setError, toast, "Error al registrar el pago")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {seleccionado ? `Cobrando a ${seleccionado.nombreCompleto}.` : "Buscá al cliente por nombre o DNI."}
          </DialogDescription>
        </DialogHeader>

        {!seleccionado ? (
          <div className="grid gap-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar por nombre o DNI..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {busqueda.trim() === "" ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Empezá a escribir para buscar un cliente.
                </p>
              ) : resultados.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No se encontraron clientes.</p>
              ) : (
                resultados.map((c) => (
                  <button
                    key={c.idCliente}
                    type="button"
                    onClick={() => setSeleccionado(c)}
                    className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium">{c.nombreCompleto}</span>
                    <span className="text-xs text-muted-foreground">DNI {c.dni}</span>
                  </button>
                ))
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-mt-1 w-fit px-2 text-muted-foreground"
              onClick={() => setSeleccionado(null)}
              disabled={loading}
            >
              <ChevronLeft className="size-4" />
              Cambiar cliente
            </Button>

            <div className="grid gap-2">
              <Label htmlFor="monto">Monto *</Label>
              <Input
                id="monto"
                type="text"
                inputMode="decimal"
                {...withCharFilter(register("monto"), montoFilter)}
                aria-invalid={!!errors.monto}
              />
              {errors.monto && <p className="text-sm text-destructive">{errors.monto.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="metodo">Método de pago *</Label>
              <Controller
                name="metodo"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="metodo" className="w-full" aria-invalid={!!errors.metodo}>
                      <SelectValue placeholder="Seleccioná un método" />
                    </SelectTrigger>
                    <SelectContent>
                      {metodoOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.metodo && <p className="text-sm text-destructive">{errors.metodo.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {loading ? "Registrando..." : "Registrar pago"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
