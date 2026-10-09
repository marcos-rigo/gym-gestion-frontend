"use client"

import { useState, type FormEvent } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { hoyTucuman } from "@/lib/utils"
import { getRecaudacionPdf } from "@/services/reportes"

interface RecaudacionPdfDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Rango por defecto: del 1° del mes en curso a hoy (ambos en la zona del gimnasio)
function rangoPorDefecto() {
  const hoy = hoyTucuman()
  return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy }
}

function validarRango(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return "Completá ambas fechas"
  if (hasta > hoyTucuman()) return "La fecha hasta no puede ser futura"
  if (desde > hasta) return "La fecha desde no puede ser posterior a la fecha hasta"
  return null
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Diferido: revocar en el mismo tick puede cortar la descarga en algunos navegadores
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function RecaudacionPdfDialog({ open, onOpenChange }: RecaudacionPdfDialogProps) {
  const { toast } = useToast()
  const [desde, setDesde] = useState(() => rangoPorDefecto().desde)
  const [hasta, setHasta] = useState(() => rangoPorDefecto().hasta)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  // Al abrir, arrancar siempre del rango por defecto y sin error previo
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      const rango = rangoPorDefecto()
      setDesde(rango.desde)
      setHasta(rango.hasta)
      setError(null)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errorRango = validarRango(desde, hasta)
    if (errorRango) {
      setError(errorRango)
      return
    }

    setError(null)
    setLoading(true)
    try {
      const blob = await getRecaudacionPdf({ desde, hasta })
      descargarBlob(blob, `recaudacion_${desde}_${hasta}.pdf`)
      toast({ title: "PDF descargado", description: `Recaudación del ${desde} al ${hasta}` })
      onOpenChange(false)
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido"
      setError(mensaje)
      toast({ title: "Error al generar el PDF", description: mensaje, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descargar PDF de recaudación</DialogTitle>
          <DialogDescription>Elegí el período a incluir en el reporte.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="recaudacion-desde">Desde</Label>
              <Input
                id="recaudacion-desde"
                type="date"
                value={desde}
                max={hasta || hoyTucuman()}
                onChange={(e) => setDesde(e.target.value)}
                aria-invalid={!!error}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recaudacion-hasta">Hasta</Label>
              <Input
                id="recaudacion-hasta"
                type="date"
                value={hasta}
                min={desde || undefined}
                max={hoyTucuman()}
                onChange={(e) => setHasta(e.target.value)}
                aria-invalid={!!error}
                disabled={loading}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

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
              {loading ? "Generando..." : "Descargar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
