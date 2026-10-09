"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

import { SelectorMedioPago } from "@/components/selector-medio-pago"
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

export function CobroDialog({ cliente, open, onOpenChange, onSuccess }: CobroDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CobroFormValues>({
    resolver: zodResolver(cobroSchema),
    defaultValues: { monto: DEFAULT_MONTO, metodoPago: undefined },
  })

  const monto = watch("monto") || 0
  const metodoPago = watch("metodoPago")
  const montoEfectivo = watch("montoEfectivo")
  const montoTransferencia = watch("montoTransferencia")

  // Al abrir el dialog, reiniciar el formulario
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) reset({ monto: DEFAULT_MONTO, metodoPago: undefined })
  }

  async function onSubmit(values: CobroFormValues) {
    if (!cliente) return
    setLoading(true)
    try {
      const body =
        values.metodoPago === "dividido"
          ? {
              clienteId: cliente.idCliente,
              monto: values.monto,
              pagos: [
                ...(values.montoEfectivo ? [{ metodo: "efectivo" as const, monto: values.montoEfectivo }] : []),
                ...(values.montoTransferencia
                  ? [{ metodo: "transferencia" as const, monto: values.montoTransferencia }]
                  : []),
              ],
            }
          : { clienteId: cliente.idCliente, monto: values.monto, metodo: values.metodoPago }
      const res = await registrarPago(body)
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
            <Label>Método de pago *</Label>
            <SelectorMedioPago
              total={monto}
              metodo={metodoPago}
              montoEfectivo={montoEfectivo}
              montoTransferencia={montoTransferencia}
              onMetodoChange={(m) => setValue("metodoPago", m, { shouldValidate: true })}
              onMontoEfectivoChange={(v) => setValue("montoEfectivo", v, { shouldValidate: true })}
              onMontoTransferenciaChange={(v) => setValue("montoTransferencia", v, { shouldValidate: true })}
              errorMetodo={errors.metodoPago?.message}
              errorMontoEfectivo={errors.montoEfectivo?.message}
              errorMontoTransferencia={errors.montoTransferencia?.message}
              disabled={loading}
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
              {loading ? "Registrando..." : "Registrar cobro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
