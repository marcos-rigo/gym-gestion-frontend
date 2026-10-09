import { z } from "zod"
import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import type { ChangeEvent, KeyboardEvent } from "react"

// ---------------------------------------------------------------------------
// Expresiones regulares compartidas
// ---------------------------------------------------------------------------

// Espejo exacto de backend/src/utils/validators.js: letras (con tildes/ñ) separadas
// por un único espacio/guion/apóstrofe, sin separador al inicio/final ni repetido.
const NOMBRE_CHARS = "A-Za-zÀ-ÖØ-öø-ÿ'’\\-\\s"
export const NOMBRE_REGEX = /^\p{L}+(?:[ '’-]\p{L}+)*$/u
export const DNI_REGEX = /^\d{7,8}$/
export const TELEFONO_REGEX = /^\+?\d{8,15}$/
export const MONTO_REGEX = /^\d+(\.\d{1,2})?$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const MONTO_MAX = 99999999.99
export const FECHA_MIN_NACIMIENTO = "1900-01-01"

// Espejo exacto de NOMBRE_PRODUCTO_RE en backend/src/utils/validators.js: letras y
// números separados por un único espacio (sin guion ni apóstrofe).
export const NOMBRE_PRODUCTO_CHARS = "A-Za-zÀ-ÖØ-öø-ÿ0-9\\s"
export const NOMBRE_PRODUCTO_REGEX = /^[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*$/u

// ---------------------------------------------------------------------------
// Schemas de campo reutilizables
// ---------------------------------------------------------------------------

export const nombreSchema = z
  .string()
  .transform((v) => v.trim().replace(/\s+/g, " "))
  .refine((v) => v.length >= 2 && v.length <= 50, "Debe tener entre 2 y 50 caracteres")
  .refine((v) => NOMBRE_REGEX.test(v), "Solo puede contener letras, espacios, guion y apóstrofe")

export const dniSchema = z
  .string()
  .trim()
  .regex(DNI_REGEX, "El DNI debe tener 7 u 8 dígitos")

export const telefonoRequeridoSchema = z
  .string()
  .trim()
  .regex(TELEFONO_REGEX, "El teléfono debe tener entre 8 y 15 dígitos (puede empezar con +)")

export const telefonoOpcionalSchema = z
  .union([telefonoRequeridoSchema, z.literal("")])
  .optional()

export const emailSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => v.length <= 100, "El email no puede superar los 100 caracteres")
  .refine((v) => EMAIL_REGEX.test(v), "El email no tiene un formato válido")

export const emailOpcionalSchema = z.union([emailSchema, z.literal("")]).optional()

export const passwordSchema = z
  .string()
  .min(8, "Debe tener entre 8 y 72 caracteres")
  .max(72, "Debe tener entre 8 y 72 caracteres")
  .regex(/\p{L}/u, "Debe incluir al menos una letra")
  .regex(/\d/, "Debe incluir al menos un número")

export const montoSchema = z.coerce
  .number({ invalid_type_error: "Ingresá un monto válido" })
  .positive("El monto debe ser mayor a cero")
  .max(MONTO_MAX, "El monto es demasiado grande")
  .refine((v) => MONTO_REGEX.test(String(v)), "El monto admite como máximo 2 decimales")

/** Igual que montoSchema pero permite 0 (ej. caja inicial en cero). */
export const montoNoNegativoSchema = z.coerce
  .number({ invalid_type_error: "Ingresá un monto válido" })
  .min(0, "No puede ser negativo")
  .max(MONTO_MAX, "El monto es demasiado grande")
  .refine((v) => MONTO_REGEX.test(String(v)), "El monto admite como máximo 2 decimales")

export const productoNombreSchema = z
  .string()
  .transform((v) => v.trim().replace(/\s+/g, " "))
  .refine((v) => v.length >= 2 && v.length <= 60, "Debe tener entre 2 y 60 caracteres")
  .refine((v) => NOMBRE_PRODUCTO_REGEX.test(v), "Solo puede contener letras, números y espacios")

export const fechaNacimientoSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || new Date(v) <= new Date(), "La fecha de nacimiento no puede ser futura")
  .refine((v) => !v || v >= FECHA_MIN_NACIMIENTO, "La fecha de nacimiento no es válida")

// ---------------------------------------------------------------------------
// Schemas por formulario
// ---------------------------------------------------------------------------

export const clienteSchema = z.object({
  nombre: nombreSchema,
  apellido: nombreSchema,
  dni: dniSchema,
  telefono: telefonoOpcionalSchema,
  email: emailOpcionalSchema,
  direccion: z.string().trim().max(200, "Debe tener máximo 200 caracteres").optional(),
  fechaNacimiento: fechaNacimientoSchema,
  contactoEmergencia: z.string().trim().max(100, "Debe tener máximo 100 caracteres").optional(),
  observaciones: z.string().trim().max(500, "Debe tener máximo 500 caracteres").optional(),
  fotoUrl: z.string().optional(),
})

export type ClienteFormValues = z.infer<typeof clienteSchema>

const usuarioBaseSchema = {
  nombre: nombreSchema,
  email: emailSchema,
  idRol: z.string().min(1, "Seleccioná un rol"),
}

export const usuarioCreateSchema = z
  .object({
    ...usuarioBaseSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirmá la contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export const usuarioEditSchema = z.object(usuarioBaseSchema)

export type UsuarioCreateFormValues = z.infer<typeof usuarioCreateSchema>
export type UsuarioEditFormValues = z.infer<typeof usuarioEditSchema>

export const roleSchema = z.object({
  descripcion: nombreSchema,
  permissions: z.array(z.string()).min(1, "Seleccioná al menos un permiso"),
})

export type RoleFormValues = z.infer<typeof roleSchema>

export const METODOS_PAGO_CUOTA = ["efectivo", "transferencia", "dividido"] as const

export const cobroSchema = z
  .object({
    monto: montoSchema,
    metodoPago: z.enum(METODOS_PAGO_CUOTA, {
      errorMap: () => ({ message: "Seleccioná un método de pago" }),
    }),
    montoEfectivo: z.coerce.number().min(0, "No puede ser negativo").optional(),
    montoTransferencia: z.coerce.number().min(0, "No puede ser negativo").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.metodoPago !== "dividido") return
    const efectivo = data.montoEfectivo ?? 0
    const transferencia = data.montoTransferencia ?? 0
    if (efectivo <= 0 && transferencia <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresá al menos un monto",
        path: ["montoEfectivo"],
      })
      return
    }
    const suma = Math.round((efectivo + transferencia) * 100) / 100
    if (Math.abs(suma - data.monto) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La suma de ambos montos debe ser igual al total",
        path: ["montoTransferencia"],
      })
    }
  })

export type CobroFormValues = z.infer<typeof cobroSchema>

/** Reutilizado por cualquier anulación con motivo: pagos, ventas, movimientos de caja. */
export const anulacionSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(3, "El motivo debe tener al menos 3 caracteres")
    .max(300, "El motivo no puede superar los 300 caracteres"),
})

export const anularPagoSchema = anulacionSchema

export type AnularPagoFormValues = z.infer<typeof anulacionSchema>

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export const productoSchema = z.object({
  nombre: productoNombreSchema,
  descripcion: z.string().trim().max(200, "Debe tener máximo 200 caracteres").optional().or(z.literal("")),
  categoria: z.string().trim().max(50, "Debe tener máximo 50 caracteres").optional().or(z.literal("")),
  precio: montoSchema,
  controlaStock: z.boolean(),
  stockActual: z.coerce
    .number({ invalid_type_error: "Ingresá un número" })
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .optional(),
  stockMinimo: z.coerce
    .number({ invalid_type_error: "Ingresá un número" })
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .optional(),
})

export type ProductoFormValues = z.infer<typeof productoSchema>

export const ajustarStockSchema = z.object({
  delta: z.coerce
    .number({ invalid_type_error: "Ingresá un número" })
    .int("Debe ser un número entero")
    .refine((v) => v !== 0, "El ajuste no puede ser cero"),
  motivo: z.string().trim().max(300, "Debe tener máximo 300 caracteres").optional().or(z.literal("")),
})

export type AjustarStockFormValues = z.infer<typeof ajustarStockSchema>

// ---------------------------------------------------------------------------
// Caja: egresos/ingresos extra y apertura
// ---------------------------------------------------------------------------

export const movimientoCajaSchema = z.object({
  concepto: z.string().trim().min(2, "Debe tener al menos 2 caracteres").max(100, "Debe tener máximo 100 caracteres"),
  monto: montoSchema,
  metodo: z.enum(["efectivo", "transferencia"], {
    errorMap: () => ({ message: "Seleccioná un método de pago" }),
  }),
})

export type MovimientoCajaFormValues = z.infer<typeof movimientoCajaSchema>

export const cajaAperturaSchema = z.object({
  montoInicialEfectivo: montoNoNegativoSchema,
})

export type CajaAperturaFormValues = z.infer<typeof cajaAperturaSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "El email es obligatorio").email("Ingresá un email válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
})

export type LoginFormValues = z.infer<typeof loginSchema>

// ---------------------------------------------------------------------------
// Bloqueo de caracteres inválidos mientras se escribe
// ---------------------------------------------------------------------------

type CharFilter = {
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

/** `allowedClass` es el contenido de una character class de regex, ej. "0-9" */
function makeCharFilter(allowedClass: string): CharFilter {
  const singleChar = new RegExp(`^[${allowedClass}]$`)
  const stripInvalid = new RegExp(`[^${allowedClass}]`, "g")
  return {
    onKeyDown: (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1) return // Backspace, Tab, flechas, etc. no tienen longitud 1
      if (!singleChar.test(e.key)) e.preventDefault()
    },
    onChange: (e) => {
      e.target.value = e.target.value.replace(stripInvalid, "")
    },
  }
}

export const letrasFilter = makeCharFilter(NOMBRE_CHARS)
export const digitosFilter = makeCharFilter("0-9")
export const telefonoFilter = makeCharFilter("0-9+")
export const montoFilter = makeCharFilter("0-9.")

/** Combina un `register(...)` de react-hook-form con un filtro de caracteres. */
export function withCharFilter<T extends { onChange: (e: ChangeEvent<HTMLInputElement>) => void }>(
  registration: T,
  filter: CharFilter
) {
  return {
    ...registration,
    onKeyDown: filter.onKeyDown,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      filter.onChange(e)
      registration.onChange(e)
    },
  }
}

// ---------------------------------------------------------------------------
// Mapeo de errores del backend
// ---------------------------------------------------------------------------

type ToastFn = (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void

/**
 * El backend manda `{ message, errors: { campo: mensaje } }` tanto en 400
 * (validación) como en 409 (duplicados: DNI/email/descripción de rol ya en uso).
 * Si viene `errors`, lo mapea a los campos del form; para cualquier otro caso
 * (sin `errors`, 403, 500, red caída) muestra un toast con el mensaje.
 */
export function aplicarErrorBackend<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  toast: ToastFn,
  defaultTitle: string
) {
  const fieldErrors = (err as { errors?: Record<string, string> } | undefined)?.errors

  if (fieldErrors && typeof fieldErrors === "object" && Object.keys(fieldErrors).length > 0) {
    for (const [campo, mensaje] of Object.entries(fieldErrors)) {
      setError(campo as Path<T>, { type: "server", message: mensaje })
    }
    return
  }

  toast({
    title: defaultTitle,
    description: err instanceof Error ? err.message : "Error desconocido",
    variant: "destructive",
  })
}
