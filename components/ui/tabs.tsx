"use client"

import { useEffect, useRef } from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva } from "class-variance-authority"
import { cn } from "cn"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

// Contenedor tipo "segmented control": fondo apenas distinto de la página, borde suave y centrado.
// Si no entran todas las pestañas, hace scroll horizontal sin mostrar la barra.
const tabsListVariants = cva(
  "group/tabs-list relative mx-auto flex w-fit max-w-full items-center justify-start overflow-x-auto rounded-xl border border-border bg-muted p-1 text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
)

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  const listRef = useRef<HTMLDivElement>(null)

  // Mantiene la pestaña activa centrada cuando hay scroll horizontal (mobile/tablet).
  useEffect(() => {
    const lista = listRef.current
    if (!lista) return

    function centrarActivo() {
      const activo = lista?.querySelector<HTMLElement>("[data-active]")
      if (!lista || !activo || lista.scrollWidth <= lista.clientWidth) return
      lista.scrollTo({
        left: activo.offsetLeft - (lista.clientWidth - activo.offsetWidth) / 2,
        behavior: "smooth",
      })
    }

    centrarActivo()
    const observer = new MutationObserver(centrarActivo)
    observer.observe(lista, { attributes: true, attributeFilter: ["data-active"], subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(tabsListVariants(), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-background/60 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:hover:bg-input/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "data-active:bg-background data-active:text-foreground data-active:shadow-sm data-active:ring-1 data-active:ring-border dark:data-active:bg-input/30 dark:data-active:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
