import { render, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ClienteModule } from "./cliente-module"
import { PERMISOS } from "@/lib/permissions"
import type { Cliente } from "@/lib/types"

const { useAuthMock, getClientesMock, deleteClienteMock, replaceMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getClientesMock: vi.fn(),
  deleteClienteMock: vi.fn(),
  replaceMock: vi.fn(),
}))

vi.mock("@/contexts/auth-context", () => ({ useAuth: useAuthMock }))
vi.mock("@/services/clientes", () => ({ getClientes: getClientesMock, deleteCliente: deleteClienteMock }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
}))

const clientes: Cliente[] = [
  {
    idCliente: "c1",
    apellido: "Pérez",
    nombre: "Juan",
    nombreCompleto: "Pérez, Juan",
    dni: "12345678",
    fechaNacimiento: "",
    telefono: "",
    email: "",
    direccion: "",
    fotoUrl: "",
    contactoEmergencia: "",
    observaciones: "",
    fechaAlta: "",
    fechaInicioCuota: "",
    fechaVencimiento: "2026-11-01",
    estado: "activo",
    estadoCuota: "al_dia",
    createdAt: "",
  },
]

function renderModule(auth: { esAdmin: boolean; permisos: string[] }) {
  useAuthMock.mockReturnValue(auth)
  getClientesMock.mockResolvedValue(clientes)
  return render(<ClienteModule />)
}

function fila() {
  return screen.getByText("Pérez, Juan").closest("tr")!
}

describe("ClienteModule - botones según permisos", () => {
  it("un admin ve crear/editar/eliminar", async () => {
    renderModule({ esAdmin: true, permisos: [] })
    await waitFor(() => expect(screen.getByText("Pérez, Juan")).toBeInTheDocument())

    expect(screen.getByRole("button", { name: "Nuevo Cliente" })).toBeInTheDocument()
    const row = within(fila())
    expect(row.getByRole("button", { name: "Ver cliente" })).toBeInTheDocument()
    expect(row.getByRole("button", { name: "Editar cliente" })).toBeInTheDocument()
    expect(row.getByRole("button", { name: "Eliminar cliente" })).toBeInTheDocument()
  })

  it("el rol Empleado (ver/crear/editar, sin eliminar) no ve el tacho de eliminar", async () => {
    renderModule({
      esAdmin: false,
      permisos: [PERMISOS.CLIENTES_VER, PERMISOS.CLIENTES_CREAR, PERMISOS.CLIENTES_EDITAR],
    })
    await waitFor(() => expect(screen.getByText("Pérez, Juan")).toBeInTheDocument())

    expect(screen.getByRole("button", { name: "Nuevo Cliente" })).toBeInTheDocument()
    const row = within(fila())
    expect(row.getByRole("button", { name: "Ver cliente" })).toBeInTheDocument()
    expect(row.getByRole("button", { name: "Editar cliente" })).toBeInTheDocument()
    expect(row.queryByRole("button", { name: "Eliminar cliente" })).not.toBeInTheDocument()
  })

  it("con solo clientes_ver no hay Nuevo/Editar/Eliminar, pero sí Ver", async () => {
    renderModule({ esAdmin: false, permisos: [PERMISOS.CLIENTES_VER] })
    await waitFor(() => expect(screen.getByText("Pérez, Juan")).toBeInTheDocument())

    expect(screen.queryByRole("button", { name: "Nuevo Cliente" })).not.toBeInTheDocument()
    const row = within(fila())
    expect(row.getByRole("button", { name: "Ver cliente" })).toBeInTheDocument()
    expect(row.queryByRole("button", { name: "Editar cliente" })).not.toBeInTheDocument()
    expect(row.queryByRole("button", { name: "Eliminar cliente" })).not.toBeInTheDocument()
  })
})
