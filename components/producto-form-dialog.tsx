"use client"

import { useEffect, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import type { Producto } from "@/lib/types"
import {
  aplicarErrorBackend,
  digitosFilter,
  montoFilter,
  productoSchema,
  withCharFilter,
  type ProductoFormValues,
} from "@/lib/validations"
import { createProducto, updateProducto } from "@/services/productos"

interface ProductoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: Producto | null
}

function toDefaults(producto?: Producto | null): ProductoFormValues {
  return {
    nombre: producto?.nombre ?? "",
    descripcion: producto?.descripcion ?? "",
    categoria: producto?.categoria ?? "",
    precio: producto?.precio ?? 0,
    controlaStock: producto?.controlaStock ?? false,
    stockActual: producto?.stockActual ?? undefined,
    stockMinimo: producto?.stockMinimo ?? undefined,
  }
}

export function ProductoFormDialog({ open, onOpenChange, onSuccess, initialData }: ProductoFormDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const isEdit = Boolean(initialData)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setError,
    formState: { errors },
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: toDefaults(initialData),
  })

  const controlaStock = watch("controlaStock")

  useEffect(() => {
    if (open) reset(toDefaults(initialData))
  }, [open, initialData, reset])

  async function onSubmit(values: ProductoFormValues) {
    setLoading(true)
    try {
      const body = {
        nombre: values.nombre,
        descripcion: values.descripcion || undefined,
        categoria: values.categoria || undefined,
        precio: values.precio,
        controlaStock: values.controlaStock,
        ...(values.controlaStock
          ? { stockActual: values.stockActual ?? 0, stockMinimo: values.stockMinimo ?? 0 }
          : {}),
      }
      if (initialData) {
        await updateProducto(initialData.id, body)
        toast({ title: "Producto actualizado", description: values.nombre })
      } else {
        await createProducto(body)
        toast({ title: "Producto creado", description: values.nombre })
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      aplicarErrorBackend(err, setError, toast, isEdit ? "Error al actualizar el producto" : "Error al crear el producto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Modificá los datos del producto." : "Completá los datos del nuevo producto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" {...register("nombre")} aria-invalid={!!errors.nombre} />
            {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input id="descripcion" {...register("descripcion")} aria-invalid={!!errors.descripcion} />
            {errors.descripcion && <p className="text-sm text-destructive">{errors.descripcion.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Input id="categoria" {...register("categoria")} aria-invalid={!!errors.categoria} />
            {errors.categoria && <p className="text-sm text-destructive">{errors.categoria.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="precio">Precio *</Label>
            <Input
              id="precio"
              type="text"
              inputMode="decimal"
              {...withCharFilter(register("precio"), montoFilter)}
              aria-invalid={!!errors.precio}
            />
            {errors.precio && <p className="text-sm text-destructive">{errors.precio.message}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="controlaStock"
              control={control}
              render={({ field }) => (
                <Switch id="controlaStock" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="controlaStock" className="font-normal">
              Controla stock
            </Label>
          </div>

          {controlaStock && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stockActual">Stock actual</Label>
                <Input
                  id="stockActual"
                  type="text"
                  inputMode="numeric"
                  {...withCharFilter(register("stockActual"), digitosFilter)}
                  aria-invalid={!!errors.stockActual}
                />
                {errors.stockActual && <p className="text-sm text-destructive">{errors.stockActual.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stockMinimo">Stock mínimo</Label>
                <Input
                  id="stockMinimo"
                  type="text"
                  inputMode="numeric"
                  {...withCharFilter(register("stockMinimo"), digitosFilter)}
                  aria-invalid={!!errors.stockMinimo}
                />
                {errors.stockMinimo && <p className="text-sm text-destructive">{errors.stockMinimo.message}</p>}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
