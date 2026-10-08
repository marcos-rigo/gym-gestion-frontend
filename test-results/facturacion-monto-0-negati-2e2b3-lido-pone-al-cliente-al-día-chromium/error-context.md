# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: facturacion.spec.ts >> monto 0, negativo y con 3 decimales se rechazan; un cobro válido pone al cliente al día
- Location: e2e\facturacion.spec.ts:12:5

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Nuevo Cliente' })

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e3]:
    - generic [ref=f1e4]:
      - generic [ref=f1e5]: Iniciar sesión
      - generic [ref=f1e6]: Ingresá tus credenciales para acceder al panel.
    - generic [ref=f1e8]:
      - generic [ref=f1e9]:
        - generic [ref=f1e10]: Email
        - textbox "Email" [ref=f1e11]
      - generic [ref=f1e12]:
        - generic [ref=f1e13]: Contraseña
        - generic [ref=f1e14]:
          - textbox "Contraseña" [ref=f1e15]
          - button "Mostrar contraseña" [ref=f1e16]
      - button "Ingresar" [ref=f1e17]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=f1e23] [cursor=pointer]
  - alert [ref=f1e27]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test"
  2  | import { pool } from "./db"
  3  | import { loadFixtures } from "./fixtures"
  4  | import { dniDePrueba, login } from "./helpers"
  5  | 
  6  | const fx = loadFixtures()
  7  | 
  8  | test.beforeEach(async ({ page }) => {
  9  |   await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  10 | })
  11 | 
  12 | test("monto 0, negativo y con 3 decimales se rechazan; un cobro válido pone al cliente al día", async ({ page }) => {
  13 |   const dni = dniDePrueba()
  14 |   await page.goto("/dashboard/clientes")
> 15 |   await page.getByRole("button", { name: "Nuevo Cliente" }).click()
     |                                                             ^ Error: locator.click: Test timeout of 45000ms exceeded.
  16 |   await page.getByLabel("Nombre *").fill("Zze2e")
  17 |   await page.getByLabel("Apellido *").fill("Factura")
  18 |   await page.getByLabel("DNI *").fill(dni)
  19 |   await page.getByRole("button", { name: "Crear cliente" }).click()
  20 |   await expect(page.getByText("Cliente creado")).toBeVisible()
  21 | 
  22 |   // Fuerza al cliente a "moroso": no hay forma de setear el vencimiento desde el UI
  23 |   // (el backend lo calcula), así que se ajusta directo en la base para probar el flujo.
  24 |   const { rows } = await pool.query("SELECT id FROM clientes WHERE dni = $1", [dni])
  25 |   const clienteId = rows[0].id as string
  26 |   await pool.query(
  27 |     "UPDATE clientes SET fecha_vencimiento = (CURRENT_DATE - INTERVAL '5 days')::date WHERE id = $1",
  28 |     [clienteId]
  29 |   )
  30 | 
  31 |   await page.reload()
  32 |   const fila = page.getByRole("row", { name: /Factura, Zze2e/ })
  33 |   await expect(fila.getByText("Moroso")).toBeVisible()
  34 | 
  35 |   await fila.getByRole("button", { name: "Ver cliente" }).click()
  36 |   await page.getByRole("button", { name: "Cobrar Cuota" }).click()
  37 | 
  38 |   const monto = page.getByLabel("Monto *")
  39 |   await monto.fill("")
  40 |   await monto.pressSequentially("0")
  41 |   await page.getByRole("button", { name: "Registrar cobro" }).click()
  42 |   await expect(page.getByText("El monto debe ser mayor a cero")).toBeVisible()
  43 | 
  44 |   await monto.fill("")
  45 |   await monto.pressSequentially("-45000")
  46 |   await expect(monto).toHaveValue("45000")
  47 | 
  48 |   await monto.fill("")
  49 |   await monto.pressSequentially("100.999")
  50 |   await page.getByRole("button", { name: "Registrar cobro" }).click()
  51 |   await expect(page.getByText("El monto admite como máximo 2 decimales")).toBeVisible()
  52 | 
  53 |   await monto.fill("")
  54 |   await monto.pressSequentially("45000")
  55 |   await page.getByRole("button", { name: "Registrar cobro" }).click()
  56 |   await expect(page.getByText("Cobro registrado")).toBeVisible()
  57 | 
  58 |   await page.getByRole("button", { name: "Cerrar" }).click()
  59 |   await expect(fila.getByText("Al día")).toBeVisible()
  60 | 
  61 |   // cleanup (cascada a pagos por FK)
  62 |   await fila.getByRole("button", { name: "Eliminar cliente" }).click()
  63 |   await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  64 |   await expect(page.getByText("Cliente eliminado")).toBeVisible()
  65 | })
  66 | 
```