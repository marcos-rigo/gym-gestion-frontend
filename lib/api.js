export const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function apiClient(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  // responseType: 'blob' para endpoints que devuelven archivos (ej. PDFs) en vez de JSON
  const { headers: extraHeaders, responseType, ...restOptions } = options
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...extraHeaders,
    },
    ...restOptions,
  }
  const response = await fetch(`${baseURL}${endpoint}`, config)
  // Un 401 de /auth/login son credenciales inválidas, no una sesión vencida: no hay
  // token que limpiar ni redirect que disparar, y el mensaje real del backend
  // ("Credenciales inválidas") tiene que llegar al formulario de login.
  if (response.status === 401 && endpoint !== '/auth/login') {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    throw new Error('No autorizado')
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const err = new Error(errorData.message || `Error ${response.status}`)
    err.status = response.status
    err.errors = errorData.errors
    throw err
  }
  return responseType === 'blob' ? response.blob() : response.json()
}
