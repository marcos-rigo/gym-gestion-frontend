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

export interface Pago {
    id: string
    clienteId: string
    clienteNombreCompleto: string
    clienteDni: string
    usuarioId: string | null
    usuarioNombre: string
    monto: number
    metodo: "efectivo" | "tarjeta" | "transferencia"
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
    metodo: "efectivo" | "tarjeta" | "transferencia"
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
