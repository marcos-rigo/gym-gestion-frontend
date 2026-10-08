import fs from "node:fs"
import path from "node:path"
import type { Fixtures } from "./global-setup"

const FIXTURES_PATH = path.resolve(__dirname, ".fixtures.json")

export function loadFixtures(): Fixtures {
  return JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf-8"))
}
