import { expect, test } from "@playwright/test"
import { loadFixtures } from "./fixtures"
import { dniDePrueba, login } from "./helpers"

const fx = loadFixtures()

test.beforeEach(async ({ page }) => {
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/clientes")
})

test("el campo DNI bloquea letras al tipear", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  const dni = page.getByLabel("DNI *")
  await dni.pressSequentially("ABC1234")
  await expect(dni).toHaveValue("1234")
  await page.getByRole("button", { name: "Cancelar" }).click()
})

test("el campo nombre bloquea dígitos al tipear", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  const nombre = page.getByLabel("Nombre *")
  await nombre.pressSequentially("Juan1")
  await expect(nombre).toHaveValue("Juan")
  await page.getByRole("button", { name: "Cancelar" }).click()
})

test("teléfono inválido y nacimiento futuro muestran error", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  await page.getByLabel("Nombre *").fill("Juan")
  await page.getByLabel("Apellido *").fill("Pérez")
  await page.getByLabel("DNI *").fill(dniDePrueba())
  await page.getByLabel("Teléfono").fill("123")
  const futuro = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)
  await page.getByLabel("Fecha de nacimiento").fill(futuro)
  await page.getByRole("button", { name: "Crear cliente" }).click()

  await expect(page.getByText("El teléfono debe tener entre 8 y 15 dígitos")).toBeVisible()
  await expect(page.getByText("La fecha de nacimiento no puede ser futura")).toBeVisible()
  await page.getByRole("button", { name: "Cancelar" }).click()
})

test("crear, editar, buscar y eliminar un cliente de punta a punta", async ({ page }) => {
  const dni = dniDePrueba()

  // crear
  await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  await page.getByLabel("Nombre *").fill("Zze2e")
  await page.getByLabel("Apellido *").fill("Cliente")
  await page.getByLabel("DNI *").fill(dni)
  await page.getByLabel("Teléfono").fill("+5491122334455")
  await page.getByRole("button", { name: "Crear cliente" }).click()
  await expect(page.getByText("Cliente creado")).toBeVisible()

  const fila = page.getByRole("row", { name: new RegExp(`Cliente, Zze2e`) })
  await expect(fila).toBeVisible()
  await expect(fila).toContainText(dni)

  // DNI duplicado
  await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  await page.getByLabel("Nombre *").fill("Otro")
  await page.getByLabel("Apellido *").fill("Cliente")
  await page.getByLabel("DNI *").fill(dni)
  await page.getByRole("button", { name: "Crear cliente" }).click()
  await expect(page.getByText("Ya existe un cliente con ese DNI")).toBeVisible()
  await page.getByRole("button", { name: "Cancelar" }).click()

  // buscar
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dni)
  await expect(page.getByRole("row", { name: new RegExp(`Cliente, Zze2e`) })).toBeVisible()
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill("xxx-no-existe-xxx")
  await expect(page.getByText("No se encontraron clientes.")).toBeVisible()
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dni)

  // editar
  await fila.getByRole("button", { name: "Editar cliente" }).click()
  await page.getByLabel("Teléfono").fill("")
  await page.getByLabel("Teléfono").fill("+5491199998888")
  await page.getByRole("button", { name: "Guardar cambios" }).click()
  await expect(page.getByText("Cliente actualizado")).toBeVisible()
  await expect(fila).toContainText("+5491199998888")

  // eliminar
  await fila.getByRole("button", { name: "Eliminar cliente" }).click()
  await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(page.getByText("Cliente eliminado")).toBeVisible()
  await expect(page.getByRole("row", { name: new RegExp(`Cliente, Zze2e`) })).not.toBeVisible()
})

test("subida de foto con cámara falsa de Chromium", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  await page.getByRole("button", { name: "Activar cámara" }).click()
  await page.getByRole("button", { name: "Capturar foto" }).click()
  await expect(page.getByRole("button", { name: "Volver a tomar" })).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('img[alt="Foto del cliente"]')).toBeVisible()
  await page.getByRole("button", { name: "Cancelar" }).click()
})
