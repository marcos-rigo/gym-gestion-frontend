import { apiClient } from '@/lib/api'

function normalizeRol(raw) {
  return {
    idRol: raw.id ?? raw.idRol,
    descripcion: raw.descripcion ?? '',
    permissions: raw.permissions ?? [],
    userCount: raw.userCount ?? 0,
    createdAt: raw.createdAt ?? '',
  }
}

export async function getRoles() {
  const { data } = await apiClient('/roles')
  return data.map(normalizeRol)
}

/** @param {{ descripcion: string, permissions?: string[] }} data */
export function createRol({ descripcion, permissions = [] }) {
  return apiClient('/roles', { method: 'POST', body: JSON.stringify({ descripcion, permissions }) })
}

export function updateRol(id, { descripcion, permissions }) {
  return apiClient(`/roles/${id}`, { method: 'PUT', body: JSON.stringify({ descripcion, permissions }) })
}

export function deleteRol(id) {
  return apiClient(`/roles/${id}`, { method: 'DELETE' })
}

export async function getMisPermisos() {
  const { data } = await apiClient('/auth/mis-permisos')
  return data
}
