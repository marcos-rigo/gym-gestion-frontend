import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CierreCajaTab } from "./cierre-caja-tab"
import type { CierreCajaCompleto } from "@/lib/types"
import { hoyTucuman } from "@/lib/utils"

const { getCierreCajaCompletoMock, toastMock } = vi.hoisted(() => ({
  getCierreCajaCompletoMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock("@/services/caja", () => ({ getCierreCajaCompleto: getCierreCajaCompletoMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))

function cierreVacio(fecha: string): CierreCajaCompleto {
  return {
    fecha,
    aperturaInicialEfectivo: 0,
    efectivoEsperado: 0,
    transferenciasTotal: 0,
    porTipo: {
      cuotas: { efectivo: 0, transferencia: 0, cantidad: 0 },
      ventas: { efectivo: 0, transferencia: 0, cantidad: 0 },
      egresos: { efectivo: 0, transferencia: 0, cantidad: 0 },
      ingresosExtra: { efectivo: 0, transferencia: 0, cantidad: 0 },
    },
    porEmpleado: [],
    anulados: { cuotas: { cantidad: 0, monto: 0 }, ventas: { cantidad: 0, monto: 0 } },
  }
}

describe("CierreCajaTab", () => {
  afterEach(() => {
    getCierreCajaCompletoMock.mockReset()
  })

  it('el selector de fecha arranca en "hoy" según la zona horaria de Tucumán', async () => {
    getCierreCajaCompletoMock.mockResolvedValue(cierreVacio(hoyTucuman()))
    render(<CierreCajaTab />)

    await waitFor(() => expect(getCierreCajaCompletoMock).toHaveBeenCalledWith(hoyTucuman()))
    expect(screen.getByLabelText("Fecha")).toHaveValue(hoyTucuman())
  })

  it("sin movimientos ni anulados, muestra la fórmula en cero en vez de una pantalla vacía", async () => {
    getCierreCajaCompletoMock.mockResolvedValue(cierreVacio(hoyTucuman()))
    render(<CierreCajaTab />)

    await waitFor(() => expect(screen.getByText("Efectivo Esperado")).toBeInTheDocument())
    expect(screen.getByText("Sin movimientos por empleado.")).toBeInTheDocument()
    expect(screen.queryByText("Anulados del Día")).not.toBeInTheDocument()
  })

  it("muestra el efectivo esperado, las transferencias y el desglose por empleado", async () => {
    const cierre: CierreCajaCompleto = {
      fecha: hoyTucuman(),
      aperturaInicialEfectivo: 1000,
      efectivoEsperado: 46000,
      transferenciasTotal: 0,
      porTipo: {
        cuotas: { efectivo: 45000, transferencia: 0, cantidad: 1 },
        ventas: { efectivo: 0, transferencia: 0, cantidad: 0 },
        egresos: { efectivo: 0, transferencia: 0, cantidad: 0 },
        ingresosExtra: { efectivo: 0, transferencia: 0, cantidad: 0 },
      },
      porEmpleado: [
        { usuarioId: "u1", usuarioNombre: "Zze2e Empleado", cuotas: { monto: 45000, cantidad: 1 }, ventas: { monto: 0, cantidad: 0 } },
      ],
      anulados: { cuotas: { cantidad: 0, monto: 0 }, ventas: { cantidad: 0, monto: 0 } },
    }
    getCierreCajaCompletoMock.mockResolvedValue(cierre)

    render(<CierreCajaTab />)

    await waitFor(() => expect(screen.getByText("$ 46.000,00")).toBeInTheDocument())
    expect(screen.getAllByText("Zze2e Empleado").length).toBeGreaterThan(0)
  })

  it('muestra "Anulados del Día" por separado, cuotas y ventas', async () => {
    const cierre: CierreCajaCompleto = {
      fecha: hoyTucuman(),
      aperturaInicialEfectivo: 0,
      efectivoEsperado: 45000,
      transferenciasTotal: 0,
      porTipo: {
        cuotas: { efectivo: 45000, transferencia: 0, cantidad: 1 },
        ventas: { efectivo: 0, transferencia: 0, cantidad: 0 },
        egresos: { efectivo: 0, transferencia: 0, cantidad: 0 },
        ingresosExtra: { efectivo: 0, transferencia: 0, cantidad: 0 },
      },
      porEmpleado: [
        { usuarioId: "u1", usuarioNombre: "Zze2e Empleado", cuotas: { monto: 45000, cantidad: 1 }, ventas: { monto: 0, cantidad: 0 } },
      ],
      anulados: { cuotas: { cantidad: 1, monto: 20000 }, ventas: { cantidad: 0, monto: 0 } },
    }
    getCierreCajaCompletoMock.mockResolvedValue(cierre)

    render(<CierreCajaTab />)

    await waitFor(() => expect(screen.getByText("Anulados del Día")).toBeInTheDocument())
    expect(screen.getByText("$ 20.000,00")).toBeInTheDocument()
    expect(screen.getByText("1 pago (no suman al total)")).toBeInTheDocument()
  })

  it("cambiar la fecha vuelve a pedir el cierre para la nueva fecha", async () => {
    getCierreCajaCompletoMock.mockResolvedValue(cierreVacio(hoyTucuman()))
    render(<CierreCajaTab />)
    await waitFor(() => expect(getCierreCajaCompletoMock).toHaveBeenCalledTimes(1))

    const input = screen.getByLabelText("Fecha")
    fireEvent.change(input, { target: { value: "2026-01-05" } })

    await waitFor(() => expect(getCierreCajaCompletoMock).toHaveBeenLastCalledWith("2026-01-05"))
  })
})
