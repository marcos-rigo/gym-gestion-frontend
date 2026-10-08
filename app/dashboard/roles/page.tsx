import { RoleGuard } from "@/components/role-guard"
import { RolesModule } from "@/components/roles-module"
import { RUTAS_PROTEGIDAS } from "@/lib/permissions"

export default function RolesPage() {
  return (
    <RoleGuard ruta={RUTAS_PROTEGIDAS.ROLES}>
      <RolesModule />
    </RoleGuard>
  )
}
