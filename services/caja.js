import { apiClient } from '@/lib/api'

function normalizeMovimiento(raw) {
  return {
    id: raw.id,
    tipo: raw.tipo,
    concepto: raw.concepto,
    monto: Number(raw.monto),
    metodo: raw.metodo,
    fechaHora: raw.fechaHora,
    idUsuario: raw.idUsuario ?? null,
    usuarioNombre: raw.usuarioNombre ?? '',
    anulado: !!raw.anulado,
    motivoAnulacion: raw.motivoAnulacion ?? null,
    anuladoPor: raw.anuladoPor ?? null,
    anuladoAt: raw.anuladoAt ?? null,
  }
}

/** @param {{ tipo: 'egreso'|'ingreso_extra', concepto: string, monto: number, metodo: 'efectivo'|'transferencia' }} data */
export function crearMovimientoCaja(data) {
  return apiClient('/caja/movimientos', { method: 'POST', body: JSON.stringify(data) })
}

export async function getMovimientosCaja(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.fecha) params.set('fecha', filtros.fecha)
  if (filtros.tipo) params.set('tipo', filtros.tipo)
  const query = params.toString()
  const { data } = await apiClient(`/caja/movimientos${query ? `?${query}` : ''}`)
  return data.map(normalizeMovimiento)
}

export function anularMovimientoCaja(id, motivo) {
  return apiClient(`/caja/movimientos/${id}/anular`, { method: 'POST', body: JSON.stringify({ motivo }) })
}

export async function getAperturaCaja(fecha) {
  const params = fecha ? `?fecha=${fecha}` : ''
  const { data } = await apiClient(`/caja/apertura${params}`)
  if (!data) return null
  return { fecha: data.fecha, montoInicialEfectivo: Number(data.montoInicialEfectivo), idUsuario: data.idUsuario ?? null }
}

/** @param {{ fecha?: string, montoInicialEfectivo: number }} data */
export function setAperturaCaja(data) {
  return apiClient('/caja/apertura', { method: 'PUT', body: JSON.stringify(data) })
}

export async function getCierreCajaCompleto(fecha) {
  const params = fecha ? `?fecha=${fecha}` : ''
  const { data } = await apiClient(`/caja/cierre${params}`)
  return data
}
