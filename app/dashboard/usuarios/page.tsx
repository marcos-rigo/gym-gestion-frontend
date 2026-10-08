import { RoleGuard } from "@/components/role-guard"
import { UsuarioModule } from "@/components/usuario-module"
import { RUTAS_PROTEGIDAS } from "@/lib/permissions"

export default function UsuariosPage() {
  return (
    <RoleGuard ruta={RUTAS_PROTEGIDAS.USUARIOS}>
      <UsuarioModule />
    </RoleGuard>
  )
}
