import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ClienteFormDialog } from "./cliente-form-dialog"

const { createClienteMock, updateClienteMock, uploadFotoClienteMock, toastMock } = vi.hoisted(() => ({
  createClienteMock: vi.fn(),
  updateClienteMock: vi.fn(),
  uploadFotoClienteMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock("@/services/clientes", () => ({
  createCliente: createClienteMock,
  updateCliente: updateClienteMock,
  uploadFotoCliente: uploadFotoClienteMock,
}))

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))

function renderDialog(props: Partial<React.ComponentProps<typeof ClienteFormDialog>> = {}) {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  render(
    <ClienteFormDialog open onOpenChange={onOpenChange} onSuccess={onSuccess} {...props} />
  )
  return { onOpenChange, onSuccess }
}

describe("ClienteFormDialog", () => {
  afterEach(() => {
    createClienteMock.mockReset()
    updateClienteMock.mockReset()
    uploadFotoClienteMock.mockReset()
    toastMock.mockReset()
  })

  it("el campo DNI bloquea letras al tipear", async () => {
    const user = userEvent.setup()
    renderDialog()

    const dni = screen.getByLabelText("DNI *")
    await user.type(dni, "ABC1234")

    expect(dni).toHaveValue("1234")
  })

  it("el campo nombre bloquea dígitos al tipear", async () => {
    const user = userEvent.setup()
    renderDialog()

    const nombre = screen.getByLabelText("Nombre *")
    await user.type(nombre, "Juan1")

    expect(nombre).toHaveValue("Juan")
  })

  it("el campo teléfono permite + y dígitos, bloquea letras", async () => {
    const user = userEvent.setup()
    renderDialog()

    const telefono = screen.getByLabelText("Teléfono")
    await user.type(telefono, "+54abc91122334455")

    expect(telefono).toHaveValue("+5491122334455")
  })

  it("al pegar un DNI con letras, el valor pegado se limpia", async () => {
    const user = userEvent.setup()
    renderDialog()

    const dni = screen.getByLabelText("DNI *")
    await user.click(dni)
    await user.paste("12AB3456")

    expect(dni).toHaveValue("123456")
  })

  it("muestra el error de longitud mínima de nombre debajo del campo", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "J")
    await user.type(screen.getByLabelText("Apellido *"), "Pérez")
    await user.type(screen.getByLabelText("DNI *"), "12345678")
    await user.click(screen.getByRole("button", { name: "Crear cliente" }))

    expect(await screen.findByText("Debe tener entre 2 y 50 caracteres")).toBeInTheDocument()
    expect(createClienteMock).not.toHaveBeenCalled()
  })

  it("rechaza una fecha de nacimiento futura", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "Juan")
    await user.type(screen.getByLabelText("Apellido *"), "Pérez")
    await user.type(screen.getByLabelText("DNI *"), "12345678")
    const futuro = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)
    fireEvent.change(screen.getByLabelText("Fecha de nacimiento"), { target: { value: futuro } })
    await user.click(screen.getByRole("button", { name: "Crear cliente" }))

    expect(await screen.findByText("La fecha de nacimiento no puede ser futura")).toBeInTheDocument()
    expect(createClienteMock).not.toHaveBeenCalled()
  })

  it("deshabilita el botón de submit mientras guarda", async () => {
    let resolveCreate!: (value: unknown) => void
    createClienteMock.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve }))
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "Juan")
    await user.type(screen.getByLabelText("Apellido *"), "Pérez")
    await user.type(screen.getByLabelText("DNI *"), "12345678")
    await user.click(screen.getByRole("button", { name: "Crear cliente" }))

    expect(await screen.findByRole("button", { name: "Guardando..." })).toBeDisabled()
    await act(async () => { resolveCreate({}) })
  })

  it("un DNI duplicado (409 con errors.dni) se muestra debajo del campo DNI", async () => {
    const err = Object.assign(new Error("Ya existe un cliente con ese DNI"), {
      status: 409,
      errors: { dni: "Ya existe un cliente con ese DNI" },
    })
    createClienteMock.mockRejectedValue(err)
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "Juan")
    await user.type(screen.getByLabelText("Apellido *"), "Pérez")
    await user.type(screen.getByLabelText("DNI *"), "87654321")
    await user.click(screen.getByRole("button", { name: "Crear cliente" }))

    expect(await screen.findByText("Ya existe un cliente con ese DNI")).toBeInTheDocument()
    expect(toastMock).not.toHaveBeenCalled()
  })

  it("un error sin campo (403) se muestra como toast", async () => {
    const err = Object.assign(new Error("Acceso denegado"), { status: 403 })
    createClienteMock.mockRejectedValue(err)
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "Juan")
    await user.type(screen.getByLabelText("Apellido *"), "Pérez")
    await user.type(screen.getByLabelText("DNI *"), "87654321")
    await user.click(screen.getByRole("button", { name: "Crear cliente" }))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: "Error al crear el cliente",
        description: "Acceso denegado",
        variant: "destructive",
      })
    )
  })

  it("crea un cliente válido y llama a onSuccess", async () => {
    createClienteMock.mockResolvedValue({ data: { id: "1" } })
    const user = userEvent.setup()
    const { onSuccess, onOpenChange } = renderDialog()

    await user.type(screen.getByLabelText("Nombre *"), "María")
    await user.type(screen.getByLabelText("Apellido *"), "Pérez")
    await user.type(screen.getByLabelText("DNI *"), "87654321")
    await user.click(screen.getByRole("button", { name: "Crear cliente" }))

    await waitFor(() => expect(createClienteMock).toHaveBeenCalledTimes(1))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSuccess).toHaveBeenCalled()
  })

  it("si falla getUserMedia, muestra un toast de error de cámara", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole("button", { name: "Activar cámara" }))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Error al acceder a la cámara" })
      )
    )
  })
})
