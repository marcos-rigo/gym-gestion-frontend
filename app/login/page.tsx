"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <div className="min-h-screen flex items-center justify-center bg-deep">
      <Card className="w-full max-w-sm border-white/10 bg-[#141414] text-white">
        <CardHeader>
          <CardTitle className="font-display text-3xl tracking-wide text-lime">
            Iniciar sesión
          </CardTitle>
          <CardDescription className="text-gray-400">
            Ingresá tus credenciales para acceder al panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                aria-invalid={!!errors.email}
                className="border-white/20 bg-white/5 placeholder:text-gray-500"
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                  className="border-white/20 bg-white/5 pr-9 placeholder:text-gray-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 text-gray-400 hover:bg-white/10 hover:text-white"
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
            <Button type="submit" disabled={loading} className="mt-2">
              {loading && <Loader2 className="animate-spin" />}
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
