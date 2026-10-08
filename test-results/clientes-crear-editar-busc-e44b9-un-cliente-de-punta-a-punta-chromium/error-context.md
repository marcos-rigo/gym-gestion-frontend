# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clientes.spec.ts >> crear, editar, buscar y eliminar un cliente de punta a punta
- Location: e2e\clientes.spec.ts:43:5

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
  2  | import { loadFixtures } from "./fixtures"
  3  | import { dniDePrueba, login } from "./helpers"
  4  | 
  5  | const fx = loadFixtures()
  6  | 
  7  | test.beforeEach(async ({ page }) => {
  8  |   await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  9  |   await page.goto("/dashboard/clientes")
  10 | })
  11 | 
  12 | test("el campo DNI bloquea letras al tipear", async ({ page }) => {
  13 |   await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  14 |   const dni = page.getByLabel("DNI *")
  15 |   await dni.pressSequentially("ABC1234")
  16 |   await expect(dni).toHaveValue("1234")
  17 |   await page.getByRole("button", { name: "Cancelar" }).click()
  18 | })
  19 | 
  20 | test("el campo nombre bloquea dígitos al tipear", async ({ page }) => {
  21 |   await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  22 |   const nombre = page.getByLabel("Nombre *")
  23 |   await nombre.pressSequentially("Juan1")
  24 |   await expect(nombre).toHaveValue("Juan")
  25 |   await page.getByRole("button", { name: "Cancelar" }).click()
  26 | })
  27 | 
  28 | test("teléfono inválido y nacimiento futuro muestran error", async ({ page }) => {
  29 |   await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  30 |   await page.getByLabel("Nombre *").fill("Juan")
  31 |   await page.getByLabel("Apellido *").fill("Pérez")
  32 |   await page.getByLabel("DNI *").fill(dniDePrueba())
  33 |   await page.getByLabel("Teléfono").fill("123")
  34 |   const futuro = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)
  35 |   await page.getByLabel("Fecha de nacimiento").fill(futuro)
  36 |   await page.getByRole("button", { name: "Crear cliente" }).click()
  37 | 
  38 |   await expect(page.getByText("El teléfono debe tener entre 8 y 15 dígitos")).toBeVisible()
  39 |   await expect(page.getByText("La fecha de nacimiento no puede ser futura")).toBeVisible()
  40 |   await page.getByRole("button", { name: "Cancelar" }).click()
  41 | })
  42 | 
  43 | test("crear, editar, buscar y eliminar un cliente de punta a punta", async ({ page }) => {
  44 |   const dni = dniDePrueba()
  45 | 
  46 |   // crear
> 47 |   await page.getByRole("button", { name: "Nuevo Cliente" }).click()
     |                                                             ^ Error: locator.click: Test timeout of 45000ms exceeded.
  48 |   await page.getByLabel("Nombre *").fill("Zze2e")
  49 |   await page.getByLabel("Apellido *").fill("Cliente")
  50 |   await page.getByLabel("DNI *").fill(dni)
  51 |   await page.getByLabel("Teléfono").fill("+5491122334455")
  52 |   await page.getByRole("button", { name: "Crear cliente" }).click()
  53 |   await expect(page.getByText("Cliente creado")).toBeVisible()
  54 | 
  55 |   const fila = page.getByRole("row", { name: new RegExp(`Cliente, Zze2e`) })
  56 |   await expect(fila).toBeVisible()
  57 |   await expect(fila).toContainText(dni)
  58 | 
  59 |   // DNI duplicado
  60 |   await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  61 |   await page.getByLabel("Nombre *").fill("Otro")
  62 |   await page.getByLabel("Apellido *").fill("Cliente")
  63 |   await page.getByLabel("DNI *").fill(dni)
  64 |   await page.getByRole("button", { name: "Crear cliente" }).click()
  65 |   await expect(page.getByText("Ya existe un cliente con ese DNI")).toBeVisible()
  66 |   await page.getByRole("button", { name: "Cancelar" }).click()
  67 | 
  68 |   // buscar
  69 |   await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dni)
  70 |   await expect(page.getByRole("row", { name: new RegExp(`Cliente, Zze2e`) })).toBeVisible()
  71 |   await page.getByPlaceholder("Buscar por nombre o DNI...").fill("xxx-no-existe-xxx")
  72 |   await expect(page.getByText("No se encontraron clientes.")).toBeVisible()
  73 |   await page.getByPlaceholder("Buscar por nombre o DNI...").fill(dni)
  74 | 
  75 |   // editar
  76 |   await fila.getByRole("button", { name: "Editar cliente" }).click()
  77 |   await page.getByLabel("Teléfono").fill("")
  78 |   await page.getByLabel("Teléfono").fill("+5491199998888")
  79 |   await page.getByRole("button", { name: "Guardar cambios" }).click()
  80 |   await expect(page.getByText("Cliente actualizado")).toBeVisible()
  81 |   await expect(fila).toContainText("+5491199998888")
  82 | 
  83 |   // eliminar
  84 |   await fila.getByRole("button", { name: "Eliminar cliente" }).click()
  85 |   await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  86 |   await expect(page.getByText("Cliente eliminado")).toBeVisible()
  87 |   await expect(page.getByRole("row", { name: new RegExp(`Cliente, Zze2e`) })).not.toBeVisible()
  88 | })
  89 | 
  90 | test("subida de foto con cámara falsa de Chromium", async ({ page }) => {
  91 |   await page.getByRole("button", { name: "Nuevo Cliente" }).click()
  92 |   await page.getByRole("button", { name: "Activar cámara" }).click()
  93 |   await page.getByRole("button", { name: "Capturar foto" }).click()
  94 |   await expect(page.getByRole("button", { name: "Volver a tomar" })).toBeVisible({ timeout: 10_000 })
  95 |   await expect(page.locator('img[alt="Foto del cliente"]')).toBeVisible()
  96 |   await page.getByRole("button", { name: "Cancelar" }).click()
  97 | })
  98 | 
```