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

export const cobroSchema = z.object({
  monto: montoSchema,
  metodo: z.enum(["efectivo", "tarjeta", "transferencia"], {
    errorMap: () => ({ message: "Seleccioná un método de pago" }),
  }),
})

export type CobroFormValues = z.infer<typeof cobroSchema>

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
