import { beforeEach, describe, expect, it, vi } from "vitest"

function makeToken(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

function stubLocation(pathname = "/dashboard") {
  const location = { pathname, href: `http://localhost:3000${pathname}` }
  Object.defineProperty(window, "location", { value: location, writable: true, configurable: true })
  return location
}

vi.mock("./api", () => ({
  apiClient: vi.fn(),
}))

describe("lib/auth", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
    stubLocation()
  })

  it("getToken devuelve null si no hay token guardado", async () => {
    const { getToken } = await import("./auth")
    expect(getToken()).toBeNull()
  })

  it("isAuthenticated es false sin token", async () => {
    const { isAuthenticated } = await import("./auth")
    expect(isAuthenticated()).toBe(false)
  })

  it("isAuthenticated es true con un token cuyo exp es futuro", async () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 })
    localStorage.setItem("token", token)
    const { isAuthenticated } = await import("./auth")
    expect(isAuthenticated()).toBe(true)
  })

  it("isAuthenticated es false con un token expirado", async () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 10 })
    localStorage.setItem("token", token)
    const { isAuthenticated } = await import("./auth")
    expect(isAuthenticated()).toBe(false)
  })

  it("isAuthenticated es false con un token malformado", async () => {
    localStorage.setItem("token", "esto-no-es-un-jwt")
    const { isAuthenticated } = await import("./auth")
    expect(isAuthenticated()).toBe(false)
  })

  it("login guarda token y usuario en localStorage cuando el backend responde con token", async () => {
    const { apiClient } = await import("./api")
    const usuario = { id: "1", nombre: "Juan", email: "juan@example.com" }
    vi.mocked(apiClient).mockResolvedValue({ token: "abc123", usuario })

    const { login } = await import("./auth")
    const data = await login("juan@example.com", "Test1234")

    expect(data.token).toBe("abc123")
    expect(localStorage.getItem("token")).toBe("abc123")
    expect(JSON.parse(localStorage.getItem("usuario")!)).toEqual(usuario)
  })

  it("logout limpia localStorage y redirige a /login", async () => {
    localStorage.setItem("token", "abc123")
    localStorage.setItem("usuario", JSON.stringify({ id: "1" }))
    const location = stubLocation("/dashboard/clientes")

    const { logout } = await import("./auth")
    logout()

    expect(localStorage.getItem("token")).toBeNull()
    expect(localStorage.getItem("usuario")).toBeNull()
    expect(location.href).toBe("/login")
  })
})
