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
import type { Venta } from "@/lib/types"
import { anulacionSchema, aplicarErrorBackend, type AnularPagoFormValues } from "@/lib/validations"
import { anularVenta } from "@/services/ventas"

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

interface AnularVentaDialogProps {
  venta: Venta | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AnularVentaDialog({ venta, open, onOpenChange, onSuccess }: AnularVentaDialogProps) {
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
    resolver: zodResolver(anulacionSchema),
    defaultValues: { motivo: "" },
  })

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) reset({ motivo: "" })
  }

  async function onSubmit(values: AnularPagoFormValues) {
    if (!venta) return
    setLoading(true)
    try {
      await anularVenta(venta.id, values.motivo)
      toast({ title: "Venta anulada", description: currencyFormatter.format(venta.total) })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      aplicarErrorBackend(err, setError, toast, "Error al anular la venta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular venta</DialogTitle>
          <DialogDescription>
            {venta && <>Venta por {currencyFormatter.format(venta.total)}. Restituye el stock de los productos vendidos.</>}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Textarea id="motivo" rows={3} {...register("motivo")} aria-invalid={!!errors.motivo} />
            {errors.motivo && <p className="text-sm text-destructive">{errors.motivo.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Anulando..." : "Anular venta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
