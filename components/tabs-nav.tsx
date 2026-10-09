"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export interface OpcionTab {
  value: string
  label: string
}

interface TabsNavProps {
  opciones: OpcionTab[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

// Navegación de un <Tabs> controlado: pestañas tipo pill desde md, y un selector de ancho completo
// en pantallas chicas. Ambos cambian el mismo estado, así que la lógica es idéntica en los dos casos.
export function TabsNav({ opciones, value, onValueChange, className }: TabsNavProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="md:hidden">
        <Select
          items={opciones}
          value={value}
          onValueChange={(v) => {
            if (v != null) onValueChange(String(v))
          }}
        >
          <SelectTrigger
            aria-label="Sección"
            className="h-auto w-full rounded-xl border-border bg-background px-4 py-3 text-base font-semibold text-foreground shadow-sm data-[size=default]:h-auto"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            side="bottom"
            className="w-(--anchor-width) rounded-xl p-1 shadow-lg"
          >
            {opciones.map((o) => (
              <SelectItem
                key={o.value}
                value={o.value}
                className="min-h-12 rounded-lg py-3 text-base data-[highlighted]:bg-muted"
              >
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TabsList className="hidden md:flex">
        {opciones.map((o) => (
          <TabsTrigger key={o.value} value={o.value}>
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  )
}
