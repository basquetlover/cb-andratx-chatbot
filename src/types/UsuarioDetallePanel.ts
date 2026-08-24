export type EstadoUsuarioPanel = "pendiente" | "activo" | "bloqueado" | "desactivado";

export type TipoUsuarioPanel = "interno" | "publico";

export type NivelAccesoUsuarioPanel = "panel" | "todos-equipos" | "acceso-total";

export interface EquipoUsuarioDetalle {
  equipoId: string;
  nombre: string;
  nombreCorto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  fechaCaducidad: string | null;
}

export interface CreadorUsuarioDetalle {
  id: string;
  nombreCompleto: string;
  email: string;
}

export interface UsuarioDetallePanel {
  id: string;

  datosPersonales: {
    nombre: string;
    apellidos: string;
    email: string;
    telefono: string;
    tipoUsuario: TipoUsuarioPanel;
    cargo: string;
    imagen: string | null;
    estado: EstadoUsuarioPanel;
    aceptaComunicaciones: boolean;
  };

  acceso: {
    nivelAcceso: NivelAccesoUsuarioPanel;
    accesoPanel: boolean;
    accesoTotal: boolean;
    accesoTodosEquipos: boolean;
    permisosSeleccionados: string[];
    version: number;
  };

  equiposAsignados: EquipoUsuarioDetalle[];

  seguridad: {
    emailVerificadoAt: string | null;
    passwordChangedAt: string | null;
    tienePassword: boolean;
    sesionesActivas: number;
    invitacionPendiente: boolean;
    invitacionCaducaAt: string | null;
  };

  administracion: {
    creadoPor: CreadorUsuarioDetalle | null;
    createdAt: string;
    updatedAt: string;
    ultimoAccesoAt: string | null;
  };
}