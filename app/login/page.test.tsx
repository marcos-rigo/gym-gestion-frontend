import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import LoginPage from "./page"

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }))
const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ login: loginMock }),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}))

describe("LoginPage", () => {
  afterEach(() => {
    loginMock.mockReset()
    toastMock.mockReset()
  })

  it("muestra el error de contraseña vacía sin llamar a login", async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText("Email"), "juan@example.com")
    await user.click(screen.getByRole("button", { name: "Ingresar" }))

    expect(await screen.findByText("La contraseña es obligatoria")).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it("muestra el error de email mal formado sin llamar a login", async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText("Email"), "no-es-un-email")
    await user.type(screen.getByLabelText("Contraseña"), "cualquiera")
    await user.click(screen.getByRole("button", { name: "Ingresar" }))

    expect(await screen.findByText("Ingresá un email válido")).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it("con credenciales inválidas muestra un toast con el mensaje del backend", async () => {
    loginMock.mockResolvedValue({ success: false, error: "Credenciales inválidas" })
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText("Email"), "juan@example.com")
    await user.type(screen.getByLabelText("Contraseña"), "Test1234")
    await user.click(screen.getByRole("button", { name: "Ingresar" }))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({
        title: "Error al iniciar sesión",
        description: "Credenciales inválidas",
        variant: "destructive",
      })
    )
  })

  it("el botón ojo alterna el tipo del campo sin quitarle el foco", async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    const passwordInput = screen.getByLabelText("Contraseña")
    await user.click(passwordInput)
    expect(passwordInput).toHaveAttribute("type", "password")

    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }))
    expect(passwordInput).toHaveAttribute("type", "text")
    expect(document.activeElement).toBe(passwordInput)

    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }))
    expect(passwordInput).toHaveAttribute("type", "password")
    expect(document.activeElement).toBe(passwordInput)
  })

  it("deshabilita el botón de submit mientras login() está pendiente", async () => {
    let resolveLogin!: (value: { success: boolean }) => void
    loginMock.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve }))
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText("Email"), "juan@example.com")
    await user.type(screen.getByLabelText("Contraseña"), "Test1234")
    await user.click(screen.getByRole("button", { name: "Ingresar" }))

    expect(await screen.findByRole("button", { name: "Ingresando..." })).toBeDisabled()
    await act(async () => {
      resolveLogin({ success: true })
    })
  })
})
