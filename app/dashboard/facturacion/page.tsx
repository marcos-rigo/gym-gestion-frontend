import { FacturacionModule } from "@/components/facturacion-module"
import { RoleGuard } from "@/components/role-guard"
import { RUTAS_PROTEGIDAS } from "@/lib/permissions"

export default function FacturacionPage() {
  return (
    <RoleGuard ruta={RUTAS_PROTEGIDAS.FACTURACION}>
      <FacturacionModule />
    </RoleGuard>
  )
}
