import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Ingresar" }).click()
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click()
  await expect(page).toHaveURL(/\/login/)
}

/** DNI de prueba único (siempre empieza con 99 para distinguirlo a simple vista). */
export function dniDePrueba() {
  return `99${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`
}
