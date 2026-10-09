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
import {
  aplicarErrorBackend,
  montoFilter,
  movimientoCajaSchema,
  withCharFilter,
  type MovimientoCajaFormValues,
} from "@/lib/validations"
import { crearMovimientoCaja } from "@/services/caja"

interface MovimientoCajaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  tipo: "egreso" | "ingreso_extra"
}

export function MovimientoCajaFormDialog({ open, onOpenChange, onSuccess, tipo }: MovimientoCajaFormDialogProps) {
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
  } = useForm<MovimientoCajaFormValues>({
    resolver: zodResolver(movimientoCajaSchema),
    defaultValues: { concepto: "", monto: 0, metodo: "efectivo" },
  })

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) reset({ concepto: "", monto: 0, metodo: "efectivo" })
  }

  async function onSubmit(values: MovimientoCajaFormValues) {
    setLoading(true)
    try {
      await crearMovimientoCaja({ tipo, ...values })
      toast({ title: tipo === "egreso" ? "Egreso registrado" : "Ingreso registrado", description: values.concepto })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      aplicarErrorBackend(err, setError, toast, "Error al registrar el movimiento")
    } finally {
      setLoading(false)
    }
  }

  const titulo = tipo === "egreso" ? "Nuevo Egreso" : "Nuevo Ingreso Extra"

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Se registra con la fecha y hora de hoy.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="concepto">Concepto *</Label>
            <Input id="concepto" {...register("concepto")} aria-invalid={!!errors.concepto} />
            {errors.concepto && <p className="text-sm text-destructive">{errors.concepto.message}</p>}
          </div>

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
            <Label htmlFor="metodo">Medio *</Label>
            <Controller
              name="metodo"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="metodo" className="w-full" aria-invalid={!!errors.metodo}>
                    <SelectValue placeholder="Seleccioná un medio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
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
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
