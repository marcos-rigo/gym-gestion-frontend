import { apiClient, baseURL } from '@/lib/api'

function normalizeCliente(raw) {
  const apellido = raw.apellido ?? ''
  const nombre = raw.nombre ?? ''
  return {
    idCliente: raw.id,
    apellido,
    nombre,
    nombreCompleto: raw.nombreCompleto ?? `${apellido}, ${nombre}`,
    dni: raw.dni ?? '',
    fechaNacimiento: raw.fechaNacimiento ?? '',
    telefono: raw.telefono ?? '',
    email: raw.email ?? '',
    direccion: raw.direccion ?? '',
    fotoUrl: raw.fotoUrl ?? '',
    contactoEmergencia: raw.contactoEmergencia ?? '',
    observaciones: raw.observaciones ?? '',
    fechaAlta: raw.fechaAlta ?? '',
    fechaInicioCuota: raw.fechaInicioCuota ?? '',
    fechaVencimiento: raw.fechaVencimiento ?? '',
    estado: raw.estado ?? 'activo',
    estadoCuota: raw.estadoCuota ?? null,
    createdAt: raw.createdAt ?? '',
  }
}

export async function getClientes() {
  const { data } = await apiClient('/clientes')
  return data.map(normalizeCliente)
}

function normalizeMoroso(raw) {
  return {
    idCliente: raw.id,
    nombreCompleto: raw.nombreCompleto,
    dni: raw.dni,
    fechaVencimiento: raw.fechaVencimiento,
    diasAtraso: raw.diasAtraso,
    montoReferencia: raw.montoReferencia === null ? null : Number(raw.montoReferencia),
  }
}

function normalizePorVencer(raw) {
  return {
    idCliente: raw.id,
    nombreCompleto: raw.nombreCompleto,
    dni: raw.dni,
    fechaVencimiento: raw.fechaVencimiento,
    diasRestantes: raw.diasRestantes,
    montoReferencia: raw.montoReferencia === null ? null : Number(raw.montoReferencia),
  }
}

function buildListadoParams({ query, page, pageSize }) {
  const params = new URLSearchParams()
  if (query) params.set('query', query)
  if (page) params.set('page', String(page))
  if (pageSize) params.set('pageSize', String(pageSize))
  return params.toString()
}

export async function getMorosos(filtros = {}) {
  const query = buildListadoParams(filtros)
  const { data, meta } = await apiClient(`/clientes/morosos${query ? `?${query}` : ''}`)
  return { data: data.map(normalizeMoroso), meta }
}

export async function getPorVencer(filtros = {}) {
  const query = buildListadoParams(filtros)
  const { data, meta } = await apiClient(`/clientes/por-vencer${query ? `?${query}` : ''}`)
  return { data: data.map(normalizePorVencer), meta }
}

export function createCliente(data) {
  return apiClient('/clientes', { method: 'POST', body: JSON.stringify(data) })
}

export function updateCliente(id, data) {
  return apiClient(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function deleteCliente(id) {
  return apiClient(`/clientes/${id}`, { method: 'DELETE' })
}

export async function uploadFotoCliente(blob) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const formData = new FormData()
  formData.append('foto', blob)
  const res = await fetch(`${baseURL}/upload/foto`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    const err = new Error(errorData.message || 'No se pudo subir la foto')
    err.status = res.status
    throw err
  }
  return res.json()
}
