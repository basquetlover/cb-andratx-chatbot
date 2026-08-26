export interface PatrocinadorAsignadoEquipo {
  id: string;
  fechaAsignacion: string | null;
  asignadoPor: string | null;
}

export interface PatrocinadorResumenEquipo {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  logo: string | null;
  activo: boolean;
}

export interface EquipoListadoPanel {
  id: string;
  temporadaId: string | null;
  nombre: string;
  nombreCorto: string | null;
  slug: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  descripcion: string | null;
  imagen: string | null;
  activo: boolean;
  chatbot: boolean;
  idEquipoFbib: string | null;
  mostrarSponsor: boolean;
  patrocinadores: PatrocinadorResumenEquipo[];
  totalPatrocinadores: number;
  entrenamientosSemana: number;
  tieneEntrenamientos: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface ResumenEquiposPanel {
  total: number;
  activos: number;
  disponiblesChatbot: number;
  sinConfigurarChatbot: number;
  conEntrenamientos: number;
  sinEntrenamientos: number;
}

export interface ResultadoEquiposPanel {
  temporada: {
    id: string;
    nombre: string | null;
  } | null;
  resumen: ResumenEquiposPanel;
  equipos: EquipoListadoPanel[];
}

export interface RespuestaEquiposPanelApi {
  ok: boolean;
  data: ResultadoEquiposPanel | null;
  error?: string;
}

export interface DatosCrearEquipoPanel {
  temporadaId: string;
  nombre: string;
  nombreCorto: string | null;
  slug: string;
  categoria: string;
  genero: string;
  nivel: string | null;
  descripcion: string | null;
  activo: boolean;
  chatbot: boolean;
  idEquipoFbib: string | null;
  mostrarSponsor: boolean;
  patrocinadoresIds: string[];
}

export interface EquipoCreadoPanel {
  id: string;
  temporadaId: string;
  nombre: string;
  nombreCorto: string | null;
  slug: string;
  categoria: string;
  genero: string;
  nivel: string | null;
  descripcion: string | null;
  activo: boolean;
  chatbot: boolean;
  idEquipoFbib: string | null;
  mostrarSponsor: boolean;
  createdAt: string;
}

export interface ErrorCampoEquipo {
  campo: string;
  mensaje: string;
}

export interface RespuestaCrearEquipoApi {
  ok: boolean;
  data: {
    equipo: EquipoCreadoPanel;
  } | null;
  error?: string;
  errores?: ErrorCampoEquipo[];
}