# Reporte Frontend — Productos, Ventas, Caja y pago dividido

## Resumen

Implementadas las Fases 1-6 contra el contrato real de `backend/REPORTE_BACKEND.md` (Productos,
Ventas con pago dividido, Caja integrada, pago dividido en cuotas), y luego ajustado a los fixes
de `backend/REPORTE_FINAL.md` (ver "Ronda 2"). Todo sigue las convenciones existentes:
`services/*.js` (fetch + normalización), `components/*-module.tsx` + dialogs, react-hook-form +
zod en `lib/validations.ts`, `aplicarErrorBackend`, `RUTAS_PROTEGIDAS` / `PERMISOS`
centralizados en `lib/permissions.ts`, `RoleGuard`, mobile con cards/acordeón.

**Estado final**: `tsc --noEmit` OK · `lint` 0 errores (11 warnings preexistentes, mismos que
antes de esta tarea) · `build` OK · **Vitest 208/208** (3 corridas seguidas) · **Playwright 43/43
en dev y 43/43 contra `build && start`** · DB sin datos de test · puertos 3000 y 3001 libres.

## Qué se construyó

**Fase 1 — Productos** (`/dashboard/productos`): `producto-module.tsx` (listado, búsqueda,
filtro activo/inactivo/todos, paginado), `producto-form-dialog.tsx` (alta/edición con
`controlaStock` condicionando stock actual/mínimo), `ajustar-stock-dialog.tsx` (delta +
motivo), activar/desactivar vía `toggle-activo`. Gateado por `productos_*`.

**Fase 2 — Punto de Venta** (`/dashboard/ventas`): `venta-module.tsx`, mobile-first. Grilla de
productos activos, carrito con +/-, total, `selector-medio-pago.tsx` (componente compartido:
Efectivo/Transferencia/Dividido, sin preselección, con autocompletado del resto en Dividido),
cliente opcional, botón Cobrar deshabilitado mientras guarda, historial del día con anular
(`anular-venta-dialog.tsx`, motivo obligatorio). Reportes de ventas (Fase 5) como tab interna.
Gateado por `ventas_*`.

**Fase 3 — Pago dividido en cuotas**: `cobroSchema` rehecho (`metodoPago` + montos, superRefine
de suma), `CobroDialog` y `RegistrarPagoDialog` migrados a `SelectorMedioPago`. Movimientos de
Facturación muestra "Mixto ($X + $Y)" con tooltip. `services/pagos.js` manda `metodo` o `pagos`
según corresponda.

**Fase 4 — Caja**: `egresos-tab.tsx` (alta egreso/ingreso extra, anular), `caja-apertura-tab.tsx`
(efectivo inicial del día), `cierre-caja-tab.tsx` reescrito contra `/api/caja/cierre` (fórmula
visible, transferencias aparte, por tipo, por empleado, anulados de cuotas y ventas separados).
Estas 3 pestañas solo se muestran con `caja_ver`. **Importante**: para quien NO tiene `caja_ver`
(Empleado por defecto), la pestaña Cierre de Caja sigue usando el endpoint viejo
`/api/pagos/cierre-caja` vía `cierre-caja-cuotas-tab.tsx` — es el único que ese rol puede
llamar, y ya traía scoping a lo propio. Perder esto rompía el caso real de un Empleado
consultando su cierre del día.

**Fase 5 — Reportes y dashboard**: `reporte-ventas-tab.tsx` (productos más vendidos, ventas por
día, rango de fechas) dentro de Ventas. Tarjeta "Ventas de hoy" en `dashboard-overview.tsx`
usando los campos nuevos de `/api/dashboard/stats`.

**Fase 6 — Tests**: ver abajo.

## Tests por capa

- **Vitest + Testing Library**: **208 tests, 21 archivos, 0 fallas**, estable en 3 corridas
  completas seguidas. Nuevos/actualizados: `lib/validations.test.ts` (+productoSchema,
  ajustarStockSchema, movimientoCajaSchema, cajaAperturaSchema, cobroSchema dividido,
  anulacionSchema), `cobro-dialog.test.tsx` (método obligatorio, dividido que no suma, dividido
  válido), `venta-module.test.tsx` (carrito suma/cantidades/total, método obligatorio, dividido
  que no suma, cobro en efectivo limpia el carrito, oculta Anular sin permiso),
  `producto-module.test.tsx` (permisos ocultan Nuevo Producto / switch activo),
  `anular-venta-dialog.test.tsx` (motivo obligatorio), `cierre-caja-tab.test.tsx` reescrito
  contra el endpoint nuevo, `facturacion-module.test.tsx` actualizado, `morosos-tab.test.tsx`
  (+1 test de regresión del debounce, ver Ronda 2).
- **Playwright (backend real)**: **43 tests, 0 fallas, tanto con `npm run dev` como contra
  `build && start`**. Suite nueva `e2e/productos-ventas-caja.spec.ts` (8 tests, los pedidos en la
  Fase 6: crear producto y vender en efectivo, venta por transferencia con cierre cuadrando, venta
  dividida con cierre cuadrando, cuota dividida con desglose "Mixto", anular venta baja el
  efectivo esperado, egreso baja el efectivo esperado, Empleado vende pero no crea productos ni
  anula, mobile del punto de venta). `e2e/facturacion-fase2.spec.ts` y `e2e/facturacion.spec.ts`
  actualizados para el método de pago obligatorio (ya no hay Tarjeta) y el Cierre de Caja
  integrado. Cada modo se corrió en dos mitades (24 + 19 tests, cada una con su propio
  setup/teardown de fixtures) para no pasar el límite de 10 min por comando.
- **DB**: limpia al terminar: 0 filas de test (`TEST%`, `Zze2e%`, `@example.test`) en clientes,
  usuarios, roles, productos y movimientos_caja; `ventas` en 0; `pagos` en 6 (las mismas 6 reales
  que menciona `backend/REPORTE_FINAL.md`).

## Ronda 2 — después de `backend/REPORTE_FINAL.md`

### Contrato de ventas

El backend corrigió 2 cosas en `/api/ventas*` (`anulada` viajaba como `null` en vez de `false`;
el detalle no traía `usuarioNombre`/`clienteNombreCompleto`). Antes de tocar el front verifiqué
el shape real contra la API levantada (no contra la doc), en los 5 endpoints: crear sin cliente,
crear con cliente, detalle, listado y anular. En todos `anulada` es boolean real,
`usuarioNombre` viene siempre y `clienteNombreCompleto` viene como `"Apellido, Nombre"` o `null`
si la venta no tiene cliente; no hay campos de más.

Cambios en el front:
- `services/ventas.js`: se quitaron las tres normalizaciones que tapaban esos bugs
  (`anulada: !!raw.anulada`, `usuarioNombre: raw.usuarioNombre ?? ''`,
  `clienteNombreCompleto: raw.clienteNombreCompleto ?? ''`); ahora pasan tal cual. Las
  conversiones `Number(...)` de montos se mantienen: esas no tapan nada, los numeric de Postgres
  siguen llegando como string.
- `lib/types.ts`: `Venta.usuarioNombre` y `Venta.clienteNombreCompleto` pasan de opcionales a
  `string | null`, que es lo que manda el backend (`usuario_nombre` sale de un `LEFT JOIN`, así
  que también puede ser `null`). Ajustado el fixture de `venta-module.test.tsx`.

### Bugs encontrados y corregidos en esta ronda

1. **Bug de app (preexistente en 3 pantallas, y copiado por mí en Productos): el debounce de
   búsqueda revertía la paginación.** El efecto de debounce corría también al montar y a los
   300 ms hacía `setPage(1)` aunque no se hubiera tipeado nada: un "Siguiente" hecho en ese
   lapso se perdía. Afectaba `morosos-tab.tsx`, `por-vencer-tab.tsx`, `facturacion-module.tsx`
   (Movimientos) y `producto-module.tsx`. Fix: el efecto no arma el timer si el texto ya coincide
   con la búsqueda aplicada. Apareció porque un test preexistente de paginación de Morosos fallaba
   de forma intermitente bajo carga; se agregó un test de regresión determinístico (timers falsos)
   y se verificó que **falla contra el código viejo** (`page: 1` en vez de `page: 2`) y pasa con
   el fix.
2. **Bug de test: `facturacion-module.test.tsx` esperaba "más de 1 fila"**, condición que ya
   cumple el header + la fila del spinner de carga; bajo carga inspeccionaba el spinner en vez
   de los pagos. Ahora espera exactamente header + 3 filas.
3. **Bug de test e2e: limpiar un input de react-hook-form antes de que muestre su valor
   inicial.** En dev (sobre todo en frío), tipear "22222" en Monto dejaba "2222245000". Lo
   reproduje aislado y con un trace del setter de `value`: Playwright limpiaba el input cuando
   todavía estaba vacío, y unos ms después el ref de `register` de react-hook-form escribía el
   default `45000` con el cursor en 0, así que lo tipeado quedaba delante. No es alcanzable por
   un usuario (la ventana es de milisegundos justo al montar el form). Fix: helper
   `reemplazarTipeando()` en `e2e/helpers.ts`, que espera el valor inicial antes de limpiar; usado
   en los 9 lugares que limpian un campo recién montado (Monto de cobros/egresos, Precio de
   producto).

### Bugs de backend

Ninguno nuevo. Los 2 que corrigió el backend en su Fase 9 no eran visibles en la UI (los tapaba
la normalización que ahora se sacó) y quedaron verificados contra la API real.

## Bugs corregidos en la ronda 1 (propios, durante el desarrollo)

1. **Nombre de producto con guion bajo**: el e2e inicial usaba `nombreTest()` (con `_`), que el
   propio regex de producto (letras/números/espacios) rechaza — se agregó `nombreProductoTest()`
   con espacios para los productos creados vía UI/API real.
2. **`CierreCajaTab` quedaba vacío para un Empleado**: renderizaba el endpoint integrado
   (`caja_ver`) para cualquiera con `facturacion_ver`, y ese endpoint devuelve 403 sin
   `caja_ver`. Corregido separando en dos componentes según el permiso (ver Fase 4).
3. **"No hubo movimientos este día" ocultaba la fórmula en cero**: se quitó ese branch; la
   fórmula (aunque esté en $0) y el resto de las cards siempre se muestran.
4. **`parseCurrency` en el e2e nuevo perdía el signo negativo** (Intl formatea negativos como
   `"-$ 777,00"`, con el signo antes del símbolo) — corregido.

## Notas de entorno (no son bugs de código)

- **Corrección respecto del reporte anterior**: atribuí los reinicios en loop de
  `node --watch index.js` (el `npm run dev` del backend que levanta `playwright.config.ts`) a otro
  proceso editando `backend/` en paralelo. En esta ronda el loop siguió apareciendo **sin ningún
  archivo modificado** (ni en `backend/` ni en su `node_modules`), así que la causa real es el
  `--watch` experimental de Node 20.11 en Windows disparando cambios espurios. Es intermitente:
  hizo fallar una vez el arranque del web server de Playwright y, en otra corrida, el primer
  login con `ERR_CONNECTION_REFUSED` en `:3001`; ambas mitades pasaron completas al reintentar.
  Sugerencia (no aplicada, es del backend): usar `node index.js` para los e2e o actualizar Node.
- Fragilidad preexistente (no tocada, ajena a esta tarea): helpers de
  `e2e/facturacion-fase2.spec.ts` calculan vencimientos con `CURRENT_DATE` de Postgres (UTC) en
  vez de la fecha de Tucumán que usa la UI; entre ~21:00 y 24:00 hora Argentina, los tests 2/3/7
  de esa spec pueden fallar por un día de diferencia.
- `playwright.config.ts` quedó sin cambios.

## Permisos nuevos (recordatorio para Roles)

`productos_ver/crear/editar/eliminar`, `ventas_ver/registrar/anular`, `caja_ver/caja_movimientos`.
Admin los tiene todos. Empleado viene de fábrica con `productos_ver`, `ventas_registrar`,
`ventas_ver` (nada de `ventas_anular` ni `caja_*`): si se quiere que un Empleado vea Caja hay que
asignárselo manualmente en Roles.
