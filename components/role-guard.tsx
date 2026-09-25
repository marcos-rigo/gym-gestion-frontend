"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export function RoleGuard({ requiredPermission, children }: { requiredPermission: string; children: React.ReactNode }) {
  const { usuario, permisos, esAdmin, isLoading } = useAuth()
  const router = useRouter()
  const allowed = esAdmin || (!!usuario && permisos.includes(requiredPermission))

  useEffect(() => {
    if (isLoading) return
    if (!allowed) {
      router.replace("/dashboard")
    }
  }, [allowed, isLoading, router])

  if (isLoading) return null
  if (!allowed) return null

  return <>{children}</>
}
