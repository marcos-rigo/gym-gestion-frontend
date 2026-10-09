import { apiClient } from '@/lib/api'

function normalizePago(raw) {
  return {
    id: raw.id,
    clienteId: raw.clienteId,
    clienteNombreCompleto: raw.clienteApellido && raw.clienteNombre
      ? `${raw.clienteApellido}, ${raw.clienteNombre}`
      : '',
    clienteDni: raw.clienteDni ?? '',
    usuarioId: raw.usuarioId ?? null,
    usuarioNombre: raw.usuarioNombre ?? '',
    monto: Number(raw.monto),
    metodo: raw.metodo,
    metodos: (raw.metodos ?? []).map((m) => ({ metodo: m.metodo, monto: Number(m.monto) })),
    periodoDesde: raw.periodoDesde,
    periodoHasta: raw.periodoHasta,
    fechaPago: raw.fechaPago,
    anulado: !!raw.anulado,
    anuladoAt: raw.anuladoAt ?? null,
    anuladoPorNombre: raw.anuladoPorNombre ?? '',
    motivoAnulacion: raw.motivoAnulacion ?? '',
  }
}

/**
 * @param {{ clienteId: string, monto: number, metodo?: 'efectivo'|'transferencia', pagos?: {metodo: string, monto: number}[] }} data
 * Mandá `metodo` para un cobro de un solo método, o `pagos` (2 elementos) para un cobro dividido.
 */
export function registrarPago({ clienteId, monto, metodo, pagos }) {
  const body = pagos ? { clienteId, monto, pagos } : { clienteId, monto, metodo }
  return apiClient('/pagos', { method: 'POST', body: JSON.stringify(body) })
}

export async function getPagosCliente(clienteId) {
  const { data } = await apiClient(`/pagos/cliente/${clienteId}`)
  return data
}

export async function getStatsFacturacion() {
  const { data } = await apiClient('/pagos/stats')
  return data
}

export async function getPagos(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.hasta) params.set('hasta', filtros.hasta)
  if (filtros.metodo) params.set('metodo', filtros.metodo)
  if (filtros.usuarioId) params.set('usuarioId', filtros.usuarioId)
  if (filtros.estado) params.set('estado', filtros.estado)
  if (filtros.clienteQuery) params.set('clienteQuery', filtros.clienteQuery)
  if (filtros.page) params.set('page', String(filtros.page))
  if (filtros.pageSize) params.set('pageSize', String(filtros.pageSize))
  const query = params.toString()
  const { data, meta } = await apiClient(`/pagos${query ? `?${query}` : ''}`)
  return { data: data.map(normalizePago), meta }
}

export function anularPago(id, motivo) {
  return apiClient(`/pagos/${id}/anular`, { method: 'POST', body: JSON.stringify({ motivo }) })
}

export async function getCierreCaja(fecha) {
  const { data } = await apiClient(`/pagos/cierre-caja?fecha=${fecha}`)
  return data
}
