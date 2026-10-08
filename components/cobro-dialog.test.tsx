import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CobroDialog } from "./cobro-dialog"
import type { Cliente } from "@/lib/types"

const { registrarPagoMock, toastMock } = vi.hoisted(() => ({
  registrarPagoMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock("@/services/pagos", () => ({ registrarPago: registrarPagoMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))

const cliente = { idCliente: "c1", nombreCompleto: "Pérez, Juan" } as Cliente

function renderDialog() {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  render(<CobroDialog cliente={cliente} open onOpenChange={onOpenChange} onSuccess={onSuccess} />)
  return { onOpenChange, onSuccess }
}

async function setMonto(user: ReturnType<typeof userEvent.setup>, value: string) {
  const monto = screen.getByLabelText("Monto *")
  await user.clear(monto)
  await user.type(monto, value)
}

describe("CobroDialog", () => {
  afterEach(() => {
    registrarPagoMock.mockReset()
    toastMock.mockReset()
  })

  it("el campo monto bloquea letras y el signo menos", async () => {
    const user = userEvent.setup()
    renderDialog()

    await setMonto(user, "-abc100.5x")

    expect(screen.getByLabelText("Monto *")).toHaveValue("100.5")
  })

  it("rechaza un monto igual a cero", async () => {
    const user = userEvent.setup()
    renderDialog()

    await setMonto(user, "0")
    await user.click(screen.getByRole("button", { name: "Registrar cobro" }))

    expect(await screen.findByText("El monto debe ser mayor a cero")).toBeInTheDocument()
    expect(registrarPagoMock).not.toHaveBeenCalled()
  })

  it("rechaza un monto con 3 decimales", async () => {
    const user = userEvent.setup()
    renderDialog()

    await setMonto(user, "100.999")
    await user.click(screen.getByRole("button", { name: "Registrar cobro" }))

    expect(await screen.findByText("El monto admite como máximo 2 decimales")).toBeInTheDocument()
    expect(registrarPagoMock).not.toHaveBeenCalled()
  })

  it("registra un cobro válido con el monto por defecto y método efectivo", async () => {
    registrarPagoMock.mockResolvedValue({ periodoHasta: "2026-12-07" })
    const user = userEvent.setup()
    const { onSuccess } = renderDialog()

    expect(screen.getByLabelText("Monto *")).toHaveValue("45000")
    await user.click(screen.getByRole("button", { name: "Registrar cobro" }))

    await waitFor(() =>
      expect(registrarPagoMock).toHaveBeenCalledWith({ clienteId: "c1", monto: 45000, metodo: "efectivo" })
    )
    expect(onSuccess).toHaveBeenCalled()
  })

  it("permite elegir otro método de pago", async () => {
    registrarPagoMock.mockResolvedValue({})
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByLabelText("Método de pago *"))
    await user.click(await screen.findByRole("option", { name: "Tarjeta" }))
    await user.click(screen.getByRole("button", { name: "Registrar cobro" }))

    await waitFor(() =>
      expect(registrarPagoMock).toHaveBeenCalledWith({ clienteId: "c1", monto: 45000, metodo: "tarjeta" })
    )
  })

  it("un cliente inexistente (404) se muestra como toast", async () => {
    const err = Object.assign(new Error("Cliente no encontrado"), { status: 404 })
    registrarPagoMock.mockRejectedValue(err)
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole("button", { name: "Registrar cobro" }))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: "Error al registrar el cobro",
        description: "Cliente no encontrado",
        variant: "destructive",
      })
    )
  })

  it("deshabilita el botón de submit mientras registra", async () => {
    let resolveRegistrar!: (value: unknown) => void
    registrarPagoMock.mockReturnValue(new Promise((resolve) => { resolveRegistrar = resolve }))
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole("button", { name: "Registrar cobro" }))

    expect(await screen.findByRole("button", { name: "Registrando..." })).toBeDisabled()
    await act(async () => { resolveRegistrar({}) })
  })
})
