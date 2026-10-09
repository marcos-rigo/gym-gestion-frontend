import { apiClient } from '@/lib/api'

function normalizeVentaItem(raw) {
  return {
    id: raw.id,
    idProducto: raw.idProducto ?? null,
    nombreSnapshot: raw.nombreSnapshot,
    precioUnitario: Number(raw.precioUnitario),
    cantidad: Number(raw.cantidad),
    subtotal: Number(raw.subtotal),
  }
}

function normalizeVentaPago(raw) {
  return { id: raw.id, metodo: raw.metodo, monto: Number(raw.monto) }
}

function normalizeVenta(raw) {
  return {
    id: raw.id,
    fechaHora: raw.fechaHora,
    idUsuario: raw.idUsuario ?? null,
    usuarioNombre: raw.usuarioNombre,
    idCliente: raw.idCliente ?? null,
    clienteNombreCompleto: raw.clienteNombreCompleto,
    total: Number(raw.total),
    anulada: raw.anulada,
    motivoAnulacion: raw.motivoAnulacion ?? null,
    anuladaPor: raw.anuladaPor ?? null,
    anuladaAt: raw.anuladaAt ?? null,
    createdAt: raw.createdAt ?? '',
    items: (raw.items ?? []).map(normalizeVentaItem),
    pagos: (raw.pagos ?? []).map(normalizeVentaPago),
  }
}

/** @param {{ items: {idProducto: string, cantidad: number}[], pagos: {metodo: string, monto: number}[], idCliente?: string }} data */
export async function crearVenta(data) {
  const { data: venta } = await apiClient('/ventas', { method: 'POST', body: JSON.stringify(data) })
  return normalizeVenta(venta)
}

export async function getVentas(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.hasta) params.set('hasta', filtros.hasta)
  if (filtros.usuarioId) params.set('usuarioId', filtros.usuarioId)
  if (filtros.anuladas !== undefined && filtros.anuladas !== null) params.set('anuladas', String(filtros.anuladas))
  if (filtros.page) params.set('page', String(filtros.page))
  if (filtros.pageSize) params.set('pageSize', String(filtros.pageSize))
  const query = params.toString()
  const { data, meta } = await apiClient(`/ventas${query ? `?${query}` : ''}`)
  return { data: data.map(normalizeVenta), meta }
}

export async function getVenta(id) {
  const { data } = await apiClient(`/ventas/${id}`)
  return normalizeVenta(data)
}

export function anularVenta(id, motivo) {
  return apiClient(`/ventas/${id}/anular`, { method: 'POST', body: JSON.stringify({ motivo }) })
}

export async function getReporteVentas({ desde, hasta } = {}) {
  const params = new URLSearchParams()
  if (desde) params.set('desde', desde)
  if (hasta) params.set('hasta', hasta)
  const query = params.toString()
  const { data } = await apiClient(`/ventas/reportes${query ? `?${query}` : ''}`)
  return {
    porProducto: (data.porProducto ?? []).map((p) => ({
      idProducto: p.idProducto,
      nombre: p.nombre,
      unidades: Number(p.unidades),
      ingreso: Number(p.ingreso),
    })),
    porDia: (data.porDia ?? []).map((d) => ({
      fecha: d.fecha,
      cantidad: Number(d.cantidad),
      total: Number(d.total),
    })),
  }
}
