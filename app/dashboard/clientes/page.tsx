import { Suspense } from "react"

import { RoleGuard } from "@/components/role-guard"
import { ClienteModule } from "@/components/cliente-module"
import { RUTAS_PROTEGIDAS } from "@/lib/permissions"

export default function ClientesPage() {
  return (
    <RoleGuard ruta={RUTAS_PROTEGIDAS.CLIENTES}>
      <Suspense>
        <ClienteModule />
      </Suspense>
    </RoleGuard>
  )
}
