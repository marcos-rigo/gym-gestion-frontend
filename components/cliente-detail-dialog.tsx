"use client"

import { useCallback, useEffect, useState } from "react"
import { DollarSign, User } from "lucide-react"

import { CobroDialog } from "@/components/cobro-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import type { Cliente } from "@/lib/types"
import { cn, formatDate } from "@/lib/utils"
import { getPagosCliente } from "@/services/pagos"

interface ClienteDetailDialogProps {
  cliente: Cliente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClienteActualizado?: () => void
}

interface Pago {
  id?: string
  fecha: string
  monto: number
  metodo: string
}

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

export const estadoBadgeClass: Record<Cliente["estado"], string> = {
  activo: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  vencido: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  suspendido: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

export function EstadoBadge({ estado }: { estado: Cliente["estado"] }) {
  return (
    <Badge className={cn("capitalize", estadoBadgeClass[estado] ?? estadoBadgeClass.suspendido)}>
      {estado}
    </Badge>
  )
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm break-words">{value || "—"}</span>
    </div>
  )
}

export function ClienteDetailDialog({
  cliente,
  open,
  onOpenChange,
  onClienteActualizado,
}: ClienteDetailDialogProps) {
  const { permisos, esAdmin } = useAuth()
  const puedeCobrar = esAdmin || (permisos ?? []).includes("facturacion_cobrar")
  const puedeVerPagos = esAdmin || (permisos ?? []).includes("facturacion_ver")

  const [pagos, setPagos] = useState<Pago[]>([])
  const [showCobro, setShowCobro] = useState(false)
  const clienteId = cliente?.idCliente

  const fetchPagos = useCallback(async () => {
    if (!clienteId) return
    try {
      const data = await getPagosCliente(clienteId)
      setPagos((data ?? []).slice(0, 5))
    } catch {
      setPagos([])
    }
  }, [clienteId])

  useEffect(() => {
    if (open && puedeVerPagos) fetchPagos()
  }, [open, puedeVerPagos, fetchPagos])

  function handleCobroSuccess() {
    if (puedeVerPagos) fetchPagos()
    onClienteActualizado?.()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95dvh] gap-3 overflow-y-auto sm:max-w-2xl">
        {cliente && (
          <>
            <div className="flex items-center gap-3">
              {cliente.fotoUrl ? (
                <img
                  src={cliente.fotoUrl}
                  alt={cliente.nombreCompleto}
                  className="size-16 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-white/10">
                  <User />
                </div>
              )}
              <DialogHeader className="min-w-0">
                <DialogTitle className="truncate">{cliente.nombreCompleto}</DialogTitle>
                <DialogDescription>Detalle del cliente</DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
              <EstadoBadge estado={cliente.estado} />
              <span className="text-sm text-muted-foreground">
                Vence el{" "}
                <span className="font-medium text-foreground">
                  {formatDate(cliente.fechaVencimiento)}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <Field label="Apellido" value={cliente.apellido} />
              <Field label="Nombre" value={cliente.nombre} />
              <Field label="DNI" value={cliente.dni} />
              <Field
                label="Fecha de nacimiento"
                value={cliente.fechaNacimiento ? formatDate(cliente.fechaNacimiento) : ""}
              />
              <Field label="Teléfono" value={cliente.telefono} />
              <Field label="Email" value={cliente.email} />
              <Field label="Dirección" value={cliente.direccion} />
              <Field label="Contacto de emergencia" value={cliente.contactoEmergencia} />
            </div>

            <Field label="Observaciones" value={cliente.observaciones} />

            {puedeVerPagos && (
              <div className="grid gap-1">
                <span className="text-sm font-semibold">Historial de Pagos</span>
                {pagos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {pagos.map((pago, i) => (
                      <li
                        key={pago.id ?? i}
                        className="flex items-center justify-between gap-2 px-3 py-1 text-sm"
                      >
                        <span>{formatDate(pago.fecha)}</span>
                        <span className="font-medium">{currencyFormatter.format(pago.monto)}</span>
                        <span className="capitalize text-muted-foreground">{pago.metodo}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <DialogFooter>
              {puedeCobrar && (
                <Button onClick={() => setShowCobro(true)}>
                  <DollarSign />
                  Cobrar Cuota
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>

    <CobroDialog
      cliente={cliente}
      open={showCobro}
      onOpenChange={setShowCobro}
      onSuccess={handleCobroSuccess}
    />
    </>
  )
}
