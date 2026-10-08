import { describe, expect, it } from "vitest"
import { PERMISOS, primeraRutaAccesible, puedeAcceder, RUTAS_PROTEGIDAS } from "./permissions"

describe("RUTAS_PROTEGIDAS", () => {
  it("define las 4 rutas del dashboard con su href", () => {
    expect(RUTAS_PROTEGIDAS.DASHBOARD.href).toBe("/dashboard")
    expect(RUTAS_PROTEGIDAS.CLIENTES.href).toBe("/dashboard/clientes")
    expect(RUTAS_PROTEGIDAS.USUARIOS.href).toBe("/dashboard/usuarios")
    expect(RUTAS_PROTEGIDAS.ROLES.href).toBe("/dashboard/roles")
  })

  it("Usuarios es soloAdmin (el backend solo exige esAdmin/Dueño, no permisos granulares)", () => {
    expect(RUTAS_PROTEGIDAS.USUARIOS.soloAdmin).toBe(true)
    expect(RUTAS_PROTEGIDAS.USUARIOS.permiso).toBeUndefined()
  })

  it.each([
    ["DASHBOARD", PERMISOS.ESTADISTICAS_VER],
    ["CLIENTES", PERMISOS.CLIENTES_VER],
    ["ROLES", PERMISOS.ROLES_VER],
  ] as const)("%s exige el permiso %s", (key, permiso) => {
    expect(RUTAS_PROTEGIDAS[key].permiso).toBe(permiso)
  })
})

describe("puedeAcceder", () => {
  it("un admin siempre puede, incluso en rutas soloAdmin", () => {
    expect(puedeAcceder(RUTAS_PROTEGIDAS.USUARIOS, { esAdmin: true, permisos: [] })).toBe(true)
    expect(puedeAcceder(RUTAS_PROTEGIDAS.DASHBOARD, { esAdmin: true, permisos: [] })).toBe(true)
  })

  it("un no-admin nunca puede entrar a una ruta soloAdmin aunque tenga el string de permiso", () => {
    expect(
      puedeAcceder(RUTAS_PROTEGIDAS.USUARIOS, { esAdmin: false, permisos: [PERMISOS.USUARIOS_VER] })
    ).toBe(false)
  })

  it("un no-admin con el permiso exacto puede entrar", () => {
    expect(
      puedeAcceder(RUTAS_PROTEGIDAS.CLIENTES, { esAdmin: false, permisos: [PERMISOS.CLIENTES_VER] })
    ).toBe(true)
  })

  it("un no-admin sin el permiso no puede entrar", () => {
    expect(puedeAcceder(RUTAS_PROTEGIDAS.CLIENTES, { esAdmin: false, permisos: [] })).toBe(false)
    expect(
      puedeAcceder(RUTAS_PROTEGIDAS.ROLES, { esAdmin: false, permisos: [PERMISOS.CLIENTES_VER] })
    ).toBe(false)
  })

  it("una ruta sin permiso definido es accesible para cualquier usuario autenticado", () => {
    expect(puedeAcceder({ permiso: undefined }, { esAdmin: false, permisos: [] })).toBe(true)
  })
})

describe("primeraRutaAccesible", () => {
  it("un admin siempre cae en /dashboard (primero en el orden)", () => {
    expect(primeraRutaAccesible({ esAdmin: true, permisos: [] })).toBe("/dashboard")
  })

  it("el rol Empleado (clientes_ver, sin estadisticas_ver) cae en /dashboard/clientes", () => {
    expect(
      primeraRutaAccesible({
        esAdmin: false,
        permisos: [PERMISOS.CLIENTES_VER, PERMISOS.CLIENTES_CREAR, PERMISOS.FACTURACION_VER],
      })
    ).toBe("/dashboard/clientes")
  })

  it("un usuario con solo roles_ver cae en /dashboard/roles", () => {
    expect(primeraRutaAccesible({ esAdmin: false, permisos: [PERMISOS.ROLES_VER] })).toBe("/dashboard/roles")
  })

  it("un usuario sin ningún permiso cae en el fallback /dashboard", () => {
    expect(primeraRutaAccesible({ esAdmin: false, permisos: [] })).toBe("/dashboard")
  })
})
