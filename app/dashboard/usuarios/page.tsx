import { RoleGuard } from "@/components/role-guard"
import { UsuarioModule } from "@/components/usuario-module"

export default function UsuariosPage() {
  return (
    <RoleGuard requiredPermission="usuarios_ver">
      <UsuarioModule />
    </RoleGuard>
  )
}
