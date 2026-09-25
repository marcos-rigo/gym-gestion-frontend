import { apiClient } from '@/lib/api'

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

export function createCliente(data) {
  return apiClient('/clientes', { method: 'POST', body: JSON.stringify(data) })
}

export function updateCliente(id, data) {
  return apiClient(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function deleteCliente(id) {
  return apiClient(`/clientes/${id}`, { method: 'DELETE' })
}
