import { expect, test } from "@playwright/test"
import { loadFixtures } from "./fixtures"
import { login } from "./helpers"

const fx = loadFixtures()
const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })

test("cada tarjeta del dashboard coincide con /api/dashboard/stats y /api/pagos/stats", async ({ page }) => {
  // Las dos llamadas del dashboard salen en paralelo apenas el login redirige: si el
  // segundo waitForResponse se arma recién después del primero, puede llegar tarde y
  // perderse la respuesta de /pagos/stats. Se registran ambos listeners antes del login.
  const [statsResponse, pagosResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/dashboard/stats") && res.status() === 200),
    page.waitForResponse((res) => res.url().includes("/pagos/stats") && res.status() === 200),
    login(page, fx.credenciales.admin.email, fx.credenciales.admin.password),
  ])
  const statsBody = await statsResponse.json()
  const stats = statsBody.data

  const pagosBody = await pagosResponse.json()
  const facturacion = pagosBody.data

  // El título vive en el CardHeader y el valor en el CardContent, hermano del header
  // (no un hijo): hay que subir hasta el Card (dos niveles) para que ambos queden
  // dentro del mismo locator.
  await expect(page.getByText("Total Clientes").locator("../..")).toContainText(String(stats.total))
  await expect(page.getByText("Activos", { exact: true }).locator("../..")).toContainText(String(stats.activos))
  await expect(page.getByText("Por Vencer (7 días)").locator("../..")).toContainText(String(stats.porVencer))
  await expect(page.getByText("Morosos").locator("../..")).toContainText(String(stats.morosos))
  await expect(page.getByText("Nuevos este mes").locator("../..")).toContainText(String(stats.nuevosMes))

  await expect(page.getByText("Facturación Hoy").locator("../..")).toContainText(currency.format(facturacion.hoy))
  await expect(page.getByText("Esta Semana").locator("../..")).toContainText(currency.format(facturacion.semana))
  // exact: true porque "Este Mes" es substring de "Nuevos este mes" (getByText matchea
  // sin distinguir mayúsculas/minúsculas por defecto).
  await expect(page.getByText("Este Mes", { exact: true }).locator("../..")).toContainText(
    currency.format(facturacion.mes)
  )
})

test("un usuario sin estadisticas_ver no ve el link Dashboard ni puede entrar por URL", async ({ page }) => {
  await login(page, fx.credenciales.parcial.email, fx.credenciales.parcial.password)
  await expect(page).toHaveURL(/\/dashboard\/clientes$/)
  await expect(page.getByRole("navigation").getByText("Dashboard")).not.toBeVisible()

  await page.goto("/dashboard")
  await expect(page.getByText("No tenés permiso para ver esta página")).toBeVisible()
})
