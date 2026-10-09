import { ProductoModule } from "@/components/producto-module"
import { RoleGuard } from "@/components/role-guard"
import { RUTAS_PROTEGIDAS } from "@/lib/permissions"

export default function ProductosPage() {
  return (
    <RoleGuard ruta={RUTAS_PROTEGIDAS.PRODUCTOS}>
      <ProductoModule />
    </RoleGuard>
  )
}
