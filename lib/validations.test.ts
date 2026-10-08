import { describe, expect, it, vi } from "vitest"
import {
  aplicarErrorBackend,
  clienteSchema,
  cobroSchema,
  dniSchema,
  emailSchema,
  fechaNacimientoSchema,
  loginSchema,
  montoSchema,
  nombreSchema,
  passwordSchema,
  roleSchema,
  telefonoOpcionalSchema,
  usuarioCreateSchema,
  usuarioEditSchema,
} from "./validations"

describe("nombreSchema", () => {
  it.each(["Juan", "María José", "O'Connor-Díaz", "Jean-Pierre", "Ñoño", "Ana  María"])(
    "acepta %s",
    (value) => {
      expect(nombreSchema.safeParse(value).success).toBe(true)
    }
  )

  it("colapsa espacios repetidos y recorta extremos", () => {
    const result = nombreSchema.safeParse("  Ana   María  ")
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe("Ana María")
  })

  it.each([
    ["A", "menor al mínimo (1 char)"],
    ["a".repeat(51), "mayor al máximo (51 chars)"],
    ["Juan1", "contiene dígitos"],
    ["Juan@", "contiene símbolos"],
    ["-Juan", "separador al inicio"],
    ["Juan-", "separador al final"],
    ["Juan--Pérez", "separador repetido"],
  ])("rechaza %s (%s)", (value) => {
    expect(nombreSchema.safeParse(value).success).toBe(false)
  })

  it("acepta el límite de 2 y 50 caracteres", () => {
    expect(nombreSchema.safeParse("Jo").success).toBe(true)
    expect(nombreSchema.safeParse("a".repeat(50)).success).toBe(true)
  })
})

describe("dniSchema", () => {
  it.each(["1234567", "12345678"])("acepta %s dígitos", (value) => {
    expect(dniSchema.safeParse(value).success).toBe(true)
  })

  it.each(["123456", "123456789", "1234567A", "ABC1234"])("rechaza %s", (value) => {
    expect(dniSchema.safeParse(value).success).toBe(false)
  })
})

describe("telefonoOpcionalSchema", () => {
  it("acepta vacío/undefined (es opcional)", () => {
    expect(telefonoOpcionalSchema.safeParse("").success).toBe(true)
    expect(telefonoOpcionalSchema.safeParse(undefined).success).toBe(true)
  })

  it.each(["12345678", "123456789012345", "+5491122334455"])("acepta %s", (value) => {
    expect(telefonoOpcionalSchema.safeParse(value).success).toBe(true)
  })

  it.each(["1234567", "12345678901234567", "abcdefgh", "++12345678"])("rechaza %s", (value) => {
    expect(telefonoOpcionalSchema.safeParse(value).success).toBe(false)
  })
})

describe("emailSchema", () => {
  it("normaliza a trim + lowercase", () => {
    const result = emailSchema.safeParse("  MARIA@Example.COM  ")
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe("maria@example.com")
  })

  it("rechaza formato inválido", () => {
    expect(emailSchema.safeParse("no-es-un-email").success).toBe(false)
    expect(emailSchema.safeParse("falta-dominio@").success).toBe(false)
  })

  it("rechaza más de 100 caracteres", () => {
    const largo = `${"a".repeat(95)}@a.com`
    expect(largo.length).toBeGreaterThan(100)
    expect(emailSchema.safeParse(largo).success).toBe(false)
  })
})

describe("passwordSchema", () => {
  it.each(["Test1234", "a".repeat(70) + "1a", "Password1"])("acepta %s", (value) => {
    expect(passwordSchema.safeParse(value).success).toBe(true)
  })

  it("acepta el límite de 72 caracteres", () => {
    const value = `${"a".repeat(70)}11`
    expect(value.length).toBe(72)
    expect(passwordSchema.safeParse(value).success).toBe(true)
  })

  it.each([
    ["short1", "menor a 8"],
    ["a".repeat(71) + "11", "más de 72"],
    ["soloLetras", "sin número"],
    ["12345678", "sin letra"],
  ])("rechaza %s (%s)", (value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false)
  })
})

describe("montoSchema", () => {
  it.each([1, 100, 45000, "45000", "100.5", "100.55", 99999999.99])("acepta %s", (value) => {
    expect(montoSchema.safeParse(value).success).toBe(true)
  })

  it.each<[number | string, string]>([
    [0, "cero"],
    [-1, "negativo"],
    ["100.999", "3 decimales"],
    [99999999.991, "supera el máximo"],
    ["abc", "no numérico"],
  ])("rechaza %s (%s)", (value) => {
    expect(montoSchema.safeParse(value).success).toBe(false)
  })
})

describe("fechaNacimientoSchema", () => {
  it("acepta vacío", () => {
    expect(fechaNacimientoSchema.safeParse("").success).toBe(true)
    expect(fechaNacimientoSchema.safeParse(undefined).success).toBe(true)
  })

  it("acepta una fecha pasada válida", () => {
    expect(fechaNacimientoSchema.safeParse("1990-05-20").success).toBe(true)
  })

  it("rechaza una fecha futura", () => {
    const futuro = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    expect(fechaNacimientoSchema.safeParse(futuro).success).toBe(false)
  })

  it("rechaza una fecha anterior a 1900", () => {
    expect(fechaNacimientoSchema.safeParse("1899-12-31").success).toBe(false)
  })

  it("acepta el límite exacto 1900-01-01", () => {
    expect(fechaNacimientoSchema.safeParse("1900-01-01").success).toBe(true)
  })
})

describe("clienteSchema", () => {
  const base = { nombre: "Juan", apellido: "Pérez", dni: "12345678" }

  it("acepta el mínimo requerido (resto opcional)", () => {
    expect(clienteSchema.safeParse(base).success).toBe(true)
  })

  it("rechaza si falta dni/nombre/apellido", () => {
    expect(clienteSchema.safeParse({ nombre: "Juan", apellido: "Pérez" }).success).toBe(false)
  })

  it("propaga el error del campo que falla", () => {
    const result = clienteSchema.safeParse({ ...base, dni: "ABC" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "dni")).toBe(true)
    }
  })
})

describe("usuarioCreateSchema / usuarioEditSchema", () => {
  it("create exige password y confirmación iguales", () => {
    const ok = usuarioCreateSchema.safeParse({
      nombre: "Juan",
      email: "juan@example.com",
      idRol: "rol-1",
      password: "Test1234",
      confirmPassword: "Test1234",
    })
    expect(ok.success).toBe(true)
  })

  it("create rechaza si las contraseñas no coinciden", () => {
    const result = usuarioCreateSchema.safeParse({
      nombre: "Juan",
      email: "juan@example.com",
      idRol: "rol-1",
      password: "Test1234",
      confirmPassword: "Test5678",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "confirmPassword")).toBe(true)
    }
  })

  it("edit no exige password", () => {
    const result = usuarioEditSchema.safeParse({ nombre: "Juan", email: "juan@example.com", idRol: "rol-1" })
    expect(result.success).toBe(true)
  })
})

describe("roleSchema", () => {
  it("exige al menos un permiso", () => {
    const result = roleSchema.safeParse({ descripcion: "Supervisor", permissions: [] })
    expect(result.success).toBe(false)
  })

  it("rechaza descripción con dígitos", () => {
    const result = roleSchema.safeParse({ descripcion: "Supervisor2", permissions: ["clientes_ver"] })
    expect(result.success).toBe(false)
  })

  it("acepta descripción válida con permisos", () => {
    const result = roleSchema.safeParse({ descripcion: "Supervisor", permissions: ["clientes_ver"] })
    expect(result.success).toBe(true)
  })
})

describe("cobroSchema", () => {
  it("acepta un método válido", () => {
    expect(cobroSchema.safeParse({ monto: 45000, metodo: "efectivo" }).success).toBe(true)
  })

  it("rechaza un método inválido", () => {
    expect(cobroSchema.safeParse({ monto: 45000, metodo: "cheque" }).success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("exige email y password no vacíos", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false)
    expect(loginSchema.safeParse({ email: "a@a.com", password: "" }).success).toBe(false)
  })

  it("acepta credenciales con formato válido", () => {
    expect(loginSchema.safeParse({ email: "a@a.com", password: "cualquiera" }).success).toBe(true)
  })
})

describe("aplicarErrorBackend", () => {
  function makeDeps() {
    const setError = vi.fn()
    const toast = vi.fn()
    return { setError, toast }
  }

  it("mapea errors a los campos del form en 400 y NO llama al toast", () => {
    const { setError, toast } = makeDeps()
    const err = Object.assign(new Error("Hay campos con errores. Revisá los datos ingresados."), {
      status: 400,
      errors: { dni: "El DNI debe tener 7 u 8 dígitos (solo números)" },
    })
    aplicarErrorBackend(err, setError, toast, "Error al crear el cliente")
    expect(setError).toHaveBeenCalledWith("dni", {
      type: "server",
      message: "El DNI debe tener 7 u 8 dígitos (solo números)",
    })
    expect(toast).not.toHaveBeenCalled()
  })

  it("mapea errors también en 409 (duplicados)", () => {
    const { setError, toast } = makeDeps()
    const err = Object.assign(new Error("Ya existe un cliente con ese DNI"), {
      status: 409,
      errors: { dni: "Ya existe un cliente con ese DNI" },
    })
    aplicarErrorBackend(err, setError, toast, "Error al crear el cliente")
    expect(setError).toHaveBeenCalledWith("dni", { type: "server", message: "Ya existe un cliente con ese DNI" })
    expect(toast).not.toHaveBeenCalled()
  })

  it("mapea múltiples campos si vienen varios errores", () => {
    const { setError, toast } = makeDeps()
    const err = Object.assign(new Error("Hay campos con errores."), {
      status: 400,
      errors: { nombre: "msg nombre", email: "msg email" },
    })
    aplicarErrorBackend(err, setError, toast, "titulo")
    expect(setError).toHaveBeenCalledTimes(2)
    expect(toast).not.toHaveBeenCalled()
  })

  it("muestra un toast cuando no hay errors (403/500/red caída)", () => {
    const { setError, toast } = makeDeps()
    const err = Object.assign(new Error("Acceso denegado"), { status: 403 })
    aplicarErrorBackend(err, setError, toast, "Error al actualizar el usuario")
    expect(setError).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith({
      title: "Error al actualizar el usuario",
      description: "Acceso denegado",
      variant: "destructive",
    })
  })

  it("usa 'Error desconocido' si el error no es un Error", () => {
    const { setError, toast } = makeDeps()
    aplicarErrorBackend("algo raro", setError, toast, "titulo")
    expect(toast).toHaveBeenCalledWith({
      title: "titulo",
      description: "Error desconocido",
      variant: "destructive",
    })
  })
})
