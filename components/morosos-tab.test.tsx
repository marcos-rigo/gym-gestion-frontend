import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MorososTab } from "./morosos-tab"
import type { ClienteMoroso } from "@/lib/types"

const { getMorososMock, toastMock } = vi.hoisted(() => ({ getMorososMock: vi.fn(), toastMock: vi.fn() }))

vi.mock("@/services/clientes", () => ({ getMorosos: getMorososMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))

function moroso(overrides: Partial<ClienteMoroso> = {}): ClienteMoroso {
  return {
    idCliente: "c1",
    nombreCompleto: "Pérez, Juan",
    dni: "99000001",
    fechaVencimiento: "2026-01-01",
    diasAtraso: 5,
    montoReferencia: 45000,
    ...overrides,
  }
}

describe("MorososTab", () => {
  afterEach(() => {
    getMorososMock.mockReset()
  })

  it("muestra el total adeudado y los días de atraso de cada fila", async () => {
    getMorososMock.mockResolvedValue({
      data: [moroso()],
      meta: { total: 1, totalAdeudado: 45000 },
    })

    render(<MorososTab onCobroRegistrado={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByText("Pérez, Juan").length).toBeGreaterThan(0))
    expect(screen.getAllByText("$ 45.000,00").length).toBeGreaterThan(0)
    expect(screen.getAllByText("5 días").length).toBeGreaterThan(0)
  })

  it('muestra "Sin referencia" cuando el cliente nunca pagó (montoReferencia null)', async () => {
    getMorososMock.mockResolvedValue({
      data: [moroso({ montoReferencia: null })],
      meta: { total: 1, totalAdeudado: 0 },
    })

    render(<MorososTab onCobroRegistrado={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByText("Sin referencia").length).toBeGreaterThan(0))
  })

  it('muestra el estado vacío "No hay clientes morosos."', async () => {
    getMorososMock.mockResolvedValue({ data: [], meta: { total: 0, totalAdeudado: 0 } })

    render(<MorososTab onCobroRegistrado={vi.fn()} />)

    await waitFor(() => expect(screen.getByText("No hay clientes morosos.")).toBeInTheDocument())
  })

  it("debounce: la búsqueda espera antes de disparar el fetch y resetea a la página 1", async () => {
    const user = userEvent.setup()
    getMorososMock.mockResolvedValue({ data: [], meta: { total: 0, totalAdeudado: 0 } })

    render(<MorososTab onCobroRegistrado={vi.fn()} />)
    await waitFor(() => expect(getMorososMock).toHaveBeenCalledTimes(1))

    const input = screen.getByPlaceholderText("Buscar por nombre o DNI...")
    await user.type(input, "Juan")

    await waitFor(() =>
      expect(getMorososMock).toHaveBeenLastCalledWith({ query: "Juan", page: 1, pageSize: 20 })
    )
    // El debounce colapsa las teclas intermedias: no un fetch por cada una.
    expect(getMorososMock.mock.calls.length).toBeLessThan("Juan".length + 1)
  })

  it("un Siguiente hecho antes de que venzan los 300 ms del debounce inicial no se revierte a la página 1", async () => {
    // Timers falsos: hace determinístico un bug que con timers reales solo aparecía bajo carga.
    // No se usan waitFor/findBy acá porque dependen de setTimeout reales para drenar microtasks.
    vi.useFakeTimers()
    try {
      getMorososMock.mockResolvedValue({ data: [moroso()], meta: { total: 25, totalAdeudado: 45000 } })
      render(<MorososTab onCobroRegistrado={vi.fn()} />)
      for (let i = 0; i < 5; i++) await act(() => vi.advanceTimersByTimeAsync(0))

      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }))
      await act(() => vi.advanceTimersByTimeAsync(400))

      expect(getMorososMock).toHaveBeenLastCalledWith({ query: undefined, page: 2, pageSize: 20 })
    } finally {
      vi.useRealTimers()
    }
  })

  it("paginación: Siguiente pide la página 2 y Anterior vuelve a la 1", async () => {
    const user = userEvent.setup()
    getMorososMock.mockResolvedValue({
      data: [moroso()],
      meta: { total: 25, totalAdeudado: 45000 },
    })

    render(<MorososTab onCobroRegistrado={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument())

    await user.click(screen.getByRole("button", { name: "Siguiente" }))
    await waitFor(() =>
      expect(getMorososMock).toHaveBeenLastCalledWith({ query: undefined, page: 2, pageSize: 20 })
    )

    await user.click(screen.getByRole("button", { name: "Anterior" }))
    await waitFor(() =>
      expect(getMorososMock).toHaveBeenLastCalledWith({ query: undefined, page: 1, pageSize: 20 })
    )
  })
})
