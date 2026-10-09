import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Contraseña", { exact: true }).fill(password)
  // Sin esto, un `page.goto` inmediatamente después del click puede ganarle la carrera
  // al POST /auth/login + redirect (el token todavía no está en localStorage), dejando
  // al navegador de vuelta en /login con el formulario vacío.
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/auth/login") && res.request().method() === "POST"),
    page.getByRole("button", { name: "Ingresar" }).click(),
  ])
  await page.waitForURL((url) => !url.pathname.startsWith("/login"))
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click()
  await expect(page).toHaveURL(/\/login/)
}

/**
 * Reemplaza el valor de un input de react-hook-form recién montado, tecla por tecla. Primero
 * espera a que muestre su valor inicial: en dev, el ref de `register` puede escribirlo unos ms
 * después de que el input ya es interactivo; si se limpió antes, ese valor aparece igual y lo
 * tipeado queda delante (visto: tipear "22222" dejaba "2222245000").
 */
export async function reemplazarTipeando(input: Locator, valorInicial: string, valor: string) {
  await expect(input).toHaveValue(valorInicial)
  await input.fill("")
  await input.pressSequentially(valor)
}

/** DNI de prueba único (siempre empieza con 99 para distinguirlo a simple vista). */
export function dniDePrueba() {
  return `99${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`
}
