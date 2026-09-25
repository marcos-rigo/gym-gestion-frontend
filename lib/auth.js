import { apiClient } from './api'

export async function login(email, password) {
  const data = await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (data.token) {
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
  }
  return data
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('usuario')
  if (typeof window !== 'undefined') window.location.href = '/login'
}

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function isAuthenticated() {
  const token = getToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}
