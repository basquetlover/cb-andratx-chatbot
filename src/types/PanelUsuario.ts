export type PasoCreacionUsuario = 1 | 2 | 3 | 4;

export type TipoUsuarioPanel = "interno" | "publico";

export type NivelAccesoUsuario = "panel" | "todos-equipos" | "acceso-total";

export interface DatosPersonalesUsuario {
  nombre: string;
  apellidos: string;
  email: string;
  confirmarEmail: string;
  telefono: string;
  tipoUsuario: TipoUsuarioPanel;
  cargo: string;
}

export interface ConfiguracionPermisosUsuario {
  nivelAcceso: NivelAccesoUsuario;
  permisosSeleccionados: string[];
}

export interface EquipoAsignadoUsuario {
  equipoId: string;
  principal: boolean;
  fechaCaducidad: string | null;
}

export interface EstadoCreacionUsuario {
  datosPersonales: DatosPersonalesUsuario;
  configuracionPermisos: ConfiguracionPermisosUsuario;
  equiposAsignados: EquipoAsignadoUsuario[];
}

export interface EquipoDisponiblePanel {
  id: string;
  nombre: string | null;
  nombreCorto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
}

export interface PermisoDisponiblePanel {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
  accion: string;
  activo: boolean;
}

export interface ErrorCampoUsuario {
  campo: string;
  mensaje: string;
}

export interface RespuestaCreacionUsuario {
  ok: boolean;
  data?: {
    usuarioId: string;
    nombreCompleto: string;
    email: string;
    estado: string;
    enlaceInvitacion?: string;
    emailEnviado: boolean;
  };
  error?: string;
  errores?: ErrorCampoUsuario[];
}

export const estadoInicialCreacionUsuario: EstadoCreacionUsuario = {
  datosPersonales: {
    nombre: "",
    apellidos: "",
    email: "",
    confirmarEmail: "",
    telefono: "",
    tipoUsuario: "interno",
    cargo: "",
  },
  configuracionPermisos: {
    nivelAcceso: "panel",
    permisosSeleccionados: [],
  },
  equiposAsignados: [],
};