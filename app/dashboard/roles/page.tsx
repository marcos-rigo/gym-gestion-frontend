import { RoleGuard } from "@/components/role-guard"
import { RolesModule } from "@/components/roles-module"

export default function RolesPage() {
  return (
    <RoleGuard requiredPermission="roles_ver">
      <RolesModule />
    </RoleGuard>
  )
}
