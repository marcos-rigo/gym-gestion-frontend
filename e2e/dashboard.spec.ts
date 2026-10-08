import { expect, test } from "@playwright/test"
import { loadFixtures } from "./fixtures"
import { login } from "./helpers"

const fx = loadFixtures()
const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

test("cada tarjeta del dashboard coincide con /api/dashboard/stats y /api/pagos/stats", async ({ page }) => {
  const [statsResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/dashboard/stats") && res.status() === 200),
    login(page, fx.credenciales.admin.email, fx.credenciales.admin.password),
  ])
  const statsBody = await statsResponse.json()
  const stats = statsBody.data

  const pagosResponse = await page.waitForResponse((res) => res.url().includes("/pagos/stats") && res.status() === 200)
  const pagosBody = await pagosResponse.json()
  const facturacion = pagosBody.data

  await expect(page.getByText("Total Clientes").locator("..")).toContainText(String(stats.total))
  await expect(page.getByText("Activos", { exact: true }).locator("..")).toContainText(String(stats.activos))
  await expect(page.getByText("Por Vencer (7 días)").locator("..")).toContainText(String(stats.porVencer))
  await expect(page.getByText("Morosos").locator("..")).toContainText(String(stats.morosos))
  await expect(page.getByText("Nuevos este mes").locator("..")).toContainText(String(stats.nuevosMes))

  await expect(page.getByText("Facturación Hoy").locator("..")).toContainText(currency.format(facturacion.hoy))
  await expect(page.getByText("Esta Semana").locator("..")).toContainText(currency.format(facturacion.semana))
  await expect(page.getByText("Este Mes").locator("..")).toContainText(currency.format(facturacion.mes))
})

test("un usuario sin estadisticas_ver no ve el link Dashboard ni puede entrar por URL", async ({ page }) => {
  await login(page, fx.credenciales.parcial.email, fx.credenciales.parcial.password)
  await expect(page).toHaveURL(/\/dashboard\/clientes$/)
  await expect(page.getByRole("navigation").getByText("Dashboard")).not.toBeVisible()

  await page.goto("/dashboard")
  await expect(page.getByText("No tenés permiso para ver esta página")).toBeVisible()
})
