import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function mockFetchOnce(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function stubLocation(pathname: string) {
  const location = { pathname, href: `http://localhost:3000${pathname}` }
  Object.defineProperty(window, "location", { value: location, writable: true, configurable: true })
  return location
}

describe("apiClient", () => {
  beforeEach(() => {
    localStorage.clear()
    stubLocation("/dashboard")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("agrega el Bearer token cuando hay uno en localStorage", async () => {
    localStorage.setItem("token", "abc123")
    const fetchMock = mockFetchOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
    const { apiClient } = await import("./api")

    await apiClient("/clientes")

    const [, config] = fetchMock.mock.calls[0]
    expect(config.headers.Authorization).toBe("Bearer abc123")
  })

  it("no agrega Authorization si no hay token", async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
    const { apiClient } = await import("./api")

    await apiClient("/clientes")

    const [, config] = fetchMock.mock.calls[0]
    expect(config.headers.Authorization).toBeUndefined()
  })

  it("en 401 limpia localStorage y redirige a /login si no está ya ahí", async () => {
    localStorage.setItem("token", "abc123")
    localStorage.setItem("usuario", JSON.stringify({ id: "1" }))
    const location = stubLocation("/dashboard")
    mockFetchOnce({ ok: false, status: 401, json: async () => ({ message: "No autorizado" }) })
    const { apiClient } = await import("./api")

    await expect(apiClient("/clientes")).rejects.toThrow("No autorizado")
    expect(localStorage.getItem("token")).toBeNull()
    expect(localStorage.getItem("usuario")).toBeNull()
    expect(location.href).toBe("/login")
  })

  it("en 401 ya estando en /login no vuelve a limpiar ni a redirigir", async () => {
    localStorage.setItem("token", "sigue-presente")
    const location = stubLocation("/login")
    mockFetchOnce({ ok: false, status: 401, json: async () => ({ message: "No autorizado" }) })
    const { apiClient } = await import("./api")

    await expect(apiClient("/auth/login")).rejects.toThrow("No autorizado")
    expect(localStorage.getItem("token")).toBe("sigue-presente")
    expect(location.href).toBe("http://localhost:3000/login")
  })

  it("en una respuesta no-ok, el Error incluye status, message y errors del backend", async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "Hay campos con errores.", errors: { dni: "El DNI debe tener 7 u 8 dígitos" } }),
    })
    const { apiClient } = await import("./api")

    const err: (Error & { status?: number; errors?: Record<string, string> }) | undefined = await apiClient(
      "/clientes"
    ).catch((e) => e)

    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toBe("Hay campos con errores.")
    expect(err?.status).toBe(400)
    expect(err?.errors).toEqual({ dni: "El DNI debe tener 7 u 8 dígitos" })
  })

  it("cuando el backend no manda message, usa un mensaje genérico con el status", async () => {
    mockFetchOnce({ ok: false, status: 500, json: async () => ({}) })
    const { apiClient } = await import("./api")

    const err: (Error & { status?: number }) | undefined = await apiClient("/clientes").catch((e) => e)
    expect(err?.message).toBe("Error 500")
    expect(err?.status).toBe(500)
  })

  it("en una respuesta ok devuelve el JSON parseado", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ data: [{ id: "1" }] }) })
    const { apiClient } = await import("./api")

    const result = await apiClient("/clientes")
    expect(result).toEqual({ data: [{ id: "1" }] })
  })
})
