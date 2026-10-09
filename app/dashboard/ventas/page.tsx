import { RoleGuard } from "@/components/role-guard"
import { VentaModule } from "@/components/venta-module"
import { RUTAS_PROTEGIDAS } from "@/lib/permissions"

export default function VentasPage() {
  return (
    <RoleGuard ruta={RUTAS_PROTEGIDAS.VENTAS}>
      <VentaModule />
    </RoleGuard>
  )
}
