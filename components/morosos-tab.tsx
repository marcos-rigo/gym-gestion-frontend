"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Search } from "lucide-react"

import { CobroDialog } from "@/components/cobro-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import type { Cliente, ClienteMoroso } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { getMorosos } from "@/services/clientes"

const PAGE_SIZE = 20

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

// CobroDialog solo usa idCliente/nombreCompleto; el resto se completa con placeholders
// porque este listado no trae el registro completo del cliente.
function toClienteStub(row: ClienteMoroso): Cliente {
  return {
    idCliente: row.idCliente,
    nombreCompleto: row.nombreCompleto,
    dni: row.dni,
    apellido: "",
    nombre: "",
    fechaNacimiento: "",
    telefono: "",
    email: "",
    direccion: "",
    fotoUrl: "",
    contactoEmergencia: "",
    observaciones: "",
    fechaAlta: "",
    fechaInicioCuota: "",
    fechaVencimiento: row.fechaVencimiento,
    estado: "activo",
    estadoCuota: "moroso",
    createdAt: "",
  }
}

interface MorososTabProps {
  onCobroRegistrado: () => void
}

export function MorososTab({ onCobroRegistrado }: MorososTabProps) {
  const { toast } = useToast()
  const [rows, setRows] = useState<ClienteMoroso[]>([])
  const [total, setTotal] = useState(0)
  const [totalAdeudado, setTotalAdeudado] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [queryInput, setQueryInput] = useState("")
  const [query, setQuery] = useState("")
  const [cobrando, setCobrando] = useState<ClienteMoroso | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(queryInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [queryInput])

  const fetchMorosos = useCallback(() => {
    getMorosos({ query: query || undefined, page, pageSize: PAGE_SIZE })
      .then(({ data, meta }) => {
        setRows(data)
        setTotal(meta?.total ?? data.length)
        setTotalAdeudado(meta?.totalAdeudado ?? 0)
      })
      .catch((err: unknown) => {
        toast({
          title: "Error al cargar los morosos",
          description: err instanceof Error ? err.message : "Error desconocido",
          variant: "destructive",
        })
      })
      .finally(() => setLoading(false))
  }, [query, page, toast])

  useEffect(() => {
    fetchMorosos()
  }, [fetchMorosos])

  function handleCobroSuccess() {
    fetchMorosos()
    onCobroRegistrado()
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-4">
      <Card className="max-w-xs">
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Total Adeudado Estimado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-critical">
            {loading ? "—" : currencyFormatter.format(totalAdeudado)}
          </div>
        </CardContent>
      </Card>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o DNI..."
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex h-24 items-center justify-center text-center text-muted-foreground">
            No hay clientes morosos.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((c) => (
              <Card key={c.idCliente}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.nombreCompleto}</p>
                      <p className="text-xs text-muted-foreground">DNI {c.dni}</p>
                    </div>
                    <Badge className="border border-critical/20 bg-critical/15 shrink-0 text-red-600">
                      {c.diasAtraso} día{c.diasAtraso === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Vencido el {formatDate(c.fechaVencimiento)}
                    </span>
                    <span className="text-sm font-semibold">
                      {c.montoReferencia === null ? "Sin referencia" : currencyFormatter.format(c.montoReferencia)}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => setCobrando(c)}>
                    Registrar pago
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: tabla */}
          <Card className="hidden md:block">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Días de atraso</TableHead>
                    <TableHead>Monto adeudado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.idCliente}>
                      <TableCell className="font-medium">{c.nombreCompleto}</TableCell>
                      <TableCell>{c.dni}</TableCell>
                      <TableCell>{formatDate(c.fechaVencimiento)}</TableCell>
                      <TableCell>
                        <Badge className="border border-critical/20 bg-critical/15 text-red-600">
                          {c.diasAtraso} día{c.diasAtraso === 1 ? "" : "s"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.montoReferencia === null ? "Sin referencia" : currencyFormatter.format(c.montoReferencia)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => setCobrando(c)}>
                          Registrar pago
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages} · {total} moroso{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <CobroDialog
        cliente={cobrando ? toClienteStub(cobrando) : null}
        open={cobrando !== null}
        onOpenChange={(open) => !open && setCobrando(null)}
        onSuccess={handleCobroSuccess}
      />
    </div>
  )
}
