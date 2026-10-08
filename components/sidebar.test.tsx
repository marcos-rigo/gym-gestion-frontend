import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Sidebar } from "./sidebar"
import { PERMISOS } from "@/lib/permissions"

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }))

vi.mock("@/contexts/auth-context", () => ({ useAuth: useAuthMock }))
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }))

function nav() {
  return screen.getByRole("navigation")
}

describe("Sidebar", () => {
  it("un admin ve los 4 links", () => {
    useAuthMock.mockReturnValue({
      usuario: { nombre: "Admin", email: "admin@test.com" },
      permisos: [],
      esAdmin: true,
      logout: vi.fn(),
    })
    render(<Sidebar />)

    const links = nav()
    expect(links).toHaveTextContent("Dashboard")
    expect(links).toHaveTextContent("Clientes")
    expect(links).toHaveTextContent("Usuarios")
    expect(links).toHaveTextContent("Roles")
  })

  it("el rol Empleado (sin estadisticas_ver/usuarios/roles) solo ve Clientes", () => {
    useAuthMock.mockReturnValue({
      usuario: { nombre: "Empleado", email: "empleado@test.com" },
      permisos: [PERMISOS.CLIENTES_VER, PERMISOS.FACTURACION_VER, PERMISOS.FACTURACION_COBRAR],
      esAdmin: false,
      logout: vi.fn(),
    })
    render(<Sidebar />)

    const links = nav()
    expect(links).not.toHaveTextContent("Dashboard")
    expect(links).toHaveTextContent("Clientes")
    expect(links).not.toHaveTextContent("Usuarios")
    expect(links).not.toHaveTextContent("Roles")
  })

  it("un Dueño (no esAdmin) nunca ve Usuarios aunque tenga usuarios_ver en permisos", () => {
    useAuthMock.mockReturnValue({
      usuario: { nombre: "Dueño", email: "dueno@test.com" },
      permisos: [PERMISOS.USUARIOS_VER, PERMISOS.CLIENTES_VER],
      esAdmin: false,
      logout: vi.fn(),
    })
    render(<Sidebar />)

    expect(nav()).not.toHaveTextContent("Usuarios")
  })

  it("sin ningún permiso no ve ningún link de módulo", () => {
    useAuthMock.mockReturnValue({
      usuario: { nombre: "Nadie", email: "nadie@test.com" },
      permisos: [],
      esAdmin: false,
      logout: vi.fn(),
    })
    render(<Sidebar />)

    const links = nav()
    expect(links).not.toHaveTextContent("Dashboard")
    expect(links).not.toHaveTextContent("Clientes")
    expect(links).not.toHaveTextContent("Usuarios")
    expect(links).not.toHaveTextContent("Roles")
  })
})
