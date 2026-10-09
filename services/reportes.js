import { apiClient } from '@/lib/api'

/**
 * Descarga el PDF de recaudación del período (fechas YYYY-MM-DD, inclusive).
 * @param {{ desde: string, hasta: string }} rango
 * @returns {Promise<Blob>}
 */
export function getRecaudacionPdf({ desde, hasta }) {
  const params = new URLSearchParams({ desde, hasta })
  return apiClient(`/reportes/recaudacion-pdf?${params.toString()}`, {
    headers: { Accept: 'application/pdf' },
    responseType: 'blob',
  })
}
