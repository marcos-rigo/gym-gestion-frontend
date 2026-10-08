import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RoleFormDialog } from "./role-form-dialog"
import type { Role } from "@/lib/types"

const { createRolMock, updateRolMock, toastMock } = vi.hoisted(() => ({
  createRolMock: vi.fn(),
  updateRolMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock("@/services/roles", () => ({ createRol: createRolMock, updateRol: updateRolMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))

function renderDialog(initialData: Role | null = null) {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  render(<RoleFormDialog open onOpenChange={onOpenChange} onSuccess={onSuccess} initialData={initialData} />)
  return { onOpenChange, onSuccess }
}

describe("RoleFormDialog - alta/edición", () => {
  afterEach(() => {
    createRolMock.mockReset()
    updateRolMock.mockReset()
    toastMock.mockReset()
  })

  it("el campo descripción bloquea dígitos al tipear", async () => {
    const user = userEvent.setup()
    renderDialog()

    const descripcion = screen.getByLabelText("Nombre del rol *")
    await user.type(descripcion, "Supervisor2")

    expect(descripcion).toHaveValue("Supervisor")
  })

  it("exige al menos un permiso seleccionado", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre del rol *"), "Supervisor")
    await user.click(screen.getByRole("button", { name: "Crear rol" }))

    expect(await screen.findByText("Seleccioná al menos un permiso")).toBeInTheDocument()
    expect(createRolMock).not.toHaveBeenCalled()
  })

  it("Seleccionar todos marca todos los checkboxes de la categoría y Quitar todos los desmarca", async () => {
    const user = userEvent.setup()
    renderDialog()

    const clientesButtons = screen.getAllByRole("button", { name: "Seleccionar todos" })
    await user.click(clientesButtons[0])

    expect(screen.getByRole("checkbox", { name: "Ver Clientes" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Crear Clientes" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Editar Clientes" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Eliminar Clientes" })).toBeChecked()

    await user.click(screen.getByRole("button", { name: "Quitar todos" }))
    expect(screen.getByRole("checkbox", { name: "Ver Clientes" })).not.toBeChecked()
  })

  it("crea un rol válido con permisos y llama a onSuccess", async () => {
    createRolMock.mockResolvedValue({ data: { idRol: "r1" } })
    const user = userEvent.setup()
    const { onSuccess } = renderDialog()

    await user.type(screen.getByLabelText("Nombre del rol *"), "Supervisor")
    await user.click(screen.getAllByRole("button", { name: "Seleccionar todos" })[0])
    await user.click(screen.getByRole("button", { name: "Crear rol" }))

    await waitFor(() =>
      expect(createRolMock).toHaveBeenCalledWith({
        descripcion: "Supervisor",
        permissions: ["clientes_ver", "clientes_crear", "clientes_editar", "clientes_eliminar"],
      })
    )
    expect(onSuccess).toHaveBeenCalled()
  })

  it("una descripción duplicada (409) se muestra debajo del campo", async () => {
    const err = Object.assign(new Error("Ya existe un rol con esa descripción"), {
      status: 409,
      errors: { descripcion: "Ya existe un rol con esa descripción" },
    })
    createRolMock.mockRejectedValue(err)
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre del rol *"), "Empleado")
    await user.click(screen.getAllByRole("button", { name: "Seleccionar todos" })[0])
    await user.click(screen.getByRole("button", { name: "Crear rol" }))

    expect(await screen.findByText("Ya existe un rol con esa descripción")).toBeInTheDocument()
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("deshabilita el botón de submit mientras guarda", async () => {
    let resolveCreate!: (value: unknown) => void
    createRolMock.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve }))
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre del rol *"), "Supervisor")
    await user.click(screen.getAllByRole("button", { name: "Seleccionar todos" })[0])
    await user.click(screen.getByRole("button", { name: "Crear rol" }))

    expect(await screen.findByRole("button", { name: "Guardando..." })).toBeDisabled()
    await act(async () => { resolveCreate({}) })
  })
})

describe("RoleFormDialog - rol Admin (protegido)", () => {
  afterEach(() => {
    createRolMock.mockReset()
    updateRolMock.mockReset()
    toastMock.mockReset()
  })

  const adminRole: Role = {
    idRol: "admin",
    descripcion: "Admin",
    permissions: ["clientes_ver"],
    userCount: 1,
    esAdmin: true,
    createdAt: "",
  }

  it("muestra 'Ver Rol', deshabilita los campos y no tiene botón de guardar", () => {
    renderDialog(adminRole)

    expect(screen.getByText("Ver Rol")).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre del rol *")).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: "Ver Clientes" })).toHaveAttribute("aria-disabled", "true")
    expect(screen.queryByRole("button", { name: /Crear rol|Guardar cambios/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument()
  })
})
