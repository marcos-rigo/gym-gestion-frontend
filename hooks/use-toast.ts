"use client"

import { toast as sonnerToast } from "sonner"

type ToastOptions = {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

function toast({ title, description, variant = "default" }: ToastOptions) {
  if (variant === "destructive") {
    return sonnerToast.error(title, { description })
  }
  return sonnerToast.success(title, { description })
}

export function useToast() {
  return { toast }
}

export { toast }
