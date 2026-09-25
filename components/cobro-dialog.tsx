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
import { registrarPago } from "@/services/pagos"

interface CobroDialogProps {
  cliente: Cliente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const DEFAULT_MONTO = "45000"

const metodoOptions = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
]

export function CobroDialog({ cliente, open, onOpenChange, onSuccess }: CobroDialogProps) {
  const { toast } = useToast()
  const [monto, setMonto] = useState(DEFAULT_MONTO)
  const [metodo, setMetodo] = useState("efectivo")
  const [loading, setLoading] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)

  // Al abrir el dialog, reiniciar el formulario
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setMonto(DEFAULT_MONTO)
      setMetodo("efectivo")
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!cliente) return
    const montoNumber = Number(monto)
    if (!montoNumber || montoNumber <= 0) {
      toast({
        title: "Monto inválido",
        description: "Ingresá un monto mayor a cero.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const res = await registrarPago({
        clienteId: cliente.idCliente,
        monto: montoNumber,
        metodo,
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
      toast({
        title: "Error al registrar el cobro",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      })
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

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="monto">Monto *</Label>
            <Input
              id="monto"
              type="number"
              min="0"
              step="any"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="metodo">Método de pago *</Label>
            <Select value={metodo} onValueChange={(value) => setMetodo(value as string)}>
              <SelectTrigger id="metodo" className="w-full">
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
