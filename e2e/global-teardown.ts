// Borra todo lo que global-setup.ts creó (y cualquier resto de una corrida anterior que
// haya quedado colgado) para no ensuciar la base real. Nunca toca al superadmin.
import fs from "node:fs"
import path from "node:path"
import { pool } from "./db"
import type { Fixtures } from "./global-setup"

const FIXTURES_PATH = path.resolve(__dirname, ".fixtures.json")

export default async function globalTeardown() {
  try {
    if (fs.existsSync(FIXTURES_PATH)) {
      const fixtures: Fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf-8"))
      const usuarioIds = fixtures.usuarios.map((u) => u.id)
      const rolIds = fixtures.roles.map((r) => r.id)
      if (usuarioIds.length > 0) {
        await pool.query("DELETE FROM pagos WHERE usuario_id = ANY($1)", [usuarioIds])
        await pool.query("DELETE FROM usuarios WHERE id = ANY($1)", [usuarioIds])
      }
      if (rolIds.length > 0) {
        await pool.query("DELETE FROM roles WHERE id = ANY($1)", [rolIds])
      }
      fs.unlinkSync(FIXTURES_PATH)
    }

    // Red de seguridad: por si algún test falló a mitad de camino y dejó algo
    // con el prefijo de prueba sin poder borrarse a sí mismo.
    await pool.query("DELETE FROM pagos WHERE usuario_id IN (SELECT id FROM usuarios WHERE nombre LIKE 'Zze2e%')")
    await pool.query("DELETE FROM usuarios WHERE nombre LIKE 'Zze2e%'")
    await pool.query("DELETE FROM clientes WHERE nombre LIKE 'Zze2e%'")
    await pool.query("DELETE FROM roles WHERE descripcion LIKE 'Zze2e%'")
  } finally {
    await pool.end()
  }
}
