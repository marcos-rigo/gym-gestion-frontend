export const PERMISOS = {
  CLIENTES_VER: "clientes_ver",
  CLIENTES_CREAR: "clientes_crear",
  CLIENTES_EDITAR: "clientes_editar",
  CLIENTES_ELIMINAR: "clientes_eliminar",
  FACTURACION_VER: "facturacion_ver",
  FACTURACION_COBRAR: "facturacion_cobrar",
  FACTURACION_ANULAR: "facturacion_anular",
  USUARIOS_VER: "usuarios_ver",
  USUARIOS_CREAR: "usuarios_crear",
  USUARIOS_EDITAR: "usuarios_editar",
  USUARIOS_ACTIVAR: "usuarios_activar",
  ROLES_VER: "roles_ver",
  ROLES_CREAR: "roles_crear",
  ROLES_EDITAR: "roles_editar",
  ROLES_ELIMINAR: "roles_eliminar",
  ESTADISTICAS_VER: "estadisticas_ver",
} as const

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS]

export const PERMISOS_GYM: { id: Permiso; label: string; category: string }[] = [
  { id: PERMISOS.CLIENTES_VER, label: "Ver Clientes", category: "Clientes" },
  { id: PERMISOS.CLIENTES_CREAR, label: "Crear Clientes", category: "Clientes" },
  { id: PERMISOS.CLIENTES_EDITAR, label: "Editar Clientes", category: "Clientes" },
  { id: PERMISOS.CLIENTES_ELIMINAR, label: "Eliminar Clientes", category: "Clientes" },
  { id: PERMISOS.FACTURACION_VER, label: "Ver Facturación", category: "Facturación" },
  { id: PERMISOS.FACTURACION_COBRAR, label: "Registrar Cobros", category: "Facturación" },
  { id: PERMISOS.FACTURACION_ANULAR, label: "Anular Pagos", category: "Facturación" },
  { id: PERMISOS.USUARIOS_VER, label: "Ver Usuarios", category: "Usuarios" },
  { id: PERMISOS.USUARIOS_CREAR, label: "Crear Usuarios", category: "Usuarios" },
  { id: PERMISOS.USUARIOS_EDITAR, label: "Editar Usuarios", category: "Usuarios" },
  { id: PERMISOS.USUARIOS_ACTIVAR, label: "Activar/Desactivar Usuarios", category: "Usuarios" },
  { id: PERMISOS.ROLES_VER, label: "Ver Roles", category: "Roles" },
  { id: PERMISOS.ROLES_CREAR, label: "Crear Roles", category: "Roles" },
  { id: PERMISOS.ROLES_EDITAR, label: "Editar Roles", category: "Roles" },
  { id: PERMISOS.ROLES_ELIMINAR, label: "Eliminar Roles", category: "Roles" },
  { id: PERMISOS.ESTADISTICAS_VER, label: "Ver Estadísticas", category: "Estadísticas" },
]

/**
 * Mapa único ruta -> permiso requerido, usado tanto por el sidebar (para
 * ocultar links) como por cada page.tsx (para el RoleGuard). Mantenerlo en un
 * solo lugar evita que un string hardcodeado se desincronice entre los dos.
 *
 * Usuarios es un caso especial: el backend exige `esAdmin` (o rol "Dueño") en
 * TODAS sus rutas via `requireDueno`, sin mirar los permisos granulares
 * `usuarios_*`. Por eso acá se marca con `soloAdmin: true` en vez de un
 * permiso: un rol no-admin con "usuarios_ver" tildado entraría a una pantalla
 * donde cada acción devuelve 403.
 */
export const RUTAS_PROTEGIDAS = {
  DASHBOARD: { href: "/dashboard", permiso: PERMISOS.ESTADISTICAS_VER as Permiso | undefined, soloAdmin: false },
  CLIENTES: { href: "/dashboard/clientes", permiso: PERMISOS.CLIENTES_VER as Permiso | undefined, soloAdmin: false },
  FACTURACION: { href: "/dashboard/facturacion", permiso: PERMISOS.FACTURACION_VER as Permiso | undefined, soloAdmin: false },
  USUARIOS: { href: "/dashboard/usuarios", permiso: undefined as Permiso | undefined, soloAdmin: true },
  ROLES: { href: "/dashboard/roles", permiso: PERMISOS.ROLES_VER as Permiso | undefined, soloAdmin: false },
} as const

export function puedeAcceder(
  ruta: { permiso?: Permiso; soloAdmin?: boolean },
  { esAdmin, permisos }: { esAdmin: boolean; permisos: string[] }
) {
  if (esAdmin) return true
  if (ruta.soloAdmin) return false
  return !ruta.permiso || permisos.includes(ruta.permiso)
}

/** Primera ruta a la que el usuario tiene acceso, para redirigir después del login. */
export function primeraRutaAccesible(ctx: { esAdmin: boolean; permisos: string[] }) {
  const orden = [
    RUTAS_PROTEGIDAS.DASHBOARD,
    RUTAS_PROTEGIDAS.CLIENTES,
    RUTAS_PROTEGIDAS.FACTURACION,
    RUTAS_PROTEGIDAS.USUARIOS,
    RUTAS_PROTEGIDAS.ROLES,
  ]
  return orden.find((ruta) => puedeAcceder(ruta, ctx))?.href ?? RUTAS_PROTEGIDAS.DASHBOARD.href
}
