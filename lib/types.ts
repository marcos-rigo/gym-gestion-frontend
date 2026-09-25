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
    rol: "dueno" | "recepcion" | "profesor"
    activo: boolean
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
