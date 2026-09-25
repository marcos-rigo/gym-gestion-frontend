import { apiClient } from '@/lib/api'

export async function getDashboardStats() {
  const { data } = await apiClient('/dashboard/stats')
  return data
}
