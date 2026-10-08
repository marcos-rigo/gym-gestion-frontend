import { render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { UsuarioModule } from "./usuario-module"
import type { Usuario } from "@/lib/types"

const { getUsuariosMock, deleteUsuarioMock, toggleActivoUsuarioMock, getRolesMock } = vi.hoisted(() => ({
  getUsuariosMock: vi.fn(),
  deleteUsuarioMock: vi.fn(),
  toggleActivoUsuarioMock: vi.fn(),
  getRolesMock: vi.fn(),
}))

vi.mock("@/services/usuarios", () => ({
  getUsuarios: getUsuariosMock,
  deleteUsuario: deleteUsuarioMock,
  toggleActivoUsuario: toggleActivoUsuarioMock,
}))
vi.mock("@/services/roles", () => ({ getRoles: getRolesMock }))

const usuarios: Usuario[] = [
  {
    id: "u1",
    nombre: "Marcos Rigo",
    email: "marcos@example.com",
    idRol: "rol-admin",
    rolDescripcion: "Admin",
    esAdmin: true,
    activo: true,
    protegido: true,
    createdAt: "",
  },
  {
    id: "u2",
    nombre: "Ana Gómez",
    email: "ana@example.com",
    idRol: "rol-empleado",
    rolDescripcion: "Empleado",
    esAdmin: false,
    activo: true,
    protegido: false,
    createdAt: "",
  },
]

describe("UsuarioModule - usuario protegido", () => {
  it("la fila protegida no tiene editar/eliminar/switch, pero sí el badge; la normal tiene todo", async () => {
    getUsuariosMock.mockResolvedValue(usuarios)
    getRolesMock.mockResolvedValue([])
    render(<UsuarioModule />)

    await waitFor(() => expect(screen.getByText("Marcos Rigo")).toBeInTheDocument())

    const filaProtegida = within(screen.getByText("Marcos Rigo").closest("tr")!)
    expect(filaProtegida.getByText("Protegido")).toBeInTheDocument()
    expect(filaProtegida.queryByRole("button", { name: "Editar usuario" })).not.toBeInTheDocument()
    expect(filaProtegida.queryByRole("button", { name: "Eliminar usuario" })).not.toBeInTheDocument()
    expect(filaProtegida.queryByRole("switch")).not.toBeInTheDocument()

    const filaNormal = within(screen.getByText("Ana Gómez").closest("tr")!)
    expect(filaNormal.queryByText("Protegido")).not.toBeInTheDocument()
    expect(filaNormal.getByRole("button", { name: "Editar usuario" })).toBeInTheDocument()
    expect(filaNormal.getByRole("button", { name: "Eliminar usuario" })).toBeInTheDocument()
    expect(filaNormal.getByRole("switch")).toBeInTheDocument()
  })
})
