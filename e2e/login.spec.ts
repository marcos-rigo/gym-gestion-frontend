import { expect, test } from "@playwright/test"
import { loadFixtures } from "./fixtures"
import { login } from "./helpers"

const fx = loadFixtures()

test.describe("Login", () => {
  test("contraseña vacía muestra error de validación sin llamar al backend", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("alguien@example.com")
    await page.getByRole("button", { name: "Ingresar" }).click()
    await expect(page.getByText("La contraseña es obligatoria")).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test("email mal formado muestra error de validación", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("no-es-un-email")
    await page.getByLabel("Contraseña", { exact: true }).fill("cualquiera")
    await page.getByRole("button", { name: "Ingresar" }).click()
    await expect(page.getByText("Ingresá un email válido")).toBeVisible()
  })

  test("credenciales inválidas muestran un toast de error", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("no-existe@example.test")
    await page.getByLabel("Contraseña", { exact: true }).fill("Test1234x")
    await page.getByRole("button", { name: "Ingresar" }).click()
    await expect(page.getByText("Credenciales inválidas")).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test("el botón ojo muestra/oculta la contraseña sin perder el foco", async ({ page }) => {
    await page.goto("/login")
    const password = page.getByLabel("Contraseña", { exact: true })
    await password.fill("Test1234x")
    await expect(password).toHaveAttribute("type", "password")

    await page.getByRole("button", { name: "Mostrar contraseña" }).click()
    await expect(password).toHaveAttribute("type", "text")
    await expect(password).toBeFocused()

    await page.getByRole("button", { name: "Ocultar contraseña" }).click()
    await expect(password).toHaveAttribute("type", "password")
    await expect(password).toBeFocused()
  })

  test("un admin cae en /dashboard", async ({ page }) => {
    await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("un usuario sin estadisticas_ver (pero con clientes_ver) cae directo en /dashboard/clientes", async ({ page }) => {
    await login(page, fx.credenciales.parcial.email, fx.credenciales.parcial.password)
    await expect(page).toHaveURL(/\/dashboard\/clientes$/)
  })

  test("un usuario sin ningún permiso cae en /dashboard y ve el mensaje de acceso denegado", async ({ page }) => {
    await login(page, fx.credenciales.sinPermisos.email, fx.credenciales.sinPermisos.password)
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText("No tenés permiso para ver esta página")).toBeVisible()
  })
})
