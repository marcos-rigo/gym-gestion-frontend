"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { login as apiLogin, logout as apiLogout, isAuthenticated as checkAuth } from "@/lib/auth"
import { getMisPermisos } from "@/services/roles"

interface Usuario {
  id: string
  nombre: string
  email: string
  rol: "dueno" | "recepcion" | "profesor"
}

interface AuthContextType {
  usuario: Usuario | null
  isLoading: boolean
  permisos: string[]
  esAdmin: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [permisos, setPermisos] = useState<string[]>([])
  const [esAdmin, setEsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      if (checkAuth()) {
        const stored = localStorage.getItem("usuario")
        if (stored) setUsuario(JSON.parse(stored))
        try {
          const permisosData = await getMisPermisos()
          setPermisos(permisosData?.permissions ?? [])
          setEsAdmin(permisosData?.esAdmin ?? false)
        } catch {
          setPermisos([])
        }
      }
      setIsLoading(false)
    }
    init()
  }, [])

  async function login(email: string, password: string) {
    try {
      const data = await apiLogin(email, password)
      setUsuario(data.usuario)
      try {
        const permisosData = await getMisPermisos()
        setPermisos(permisosData?.permissions ?? [])
        setEsAdmin(permisosData?.esAdmin ?? false)
      } catch {
        setPermisos([])
      }
      router.push("/dashboard")
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Error al iniciar sesión" }
    }
  }

  function logout() {
    setUsuario(null)
    setPermisos([])
    apiLogout()
  }

  return (
    <AuthContext.Provider value={{ usuario, isLoading, permisos, esAdmin, login, logout, isAuthenticated: !!usuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return ctx
}
