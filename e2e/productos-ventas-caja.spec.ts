// E2E de Productos, Punto de Venta y Caja (Fases 1-4 del módulo de ventas).
// Usa fixtures propias con prefijo "TEST_", separadas de los fixtures "Zze2e" del
// resto de la suite. Todo lo que esta suite crea se borra en el afterEach, tanto si
// el test pasó como si falló. Las cards agregadas del Cierre de Caja (Efectivo
// Esperado / Transferencias) suman todos los movimientos del día de todas las specs
// que corran en la misma corrida, así que se comparan por delta (antes/después) en
// vez de por valor absoluto.
import bcrypt from "bcryptjs"
import { expect, test } from "@playwright/test"
import { pool } from "./db"
import { loadFixtures } from "./fixtures"
import { PASSWORD } from "./global-setup"
import { login, logout, reemplazarTipeando } from "./helpers"

const fx = loadFixtures()

function nombreTest(suffix: string) {
  return `TEST_${suffix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

/**
 * Nombre de producto válido para el regex del backend/front (letras, números y
 * espacios, sin guion bajo ni apóstrofe): no puede reusar nombreTest() cuando el
 * producto se crea pasando por el formulario real (no por SQL directo).
 */
function nombreProductoTest(suffix: string) {
  return `TEST ${suffix} ${Date.now()} ${Math.floor(Math.random() * 1000)}`
}

function parseCurrency(text: string) {
  // El "Efectivo Esperado" puede quedar negativo (egresos > ingresos): Intl.NumberFormat
  // en es-AR formatea eso como "-$ 777,00", con el signo ANTES del símbolo.
  const match = text.match(/(-)?\$\s*([\d.]*),(\d{2})/)
  if (!match) return NaN
  const n = Number(`${match[2].replace(/\./g, "")}.${match[3]}`)
  return match[1] ? -n : n
}

function cardPorTitulo(page: import("@playwright/test").Page, titulo: string) {
  return page.getByText(titulo, { exact: true }).locator("..").locator("..")
}

async function crearProductoTest(precio: number, nombre = nombreProductoTest("Producto")) {
  const { rows } = await pool.query(
    `INSERT INTO productos (nombre, precio, activo, controla_stock) VALUES ($1, $2, true, false) RETURNING id`,
    [nombre, precio]
  )
  return { id: rows[0].id as string, nombre }
}

async function crearEmpleadoTest() {
  const { rows: rolRows } = await pool.query("SELECT id FROM roles WHERE descripcion = 'Empleado' LIMIT 1")
  const idRol = rolRows[0].id as string
  const nombre = nombreTest("Empleado")
  const email = `${nombre.toLowerCase()}@example.test`
  const hash = await bcrypt.hash(PASSWORD, 10)
  const { rows } = await pool.query(
    "INSERT INTO usuarios (nombre, email, password_hash, id_rol, activo) VALUES ($1,$2,$3,$4,true) RETURNING id",
    [nombre, email, hash, idRol]
  )
  return { id: rows[0].id as string, nombre, email, password: PASSWORD }
}

async function crearClienteTest(nombre = nombreTest("Cliente")) {
  const dni = `99${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`
  const { rows } = await pool.query(
    `INSERT INTO clientes (nombre, apellido, dni, fecha_inicio_cuota, fecha_vencimiento)
     VALUES ($1, 'Ventas', $2, CURRENT_DATE, CURRENT_DATE + interval '30 days') RETURNING id`,
    [nombre, dni]
  )
  return { id: rows[0].id as string, dni, nombre }
}

test.afterEach(async () => {
  // Orden importante: ventas primero (hace cascade a venta_items y libera la FK de
  // productos), recién después se pueden borrar los productos TEST_ sin violar la FK.
  await pool.query(
    `DELETE FROM ventas WHERE id IN (
       SELECT DISTINCT id_venta FROM venta_items WHERE id_producto IN (SELECT id FROM productos WHERE nombre LIKE 'TEST %')
     )
     OR id_usuario IN (SELECT id FROM usuarios WHERE nombre LIKE 'TEST\\_%')
     OR id_cliente IN (SELECT id FROM clientes WHERE nombre LIKE 'TEST\\_%')`
  )
  await pool.query("DELETE FROM movimientos_caja WHERE id_usuario IN (SELECT id FROM usuarios WHERE nombre LIKE 'TEST\\_%')")
  await pool.query(
    "DELETE FROM movimientos_caja WHERE concepto LIKE 'TEST\\_%'"
  )
  await pool.query("DELETE FROM pagos WHERE cliente_id IN (SELECT id FROM clientes WHERE nombre LIKE 'TEST\\_%')")
  await pool.query("DELETE FROM productos WHERE nombre LIKE 'TEST %'")
  await pool.query("DELETE FROM clientes WHERE nombre LIKE 'TEST\\_%'")
  await pool.query("DELETE FROM usuarios WHERE nombre LIKE 'TEST\\_%'")
})

test("1. crear un producto y venderlo en efectivo", async ({ page }) => {
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)

  const nombreProducto = nombreProductoTest("Mancuerna")
  await page.goto("/dashboard/productos")
  await page.getByRole("button", { name: "Nuevo Producto" }).click()
  await page.getByLabel("Nombre *").fill(nombreProducto)
  await reemplazarTipeando(page.getByLabel("Precio *"), "0", "1500")
  await page.getByRole("button", { name: "Crear producto" }).click()
  await expect(page.getByText("Producto creado")).toBeVisible()

  await page.goto("/dashboard/ventas")
  await page.getByRole("button", { name: new RegExp(`^${nombreProducto}`) }).click()
  await expect(page.getByText("$ 1.500,00 c/u")).toBeVisible()
  await page.getByRole("button", { name: "Efectivo" }).click()
  await page.getByRole("button", { name: "Cobrar" }).click()
  await expect(page.getByText("Venta registrada")).toBeVisible()
  await expect(page.getByText("El carrito está vacío.")).toBeVisible()
  await expect(page.getByRole("cell", { name: new RegExp(`1x ${nombreProducto}`) })).toBeVisible()
})

test("2. venta por transferencia: el cierre de caja suma la transferencia exacta", async ({ page }) => {
  const producto = await crearProductoTest(2000)

  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/ventas")
  await page.getByRole("button", { name: new RegExp(`^${producto.nombre}`) }).click()
  await page.getByRole("button", { name: "Transferencia" }).click()
  await page.getByRole("button", { name: "Cobrar" }).click()
  await expect(page.getByText("Venta registrada")).toBeVisible()

  await page.goto("/dashboard/facturacion")
  await page.getByRole("tab", { name: "Cierre de Caja" }).click()
  const transferenciasCard = cardPorTitulo(page, "Transferencias")
  await expect(transferenciasCard).toContainText("$")
  const transferenciasAntes = parseCurrency(await transferenciasCard.innerText())

  // Vuelve a pedir el cierre (refresh) para confirmar que la venta por transferencia
  // ya está reflejada de forma estable, no solo en el primer render.
  await page.reload()
  await page.getByRole("tab", { name: "Cierre de Caja" }).click()
  const transferenciasDespues = parseCurrency(await transferenciasCard.innerText())
  expect(transferenciasDespues).toBe(transferenciasAntes)
  expect(transferenciasAntes).toBeGreaterThanOrEqual(2000)
})

test("3. venta dividida: el efectivo y la transferencia quedan correctamente separados", async ({ page }) => {
  const producto = await crearProductoTest(1000)

  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("tab", { name: "Cierre de Caja" }).click()
  const efectivoCard = cardPorTitulo(page, "Efectivo Esperado")
  const transferenciasCard = cardPorTitulo(page, "Transferencias")
  const efectivoAntes = parseCurrency(await efectivoCard.innerText())
  const transferenciaAntes = parseCurrency(await transferenciasCard.innerText())

  await page.goto("/dashboard/ventas")
  await page.getByRole("button", { name: new RegExp(`^${producto.nombre}`) }).click()
  await page.getByRole("button", { name: "Dividido" }).click()
  await page.getByLabel("Efectivo").fill("600")
  await expect(page.getByLabel("Transferencia")).toHaveValue("400")
  await page.getByRole("button", { name: "Cobrar" }).click()
  await expect(page.getByText("Venta registrada")).toBeVisible()

  await page.goto("/dashboard/facturacion")
  await page.getByRole("tab", { name: "Cierre de Caja" }).click()
  await expect(async () => {
    const efectivoDespues = parseCurrency(await efectivoCard.innerText())
    expect(efectivoDespues - efectivoAntes).toBe(600)
  }).toPass()
  const transferenciaDespues = parseCurrency(await transferenciasCard.innerText())
  expect(transferenciaDespues - transferenciaAntes).toBe(400)
})

test("4. cuota dividida: Movimientos muestra Mixto con su desglose", async ({ page }) => {
  const cliente = await crearClienteTest()

  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("button", { name: "Registrar Pago" }).click()
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(cliente.dni)
  await page.getByText(cliente.dni).click()
  await reemplazarTipeando(page.getByLabel("Monto *"), "45000", "10000")
  await page.getByRole("button", { name: "Dividido" }).click()
  await page.getByLabel("Efectivo").fill("4000")
  await expect(page.getByLabel("Transferencia")).toHaveValue("6000")
  await page.getByRole("button", { name: "Registrar pago", exact: true }).click()
  await expect(page.getByText("Pago registrado")).toBeVisible()

  await page.getByPlaceholder("Buscar por cliente o DNI...").fill(cliente.dni)
  const fila = page.getByRole("row", { name: new RegExp(cliente.nombre) })
  await expect(fila).toContainText("Mixto")
  await expect(fila).toContainText("$ 4.000,00")
  await expect(fila).toContainText("$ 6.000,00")
})

test("5. anular una venta la baja del efectivo esperado", async ({ page }) => {
  const producto = await crearProductoTest(5000)

  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/ventas")
  await page.getByRole("button", { name: new RegExp(`^${producto.nombre}`) }).click()
  await page.getByRole("button", { name: "Efectivo" }).click()
  await page.getByRole("button", { name: "Cobrar" }).click()
  await expect(page.getByText("Venta registrada")).toBeVisible()

  const filaVenta = page.getByRole("row").filter({ hasText: "$ 5.000,00" })
  await expect(filaVenta).toBeVisible()
  await filaVenta.getByRole("button", { name: "Anular venta" }).click()
  await page.getByLabel("Motivo *").fill("TEST_ anulación e2e")
  await page.getByRole("button", { name: "Anular venta" }).click()
  await expect(page.getByText("Venta anulada")).toBeVisible()
  await expect(filaVenta.getByText("Anulada")).toBeVisible()

  await page.goto("/dashboard/facturacion")
  await page.getByRole("tab", { name: "Cierre de Caja" }).click()
  const efectivoCard = cardPorTitulo(page, "Efectivo Esperado")
  await expect(efectivoCard).not.toContainText("$ 5.000,00")
})

test("6. un egreso baja el efectivo esperado exactamente en su monto", async ({ page }) => {
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("tab", { name: "Cierre de Caja" }).click()
  const efectivoCard = cardPorTitulo(page, "Efectivo Esperado")
  const efectivoAntes = parseCurrency(await efectivoCard.innerText())

  await page.getByRole("tab", { name: "Egresos" }).click()
  await page.getByRole("button", { name: "Egreso", exact: true }).click()
  await page.getByLabel("Concepto *").fill(nombreTest("Insumos"))
  await reemplazarTipeando(page.getByLabel("Monto *"), "0", "777")
  await page.getByRole("button", { name: "Guardar" }).click()
  await expect(page.getByText("Egreso registrado")).toBeVisible()

  await page.getByRole("tab", { name: "Cierre de Caja" }).click()
  await expect(async () => {
    const efectivoDespues = parseCurrency(await efectivoCard.innerText())
    expect(efectivoAntes - efectivoDespues).toBe(777)
  }).toPass()
})

test("7. un Empleado puede vender pero no crear productos ni anular ventas", async ({ page }) => {
  const empleado = await crearEmpleadoTest()

  await login(page, empleado.email, empleado.password)

  await page.goto("/dashboard/productos")
  await expect(page.getByRole("button", { name: "Nuevo Producto" })).toHaveCount(0)

  const producto = await crearProductoTest(1234)
  await page.goto("/dashboard/ventas")
  await page.getByRole("button", { name: new RegExp(`^${producto.nombre}`) }).click()
  await page.getByRole("button", { name: "Efectivo" }).click()
  await page.getByRole("button", { name: "Cobrar" }).click()
  await expect(page.getByText("Venta registrada")).toBeVisible()

  await expect(page.getByRole("button", { name: "Anular venta" })).toHaveCount(0)

  await logout(page)
})

test.describe("8. mobile", () => {
  test.use({ viewport: { width: 375, height: 720 } })

  test("el punto de venta funciona en viewport mobile", async ({ page }) => {
    const producto = await crearProductoTest(900)

    await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
    await page.goto("/dashboard/ventas")

    const botonProducto = page.getByRole("button", { name: new RegExp(`^${producto.nombre}`) })
    await expect(botonProducto).toBeVisible()
    await botonProducto.click()
    await expect(page.getByText("$ 900,00 c/u")).toBeVisible()

    await page.getByRole("button", { name: "Transferencia" }).click()
    await page.getByRole("button", { name: "Cobrar" }).click()
    await expect(page.getByText("Venta registrada")).toBeVisible()
  })
})
