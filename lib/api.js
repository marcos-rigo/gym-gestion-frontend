export const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function apiClient(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const { headers: extraHeaders, ...restOptions } = options
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...extraHeaders,
    },
    ...restOptions,
  }
  const response = await fetch(`${baseURL}${endpoint}`, config)
  if (response.status === 401) {
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
    throw err
  }
  return response.json()
}
