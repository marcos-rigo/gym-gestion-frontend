// E2E de Facturación Fase 2 (tabs Movimientos / Morosos / Por Vencer / Cierre de Caja).
// Usa fixtures propias con prefijo "TEST_" (nombres de clientes/usuarios y roles),
// separadas de los fixtures "Zze2e" del resto de la suite e2e. Todo lo que esta suite
// crea se borra en el afterEach, tanto si el test pasó como si falló.
import bcrypt from "bcryptjs"
import { expect, test } from "@playwright/test"
import { pool } from "./db"
import { loadFixtures } from "./fixtures"
import { PASSWORD } from "./global-setup"
import { dniDePrueba, login, logout } from "./helpers"

const fx = loadFixtures()
const admin = fx.usuarios.find((u) => u.rol === "admin")!

function nombreTest(suffix: string) {
  return `TEST_${suffix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function parseCurrency(text: string) {
  // Extrae específicamente "$ 44.444,00" de un texto que puede traer otros dígitos alrededor
  // (p. ej. el título "Proyección de Ingresos (7 días)" tiene su propio "7").
  const match = text.match(/\$\s*([\d.]*),(\d{2})/)
  if (!match) return NaN
  return Number(`${match[1].replace(/\./g, "")}.${match[2]}`)
}

/** Card completa (título + contenido) a partir del texto de su CardTitle: CardTitle -> CardHeader -> Card. */
function cardPorTitulo(page: import("@playwright/test").Page, titulo: string) {
  return page.getByText(titulo).locator("..").locator("..")
}

/** Cliente con vencimiento a `diasVencimiento` días de hoy (negativo = moroso). */
async function crearClienteTest(diasVencimiento: number, nombre = nombreTest("Cliente")) {
  const dni = dniDePrueba()
  const { rows } = await pool.query(
    `INSERT INTO clientes (nombre, apellido, dni, fecha_inicio_cuota, fecha_vencimiento)
     VALUES ($1, 'Facturacion', $2, CURRENT_DATE - interval '30 days',
       (CURRENT_DATE + ($3 || ' days')::interval)::date)
     RETURNING id`,
    [nombre, dni, diasVencimiento]
  )
  return { id: rows[0].id as string, dni, nombre }
}

/** Inserta un pago histórico directo (sin pasar por el endpoint) para fijar la "cuota de referencia". */
async function registrarPagoHistoricoTest(clienteId: string, monto: number, diasVencimiento: number) {
  await pool.query(
    `INSERT INTO pagos (cliente_id, usuario_id, monto, metodo, periodo_desde, periodo_hasta, fecha_pago)
     VALUES ($1, $2, $3, 'efectivo',
       CURRENT_DATE - interval '30 days',
       (CURRENT_DATE + ($4 || ' days')::interval)::date,
       now() - interval '30 days')`,
    [clienteId, admin.id, monto, diasVencimiento]
  )
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

test.afterEach(async () => {
  await pool.query("DELETE FROM pagos WHERE cliente_id IN (SELECT id FROM clientes WHERE nombre LIKE 'TEST\\_%')")
  await pool.query("DELETE FROM pagos WHERE usuario_id IN (SELECT id FROM usuarios WHERE nombre LIKE 'TEST\\_%')")
  await pool.query("DELETE FROM clientes WHERE nombre LIKE 'TEST\\_%'")
  await pool.query("DELETE FROM usuarios WHERE nombre LIKE 'TEST\\_%'")
})

test("1. Admin/Dueño ve los 4 tabs de Facturación", async ({ page }) => {
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await expect(page.getByRole("tab", { name: "Movimientos" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Morosos" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Por Vencer" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Cierre de Caja" })).toBeVisible()
})

test("2. un cliente TEST_ moroso muestra los días de atraso correctos; el cobro lo saca de Morosos y baja el total adeudado", async ({
  page,
}) => {
  const { dni, nombre } = await crearClienteTest(-5)
  const cliente = await pool.query("SELECT id FROM clientes WHERE dni = $1", [dni])
  await registrarPagoHistoricoTest(cliente.rows[0].id, 44444, -5)

  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("tab", { name: "Morosos" }).click()

  const totalAdeudadoCard = cardPorTitulo(page, "Total Adeudado Estimado")
  await expect(totalAdeudadoCard).not.toContainText("—")
  const totalAntes = parseCurrency(await totalAdeudadoCard.innerText())

  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dni)
  const fila = page.getByRole("row", { name: new RegExp(nombre) })
  await expect(fila.getByText("5 días")).toBeVisible()
  await expect(fila.getByText("$ 44.444,00")).toBeVisible()

  await fila.getByRole("button", { name: "Registrar pago" }).click()
  await page.getByRole("button", { name: "Registrar cobro" }).click()
  await expect(page.getByText("Cobro registrado")).toBeVisible()

  // El mount de esta pestaña duplica su fetch inicial (doble efecto de React en dev), así
  // que un waitForResponse puesto acá puede enganchar esa respuesta vieja en vez de la
  // que realmente dispara el refetch post-cobro, y quedarse esperando una que nunca llega
  // (o, peor, "resolver" antes de tiempo con una respuesta que no refleja el cobro). Más
  // robusto: reintentar sobre el DOM. Se escopea a la tabla porque el nombre también
  // aparece en una card mobile oculta (misma fila, otro layout) y getByText por sí solo
  // viola el modo estricto al matchear las dos.
  const tabla = page.getByRole("table")
  await expect(tabla.getByText(nombre)).not.toBeVisible({ timeout: 15_000 })

  await page.getByPlaceholder("Buscar por nombre o DNI...").fill("")
  await expect(async () => {
    const totalDespues = parseCurrency(await totalAdeudadoCard.innerText())
    expect(totalAntes - totalDespues).toBe(44444)
  }).toPass()
})

test("3. un cliente TEST_ a 3 días de vencer aparece en Por Vencer y suma a la proyección de ingresos", async ({
  page,
}) => {
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("tab", { name: "Por Vencer" }).click()

  const proyeccionCard = cardPorTitulo(page, "Proyección de Ingresos (7 días)")
  await expect(proyeccionCard).not.toContainText("—")
  const proyeccionAntes = parseCurrency(await proyeccionCard.innerText())

  const { dni, nombre } = await crearClienteTest(3)
  const cliente = await pool.query("SELECT id FROM clientes WHERE dni = $1", [dni])
  await registrarPagoHistoricoTest(cliente.rows[0].id, 33333, 3)

  await page.reload()
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/clientes/por-vencer") && res.request().method() === "GET"),
    page.getByRole("tab", { name: "Por Vencer" }).click(),
  ])
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dni)

  const fila = page.getByRole("row", { name: new RegExp(nombre) })
  await expect(fila.getByText("3 días")).toBeVisible()
  await expect(fila.getByText("$ 33.333,00")).toBeVisible()

  // El mount de esta pestaña dispara su propio fetch inicial por duplicado (doble efecto
  // de React en dev), así que un waitForResponse puesto después de tipear/limpiar la
  // búsqueda puede terminar enganchando esa respuesta vieja (sin el filtro de búsqueda)
  // en vez de la que realmente dispara el debounce, y quedarse esperando una que nunca
  // llega. Más robusto: limpiar el campo y dejar que Playwright reintente sobre el valor
  // final en el DOM en vez de sincronizar por red.
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill("")
  await expect(async () => {
    const proyeccionDespues = parseCurrency(await proyeccionCard.innerText())
    expect(proyeccionDespues - proyeccionAntes).toBe(33333)
  }).toPass()
})

test("4. Cierre de Caja: dos métodos y dos empleados cierran, y una fecha sin pagos muestra el estado vacío", async ({
  page,
}) => {
  const { dni: dniCliente } = await crearClienteTest(30)
  const empleado = await crearEmpleadoTest()

  // Cobro 1: admin, efectivo.
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("button", { name: "Registrar Pago" }).click()
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dniCliente)
  await page.getByText(dniCliente).click()
  const monto1 = page.getByLabel("Monto *")
  await monto1.fill("")
  await monto1.pressSequentially("11111")
  await page.getByRole("button", { name: "Registrar pago", exact: true }).click()
  await expect(page.getByText("Pago registrado")).toBeVisible()
  await logout(page)

  // Cobro 2: empleado, tarjeta.
  await login(page, empleado.email, empleado.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("button", { name: "Registrar Pago" }).click()
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dniCliente)
  await page.getByText(dniCliente).click()
  const monto2 = page.getByLabel("Monto *")
  await monto2.fill("")
  await monto2.pressSequentially("22222")
  await page.getByLabel("Método de pago *").click()
  await page.getByRole("option", { name: "Tarjeta" }).click()
  await page.getByRole("button", { name: "Registrar pago", exact: true }).click()
  await expect(page.getByText("Pago registrado")).toBeVisible()
  await logout(page)

  // Cierre de caja de hoy: admin ve ambos.
  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("tab", { name: "Cierre de Caja" }).click()

  const metodoCard = cardPorTitulo(page, "Por Método de Pago")
  await expect(metodoCard.getByText("Efectivo", { exact: true })).toBeVisible()
  await expect(metodoCard.getByText("Tarjeta", { exact: true })).toBeVisible()

  // "Zze2e Admin" y el empleado TEST_ son usuarios frescos de esta corrida: su fila en
  // Por Empleado no puede arrastrar pagos de otra ejecución ni de datos reales.
  const filaAdmin = page.getByRole("row", { name: /Zze2e Admin/ })
  const filaEmpleado = page.getByRole("row", { name: new RegExp(empleado.nombre) })
  await expect(filaAdmin).toContainText("$ 11.111,00")
  await expect(filaEmpleado).toContainText("$ 22.222,00")

  // Una fecha sin movimientos muestra el estado vacío.
  await page.getByLabel("Fecha").fill("2015-01-01")
  await expect(page.getByText("No hubo movimientos este día.")).toBeVisible()
})

test("5. un Empleado solo ve sus propios cobros en Por Empleado del Cierre de Caja", async ({ page }) => {
  const { dni: dniCliente } = await crearClienteTest(30)
  const empleado = await crearEmpleadoTest()

  await login(page, empleado.email, empleado.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("button", { name: "Registrar Pago" }).click()
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dniCliente)
  await page.getByText(dniCliente).click()
  const monto = page.getByLabel("Monto *")
  await monto.fill("")
  await monto.pressSequentially("27000")
  await page.getByRole("button", { name: "Registrar pago", exact: true }).click()
  await expect(page.getByText("Pago registrado")).toBeVisible()

  await page.getByRole("tab", { name: "Cierre de Caja" }).click()
  const filaEmpleado = page.getByRole("row", { name: new RegExp(empleado.nombre) })
  await expect(filaEmpleado).toContainText("$ 27.000,00")
  await expect(page.getByText("Zze2e Admin")).toHaveCount(0)
})

test("6. anular un pago de hoy lo baja del total y lo muestra en Anulados del Día", async ({ page }) => {
  const { dni: dniCliente } = await crearClienteTest(30)

  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("button", { name: "Registrar Pago" }).click()
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dniCliente)
  await page.getByText(dniCliente).click()
  const monto = page.getByLabel("Monto *")
  await monto.fill("")
  await monto.pressSequentially("55555")
  await page.getByRole("button", { name: "Registrar pago", exact: true }).click()
  await expect(page.getByText("Pago registrado")).toBeVisible()

  await page.getByPlaceholder("Buscar por cliente o DNI...").fill(dniCliente)
  const filaPago = page.getByRole("row").filter({ hasText: "$ 55.555,00" })
  await expect(filaPago).toBeVisible()
  await filaPago.getByRole("button", { name: "Anular pago" }).click()
  await page.getByLabel("Motivo *").fill("TEST_ anulación e2e")
  await page.getByRole("button", { name: "Anular pago" }).click()
  await expect(page.getByText("Pago anulado")).toBeVisible()
  await expect(filaPago.getByText("Anulado")).toBeVisible()

  await page.getByRole("tab", { name: "Cierre de Caja" }).click()
  await expect(page.getByText("Anulados del Día")).toBeVisible()
  const anuladosCard = cardPorTitulo(page, "Anulados del Día")
  await expect(anuladosCard).toContainText("$ 55.555,00")
  await expect(anuladosCard).toContainText("1 pago (no suman al total)")

  const totalCard = cardPorTitulo(page, "Total del Día")
  await expect(totalCard).not.toContainText("$ 55.555,00")
})

test("6b. solo el pago vigente más reciente de un cliente muestra el botón Anular", async ({ page }) => {
  const { id: clienteId, dni: dniCliente } = await crearClienteTest(30)
  await registrarPagoHistoricoTest(clienteId, 11111, 30)

  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("button", { name: "Registrar Pago" }).click()
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dniCliente)
  await page.getByText(dniCliente).click()
  const monto = page.getByLabel("Monto *")
  await monto.fill("")
  await monto.pressSequentially("22222")
  await page.getByRole("button", { name: "Registrar pago", exact: true }).click()
  await expect(page.getByText("Pago registrado")).toBeVisible()

  await page.getByPlaceholder("Buscar por cliente o DNI...").fill(dniCliente)
  const filaVieja = page.getByRole("row").filter({ hasText: "$ 11.111,00" })
  const filaNueva = page.getByRole("row").filter({ hasText: "$ 22.222,00" })
  await expect(filaNueva).toBeVisible()
  await expect(filaVieja).toBeVisible()
  await expect(filaNueva.getByRole("button", { name: "Anular pago" })).toBeVisible()
  await expect(filaVieja.getByRole("button", { name: "Anular pago" })).toHaveCount(0)
})

test("7. búsqueda por nombre/DNI y paginación con más de 20 clientes TEST_ morosos", async ({ page }) => {
  const clientes = []
  for (let i = 1; i <= 22; i++) {
    clientes.push(await crearClienteTest(-i, nombreTest(`Paginado${i}`)))
  }
  const objetivo = clientes[0]

  await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  await page.goto("/dashboard/facturacion")
  await page.getByRole("tab", { name: "Morosos" }).click()

  await expect(page.getByText(/Página 1 de \d+/)).toBeVisible()
  const totalText = await page.getByText(/Página 1 de \d+/).innerText()
  const totalPaginas = Number(totalText.match(/Página 1 de (\d+)/)![1])
  expect(totalPaginas).toBeGreaterThanOrEqual(2)

  await page.getByRole("button", { name: "Siguiente" }).click()
  await expect(page.getByText(/Página 2 de \d+/)).toBeVisible()
  await page.getByRole("button", { name: "Anterior" }).click()
  await expect(page.getByText(/Página 1 de \d+/)).toBeVisible()

  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(objetivo.nombre)
  await expect(page.getByRole("row", { name: new RegExp(objetivo.nombre) })).toBeVisible()
  await expect(page.getByText(/Página 1 de 1/)).toBeVisible()

  await page.getByPlaceholder("Buscar por nombre o DNI...").fill("")
  await page.getByPlaceholder("Buscar por nombre o DNI...").fill(objetivo.dni)
  await expect(page.getByRole("row", { name: new RegExp(objetivo.nombre) })).toBeVisible()
  await expect(page.getByText(/Página 1 de 1/)).toBeVisible()
})

test.describe("8. mobile", () => {
  test.use({ viewport: { width: 375, height: 720 } })

  test("Morosos y Por Vencer muestran cards; Cierre de Caja muestra acordeón, no tabla", async ({ page }) => {
    const moroso = await crearClienteTest(-2, nombreTest("Mobile"))
    await registrarPagoHistoricoTest((await pool.query("SELECT id FROM clientes WHERE dni = $1", [moroso.dni])).rows[0].id, 12000, -2)

    await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
    await page.goto("/dashboard/facturacion")

    await page.getByRole("tab", { name: "Morosos" }).click()
    await page.getByPlaceholder("Buscar por nombre o DNI...").fill(moroso.dni)
    await expect(page.getByRole("button", { name: "Registrar pago" }).first()).toBeVisible()
    await expect(page.getByRole("table")).toBeHidden()

    await page.getByPlaceholder("Buscar por nombre o DNI...").fill("")
    await page.getByRole("tab", { name: "Por Vencer" }).click()
    await expect(page.getByRole("table")).toBeHidden()

    // Cierre de caja: un cobro de hoy para que haya algo que mostrar.
    await page.getByRole("button", { name: "Registrar Pago" }).click()
    const dialogo = page.getByRole("dialog")
    await dialogo.getByPlaceholder("Buscar por nombre o DNI...").fill(moroso.dni)
    await dialogo.getByText(moroso.dni).click()
    await dialogo.getByRole("button", { name: "Registrar pago", exact: true }).click()
    await expect(page.getByText("Pago registrado")).toBeVisible()

    await page.getByRole("tab", { name: "Cierre de Caja" }).click()
    await expect(page.getByRole("button", { name: /Zze2e Admin/ })).toBeVisible()
    await expect(page.getByRole("table")).toBeHidden()
  })
})
