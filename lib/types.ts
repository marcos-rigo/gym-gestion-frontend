export interface Cliente {
    idCliente: string
    apellido: string
    nombre: string
    nombreCompleto: string
    dni: string
    fechaNacimiento: string
    telefono: string
    email: string
    direccion: string
    fotoUrl: string
    contactoEmergencia: string
    observaciones: string
    fechaAlta: string
    fechaInicioCuota: string
    fechaVencimiento: string
    estado: "activo" | "vencido" | "suspendido"
    estadoCuota: "al_dia" | "por_vencer" | "moroso" | null
    createdAt: string
}

export interface Usuario {
    id: string
    nombre: string
    email: string
    idRol: string
    rolDescripcion: string
    esAdmin: boolean
    activo: boolean
    protegido: boolean
    createdAt: string
}

export interface Role {
    idRol: string
    descripcion: string
    permissions: string[]
    userCount: number
    esAdmin: boolean
    createdAt: string
}

export interface DesglosePago {
    metodo: "efectivo" | "transferencia"
    monto: number
}

export interface Pago {
    id: string
    clienteId: string
    clienteNombreCompleto: string
    clienteDni: string
    usuarioId: string | null
    usuarioNombre: string
    monto: number
    metodo: "efectivo" | "transferencia" | "mixto"
    metodos: DesglosePago[]
    periodoDesde: string
    periodoHasta: string
    fechaPago: string
    anulado: boolean
    anuladoAt: string | null
    anuladoPorNombre: string
    motivoAnulacion: string
}

export interface StatsFacturacion {
    hoy: number
    ayer: number
    semana: number
    semanaAnterior: number
    mes: number
    mesAnterior: number
    cantidadPagosMes: number
    ticketPromedioMes: number
}

export interface ClienteMoroso {
    idCliente: string
    nombreCompleto: string
    dni: string
    fechaVencimiento: string
    diasAtraso: number
    montoReferencia: number | null
}

export interface ClientePorVencer {
    idCliente: string
    nombreCompleto: string
    dni: string
    fechaVencimiento: string
    diasRestantes: number
    montoReferencia: number | null
}

export interface CierreCajaMetodo {
    metodo: "efectivo" | "transferencia" | "mixto"
    monto: number
    cantidad: number
}

export interface CierreCajaEmpleado {
    usuarioId: string | null
    usuarioNombre: string
    monto: number
    cantidad: number
    porMetodo: CierreCajaMetodo[]
}

export interface CierreCaja {
    fecha: string
    general: { monto: number; cantidad: number }
    porMetodo: CierreCajaMetodo[]
    porEmpleado: CierreCajaEmpleado[]
    anulados: { cantidad: number; monto: number }
}

// ---------------------------------------------------------------------------
// Productos / Ventas / Caja
// ---------------------------------------------------------------------------

export interface Producto {
    id: string
    nombre: string
    descripcion: string | null
    categoria: string | null
    precio: number
    activo: boolean
    controlaStock: boolean
    stockActual: number | null
    stockMinimo: number | null
    createdAt: string
    updatedAt: string
}

export interface VentaItem {
    id: string
    idProducto: string | null
    nombreSnapshot: string
    precioUnitario: number
    cantidad: number
    subtotal: number
}

export interface VentaPago {
    id: string
    metodo: "efectivo" | "transferencia"
    monto: number
}

export interface Venta {
    id: string
    fechaHora: string
    idUsuario: string | null
    usuarioNombre: string | null
    idCliente: string | null
    clienteNombreCompleto: string | null
    total: number
    anulada: boolean
    motivoAnulacion: string | null
    anuladaPor: string | null
    anuladaAt: string | null
    createdAt: string
    items: VentaItem[]
    pagos: VentaPago[]
}

export interface VentaReporteProducto {
    idProducto: string
    nombre: string
    unidades: number
    ingreso: number
}

export interface VentaReporteDia {
    fecha: string
    cantidad: number
    total: number
}

export interface VentaReporte {
    porProducto: VentaReporteProducto[]
    porDia: VentaReporteDia[]
}

export interface MovimientoCaja {
    id: string
    tipo: "egreso" | "ingreso_extra"
    concepto: string
    monto: number
    metodo: "efectivo" | "transferencia"
    fechaHora: string
    idUsuario: string | null
    usuarioNombre?: string
    anulado: boolean
    motivoAnulacion: string | null
    anuladoPor: string | null
    anuladoAt: string | null
}

export interface CajaApertura {
    fecha: string
    montoInicialEfectivo: number
    idUsuario: string | null
}

export interface CierreCajaDesglose {
    efectivo: number
    transferencia: number
    cantidad: number
}

export interface CierreCajaPorEmpleado {
    usuarioId: string
    usuarioNombre: string
    cuotas: { monto: number; cantidad: number }
    ventas: { monto: number; cantidad: number }
}

export interface CierreCajaCompleto {
    fecha: string
    aperturaInicialEfectivo: number
    efectivoEsperado: number
    transferenciasTotal: number
    porTipo: {
        cuotas: CierreCajaDesglose
        ventas: CierreCajaDesglose
        egresos: CierreCajaDesglose
        ingresosExtra: CierreCajaDesglose
    }
    porEmpleado: CierreCajaPorEmpleado[]
    anulados: {
        cuotas: { cantidad: number; monto: number }
        ventas: { cantidad: number; monto: number }
    }
}

export type Turno = "mañana" | "tarde"

export interface CierreTurnoEmpleado {
    usuarioId: string
    usuarioNombre: string
}

// Desglose por fuente. Cada monto por método es neto (cuotas + ventas + ingresos extra − egresos).
// En cierres previos a la migración "integrado", `desglose` viene como {} (se detecta con `cuotas` ausente).
export interface DesgloseTurno {
    cuotas: { efectivo: number; transferencia: number; total: number; cantidad: number; cobrosMixtos: number }
    ventas: { efectivo: number; transferencia: number; total: number; cantidad: number }
    ingresosExtra: { efectivo: number; transferencia: number; total: number }
    egresos: { efectivo: number; transferencia: number; total: number }
}

export interface TotalesTurno {
    totalPorMetodo: { efectivo: number; transferencia: number; mixto: number }
    /** Total neto: cuotas + ventas + ingresos extra − egresos */
    total: number
    totalCuotas: number
    totalVentas: number
    totalIngresosExtra: number
    totalEgresos: number
    cantidadPagos: number
    desglose: Partial<DesgloseTurno>
    empleados: CierreTurnoEmpleado[]
}

export interface CierreTurno extends TotalesTurno {
    id: string
    fecha: string
    turno: Turno
    creadoPorNombre: string | null
    createdAt: string
}

export interface EstadoTurno {
    fecha: string
    turno: Turno
    turnoActual: Turno
    cerrado: CierreTurno | null
    enVivo: TotalesTurno | null
}
