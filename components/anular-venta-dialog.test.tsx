import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AnularVentaDialog } from "./anular-venta-dialog"
import type { Venta } from "@/lib/types"

const { anularVentaMock, toastMock } = vi.hoisted(() => ({
  anularVentaMock: vi.fn(),
  toastMock: vi.fn(),
}))

vi.mock("@/services/ventas", () => ({ anularVenta: anularVentaMock }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }))

const venta = { id: "v1", total: 1000 } as Venta

function renderDialog() {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  render(<AnularVentaDialog venta={venta} open onOpenChange={onOpenChange} onSuccess={onSuccess} />)
  return { onOpenChange, onSuccess }
}

describe("AnularVentaDialog", () => {
  afterEach(() => {
    anularVentaMock.mockReset()
    toastMock.mockReset()
  })

  it("exige un motivo de al menos 3 caracteres", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole("button", { name: "Anular venta" }))

    expect(await screen.findByText("El motivo debe tener al menos 3 caracteres")).toBeInTheDocument()
    expect(anularVentaMock).not.toHaveBeenCalled()
  })

  it("anula con un motivo válido", async () => {
    anularVentaMock.mockResolvedValue({})
    const user = userEvent.setup()
    const { onSuccess } = renderDialog()

    await user.type(screen.getByLabelText("Motivo *"), "Cliente se arrepintió")
    await user.click(screen.getByRole("button", { name: "Anular venta" }))

    await waitFor(() => expect(anularVentaMock).toHaveBeenCalledWith("v1", "Cliente se arrepintió"))
    expect(onSuccess).toHaveBeenCalled()
  })
})
