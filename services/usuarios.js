import { apiClient } from '@/lib/api'

export async function getUsuarios() {
  const { data } = await apiClient('/usuarios')
  return data
}

export function createUsuario(data) {
  return apiClient('/usuarios', { method: 'POST', body: JSON.stringify(data) })
}

export function updateUsuario(id, data) {
  return apiClient(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export function toggleActivoUsuario(id) {
  return apiClient(`/usuarios/${id}/toggle-activo`, { method: 'PATCH' })
}
