"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { Cliente } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { aplicarErrorBackend, cobroSchema, montoFilter, withCharFilter, type CobroFormValues } from "@/lib/validations"
import { registrarPago } from "@/services/pagos"

interface CobroDialogProps {
  cliente: Cliente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const DEFAULT_MONTO = 45000

const metodoOptions = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
]

export function CobroDialog({ cliente, open, onOpenChange, onSuccess }: CobroDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
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

  // Al abrir el dialog, reiniciar el formulario
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) reset({ monto: DEFAULT_MONTO, metodo: "efectivo" })
  }

  async function onSubmit(values: CobroFormValues) {
    if (!cliente) return
    setLoading(true)
    try {
      const res = await registrarPago({
        clienteId: cliente.idCliente,
        monto: values.monto,
        metodo: values.metodo,
      })
      const periodoHasta = res?.periodoHasta ?? res?.data?.periodoHasta
      toast({
        title: "Cobro registrado",
        description: periodoHasta
          ? `Nuevo vencimiento: ${formatDate(periodoHasta)}`
          : cliente.nombreCompleto,
      })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      aplicarErrorBackend(err, setError, toast, "Error al registrar el cobro")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cobrar Cuota</DialogTitle>
          <DialogDescription>
            Registrá el pago de {cliente?.nombreCompleto ?? "el cliente"}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
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
              {loading ? "Registrando..." : "Registrar cobro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
