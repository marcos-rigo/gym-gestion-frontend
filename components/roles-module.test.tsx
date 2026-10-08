import { render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RolesModule } from "./roles-module"
import { PERMISOS } from "@/lib/permissions"
import type { Role } from "@/lib/types"

const { useAuthMock, getRolesMock, deleteRolMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getRolesMock: vi.fn(),
  deleteRolMock: vi.fn(),
}))

vi.mock("@/contexts/auth-context", () => ({ useAuth: useAuthMock }))
vi.mock("@/services/roles", () => ({ getRoles: getRolesMock, deleteRol: deleteRolMock }))

const roles: Role[] = [
  { idRol: "admin", descripcion: "Admin", permissions: ["clientes_ver"], userCount: 1, esAdmin: true, createdAt: "" },
  { idRol: "empleado", descripcion: "Empleado", permissions: ["clientes_ver"], userCount: 2, esAdmin: false, createdAt: "" },
]

function renderModule(auth: { esAdmin: boolean; permisos: string[] }) {
  useAuthMock.mockReturnValue(auth)
  getRolesMock.mockResolvedValue(roles)
  return render(<RolesModule />)
}

describe("RolesModule - permisos y rol Admin protegido", () => {
  it("un admin ve Nuevo Rol, y la fila Admin tiene ojo (no lápiz) y tacho deshabilitado", async () => {
    renderModule({ esAdmin: true, permisos: [] })
    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument())

    expect(screen.getByRole("button", { name: "Nuevo Rol" })).toBeInTheDocument()

    const filaAdmin = within(screen.getByText("Admin").closest("tr")!)
    expect(filaAdmin.getByRole("button", { name: "Ver rol" })).toBeInTheDocument()
    expect(filaAdmin.queryByRole("button", { name: "Editar rol" })).not.toBeInTheDocument()
    expect(filaAdmin.getByRole("button", { name: "Eliminar rol" })).toBeDisabled()

    const filaEmpleado = within(screen.getByText("Empleado").closest("tr")!)
    expect(filaEmpleado.getByRole("button", { name: "Editar rol" })).toBeInTheDocument()
    expect(filaEmpleado.getByRole("button", { name: "Eliminar rol" })).toBeEnabled()
  })

  it("sin roles_crear no se ve Nuevo Rol; sin roles_editar no se ve lápiz; sin roles_eliminar no se ve tacho", async () => {
    renderModule({ esAdmin: false, permisos: [PERMISOS.ROLES_VER] })
    await waitFor(() => expect(screen.getByText("Empleado")).toBeInTheDocument())

    expect(screen.queryByRole("button", { name: "Nuevo Rol" })).not.toBeInTheDocument()
    const filaEmpleado = within(screen.getByText("Empleado").closest("tr")!)
    expect(filaEmpleado.queryByRole("button", { name: "Editar rol" })).not.toBeInTheDocument()
    expect(filaEmpleado.queryByRole("button", { name: "Eliminar rol" })).not.toBeInTheDocument()
  })
})
