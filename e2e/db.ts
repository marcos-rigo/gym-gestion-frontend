// Acceso directo a Postgres para el global setup/teardown de e2e: crea y borra los
// fixtures de prueba (roles/usuarios/clientes con prefijo Zze2e) sin pasar por la API,
// igual que hace backend/scripts/smoke-test.js. Nunca toca al superadmin ni datos reales.
import path from "node:path"
import dotenv from "dotenv"
import { Pool } from "pg"

dotenv.config({ path: path.resolve(__dirname, "../../backend/.env"), quiet: true })

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
