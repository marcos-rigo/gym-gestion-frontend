import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CierreTurnoPanel } from "./cierre-turno-panel"
import type { EstadoTurno, TotalesTurno, Turno } from "@/lib/types"

const { getEstadoTurnoMock, cerrarTurnoMock, toastMock } = vi.hoisted(() => ({
  getEstadoTurnoMock: vi.fn(),
  cerrarTurnoMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock("@/services/caja", () => ({ getEstadoTurno: getEstadoTurnoMock, cerrarTurno: cerrarTurnoMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ esAdmin: true, permisos: [] }) }))

const FECHA = "2026-10-09"

// Cuotas 1800 + ventas 200 + ingresos 0 − egresos 500 = 1500 neto
const enVivo: TotalesTurno = {
  totalPorMetodo: { efectivo: 1000, transferencia: 500, mixto: 300 },
  total: 1500,
  totalCuotas: 1800,
  totalVentas: 200,
  totalIngresosExtra: 0,
  totalEgresos: 500,
  cantidadPagos: 3,
  desglose: {
    cuotas: { efectivo: 1200, transferencia: 600, total: 1800, cantidad: 3, cobrosMixtos: 300 },
    ventas: { efectivo: 0, transferencia: 200, total: 200, cantidad: 1 },
    ingresosExtra: { efectivo: 0, transferencia: 0, total: 0 },
    egresos: { efectivo: 500, transferencia: 0, total: 500 },
  },
  empleados: [
    { usuarioId: "u1", usuarioNombre: "Juan Pérez" },
    { usuarioId: "u2", usuarioNombre: "Ana López" },
  ],
}

function estadoAbierto(turno: Turno): EstadoTurno {
  return { fecha: FECHA, turno, turnoActual: "tarde", cerrado: null, enVivo }
}

function estadoCerrado(turno: Turno): EstadoTurno {
  return {
    fecha: FECHA,
    turno,
    turnoActual: "tarde",
    enVivo: null,
    cerrado: {
      ...enVivo,
      id: "c1",
      fecha: FECHA,
      turno,
      creadoPorNombre: "Marcos",
      createdAt: "2026-10-09T18:30:00.000Z",
    },
  }
}

afterEach(() => {
  getEstadoTurnoMock.mockReset()
  cerrarTurnoMock.mockReset()
  toastMock.mockReset()
})

describe("CierreTurnoPanel", () => {
  it("turno cerrado: muestra estado Cerrado, empleados como badges y botón deshabilitado", async () => {
    getEstadoTurnoMock.mockResolvedValue(estadoCerrado("tarde"))
    render(<CierreTurnoPanel fecha={FECHA} />)

    expect(await screen.findByText("Cerrado")).toBeInTheDocument()
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument()
    expect(screen.getByText("Ana López")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Turno ya cerrado" })).toBeDisabled()
  })

  it("muestra el desglose: cuotas, ventas, egresos en rojo y total neto", async () => {
    getEstadoTurnoMock.mockResolvedValue(estadoAbierto("tarde"))
    render(<CierreTurnoPanel fecha={FECHA} />)

    expect(await screen.findByText("Composición del turno")).toBeInTheDocument()
    expect(screen.getByText("Cuotas")).toBeInTheDocument()
    expect(screen.getByText("Ventas de kiosco")).toBeInTheDocument()
    const egresos = screen.getByText("−", { exact: false }).closest("dd")
    expect(egresos).toHaveClass("text-destructive")
    expect(screen.getByText("Total neto")).toBeInTheDocument()
  })

  it("cierre previo sin desglose: muestra solo el total, sin composición", async () => {
    getEstadoTurnoMock.mockResolvedValue({
      ...estadoCerrado("tarde"),
      cerrado: { ...estadoCerrado("tarde").cerrado!, desglose: {} },
    })
    render(<CierreTurnoPanel fecha={FECHA} />)

    expect(await screen.findByText("Cerrado")).toBeInTheDocument()
    expect(screen.queryByText("Composición del turno")).not.toBeInTheDocument()
  })

  it("el botón abre un diálogo con turno, fecha y total; solo confirmar ejecuta el cierre", async () => {
    let cerrado = false
    getEstadoTurnoMock.mockImplementation(() => Promise.resolve(cerrado ? estadoCerrado("tarde") : estadoAbierto("tarde")))
    cerrarTurnoMock.mockImplementation(() => {
      cerrado = true
      return Promise.resolve({})
    })
    render(<CierreTurnoPanel fecha={FECHA} />)

    await userEvent.click(await screen.findByRole("button", { name: "Cerrar turno" }))

    expect(await screen.findByText("¿Cerrar el turno tarde del 09/10/2026?")).toBeInTheDocument()
    expect(screen.getByText(/Se registrará un total de/)).toHaveTextContent("1.500")
    expect(cerrarTurnoMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Confirmar cierre" }))

    await waitFor(() => expect(cerrarTurnoMock).toHaveBeenCalledWith({ fecha: FECHA, turno: "tarde" }))
    expect(await screen.findByText("Cerrado")).toBeInTheDocument()
  })

  it("cancelar el diálogo no ejecuta el cierre", async () => {
    getEstadoTurnoMock.mockResolvedValue(estadoAbierto("tarde"))
    render(<CierreTurnoPanel fecha={FECHA} />)

    await userEvent.click(await screen.findByRole("button", { name: "Cerrar turno" }))
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }))

    await waitFor(() => expect(screen.queryByText("Confirmar cierre")).not.toBeInTheDocument())
    expect(cerrarTurnoMock).not.toHaveBeenCalled()
  })

  it("cambiar de turno vuelve a pedir el estado de ese turno", async () => {
    getEstadoTurnoMock.mockImplementation(({ turno }: { turno?: Turno }) =>
      Promise.resolve(turno === "mañana" ? estadoCerrado("mañana") : estadoAbierto("tarde"))
    )
    render(<CierreTurnoPanel fecha={FECHA} />)

    expect(await screen.findByText("En curso")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("tab", { name: "Mañana" }))

    expect(await screen.findByText("Cerrado")).toBeInTheDocument()
    await waitFor(() =>
      expect(getEstadoTurnoMock).toHaveBeenLastCalledWith({ fecha: FECHA, turno: "mañana" })
    )
  })
})
