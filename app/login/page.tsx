"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { loginSchema, type LoginFormValues } from "@/lib/validations"

export default function LoginPage() {
  const { login } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginFormValues) {
    setLoading(true)
    const result = await login(values.email, values.password)
    setLoading(false)
    if (!result.success) {
      toast({
        title: "Error al iniciar sesión",
        description: result.error ?? "Verificá tu email y contraseña e intentá de nuevo.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex h-dvh overflow-y-auto bg-deep px-4 py-8 [align-items:safe_center] [justify-content:safe_center] sm:px-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <img
            src="/logo.png"
            alt="Colosseo Gym Barrio Norte"
            className="h-20 w-auto max-w-full object-contain sm:h-24"
          />
          <p className="text-sm text-gray-400">Sistema de Gestión</p>
        </div>

        <Card className="border-white/10 bg-[#141414] text-white">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5" noValidate>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...register("email")}
                    aria-invalid={!!errors.email}
                    className="h-11 border-white/10 bg-white/5 pl-9 placeholder:text-gray-500 focus-visible:border-lime focus-visible:ring-lime/30"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password")}
                    aria-invalid={!!errors.password}
                    className="h-11 border-white/10 bg-white/5 pl-9 pr-11 placeholder:text-gray-500 focus-visible:border-lime focus-visible:ring-lime/30"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-0.5 top-1/2 size-10 -translate-y-1/2 text-gray-400 hover:bg-white/10 hover:text-white"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="mt-1 h-11 transition hover:brightness-110 active:scale-[0.98]"
              >
                {loading && <Loader2 className="animate-spin" />}
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
              {/* TODO: implementar recuperación de contraseña */}
              <button
                type="button"
                className="justify-self-center text-sm text-gray-500 hover:text-gray-300"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-600">
          © 2026 Colosseo Gym — Panel interno
        </p>
      </div>
    </div>
  )
}
