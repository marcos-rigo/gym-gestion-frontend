import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { UsuarioFormDialog } from "./usuario-form-dialog"
import type { Usuario } from "@/lib/types"

const { createUsuarioMock, updateUsuarioMock, getRolesMock, toastMock } = vi.hoisted(() => ({
  createUsuarioMock: vi.fn(),
  updateUsuarioMock: vi.fn(),
  getRolesMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock("@/services/usuarios", () => ({
  createUsuario: createUsuarioMock,
  updateUsuario: updateUsuarioMock,
}))
vi.mock("@/services/roles", () => ({ getRoles: getRolesMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))

const ROLES = [
  { idRol: "rol-empleado", descripcion: "Empleado", permissions: [], userCount: 0, esAdmin: false, createdAt: "" },
  { idRol: "rol-admin", descripcion: "Admin", permissions: [], userCount: 0, esAdmin: true, createdAt: "" },
]

function renderDialog(initialData: Usuario | null = null) {
  getRolesMock.mockResolvedValue(ROLES)
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  render(
    <UsuarioFormDialog open onOpenChange={onOpenChange} onSuccess={onSuccess} initialData={initialData} />
  )
  return { onOpenChange, onSuccess }
}

async function elegirRol(user: ReturnType<typeof userEvent.setup>, nombre: string) {
  await user.click(screen.getByLabelText("Rol *"))
  await user.click(await screen.findByRole("option", { name: nombre }))
}

describe("UsuarioFormDialog - alta", () => {
  afterEach(() => {
    createUsuarioMock.mockReset()
    updateUsuarioMock.mockReset()
    getRolesMock.mockReset()
    toastMock.mockReset()
  })

  it("rechaza una contraseña débil (sin número)", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "Juan")
    await user.type(screen.getByLabelText("Email *"), "juan@example.com")
    await user.type(screen.getByLabelText("Contraseña *"), "abcdefgh")
    await user.type(screen.getByLabelText("Confirmar contraseña *"), "abcdefgh")
    await elegirRol(user, "Empleado")
    await user.click(screen.getByRole("button", { name: "Crear usuario" }))

    expect(await screen.findByText("Debe incluir al menos un número")).toBeInTheDocument()
    expect(createUsuarioMock).not.toHaveBeenCalled()
  })

  it("rechaza confirmación de contraseña distinta", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "Juan")
    await user.type(screen.getByLabelText("Email *"), "juan@example.com")
    await user.type(screen.getByLabelText("Contraseña *"), "Test1234")
    await user.type(screen.getByLabelText("Confirmar contraseña *"), "Test5678")
    await elegirRol(user, "Empleado")
    await user.click(screen.getByRole("button", { name: "Crear usuario" }))

    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument()
    expect(createUsuarioMock).not.toHaveBeenCalled()
  })

  it("el ojo de contraseña y confirmación alternan su propio campo sin perder el foco", async () => {
    const user = userEvent.setup()
    renderDialog()

    const password = screen.getByLabelText("Contraseña *")
    const confirm = screen.getByLabelText("Confirmar contraseña *")
    expect(password).toHaveAttribute("type", "password")
    expect(confirm).toHaveAttribute("type", "password")

    await user.click(password)
    await user.click(screen.getAllByRole("button", { name: "Mostrar contraseña" })[0])
    expect(password).toHaveAttribute("type", "text")
    expect(confirm).toHaveAttribute("type", "password")
    expect(document.activeElement).toBe(password)
  })

  it("un email duplicado (409 con errors.email) se muestra debajo del campo email", async () => {
    const err = Object.assign(new Error("Ya existe un usuario con ese email"), {
      status: 409,
      errors: { email: "Ya existe un usuario con ese email" },
    })
    createUsuarioMock.mockRejectedValue(err)
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "Juan")
    await user.type(screen.getByLabelText("Email *"), "juan@example.com")
    await user.type(screen.getByLabelText("Contraseña *"), "Test1234")
    await user.type(screen.getByLabelText("Confirmar contraseña *"), "Test1234")
    await elegirRol(user, "Empleado")
    await user.click(screen.getByRole("button", { name: "Crear usuario" }))

    expect(await screen.findByText("Ya existe un usuario con ese email")).toBeInTheDocument()
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("crea un usuario válido y llama a onSuccess", async () => {
    createUsuarioMock.mockResolvedValue({ data: { id: "1" } })
    const user = userEvent.setup()
    const { onSuccess } = renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "Juan")
    await user.type(screen.getByLabelText("Email *"), "juan@example.com")
    await user.type(screen.getByLabelText("Contraseña *"), "Test1234")
    await user.type(screen.getByLabelText("Confirmar contraseña *"), "Test1234")
    await elegirRol(user, "Empleado")
    await user.click(screen.getByRole("button", { name: "Crear usuario" }))

    await waitFor(() =>
      expect(createUsuarioMock).toHaveBeenCalledWith({
        nombre: "Juan",
        email: "juan@example.com",
        idRol: "rol-empleado",
        password: "Test1234",
      })
    )
    expect(onSuccess).toHaveBeenCalled()
  })

  it("deshabilita el botón de submit mientras guarda", async () => {
    let resolveCreate!: (value: unknown) => void
    createUsuarioMock.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve }))
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "Juan")
    await user.type(screen.getByLabelText("Email *"), "juan@example.com")
    await user.type(screen.getByLabelText("Contraseña *"), "Test1234")
    await user.type(screen.getByLabelText("Confirmar contraseña *"), "Test1234")
    await elegirRol(user, "Empleado")
    await user.click(screen.getByRole("button", { name: "Crear usuario" }))

    expect(await screen.findByRole("button", { name: "Guardando..." })).toBeDisabled()
    await act(async () => { resolveCreate({}) })
  })
})

describe("UsuarioFormDialog - edición", () => {
  afterEach(() => {
    createUsuarioMock.mockReset()
    updateUsuarioMock.mockReset()
    getRolesMock.mockReset()
    toastMock.mockReset()
  })

  const usuario = {
    id: "u1",
    nombre: "Juan",
    email: "juan@example.com",
    idRol: "rol-empleado",
    rolDescripcion: "Empleado",
    esAdmin: false,
    activo: true,
    protegido: false,
    createdAt: "",
  } satisfies Usuario

  it("no muestra los campos de contraseña al editar", async () => {
    renderDialog(usuario)
    expect(await screen.findByLabelText("Nombre *")).toHaveValue("Juan")
    expect(screen.queryByLabelText("Contraseña *")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Confirmar contraseña *")).not.toBeInTheDocument()
  })

  it("precarga nombre/email y permite guardar sin pedir password", async () => {
    updateUsuarioMock.mockResolvedValue({ data: { id: "u1" } })
    const user = userEvent.setup()
    const { onSuccess } = renderDialog(usuario)

    expect(screen.getByLabelText("Nombre *")).toHaveValue("Juan")
    expect(screen.getByLabelText("Email *")).toHaveValue("juan@example.com")

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() =>
      expect(updateUsuarioMock).toHaveBeenCalledWith("u1", {
        nombre: "Juan",
        email: "juan@example.com",
        idRol: "rol-empleado",
      })
    )
    expect(onSuccess).toHaveBeenCalled()
  })
})
