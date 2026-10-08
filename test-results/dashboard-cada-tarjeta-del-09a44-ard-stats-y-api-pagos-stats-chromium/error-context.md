# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> cada tarjeta del dashboard coincide con /api/dashboard/stats y /api/pagos/stats
- Location: e2e\dashboard.spec.ts:8:5

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 45000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]: COLOSSEO
      - navigation [ref=e6]:
        - link "Dashboard" [ref=e7] [cursor=pointer]:
          - /url: /dashboard
        - link "Clientes" [ref=e13] [cursor=pointer]:
          - /url: /dashboard/clientes
        - link "Usuarios" [ref=e19] [cursor=pointer]:
          - /url: /dashboard/usuarios
        - link "Roles" [ref=e32] [cursor=pointer]:
          - /url: /dashboard/roles
      - generic [ref=e35]:
        - paragraph [ref=e36]: Zze2e Admin
        - paragraph [ref=e37]: zze2e_admin_1791434440546@example.test
        - button "Cerrar sesión" [ref=e38]
    - main [ref=e39]:
      - generic [ref=e40]:
        - heading "DASHBOARD" [level=1] [ref=e41]
        - paragraph [ref=e42]: Bienvenido, Zze2e Admin
      - generic [ref=e43]:
        - generic [ref=e44]:
          - generic [ref=e45]:
            - generic [ref=e46]: Facturación Hoy
            - generic [ref=e48]: $ 90.000,00
          - generic [ref=e50]:
            - generic [ref=e51]: Esta Semana
            - generic [ref=e53]: $ 90.000,00
          - generic [ref=e55]:
            - generic [ref=e56]: Este Mes
            - generic [ref=e58]: $ 90.000,00
        - generic [ref=e60]:
          - generic [ref=e61]:
            - generic [ref=e62]: Total Clientes
            - generic [ref=e69]: "7"
          - generic [ref=e71]:
            - generic [ref=e72]: Activos
            - generic [ref=e77]: "7"
          - generic [ref=e79]:
            - generic [ref=e80]: Por Vencer (7 días)
            - generic [ref=e85]: "0"
          - generic [ref=e87]:
            - generic [ref=e88]: Morosos
            - generic [ref=e92]: "0"
        - generic [ref=e94]:
          - generic [ref=e95]: Nuevos este mes
          - generic [ref=e100]: "7"
        - generic [ref=e102]:
          - generic [ref=e103]: Próximos Vencimientos
          - generic [ref=e105]: No hay vencimientos próximos
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e115] [cursor=pointer]
  - alert [ref=e119]: DASHBOARD
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test"
  2  | import { loadFixtures } from "./fixtures"
  3  | import { login } from "./helpers"
  4  | 
  5  | const fx = loadFixtures()
  6  | const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })
  7  | 
  8  | test("cada tarjeta del dashboard coincide con /api/dashboard/stats y /api/pagos/stats", async ({ page }) => {
  9  |   const [statsResponse] = await Promise.all([
  10 |     page.waitForResponse((res) => res.url().includes("/dashboard/stats") && res.status() === 200),
  11 |     login(page, fx.credenciales.admin.email, fx.credenciales.admin.password),
  12 |   ])
  13 |   const statsBody = await statsResponse.json()
  14 |   const stats = statsBody.data
  15 | 
> 16 |   const pagosResponse = await page.waitForResponse((res) => res.url().includes("/pagos/stats") && res.status() === 200)
     |                                    ^ Error: page.waitForResponse: Test timeout of 45000ms exceeded.
  17 |   const pagosBody = await pagosResponse.json()
  18 |   const facturacion = pagosBody.data
  19 | 
  20 |   await expect(page.getByText("Total Clientes").locator("..")).toContainText(String(stats.total))
  21 |   await expect(page.getByText("Activos", { exact: true }).locator("..")).toContainText(String(stats.activos))
  22 |   await expect(page.getByText("Por Vencer (7 días)").locator("..")).toContainText(String(stats.porVencer))
  23 |   await expect(page.getByText("Morosos").locator("..")).toContainText(String(stats.morosos))
  24 |   await expect(page.getByText("Nuevos este mes").locator("..")).toContainText(String(stats.nuevosMes))
  25 | 
  26 |   await expect(page.getByText("Facturación Hoy").locator("..")).toContainText(currency.format(facturacion.hoy))
  27 |   await expect(page.getByText("Esta Semana").locator("..")).toContainText(currency.format(facturacion.semana))
  28 |   await expect(page.getByText("Este Mes").locator("..")).toContainText(currency.format(facturacion.mes))
  29 | })
  30 | 
  31 | test("un usuario sin estadisticas_ver no ve el link Dashboard ni puede entrar por URL", async ({ page }) => {
  32 |   await login(page, fx.credenciales.parcial.email, fx.credenciales.parcial.password)
  33 |   await expect(page).toHaveURL(/\/dashboard\/clientes$/)
  34 |   await expect(page.getByRole("navigation").getByText("Dashboard")).not.toBeVisible()
  35 | 
  36 |   await page.goto("/dashboard")
  37 |   await expect(page.getByText("No tenés permiso para ver esta página")).toBeVisible()
  38 | })
  39 | 
```