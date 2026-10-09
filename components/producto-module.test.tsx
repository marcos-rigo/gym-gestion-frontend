import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ProductoModule } from "./producto-module"
import type { Producto } from "@/lib/types"

const { useAuthMock, getProductosMock, toggleActivoProductoMock, toastMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getProductosMock: vi.fn(),
  toggleActivoProductoMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock("@/contexts/auth-context", () => ({ useAuth: useAuthMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))
vi.mock("@/services/productos", () => ({
  getProductos: getProductosMock,
  toggleActivoProducto: toggleActivoProductoMock,
}))

const producto: Producto = {
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

describe("ProductoModule", () => {
  afterEach(() => {
    useAuthMock.mockReset()
    getProductosMock.mockReset()
    toggleActivoProductoMock.mockReset()
    toastMock.mockReset()
  })

  it("sin permiso productos_crear oculta el botón Nuevo Producto", async () => {
    useAuthMock.mockReturnValue({ esAdmin: false, permisos: ["productos_ver"] })
    getProductosMock.mockResolvedValue({ data: [producto], meta: { total: 1 } })

    render(<ProductoModule />)

    await waitFor(() => expect(getProductosMock).toHaveBeenCalled())
    expect(screen.queryByRole("button", { name: /Nuevo Producto/ })).not.toBeInTheDocument()
  })

  it("con productos_crear muestra el botón Nuevo Producto", async () => {
    useAuthMock.mockReturnValue({ esAdmin: false, permisos: ["productos_ver", "productos_crear"] })
    getProductosMock.mockResolvedValue({ data: [producto], meta: { total: 1 } })

    render(<ProductoModule />)

    await waitFor(() => expect(screen.getByRole("button", { name: /Nuevo Producto/ })).toBeInTheDocument())
  })

  it("sin permiso productos_editar no muestra el switch de activo/inactivo", async () => {
    useAuthMock.mockReturnValue({ esAdmin: false, permisos: ["productos_ver"] })
    getProductosMock.mockResolvedValue({ data: [producto], meta: { total: 1 } })

    render(<ProductoModule />)

    await waitFor(() => expect(screen.getAllByText("Agua").length).toBeGreaterThan(0))
    expect(screen.queryByRole("switch")).not.toBeInTheDocument()
  })
})
