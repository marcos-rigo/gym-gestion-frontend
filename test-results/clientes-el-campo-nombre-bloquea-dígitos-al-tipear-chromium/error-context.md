# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clientes.spec.ts >> el campo nombre bloquea dígitos al tipear
- Location: e2e\clientes.spec.ts:20:5

# Error details

```
Test timeout of 45000ms exceeded while running "beforeEach" hook.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import type { Page } from "@playwright/test"
  2  | import { expect } from "@playwright/test"
  3  | 
  4  | export async function login(page: Page, email: string, password: string) {
> 5  |   await page.goto("/login")
     |              ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  6  |   await page.getByLabel("Email", { exact: true }).fill(email)
  7  |   await page.getByLabel("Contraseña", { exact: true }).fill(password)
  8  |   await page.getByRole("button", { name: "Ingresar" }).click()
  9  | }
  10 | 
  11 | export async function logout(page: Page) {
  12 |   await page.getByRole("button", { name: "Cerrar sesión" }).click()
  13 |   await expect(page).toHaveURL(/\/login/)
  14 | }
  15 | 
  16 | /** DNI de prueba único (siempre empieza con 99 para distinguirlo a simple vista). */
  17 | export function dniDePrueba() {
  18 |   return `99${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`
  19 | }
  20 | 
```