import { expect, test } from "@playwright/test"
import { loadFixtures } from "./fixtures"
import { login } from "./helpers"

const fx = loadFixtures()

test.beforeEach(async ({ page }) => {
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/roles")
})

test("descripción con números y sin permisos muestran error", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo Rol" }).click()
  await page.getByLabel("Nombre del rol *").pressSequentially("Supervisor2")
  await expect(page.getByLabel("Nombre del rol *")).toHaveValue("Supervisor")
  await page.getByRole("button", { name: "Crear rol" }).click()
  await expect(page.getByText("Seleccioná al menos un permiso")).toBeVisible()
  await page.getByRole("button", { name: "Cancelar" }).click()
})

test("descripción duplicada da 409 en el campo", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo Rol" }).click()
  await page.getByLabel("Nombre del rol *").fill("Zze2e Parcial")
  await page.getByRole("checkbox", { name: "Ver Clientes" }).click()
  await page.getByRole("button", { name: "Crear rol" }).click()
  await expect(page.getByText("Ya existe un rol con esa descripción")).toBeVisible()
  await page.getByRole("button", { name: "Cancelar" }).click()
})

test("el rol Zze2e Admin (protegido) solo se puede ver, no editar ni eliminar", async ({ page }) => {
  const fila = page.getByRole("row", { name: /Zze2e Admin/ })
  await expect(fila).toContainText("Protegido")
  await expect(fila.getByRole("button", { name: "Eliminar rol" })).toBeDisabled()

  await fila.getByRole("button", { name: "Ver rol" }).click()
  await expect(page.getByText("Ver Rol")).toBeVisible()
  await expect(page.getByLabel("Nombre del rol *")).toBeDisabled()
  await expect(page.getByRole("button", { name: /Crear rol|Guardar cambios/ })).toHaveCount(0)
  await page.getByRole("button", { name: "Cerrar" }).click()
})

test("crear rol, asignar permisos, usarlo en un usuario y no poder eliminarlo hasta liberar ese usuario", async ({ page }) => {
  const nombreRol = `Zze2e Temporal`
  await page.getByRole("button", { name: "Nuevo Rol" }).click()
  await page.getByLabel("Nombre del rol *").fill(nombreRol)
  await page.getByRole("checkbox", { name: "Ver Clientes" }).click()
  await page.getByRole("checkbox", { name: "Editar Clientes" }).click()
  await page.getByRole("button", { name: "Crear rol" }).click()
  await expect(page.getByText("Rol creado")).toBeVisible()
  await expect(page.getByRole("row", { name: new RegExp(nombreRol) })).toBeVisible()

  // asignarlo a un usuario nuevo
  await page.goto("/dashboard/usuarios")
  const email = `zze2e_rol_${Date.now()}@example.test`
  await page.getByRole("button", { name: "Nuevo Usuario" }).click()
  await page.getByLabel("Nombre *").fill("Zze2e UsaRol")
  await page.getByLabel("Email *").fill(email)
  await page.getByLabel("Contraseña *", { exact: true }).fill("Test1234x")
  await page.getByLabel("Confirmar contraseña *").fill("Test1234x")
  await page.getByLabel("Rol *").click()
  await page.getByRole("option", { name: nombreRol }).click()
  await page.getByRole("button", { name: "Crear usuario" }).click()
  await expect(page.getByText("Usuario creado")).toBeVisible()

  // no se puede eliminar el rol con ese usuario asignado
  await page.goto("/dashboard/roles")
  const filaRol = page.getByRole("row", { name: new RegExp(nombreRol) })
  await filaRol.getByRole("button", { name: "Eliminar rol" }).click()
  await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(page.getByText("No se puede eliminar el rol porque tiene usuarios asignados")).toBeVisible()

  // liberar: borrar el usuario y ahora sí eliminar el rol
  await page.goto("/dashboard/usuarios")
  const filaUsuario = page.getByRole("row", { name: /Zze2e UsaRol/ })
  await filaUsuario.getByRole("button", { name: "Eliminar usuario" }).click()
  await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(page.getByText("Usuario eliminado")).toBeVisible()

  await page.goto("/dashboard/roles")
  await filaRol.getByRole("button", { name: "Eliminar rol" }).click()
  await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(page.getByText("Rol eliminado")).toBeVisible()
  await expect(page.getByRole("row", { name: new RegExp(nombreRol) })).not.toBeVisible()
})
