import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CierreCajaTab } from "./cierre-caja-tab"
import type { CierreCaja } from "@/lib/types"
import { hoyTucuman } from "@/lib/utils"

const { getCierreCajaMock, toastMock } = vi.hoisted(() => ({ getCierreCajaMock: vi.fn(), toastMock: vi.fn() }))

vi.mock("@/services/pagos", () => ({ getCierreCaja: getCierreCajaMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))

function cierreVacio(fecha: string): CierreCaja {
  return {
    fecha,
    general: { monto: 0, cantidad: 0 },
    porMetodo: [],
    porEmpleado: [],
    anulados: { cantidad: 0, monto: 0 },
  }
}

describe("CierreCajaTab", () => {
  afterEach(() => {
    getCierreCajaMock.mockReset()
  })

  it('el selector de fecha arranca en "hoy" según la zona horaria de Tucumán', async () => {
    getCierreCajaMock.mockResolvedValue(cierreVacio(hoyTucuman()))
    render(<CierreCajaTab />)

    await waitFor(() => expect(getCierreCajaMock).toHaveBeenCalledWith(hoyTucuman()))
    expect(screen.getByLabelText("Fecha")).toHaveValue(hoyTucuman())
  })

  it('muestra "No hubo movimientos este día." cuando no hay pagos ni anulados', async () => {
    getCierreCajaMock.mockResolvedValue(cierreVacio(hoyTucuman()))
    render(<CierreCajaTab />)

    await waitFor(() => expect(screen.getByText("No hubo movimientos este día.")).toBeInTheDocument())
  })

  it("muestra el total del día, el desglose por método y el acordeón por empleado", async () => {
    const cierre: CierreCaja = {
      fecha: hoyTucuman(),
      general: { monto: 90000, cantidad: 2 },
      porMetodo: [
        { metodo: "efectivo", monto: 45000, cantidad: 1 },
        { metodo: "tarjeta", monto: 45000, cantidad: 1 },
      ],
      porEmpleado: [
        {
          usuarioId: "u1",
          usuarioNombre: "Zze2e Empleado",
          monto: 45000,
          cantidad: 1,
          porMetodo: [{ metodo: "efectivo", monto: 45000, cantidad: 1 }],
        },
        {
          usuarioId: "u2",
          usuarioNombre: "Zze2e Dueño",
          monto: 45000,
          cantidad: 1,
          porMetodo: [{ metodo: "tarjeta", monto: 45000, cantidad: 1 }],
        },
      ],
      anulados: { cantidad: 0, monto: 0 },
    }
    getCierreCajaMock.mockResolvedValue(cierre)

    render(<CierreCajaTab />)

    await waitFor(() => expect(screen.getByText("$ 90.000,00")).toBeInTheDocument())
    expect(screen.getByText("2 pagos")).toBeInTheDocument()
    expect(screen.getAllByText("Zze2e Empleado").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Zze2e Dueño").length).toBeGreaterThan(0)
  })

  it('muestra "Anulados del Día" sin que el monto anulado sume al total', async () => {
    const cierre: CierreCaja = {
      fecha: hoyTucuman(),
      general: { monto: 45000, cantidad: 1 },
      porMetodo: [{ metodo: "efectivo", monto: 45000, cantidad: 1 }],
      porEmpleado: [
        {
          usuarioId: "u1",
          usuarioNombre: "Zze2e Empleado",
          monto: 45000,
          cantidad: 1,
          porMetodo: [{ metodo: "efectivo", monto: 45000, cantidad: 1 }],
        },
      ],
      anulados: { cantidad: 1, monto: 20000 },
    }
    getCierreCajaMock.mockResolvedValue(cierre)

    render(<CierreCajaTab />)

    await waitFor(() => expect(screen.getByText("Anulados del Día")).toBeInTheDocument())
    expect(screen.getByText("$ 20.000,00")).toBeInTheDocument()
    expect(screen.getByText("1 pago (no suman al total)")).toBeInTheDocument()
    // El total general no debe incluir el monto anulado (aparece en el total, el método y el empleado).
    expect(screen.getAllByText("$ 45.000,00").length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText("$ 65.000,00")).not.toBeInTheDocument()
  })

  it("cambiar la fecha vuelve a pedir el cierre para la nueva fecha", async () => {
    getCierreCajaMock.mockResolvedValue(cierreVacio(hoyTucuman()))
    render(<CierreCajaTab />)
    await waitFor(() => expect(getCierreCajaMock).toHaveBeenCalledTimes(1))

    const input = screen.getByLabelText("Fecha")
    fireEvent.change(input, { target: { value: "2026-01-05" } })

    await waitFor(() => expect(getCierreCajaMock).toHaveBeenLastCalledWith("2026-01-05"))
  })
})
