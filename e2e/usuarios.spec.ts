import { expect, test } from "@playwright/test"
import { loadFixtures } from "./fixtures"
import { login } from "./helpers"

const fx = loadFixtures()

test.beforeEach(async ({ page }) => {
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/usuarios")
})

async function elegirRol(page: import("@playwright/test").Page, nombre: string) {
  await page.getByLabel("Rol *").click()
  await page.getByRole("option", { name: nombre }).click()
}

test("password débil y confirmación distinta muestran error", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo Usuario" }).click()
  await page.getByLabel("Nombre *").fill("Zze2e Temp")
  await page.getByLabel("Email *").fill(`zze2e_temp_${Date.now()}@example.test`)
  await page.getByLabel("Contraseña *", { exact: true }).fill("abcdefgh")
  await page.getByLabel("Confirmar contraseña *").fill("abcdefgh")
  await elegirRol(page, "Zze2e Parcial")
  await page.getByRole("button", { name: "Crear usuario" }).click()
  await expect(page.getByText("Debe incluir al menos un número")).toBeVisible()

  await page.getByLabel("Contraseña *", { exact: true }).fill("Test1234")
  await page.getByLabel("Confirmar contraseña *").fill("Test5678")
  await page.getByRole("button", { name: "Crear usuario" }).click()
  await expect(page.getByText("Las contraseñas no coinciden")).toBeVisible()
  await page.getByRole("button", { name: "Cancelar" }).click()
})

test("crear, editar, desactivar y eliminar un usuario; email duplicado da 409", async ({ page }) => {
  const email = `zze2e_crud_${Date.now()}@example.test`

  await page.getByRole("button", { name: "Nuevo Usuario" }).click()
  await page.getByLabel("Nombre *").fill("Zzee CRUD")
  await page.getByLabel("Email *").fill(email)
  await page.getByLabel("Contraseña *", { exact: true }).fill("Test1234x")
  await page.getByLabel("Confirmar contraseña *").fill("Test1234x")
  await elegirRol(page, "Zze2e Parcial")
  await page.getByRole("button", { name: "Crear usuario" }).click()
  await expect(page.getByText("Usuario creado")).toBeVisible()

  const fila = page.getByRole("row", { name: /Zzee CRUD/ })
  await expect(fila).toBeVisible()

  // email duplicado
  await page.getByRole("button", { name: "Nuevo Usuario" }).click()
  await page.getByLabel("Nombre *").fill("Zzee Otro")
  await page.getByLabel("Email *").fill(email)
  await page.getByLabel("Contraseña *", { exact: true }).fill("Test1234x")
  await page.getByLabel("Confirmar contraseña *").fill("Test1234x")
  await elegirRol(page, "Zze2e Parcial")
  await page.getByRole("button", { name: "Crear usuario" }).click()
  await expect(page.getByText("Ya existe un usuario con ese email")).toBeVisible()
  await page.getByRole("button", { name: "Cancelar" }).click()

  // editar
  await fila.getByRole("button", { name: "Editar usuario" }).click()
  await page.getByLabel("Nombre *").fill("")
  await page.getByLabel("Nombre *").fill("Zzee CRUD Editado")
  await page.getByRole("button", { name: "Guardar cambios" }).click()
  await expect(page.getByText("Usuario actualizado")).toBeVisible()
  const filaEditada = page.getByRole("row", { name: /Zzee CRUD Editado/ })
  await expect(filaEditada).toBeVisible()

  // desactivar
  await expect(filaEditada).toContainText("Activo")
  await filaEditada.getByRole("switch").click()
  await expect(filaEditada).toContainText("Inactivo")

  // eliminar
  await filaEditada.getByRole("button", { name: "Eliminar usuario" }).click()
  await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(page.getByText("Usuario eliminado")).toBeVisible()
  await expect(page.getByRole("row", { name: /Zzee CRUD Editado/ })).not.toBeVisible()
})

test("el usuario protegido (superadmin) no tiene editar/eliminar/switch", async ({ page }) => {
  const filaProtegida = page.locator("tr", { hasText: "Protegido" })
  await expect(filaProtegida).toBeVisible()
  await expect(filaProtegida.getByRole("button", { name: "Editar usuario" })).toHaveCount(0)
  await expect(filaProtegida.getByRole("button", { name: "Eliminar usuario" })).toHaveCount(0)
  await expect(filaProtegida.getByRole("switch")).toHaveCount(0)
})

test("no se puede desactivar la propia cuenta", async ({ page }) => {
  const filaPropia = page.getByRole("row", { name: /Zze2e Admin/ })
  await expect(filaPropia).toBeVisible()
  await filaPropia.getByRole("switch").click()
  await expect(page.getByText("No podés desactivar tu propia cuenta")).toBeVisible()
  await expect(filaPropia).toContainText("Activo")
})
