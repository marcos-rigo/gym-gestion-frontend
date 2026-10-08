import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RoleGuard } from "./role-guard"
import { RUTAS_PROTEGIDAS } from "@/lib/permissions"

const { useAuthMock, replaceMock, usePathnameMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
  usePathnameMock: vi.fn(),
}))

vi.mock("@/contexts/auth-context", () => ({ useAuth: useAuthMock }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: usePathnameMock,
}))

describe("RoleGuard", () => {
  beforeEach(() => {
    replaceMock.mockReset()
  })

  it("no renderiza nada mientras isLoading es true", () => {
    useAuthMock.mockReturnValue({ usuario: null, permisos: [], esAdmin: false, isLoading: true })
    usePathnameMock.mockReturnValue("/dashboard/usuarios")

    render(
      <RoleGuard ruta={RUTAS_PROTEGIDAS.USUARIOS}>
        <p>contenido protegido</p>
      </RoleGuard>
    )

    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it("renderiza los children cuando el usuario tiene acceso", () => {
    useAuthMock.mockReturnValue({
      usuario: { id: "1" },
      permisos: [],
      esAdmin: true,
      isLoading: false,
    })
    usePathnameMock.mockReturnValue("/dashboard/usuarios")

    render(
      <RoleGuard ruta={RUTAS_PROTEGIDAS.USUARIOS}>
        <p>contenido protegido</p>
      </RoleGuard>
    )

    expect(screen.getByText("contenido protegido")).toBeInTheDocument()
  })

  it("en una ruta normal sin acceso, redirige a /dashboard y no renderiza nada", () => {
    useAuthMock.mockReturnValue({
      usuario: { id: "1" },
      permisos: [],
      esAdmin: false,
      isLoading: false,
    })
    usePathnameMock.mockReturnValue("/dashboard/usuarios")

    render(
      <RoleGuard ruta={RUTAS_PROTEGIDAS.USUARIOS}>
        <p>contenido protegido</p>
      </RoleGuard>
    )

    expect(replaceMock).toHaveBeenCalledWith("/dashboard")
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument()
  })

  it("sin acceso estando ya en /dashboard, NO redirige (evita el loop) y muestra un mensaje", () => {
    useAuthMock.mockReturnValue({
      usuario: { id: "1" },
      permisos: [],
      esAdmin: false,
      isLoading: false,
    })
    usePathnameMock.mockReturnValue("/dashboard")

    render(
      <RoleGuard ruta={RUTAS_PROTEGIDAS.DASHBOARD}>
        <p>contenido protegido</p>
      </RoleGuard>
    )

    expect(replaceMock).not.toHaveBeenCalled()
    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument()
    expect(screen.getByText("No tenés permiso para ver esta página")).toBeInTheDocument()
  })

  it("sin usuario autenticado, no renderiza los children", () => {
    useAuthMock.mockReturnValue({ usuario: null, permisos: [], esAdmin: false, isLoading: false })
    usePathnameMock.mockReturnValue("/dashboard/clientes")

    render(
      <RoleGuard ruta={RUTAS_PROTEGIDAS.CLIENTES}>
        <p>contenido protegido</p>
      </RoleGuard>
    )

    expect(screen.queryByText("contenido protegido")).not.toBeInTheDocument()
  })
})
