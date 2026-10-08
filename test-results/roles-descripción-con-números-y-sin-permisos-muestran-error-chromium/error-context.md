# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: roles.spec.ts >> descripción con números y sin permisos muestran error
- Location: e2e\roles.spec.ts:12:5

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Nuevo Rol' })

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
  - button "Open Next.js Dev Tools" [ref=f1e23] [cursor=pointer]:
    - generic [ref=f1e26]:
      - text: Compiling
      - generic [ref=f1e27]:
        - generic [ref=f1e28]: .
        - generic [ref=f1e29]: .
        - generic [ref=f1e30]: .
  - alert [ref=f1e31]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test"
  2  | import { loadFixtures } from "./fixtures"
  3  | import { login } from "./helpers"
  4  | 
  5  | const fx = loadFixtures()
  6  | 
  7  | test.beforeEach(async ({ page }) => {
  8  |   await login(page, fx.credenciales.admin.email, fx.credenciales.admin.password)
  9  |   await page.goto("/dashboard/roles")
  10 | })
  11 | 
  12 | test("descripción con números y sin permisos muestran error", async ({ page }) => {
> 13 |   await page.getByRole("button", { name: "Nuevo Rol" }).click()
     |                                                         ^ Error: locator.click: Test timeout of 45000ms exceeded.
  14 |   await page.getByLabel("Nombre del rol *").pressSequentially("Supervisor2")
  15 |   await expect(page.getByLabel("Nombre del rol *")).toHaveValue("Supervisor")
  16 |   await page.getByRole("button", { name: "Crear rol" }).click()
  17 |   await expect(page.getByText("Seleccioná al menos un permiso")).toBeVisible()
  18 |   await page.getByRole("button", { name: "Cancelar" }).click()
  19 | })
  20 | 
  21 | test("descripción duplicada da 409 en el campo", async ({ page }) => {
  22 |   await page.getByRole("button", { name: "Nuevo Rol" }).click()
  23 |   await page.getByLabel("Nombre del rol *").fill("Zze2e Parcial")
  24 |   await page.getByRole("checkbox", { name: "Ver Clientes" }).click()
  25 |   await page.getByRole("button", { name: "Crear rol" }).click()
  26 |   await expect(page.getByText("Ya existe un rol con esa descripción")).toBeVisible()
  27 |   await page.getByRole("button", { name: "Cancelar" }).click()
  28 | })
  29 | 
  30 | test("el rol Zze2e Admin (protegido) solo se puede ver, no editar ni eliminar", async ({ page }) => {
  31 |   const fila = page.getByRole("row", { name: /Zze2e Admin/ })
  32 |   await expect(fila).toContainText("Protegido")
  33 |   await expect(fila.getByRole("button", { name: "Eliminar rol" })).toBeDisabled()
  34 | 
  35 |   await fila.getByRole("button", { name: "Ver rol" }).click()
  36 |   await expect(page.getByText("Ver Rol")).toBeVisible()
  37 |   await expect(page.getByLabel("Nombre del rol *")).toBeDisabled()
  38 |   await expect(page.getByRole("button", { name: /Crear rol|Guardar cambios/ })).toHaveCount(0)
  39 |   await page.getByRole("button", { name: "Cerrar" }).click()
  40 | })
  41 | 
  42 | test("crear rol, asignar permisos, usarlo en un usuario y no poder eliminarlo hasta liberar ese usuario", async ({ page }) => {
  43 |   const nombreRol = `Zze2e Temporal`
  44 |   await page.getByRole("button", { name: "Nuevo Rol" }).click()
  45 |   await page.getByLabel("Nombre del rol *").fill(nombreRol)
  46 |   await page.getByRole("checkbox", { name: "Ver Clientes" }).click()
  47 |   await page.getByRole("checkbox", { name: "Editar Clientes" }).click()
  48 |   await page.getByRole("button", { name: "Crear rol" }).click()
  49 |   await expect(page.getByText("Rol creado")).toBeVisible()
  50 |   await expect(page.getByRole("row", { name: new RegExp(nombreRol) })).toBeVisible()
  51 | 
  52 |   // asignarlo a un usuario nuevo
  53 |   await page.goto("/dashboard/usuarios")
  54 |   const email = `zze2e_rol_${Date.now()}@example.test`
  55 |   await page.getByRole("button", { name: "Nuevo Usuario" }).click()
  56 |   await page.getByLabel("Nombre *").fill("Zze2e UsaRol")
  57 |   await page.getByLabel("Email *").fill(email)
  58 |   await page.getByLabel("Contraseña *", { exact: true }).fill("Test1234x")
  59 |   await page.getByLabel("Confirmar contraseña *").fill("Test1234x")
  60 |   await page.getByLabel("Rol *").click()
  61 |   await page.getByRole("option", { name: nombreRol }).click()
  62 |   await page.getByRole("button", { name: "Crear usuario" }).click()
  63 |   await expect(page.getByText("Usuario creado")).toBeVisible()
  64 | 
  65 |   // no se puede eliminar el rol con ese usuario asignado
  66 |   await page.goto("/dashboard/roles")
  67 |   const filaRol = page.getByRole("row", { name: new RegExp(nombreRol) })
  68 |   await filaRol.getByRole("button", { name: "Eliminar rol" }).click()
  69 |   await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  70 |   await expect(page.getByText("No se puede eliminar el rol porque tiene usuarios asignados")).toBeVisible()
  71 | 
  72 |   // liberar: borrar el usuario y ahora sí eliminar el rol
  73 |   await page.goto("/dashboard/usuarios")
  74 |   const filaUsuario = page.getByRole("row", { name: /Zze2e UsaRol/ })
  75 |   await filaUsuario.getByRole("button", { name: "Eliminar usuario" }).click()
  76 |   await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  77 |   await expect(page.getByText("Usuario eliminado")).toBeVisible()
  78 | 
  79 |   await page.goto("/dashboard/roles")
  80 |   await filaRol.getByRole("button", { name: "Eliminar rol" }).click()
  81 |   await page.getByRole("button", { name: "Eliminar", exact: true }).click()
  82 |   await expect(page.getByText("Rol eliminado")).toBeVisible()
  83 |   await expect(page.getByRole("row", { name: new RegExp(nombreRol) })).not.toBeVisible()
  84 | })
  85 | 
```