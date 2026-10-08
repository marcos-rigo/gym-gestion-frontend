"use client"

import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { Pago } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { aplicarErrorBackend, anularPagoSchema, type AnularPagoFormValues } from "@/lib/validations"
import { anularPago } from "@/services/pagos"

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

interface AnularPagoDialogProps {
  pago: Pago | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AnularPagoDialog({ pago, open, onOpenChange, onSuccess }: AnularPagoDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AnularPagoFormValues>({
    resolver: zodResolver(anularPagoSchema),
    defaultValues: { motivo: "" },
  })

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) reset({ motivo: "" })
  }

  async function onSubmit(values: AnularPagoFormValues) {
    if (!pago) return
    setLoading(true)
    try {
      await anularPago(pago.id, values.motivo)
      toast({ title: "Pago anulado", description: pago.clienteNombreCompleto })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      aplicarErrorBackend(err, setError, toast, "Error al anular el pago")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular pago</DialogTitle>
          <DialogDescription>
            {pago && (
              <>
                {pago.clienteNombreCompleto} · {currencyFormatter.format(pago.monto)} ·{" "}
                {formatDate(pago.fechaPago)}. Esta acción revierte el vencimiento de la cuota del
                cliente. Solo se puede anular el pago más reciente no anulado.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Textarea
              id="motivo"
              rows={3}
              placeholder="Ej: error de monto, pago duplicado, cliente se arrepintió..."
              {...register("motivo")}
              aria-invalid={!!errors.motivo}
            />
            {errors.motivo && <p className="text-sm text-destructive">{errors.motivo.message}</p>}
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
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Anulando..." : "Anular pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
