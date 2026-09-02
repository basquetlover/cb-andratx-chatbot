export const TIPOS_EVENTO = [
  "evento",
  "campus",
  "torneo",
  "presentacion",
  "reunion",
  "actividad",
  "otro",
] as const;

export const ALCANCES_EVENTO = [
  "todo-club",
  "equipos",
] as const;

export const ESTADOS_EVENTO = [
  "borrador",
  "publicado",
  "cancelado",
  "archivado",
] as const;

export type TipoEvento =
  typeof TIPOS_EVENTO[number];

export type AlcanceEvento =
  typeof ALCANCES_EVENTO[number];

export type EstadoEvento =
  typeof ESTADOS_EVENTO[number];

export interface EquipoEventoPanel {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  imagen: string | null;
  categoria: string | null;
  genero: string | null;
}

export interface TemporadaEventoPanel {
  id: string;
  nombre: string | null;
}

export interface InstalacionEventoPanel {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  direccion: string | null;
  localidad: string | null;
  codigoPostal: string | null;
}

export interface DatosEventoPanel {
  temporadaId: string | null;

  titulo: string;
  descripcionCorta: string;
  descripcion: string;

  tipo: TipoEvento;
  alcance: AlcanceEvento;

  fechaInicio: string;
  fechaFin: string;

  horaInicio: string;
  horaFin: string;
  todoElDia: boolean;

  instalacionId: string | null;
  ubicacion: string;
  direccion: string;

  imagen: string | null;
  bannerNotificacion: string | null;

  urlInformacion: string;
  urlInscripcion: string;
  requiereInscripcion: boolean;

  destacado: boolean;
  mostrarCalendario: boolean;

  estado: EstadoEvento;

  equipos: EquipoEventoPanel[];
}

export interface EventoPanel
  extends DatosEventoPanel {
  id: string;

  creadoPor: string | null;
  actualizadoPor: string | null;

  publicadoAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ResumenEventoPanel {
  id: string;

  titulo: string;
  descripcionCorta: string;

  tipo: TipoEvento;
  alcance: AlcanceEvento;
  estado: EstadoEvento;

  fechaInicio: string;
  fechaFin: string;

  horaInicio: string;
  horaFin: string;
  todoElDia: boolean;

  ubicacion: string;
  imagen: string | null;
  bannerNotificacion: string | null;

  destacado: boolean;
  mostrarCalendario: boolean;

  totalEquipos: number;
  equipos: EquipoEventoPanel[];

  createdAt: string;
  updatedAt: string;
}

export interface ResumenListadoEventosPanel {
  total: number;
  borradores: number;
  publicados: number;
  cancelados: number;
  archivados: number;
  proximos: number;
  enCurso: number;
  finalizados: number;
}

export interface ResultadoListadoEventosPanel {
  temporada: TemporadaEventoPanel | null;
  resumen: ResumenListadoEventosPanel;
  eventos: ResumenEventoPanel[];
}

export interface CrearEventoPanel {
  temporadaId: string | null;

  titulo: string;
  descripcionCorta: string;
  descripcion: string;

  tipo: TipoEvento;
  alcance: AlcanceEvento;

  fechaInicio: string;
  fechaFin: string;

  horaInicio: string;
  horaFin: string;
  todoElDia: boolean;

  instalacionId: string | null;
  ubicacion: string;
  direccion: string;

  imagen: string | null;
  bannerNotificacion: string | null;

  urlInformacion: string;
  urlInscripcion: string;
  requiereInscripcion: boolean;

  destacado: boolean;
  mostrarCalendario: boolean;

  estado: EstadoEvento;

  equiposIds: string[];
}

export interface ActualizarEventoPanel
  extends CrearEventoPanel {}

export interface ErrorCampoEvento {
  campo: string;
  mensaje: string;
}

export interface RespuestaListadoEventosPanel {
  ok: boolean;

  data: ResultadoListadoEventosPanel | null;

  error: string | null;
}

export interface RespuestaEventoPanel {
  ok: boolean;

  data: {
    evento: EventoPanel;
  } | null;

  error: string | null;

  errores?: ErrorCampoEvento[];
}

export interface RespuestaEliminarEventoPanel {
  ok: boolean;

  data: {
    id: string;
  } | null;

  error: string | null;
}

export type TipoImagenEvento =
  | "imagen"
  | "banner-notificacion";

export interface ImagenEventoSubida {
  tipo: TipoImagenEvento;

  url: string;
  ruta: string;

  mimeType: string;
  tamano: number;
}

export interface RespuestaSubirImagenEvento {
  ok: boolean;

  data: {
    imagen: ImagenEventoSubida;
  } | null;

  error: string | null;
}

export interface RespuestaEliminarImagenEvento {
  ok: boolean;

  data: {
    ruta: string;
  } | null;

  error: string | null;
}

export interface FiltrosListadoEventos {
  consulta?: string;

  estado?:
    | EstadoEvento
    | "todos";

  tipo?:
    | TipoEvento
    | "todos";

  alcance?:
    | AlcanceEvento
    | "todos";

  fechaInicio?: string;
  fechaFin?: string;
}

export interface EventoCalendarioPublico {
  id: string;

  titulo: string;
  descripcion: string | null;

  fecha: string;
  fechaFin: string;

  horaInicio: string | null;
  horaFin: string | null;

  todoElDia: boolean;

  tipo: "evento";
  tipoEvento: TipoEvento;

  ubicacion: string | null;
  direccion: string | null;

  imagen: string | null;

  destacado: boolean;

  alcance: AlcanceEvento;
  equiposIds: string[];
}

export interface RespuestaEventosCalendario {
  ok: boolean;

  data: {
    eventos: EventoCalendarioPublico[];
    total: number;
  } | null;

  error: string | null;
}