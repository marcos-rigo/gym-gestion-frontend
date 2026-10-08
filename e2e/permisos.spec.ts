import { expect, test } from "@playwright/test"
import { loadFixtures } from "./fixtures"
import { login } from "./helpers"

const fx = loadFixtures()

test("un rol sin ningún permiso no ve links y cualquier ruta de módulo lo manda a /dashboard con el mensaje", async ({ page }) => {
  await login(page, fx.credenciales.sinPermisos.email, fx.credenciales.sinPermisos.password)
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText("No tenés permiso para ver esta página")).toBeVisible()

  for (const ruta of ["/dashboard/clientes", "/dashboard/usuarios", "/dashboard/roles"]) {
    await page.goto(ruta)
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText("No tenés permiso para ver esta página")).toBeVisible()
  }
})

test("un rol parcial (solo clientes_ver) solo entra a Clientes", async ({ page }) => {
  await login(page, fx.credenciales.parcial.email, fx.credenciales.parcial.password)
  await expect(page).toHaveURL(/\/dashboard\/clientes$/)

  await page.goto("/dashboard/usuarios")
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText("No tenés permiso para ver esta página")).toBeVisible()

  await page.goto("/dashboard/roles")
  await expect(page).toHaveURL(/\/dashboard$/)
})

test("un token alterado produce 401 y manda a /login", async ({ page }) => {
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await expect(page).toHaveURL(/\/dashboard$/)

  // Se corrompe solo la firma (no el payload): así `isAuthenticated()` del cliente
  // sigue viendo un JWT con forma válida y exp futuro, y la app llega a pegarle a la
  // API real, que es la que tiene que rechazarlo con 401 por firma inválida.
  await page.evaluate(() => {
    const token = localStorage.getItem("token") ?? ""
    const partes = token.split(".")
    partes[2] = `${partes[2]?.slice(0, -4) ?? ""}xxxx`
    localStorage.setItem("token", partes.join("."))
  })
  await page.goto("/dashboard/clientes")

  await expect(page).toHaveURL(/\/login$/)
  await page.waitForFunction(() => localStorage.getItem("token") === null)
})
