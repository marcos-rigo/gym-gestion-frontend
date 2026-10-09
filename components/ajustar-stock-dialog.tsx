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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { Producto } from "@/lib/types"
import { ajustarStockSchema, aplicarErrorBackend, type AjustarStockFormValues } from "@/lib/validations"
import { ajustarStockProducto } from "@/services/productos"

interface AjustarStockDialogProps {
  producto: Producto | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AjustarStockDialog({ producto, open, onOpenChange, onSuccess }: AjustarStockDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AjustarStockFormValues>({
    resolver: zodResolver(ajustarStockSchema),
    defaultValues: { delta: 0, motivo: "" },
  })

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) reset({ delta: 0, motivo: "" })
  }

  async function onSubmit(values: AjustarStockFormValues) {
    if (!producto) return
    setLoading(true)
    try {
      await ajustarStockProducto(producto.id, { delta: values.delta, motivo: values.motivo || undefined })
      toast({ title: "Stock ajustado", description: producto.nombre })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      aplicarErrorBackend(err, setError, toast, "Error al ajustar el stock")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {producto && (
              <>
                {producto.nombre} · Stock actual: {producto.stockActual ?? 0}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="delta">Ajuste *</Label>
            <Input
              id="delta"
              type="number"
              step={1}
              {...register("delta")}
              aria-invalid={!!errors.delta}
              placeholder="Ej: 10 o -5"
            />
            <p className="text-xs text-muted-foreground">
              Positivo para sumar stock, negativo para restar.
            </p>
            {errors.delta && <p className="text-sm text-destructive">{errors.delta.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" rows={2} {...register("motivo")} aria-invalid={!!errors.motivo} />
            {errors.motivo && <p className="text-sm text-destructive">{errors.motivo.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Ajustando..." : "Ajustar stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
