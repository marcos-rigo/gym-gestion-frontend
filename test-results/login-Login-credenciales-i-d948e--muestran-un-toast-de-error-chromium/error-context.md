# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Login >> credenciales inválidas muestran un toast de error
- Location: e2e\login.spec.ts:24:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Credenciales inválidas')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Credenciales inválidas') with timeout 5000ms
  - waiting for getByText('Credenciales inválidas')

```

```yaml
- text: Iniciar sesión Ingresá tus credenciales para acceder al panel. Email
- textbox "Email": no-existe@example.test
- text: Contraseña
- textbox "Contraseña": Test1234x
- button "Mostrar contraseña"
- button "Ingresar"
- region "Notifications alt+T":
  - list:
    - listitem: Error al iniciar sesión No autorizado
- alert
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test"
  2  | import { loadFixtures } from "./fixtures"
  3  | import { login } from "./helpers"
  4  | 
  5  | const fx = loadFixtures()
  6  | 
  7  | test.describe("Login", () => {
  8  |   test("contraseña vacía muestra error de validación sin llamar al backend", async ({ page }) => {
  9  |     await page.goto("/login")
  10 |     await page.getByLabel("Email").fill("alguien@example.com")
  11 |     await page.getByRole("button", { name: "Ingresar" }).click()
  12 |     await expect(page.getByText("La contraseña es obligatoria")).toBeVisible()
  13 |     await expect(page).toHaveURL(/\/login/)
  14 |   })
  15 | 
  16 |   test("email mal formado muestra error de validación", async ({ page }) => {
  17 |     await page.goto("/login")
  18 |     await page.getByLabel("Email").fill("no-es-un-email")
  19 |     await page.getByLabel("Contraseña", { exact: true }).fill("cualquiera")
  20 |     await page.getByRole("button", { name: "Ingresar" }).click()
  21 |     await expect(page.getByText("Ingresá un email válido")).toBeVisible()
  22 |   })
  23 | 
  24 |   test("credenciales inválidas muestran un toast de error", async ({ page }) => {
  25 |     await page.goto("/login")
  26 |     await page.getByLabel("Email").fill("no-existe@example.test")
  27 |     await page.getByLabel("Contraseña", { exact: true }).fill("Test1234x")
  28 |     await page.getByRole("button", { name: "Ingresar" }).click()
> 29 |     await expect(page.getByText("Credenciales inválidas")).toBeVisible()
     |                                                            ^ Error: expect(locator).toBeVisible() failed
  30 |     await expect(page).toHaveURL(/\/login/)
  31 |   })
  32 | 
  33 |   test("el botón ojo muestra/oculta la contraseña sin perder el foco", async ({ page }) => {
  34 |     await page.goto("/login")
  35 |     const password = page.getByLabel("Contraseña", { exact: true })
  36 |     await password.fill("Test1234x")
  37 |     await expect(password).toHaveAttribute("type", "password")
  38 | 
  39 |     await page.getByRole("button", { name: "Mostrar contraseña" }).click()
  40 |     await expect(password).toHaveAttribute("type", "text")
  41 |     await expect(password).toBeFocused()
  42 | 
  43 |     await page.getByRole("button", { name: "Ocultar contraseña" }).click()
  44 |     await expect(password).toHaveAttribute("type", "password")
  45 |     await expect(password).toBeFocused()
  46 |   })
  47 | 
  48 |   test("un admin cae en /dashboard", async ({ page }) => {
  49 |     await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  50 |     await expect(page).toHaveURL(/\/dashboard$/)
  51 |   })
  52 | 
  53 |   test("un usuario sin estadisticas_ver (pero con clientes_ver) cae directo en /dashboard/clientes", async ({ page }) => {
  54 |     await login(page, fx.credenciales.parcial.email, fx.credenciales.parcial.password)
  55 |     await expect(page).toHaveURL(/\/dashboard\/clientes$/)
  56 |   })
  57 | 
  58 |   test("un usuario sin ningún permiso cae en /dashboard y ve el mensaje de acceso denegado", async ({ page }) => {
  59 |     await login(page, fx.credenciales.sinPermisos.email, fx.credenciales.sinPermisos.password)
  60 |     await expect(page).toHaveURL(/\/dashboard$/)
  61 |     await expect(page.getByText("No tenés permiso para ver esta página")).toBeVisible()
  62 |   })
  63 | })
  64 | 
```