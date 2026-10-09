import { apiClient } from '@/lib/api'

function normalizeProducto(raw) {
  return {
    id: raw.id,
    nombre: raw.nombre,
    descripcion: raw.descripcion ?? null,
    categoria: raw.categoria ?? null,
    precio: Number(raw.precio),
    activo: !!raw.activo,
    controlaStock: !!raw.controlaStock,
    stockActual: raw.stockActual === null || raw.stockActual === undefined ? null : Number(raw.stockActual),
    stockMinimo: raw.stockMinimo === null || raw.stockMinimo === undefined ? null : Number(raw.stockMinimo),
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
  }
}

export async function getProductos(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.query) params.set('query', filtros.query)
  if (filtros.activo !== undefined && filtros.activo !== null) params.set('activo', String(filtros.activo))
  if (filtros.page) params.set('page', String(filtros.page))
  if (filtros.pageSize) params.set('pageSize', String(filtros.pageSize))
  const query = params.toString()
  const { data, meta } = await apiClient(`/productos${query ? `?${query}` : ''}`)
  return { data: data.map(normalizeProducto), meta }
}

export async function getProducto(id) {
  const { data } = await apiClient(`/productos/${id}`)
  return normalizeProducto(data)
}

export function createProducto(data) {
  return apiClient('/productos', { method: 'POST', body: JSON.stringify(data) })
}

export function updateProducto(id, data) {
  return apiClient(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function deleteProducto(id) {
  return apiClient(`/productos/${id}`, { method: 'DELETE' })
}

export function toggleActivoProducto(id) {
  return apiClient(`/productos/${id}/toggle-activo`, { method: 'PATCH' })
}

/** @param {string} id @param {{ delta: number, motivo?: string }} data */
export function ajustarStockProducto(id, data) {
  return apiClient(`/productos/${id}/stock`, { method: 'PATCH', body: JSON.stringify(data) })
}
