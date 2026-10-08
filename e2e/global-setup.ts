// Crea los fixtures de prueba (roles + usuarios, prefijo "Zze2e") directo en la base,
// una sola vez para toda la corrida. Se necesita acceso directo porque el propio UI
// bloquea crear un rol sin permisos (caso que sí queremos poder probar). No toca
// al superadmin ni ningún dato real: todo lo que crea queda registrado en
// e2e/.fixtures.json y se borra en global-teardown.ts.
import fs from "node:fs"
import path from "node:path"
import bcrypt from "bcryptjs"
import { pool } from "./db"

export const PASSWORD = "Test1234x"
const FIXTURES_PATH = path.resolve(__dirname, ".fixtures.json")

export interface Fixtures {
  roles: { id: string; descripcion: string }[]
  usuarios: { id: string; email: string; nombre: string; rol: "admin" | "parcial" | "sinPermisos" }[]
  credenciales: {
    admin: { email: string; password: string }
    parcial: { email: string; password: string }
    sinPermisos: { email: string; password: string }
  }
}

async function crearRol(descripcion: string, { esAdmin = false, permisos = [] as string[] } = {}) {
  const { rows } = await pool.query(
    "INSERT INTO roles (descripcion, es_admin) VALUES ($1, $2) RETURNING id",
    [descripcion, esAdmin]
  )
  const idRol = rows[0].id as string
  if (permisos.length > 0) {
    await pool.query(
      `INSERT INTO linea_permiso (id_rol, id_permiso) SELECT $1, id FROM permisos WHERE descripcion = ANY($2)`,
      [idRol, permisos]
    )
  }
  return idRol
}

async function crearUsuario(nombre: string, email: string, idRol: string) {
  const hash = await bcrypt.hash(PASSWORD, 10)
  const { rows } = await pool.query(
    "INSERT INTO usuarios (nombre, email, password_hash, id_rol, activo) VALUES ($1,$2,$3,$4,true) RETURNING id",
    [nombre, email, hash, idRol]
  )
  return rows[0].id as string
}

export default async function globalSetup() {
  const tag = Date.now()
  const fixtures: Fixtures = {
    roles: [],
    usuarios: [],
    credenciales: {
      admin: { email: `zze2e_admin_${tag}@example.test`, password: PASSWORD },
      parcial: { email: `zze2e_parcial_${tag}@example.test`, password: PASSWORD },
      sinPermisos: { email: `zze2e_sinpermisos_${tag}@example.test`, password: PASSWORD },
    },
  }

  const idAdmin = await crearRol("Zze2e Admin", { esAdmin: true })
  fixtures.roles.push({ id: idAdmin, descripcion: "Zze2e Admin" })
  const idParcial = await crearRol("Zze2e Parcial", { permisos: ["clientes_ver"] })
  fixtures.roles.push({ id: idParcial, descripcion: "Zze2e Parcial" })
  const idSinPermisos = await crearRol("Zze2e SinPermisos", { permisos: [] })
  fixtures.roles.push({ id: idSinPermisos, descripcion: "Zze2e SinPermisos" })

  const uAdmin = await crearUsuario("Zze2e Admin", fixtures.credenciales.admin.email, idAdmin)
  fixtures.usuarios.push({ id: uAdmin, email: fixtures.credenciales.admin.email, nombre: "Zze2e Admin", rol: "admin" })
  const uParcial = await crearUsuario("Zze2e Parcial", fixtures.credenciales.parcial.email, idParcial)
  fixtures.usuarios.push({ id: uParcial, email: fixtures.credenciales.parcial.email, nombre: "Zze2e Parcial", rol: "parcial" })
  const uSinPermisos = await crearUsuario("Zze2e SinPermisos", fixtures.credenciales.sinPermisos.email, idSinPermisos)
  fixtures.usuarios.push({ id: uSinPermisos, email: fixtures.credenciales.sinPermisos.email, nombre: "Zze2e SinPermisos", rol: "sinPermisos" })

  fs.writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2))
}
