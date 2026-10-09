import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FacturacionModule } from "./facturacion-module"
import type { Pago, StatsFacturacion } from "@/lib/types"

const { useAuthMock, getPagosMock, getStatsFacturacionMock, getMorososMock, getPorVencerMock, getCierreCajaCompletoMock } =
  vi.hoisted(() => ({
    useAuthMock: vi.fn(),
    getPagosMock: vi.fn(),
    getStatsFacturacionMock: vi.fn(),
    getMorososMock: vi.fn(),
    getPorVencerMock: vi.fn(),
    getCierreCajaCompletoMock: vi.fn(),
  }))

vi.mock("@/contexts/auth-context", () => ({ useAuth: useAuthMock }))
vi.mock("@/services/pagos", () => ({
  getPagos: getPagosMock,
  getStatsFacturacion: getStatsFacturacionMock,
}))
vi.mock("@/services/clientes", () => ({
  getMorosos: getMorososMock,
  getPorVencer: getPorVencerMock,
  getClientes: vi.fn().mockResolvedValue([]),
}))
vi.mock("@/services/caja", () => ({
  getCierreCajaCompleto: getCierreCajaCompletoMock,
  getEstadoTurno: vi.fn(() => new Promise(() => {})),
  cerrarTurno: vi.fn(),
}))

const stats: StatsFacturacion = {
  hoy: 0,
  ayer: 0,
  semana: 0,
  semanaAnterior: 0,
  mes: 0,
  mesAnterior: 0,
  cantidadPagosMes: 0,
  ticketPromedioMes: 0,
}

function setAuth(auth: { esAdmin?: boolean; permisos?: string[] } = {}) {
  useAuthMock.mockReturnValue({ esAdmin: false, permisos: [], ...auth })
}

describe("FacturacionModule", () => {
  afterEach(() => {
    getPagosMock.mockReset()
    getStatsFacturacionMock.mockReset()
    getMorososMock.mockReset()
    getPorVencerMock.mockReset()
    getCierreCajaCompletoMock.mockReset()
    useAuthMock.mockReset()
  })

  it("renderiza los 4 tabs: Movimientos, Morosos, Por Vencer, Cierre de Caja", async () => {
    setAuth({ esAdmin: true })
    getStatsFacturacionMock.mockResolvedValue(stats)
    getPagosMock.mockResolvedValue({ data: [], meta: { total: 0 } })
    getMorososMock.mockResolvedValue({ data: [], meta: { total: 0, totalAdeudado: 0 } })
    getPorVencerMock.mockResolvedValue({ data: [], meta: { total: 0, proyeccionIngresos: 0 } })
    getCierreCajaCompletoMock.mockResolvedValue({
      fecha: "2026-01-01",
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
    })

    render(<FacturacionModule />)

    await waitFor(() => expect(getStatsFacturacionMock).toHaveBeenCalled())

    expect(screen.getByRole("tab", { name: "Movimientos" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Morosos" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Por Vencer" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Cierre de Caja" })).toBeInTheDocument()
  })

  it("muestra el botón Registrar Pago para admin y lo oculta sin permiso de cobro", async () => {
    getStatsFacturacionMock.mockResolvedValue(stats)
    getPagosMock.mockResolvedValue({ data: [], meta: { total: 0 } })

    setAuth({ esAdmin: true })
    const { unmount } = render(<FacturacionModule />)
    await waitFor(() => expect(screen.getByRole("button", { name: /Registrar Pago/ })).toBeInTheDocument())
    unmount()

    setAuth({ esAdmin: false, permisos: [] })
    render(<FacturacionModule />)
    await waitFor(() => expect(getStatsFacturacionMock).toHaveBeenCalled())
    expect(screen.queryByRole("button", { name: /Registrar Pago/ })).not.toBeInTheDocument()
  })

  it("navega entre tabs y dispara el fetch de cada uno", async () => {
    setAuth({ esAdmin: true })
    getStatsFacturacionMock.mockResolvedValue(stats)
    getPagosMock.mockResolvedValue({ data: [], meta: { total: 0 } })
    getMorososMock.mockResolvedValue({ data: [], meta: { total: 0, totalAdeudado: 0 } })
    getPorVencerMock.mockResolvedValue({ data: [], meta: { total: 0, proyeccionIngresos: 0 } })
    getCierreCajaCompletoMock.mockResolvedValue({
      fecha: "2026-01-01",
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
    })

    const user = userEvent.setup()
    render(<FacturacionModule />)
    await waitFor(() => expect(getPagosMock).toHaveBeenCalled())

    await user.click(screen.getByRole("tab", { name: "Morosos" }))
    await waitFor(() => expect(getMorososMock).toHaveBeenCalled())

    await user.click(screen.getByRole("tab", { name: "Por Vencer" }))
    await waitFor(() => expect(getPorVencerMock).toHaveBeenCalled())

    await user.click(screen.getByRole("tab", { name: "Cierre de Caja" }))
    await waitFor(() => expect(getCierreCajaCompletoMock).toHaveBeenCalled())
  })

  it("solo muestra Anular pago en el pago vigente más reciente de cada cliente", async () => {
    setAuth({ esAdmin: true })
    getStatsFacturacionMock.mockResolvedValue(stats)
    // Orden tal cual lo devuelve el back: fecha_pago DESC.
    const pagos: Pago[] = [
      {
        id: "p-reciente",
        clienteId: "c1",
        clienteNombreCompleto: "Pérez, Juan",
        clienteDni: "1",
        usuarioId: "u1",
        usuarioNombre: "Ana",
        monto: 45000,
        metodo: "efectivo",
        metodos: [{ metodo: "efectivo", monto: 45000 }],
        periodoDesde: "2026-02-01",
        periodoHasta: "2026-03-01",
        fechaPago: "2026-02-01T10:00:00.000Z",
        anulado: false,
        anuladoAt: null,
        anuladoPorNombre: "",
        motivoAnulacion: "",
      },
      {
        id: "p-viejo",
        clienteId: "c1",
        clienteNombreCompleto: "Pérez, Juan",
        clienteDni: "1",
        usuarioId: "u1",
        usuarioNombre: "Ana",
        monto: 45000,
        metodo: "efectivo",
        metodos: [{ metodo: "efectivo", monto: 45000 }],
        periodoDesde: "2026-01-01",
        periodoHasta: "2026-02-01",
        fechaPago: "2026-01-01T10:00:00.000Z",
        anulado: false,
        anuladoAt: null,
        anuladoPorNombre: "",
        motivoAnulacion: "",
      },
      {
        id: "p-otro-cliente",
        clienteId: "c2",
        clienteNombreCompleto: "Gómez, Ana",
        clienteDni: "2",
        usuarioId: "u1",
        usuarioNombre: "Ana",
        monto: 30000,
        metodo: "transferencia",
        metodos: [{ metodo: "transferencia", monto: 30000 }],
        periodoDesde: "2026-01-15",
        periodoHasta: "2026-02-15",
        fechaPago: "2026-01-15T10:00:00.000Z",
        anulado: false,
        anuladoAt: null,
        anuladoPorNombre: "",
        motivoAnulacion: "",
      },
    ]
    getPagosMock.mockResolvedValue({ data: pagos, meta: { total: 3 } })

    render(<FacturacionModule />)
    // Header + 3 pagos. `> 1` no alcanza: header + la fila del spinner de carga ya son 2.
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(4))

    // Las filas se renderizan en el mismo orden que llegan (fecha_pago DESC del back).
    const [filaMasReciente, filaVieja, filaOtroCliente] = screen.getAllByRole("row").slice(1)

    expect(within(filaMasReciente).queryByRole("button", { name: "Anular pago" })).toBeInTheDocument()
    expect(within(filaVieja).queryByRole("button", { name: "Anular pago" })).not.toBeInTheDocument()
    expect(within(filaOtroCliente).queryByRole("button", { name: "Anular pago" })).toBeInTheDocument()
  })
})
