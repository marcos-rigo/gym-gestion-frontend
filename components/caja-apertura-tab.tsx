"use client"

import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { PERMISOS } from "@/lib/permissions"
import { hoyTucuman } from "@/lib/utils"
import { aplicarErrorBackend, cajaAperturaSchema, montoFilter, withCharFilter, type CajaAperturaFormValues } from "@/lib/validations"
import { getAperturaCaja, setAperturaCaja } from "@/services/caja"

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

export function CajaAperturaTab() {
  const { toast } = useToast()
  const { esAdmin, permisos } = useAuth()
  const puedeEditar = esAdmin || permisos.includes(PERMISOS.CAJA_MOVIMIENTOS)

  const [fecha] = useState(hoyTucuman())
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CajaAperturaFormValues>({
    resolver: zodResolver(cajaAperturaSchema),
    defaultValues: { montoInicialEfectivo: 0 },
  })

  const fetchApertura = useCallback(() => {
    getAperturaCaja(fecha)
      .then((data) => reset({ montoInicialEfectivo: data?.montoInicialEfectivo ?? 0 }))
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar la caja inicial",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
      .finally(() => setLoading(false))
  }, [fecha, toast, reset])

  useEffect(() => {
    fetchApertura()
  }, [fetchApertura])

  async function onSubmit(values: CajaAperturaFormValues) {
    setGuardando(true)
    try {
      await setAperturaCaja({ fecha, montoInicialEfectivo: values.montoInicialEfectivo })
      toast({ title: "Caja inicial actualizada", description: currencyFormatter.format(values.montoInicialEfectivo) })
    } catch (err) {
      aplicarErrorBackend(err, setError, toast, "Error al actualizar la caja inicial")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Caja Inicial del Día</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-16 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="montoInicialEfectivo">Efectivo inicial *</Label>
              <Input
                id="montoInicialEfectivo"
                type="text"
                inputMode="decimal"
                disabled={!puedeEditar}
                {...withCharFilter(register("montoInicialEfectivo"), montoFilter)}
                aria-invalid={!!errors.montoInicialEfectivo}
              />
              {errors.montoInicialEfectivo && (
                <p className="text-sm text-destructive">{errors.montoInicialEfectivo.message}</p>
              )}
            </div>
            {puedeEditar && (
              <Button type="submit" disabled={guardando}>
                {guardando && <Loader2 className="animate-spin" />}
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
}
