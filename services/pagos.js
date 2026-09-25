import { apiClient } from '@/lib/api'

export function registrarPago({ clienteId, monto, metodo }) {
  return apiClient('/pagos', { method: 'POST', body: JSON.stringify({ clienteId, monto, metodo }) })
}

export async function getPagosCliente(clienteId) {
  const { data } = await apiClient(`/pagos/cliente/${clienteId}`)
  return data
}

export async function getStatsFacturacion() {
  const { data } = await apiClient('/pagos/stats')
  return data
}
