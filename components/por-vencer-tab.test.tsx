import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { PorVencerTab } from "./por-vencer-tab"
import type { ClientePorVencer } from "@/lib/types"

const { getPorVencerMock, toastMock } = vi.hoisted(() => ({ getPorVencerMock: vi.fn(), toastMock: vi.fn() }))

vi.mock("@/services/clientes", () => ({ getPorVencer: getPorVencerMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))

function porVencer(overrides: Partial<ClientePorVencer> = {}): ClientePorVencer {
  return {
    idCliente: "c1",
    nombreCompleto: "Gómez, Ana",
    dni: "99000002",
    fechaVencimiento: "2026-02-01",
    diasRestantes: 3,
    montoReferencia: 45000,
    ...overrides,
  }
}

describe("PorVencerTab", () => {
  afterEach(() => {
    getPorVencerMock.mockReset()
  })

  it("muestra la proyección de ingresos y los días restantes de cada fila", async () => {
    getPorVencerMock.mockResolvedValue({
      data: [porVencer()],
      meta: { total: 1, proyeccionIngresos: 45000 },
    })

    render(<PorVencerTab onCobroRegistrado={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByText("Gómez, Ana").length).toBeGreaterThan(0))
    expect(screen.getAllByText("$ 45.000,00").length).toBeGreaterThan(0)
    expect(screen.getAllByText("3 días").length).toBeGreaterThan(0)
  })

  it('suma a la proyección solo clientes con cuota de referencia conocida ("Sin referencia" si nunca pagó)', async () => {
    getPorVencerMock.mockResolvedValue({
      data: [porVencer({ montoReferencia: null })],
      meta: { total: 1, proyeccionIngresos: 0 },
    })

    render(<PorVencerTab onCobroRegistrado={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByText("Sin referencia").length).toBeGreaterThan(0))
    expect(screen.getByText("$ 0,00")).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay vencimientos próximos', async () => {
    getPorVencerMock.mockResolvedValue({ data: [], meta: { total: 0, proyeccionIngresos: 0 } })

    render(<PorVencerTab onCobroRegistrado={vi.fn()} />)

    await waitFor(() =>
      expect(screen.getByText("No hay clientes por vencer en los próximos 7 días.")).toBeInTheDocument()
    )
  })

  it("debounce: la búsqueda espera 300ms antes de refetchear y resetea a la página 1", async () => {
    const user = userEvent.setup()
    getPorVencerMock.mockResolvedValue({ data: [], meta: { total: 0, proyeccionIngresos: 0 } })

    render(<PorVencerTab onCobroRegistrado={vi.fn()} />)
    await waitFor(() => expect(getPorVencerMock).toHaveBeenCalledTimes(1))

    const input = screen.getByPlaceholderText("Buscar por nombre o DNI...")
    await user.type(input, "99000002")

    await waitFor(() =>
      expect(getPorVencerMock).toHaveBeenLastCalledWith({ query: "99000002", page: 1, pageSize: 20 })
    )
    expect(getPorVencerMock.mock.calls.length).toBeLessThan("99000002".length + 1)
  })

  it("paginación: Siguiente pide la página 2 y Anterior vuelve a la 1", async () => {
    const user = userEvent.setup()
    getPorVencerMock.mockResolvedValue({
      data: [porVencer()],
      meta: { total: 25, proyeccionIngresos: 45000 },
    })

    render(<PorVencerTab onCobroRegistrado={vi.fn()} />)
    await waitFor(() => expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument())

    await user.click(screen.getByRole("button", { name: "Siguiente" }))
    await waitFor(() =>
      expect(getPorVencerMock).toHaveBeenLastCalledWith({ query: undefined, page: 2, pageSize: 20 })
    )

    await user.click(screen.getByRole("button", { name: "Anterior" }))
    await waitFor(() =>
      expect(getPorVencerMock).toHaveBeenLastCalledWith({ query: undefined, page: 1, pageSize: 20 })
    )
  })
})
