"use client"

import { Banknote, Landmark, SplitSquareHorizontal } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export type MetodoPago = "efectivo" | "transferencia" | "dividido"

interface SelectorMedioPagoProps {
  total: number
  metodo: MetodoPago | undefined
  montoEfectivo: number | undefined
  montoTransferencia: number | undefined
  onMetodoChange: (metodo: MetodoPago) => void
  onMontoEfectivoChange: (monto: number) => void
  onMontoTransferenciaChange: (monto: number) => void
  errorMetodo?: string
  errorMontoEfectivo?: string
  errorMontoTransferencia?: string
  disabled?: boolean
}

const OPCIONES: { value: MetodoPago; label: string; icon: typeof Banknote }[] = [
  { value: "efectivo", label: "Efectivo", icon: Banknote },
  { value: "transferencia", label: "Transferencia", icon: Landmark },
  { value: "dividido", label: "Dividido", icon: SplitSquareHorizontal },
]

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Grilla de botones grandes para elegir el medio de pago (ningún valor preseleccionado
 * a propósito: obliga a elegir). Si se elige "Dividido", muestra dos montos donde
 * completar uno calcula automáticamente el resto en el otro.
 */
export function SelectorMedioPago({
  total,
  metodo,
  montoEfectivo,
  montoTransferencia,
  onMetodoChange,
  onMontoEfectivoChange,
  onMontoTransferenciaChange,
  errorMetodo,
  errorMontoEfectivo,
  errorMontoTransferencia,
  disabled,
}: SelectorMedioPagoProps) {
  function handleEfectivoChange(value: string) {
    const n = Number(value)
    const efectivo = Number.isFinite(n) ? n : 0
    onMontoEfectivoChange(efectivo)
    onMontoTransferenciaChange(Math.max(0, round2(total - efectivo)))
  }

  function handleTransferenciaChange(value: string) {
    const n = Number(value)
    const transferencia = Number.isFinite(n) ? n : 0
    onMontoTransferenciaChange(transferencia)
    onMontoEfectivoChange(Math.max(0, round2(total - transferencia)))
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        {OPCIONES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-pressed={metodo === value}
            onClick={() => onMetodoChange(value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border-2 p-4 text-sm font-medium transition-colors disabled:opacity-50",
              metodo === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted/50"
            )}
          >
            <Icon className="size-6" />
            {label}
          </button>
        ))}
      </div>
      {errorMetodo && <p className="text-sm text-destructive">{errorMetodo}</p>}

      {metodo === "dividido" && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border p-3">
          <div className="grid gap-2">
            <Label htmlFor="montoEfectivo">Efectivo</Label>
            <Input
              id="montoEfectivo"
              type="text"
              inputMode="decimal"
              disabled={disabled}
              value={montoEfectivo ?? ""}
              onChange={(e) => handleEfectivoChange(e.target.value.replace(/[^0-9.]/g, ""))}
              aria-invalid={!!errorMontoEfectivo}
            />
            {errorMontoEfectivo && <p className="text-sm text-destructive">{errorMontoEfectivo}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="montoTransferencia">Transferencia</Label>
            <Input
              id="montoTransferencia"
              type="text"
              inputMode="decimal"
              disabled={disabled}
              value={montoTransferencia ?? ""}
              onChange={(e) => handleTransferenciaChange(e.target.value.replace(/[^0-9.]/g, ""))}
              aria-invalid={!!errorMontoTransferencia}
            />
            {errorMontoTransferencia && <p className="text-sm text-destructive">{errorMontoTransferencia}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
