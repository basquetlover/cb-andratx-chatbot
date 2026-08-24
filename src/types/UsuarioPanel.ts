export interface EquipoAsignadoListado {
  id: string;
  nombre: string;
  expiresAt: string | null;
}

export interface UsuarioListadoPanel {
  id: string;
  nombre: string;
  apellidos: string | null;
  nombreCompleto: string;
  email: string;
  telefono: string | null;
  tipoUsuario: string;
  cargo: string | null;
  imagen: string | null;
  estado: "pendiente" | "activo" | "bloqueado" | "desactivado";
  accesoTodosEquipos: boolean;
  ultimoAccesoAt: string | null;
  createdAt: string;
  equipos: EquipoAsignadoListado[];
}