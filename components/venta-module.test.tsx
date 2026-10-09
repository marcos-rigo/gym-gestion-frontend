import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { VentaModule } from "./venta-module"
import type { Producto, Venta } from "@/lib/types"

const { useAuthMock, getProductosMock, getVentasMock, crearVentaMock, getClientesMock, toastMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getProductosMock: vi.fn(),
  getVentasMock: vi.fn(),
  crearVentaMock: vi.fn(),
  getClientesMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock("@/contexts/auth-context", () => ({ useAuth: useAuthMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))
vi.mock("@/services/productos", () => ({ getProductos: getProductosMock }))
vi.mock("@/services/ventas", () => ({ getVentas: getVentasMock, crearVenta: crearVentaMock, getReporteVentas: vi.fn() }))
vi.mock("@/services/clientes", () => ({ getClientes: getClientesMock }))

const producto1: Producto = {
  id: "p1",
  nombre: "Agua",
  descripcion: null,
  categoria: null,
  precio: 1000,
  activo: true,
  controlaStock: false,
  stockActual: null,
  stockMinimo: null,
  createdAt: "",
  updatedAt: "",
}

const producto2: Producto = {
  id: "p2",
  nombre: "Barrita",
  descripcion: null,
  categoria: null,
  precio: 500,
  activo: true,
  controlaStock: false,
  stockActual: null,
  stockMinimo: null,
  createdAt: "",
  updatedAt: "",
}

function setup() {
  useAuthMock.mockReturnValue({ esAdmin: true, permisos: [] })
  getProductosMock.mockResolvedValue({ data: [producto1, producto2], meta: { total: 2 } })
  getVentasMock.mockResolvedValue({ data: [], meta: { total: 0 } })
  getClientesMock.mockResolvedValue([])
}

describe("VentaModule", () => {
  afterEach(() => {
    getProductosMock.mockReset()
    getVentasMock.mockReset()
    crearVentaMock.mockReset()
    getClientesMock.mockReset()
    toastMock.mockReset()
    useAuthMock.mockReset()
  })

  it("agregar productos al carrito suma cantidades y calcula el total", async () => {
    setup()
    const user = userEvent.setup()
    render(<VentaModule />)

    const botonAgua = await screen.findByRole("button", { name: /^Agua/ })
    const botonBarrita = screen.getByRole("button", { name: /^Barrita/ })
    await user.click(botonAgua)
    await user.click(botonAgua)
    await user.click(botonBarrita)

    expect(screen.getByText("$ 2.500,00")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Quitar una unidad de Agua" }))
    expect(screen.getByText("$ 1.500,00")).toBeInTheDocument()
  })

  it("Cobrar exige elegir un método de pago", async () => {
    setup()
    const user = userEvent.setup()
    render(<VentaModule />)

    await user.click(await screen.findByRole("button", { name: /^Agua/ }))
    await user.click(screen.getByRole("button", { name: "Cobrar" }))

    expect(await screen.findByText("Seleccioná un método de pago")).toBeInTheDocument()
    expect(crearVentaMock).not.toHaveBeenCalled()
  })

  it("un pago dividido que no suma el total no cobra", async () => {
    setup()
    const user = userEvent.setup()
    render(<VentaModule />)

    await user.click(await screen.findByRole("button", { name: /^Agua/ }))
    await user.click(screen.getByRole("button", { name: "Dividido" }))
    // Total es $1.000; al poner más en efectivo que el total, el resto se clampea a 0
    // en vez de ir negativo, así que la suma (2000 + 0) termina sin igualar el total.
    await user.type(screen.getByLabelText("Efectivo"), "2000")
    await user.click(screen.getByRole("button", { name: "Cobrar" }))

    expect(await screen.findByText("La suma de ambos montos debe ser igual al total")).toBeInTheDocument()
    expect(crearVentaMock).not.toHaveBeenCalled()
  })

  it("cobra en efectivo y limpia el carrito", async () => {
    setup()
    crearVentaMock.mockResolvedValue({} as Venta)
    const user = userEvent.setup()
    render(<VentaModule />)

    await user.click(await screen.findByRole("button", { name: /^Agua/ }))
    await user.click(screen.getByRole("button", { name: "Efectivo" }))
    await user.click(screen.getByRole("button", { name: "Cobrar" }))

    await waitFor(() =>
      expect(crearVentaMock).toHaveBeenCalledWith({
        items: [{ idProducto: "p1", cantidad: 1 }],
        pagos: [{ metodo: "efectivo", monto: 1000 }],
      })
    )
    expect(screen.getByText("El carrito está vacío.")).toBeInTheDocument()
  })

  it("sin permiso ventas_anular no muestra el botón Anular venta en el historial", async () => {
    useAuthMock.mockReturnValue({ esAdmin: false, permisos: ["ventas_ver", "ventas_registrar"] })
    getProductosMock.mockResolvedValue({ data: [producto1], meta: { total: 1 } })
    getClientesMock.mockResolvedValue([])
    const venta: Venta = {
      id: "v1",
      fechaHora: new Date().toISOString(),
      idUsuario: "u1",
      usuarioNombre: "Empleado Test",
      idCliente: null,
      clienteNombreCompleto: null,
      total: 1000,
      anulada: false,
      motivoAnulacion: null,
      anuladaPor: null,
      anuladaAt: null,
      createdAt: "",
      items: [{ id: "i1", idProducto: "p1", nombreSnapshot: "Agua", precioUnitario: 1000, cantidad: 1, subtotal: 1000 }],
      pagos: [{ id: "pg1", metodo: "efectivo", monto: 1000 }],
    }
    getVentasMock.mockResolvedValue({ data: [venta], meta: { total: 1 } })

    render(<VentaModule />)

    await waitFor(() => expect(screen.getAllByText(/1x Agua/).length).toBeGreaterThan(0))
    expect(screen.queryByRole("button", { name: "Anular venta" })).not.toBeInTheDocument()
  })
})
