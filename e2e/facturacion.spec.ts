import { expect, test } from "@playwright/test"
import { pool } from "./db"
import { loadFixtures } from "./fixtures"
import { dniDePrueba, login } from "./helpers"

const fx = loadFixtures()

test.beforeEach(async ({ page }) => {
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
})

test("monto 0, negativo y con 3 decimales se rechazan; un cobro válido pone al cliente al día", async ({ page }) => {
  const dni = dniDePrueba()
  await page.goto("/dashboard/clientes")
  await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  await page.getByLabel("Nombre *").fill("Zze2e")
  await page.getByLabel("Apellido *").fill("Factura")
  await page.getByLabel("DNI *").fill(dni)
  await page.getByRole("button", { name: "Crear cliente" }).click()
  await expect(page.getByText("Cliente creado")).toBeVisible()

  // Fuerza al cliente a "moroso": no hay forma de setear el vencimiento desde el UI
  // (el backend lo calcula), así que se ajusta directo en la base para probar el flujo.
  const { rows } = await pool.query("SELECT id FROM clientes WHERE dni = $1", [dni])
  const clienteId = rows[0].id as string
  await pool.query(
    "UPDATE clientes SET fecha_vencimiento = (CURRENT_DATE - INTERVAL '5 days')::date WHERE id = $1",
    [clienteId]
  )

  await page.reload()
  const fila = page.getByRole("row", { name: /Factura, Zze2e/ })
  await expect(fila.getByText("Moroso")).toBeVisible()

  await fila.getByRole("button", { name: "Ver cliente" }).click()
  await page.getByRole("button", { name: "Cobrar Cuota" }).click()

  const monto = page.getByLabel("Monto *")
  await monto.fill("")
  await monto.pressSequentially("0")
  await page.getByRole("button", { name: "Registrar cobro" }).click()
  await expect(page.getByText("El monto debe ser mayor a cero")).toBeVisible()

  await monto.fill("")
  await monto.pressSequentially("-45000")
  await expect(monto).toHaveValue("45000")

  await monto.fill("")
  await monto.pressSequentially("100.999")
  await page.getByRole("button", { name: "Registrar cobro" }).click()
  await expect(page.getByText("El monto admite como máximo 2 decimales")).toBeVisible()

  await monto.fill("")
  await monto.pressSequentially("45000")
  await page.getByRole("button", { name: "Registrar cobro" }).click()
  await expect(page.getByText("Cobro registrado")).toBeVisible()

  await page.getByRole("button", { name: "Cerrar" }).click()
  await expect(fila.getByText("Al día")).toBeVisible()

  // cleanup (cascada a pagos por FK)
  await fila.getByRole("button", { name: "Eliminar cliente" }).click()
  await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  await expect(page.getByText("Cliente eliminado")).toBeVisible()
})
