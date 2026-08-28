export type IdiomaPublicacionPartidos =
  | "es"
  | "ca";

export type EstadoPublicacionPartidos =
  | "borrador"
  | "finalizada"
  | "archivada";

export type PlantillaPublicacionPartidos =
  "partidos-semana";

export type OrigenPartidoPublicacion =
  | "fbib"
  | "manual";

export type EstadoPartidoPublicacion =
  | "partido"
  | "descansa"
  | "aplazado";

export interface PartidoPublicacion {
  id: string;

  partidoFbibId: string | null;
  origen: OrigenPartidoPublicacion;

  orden: number;
  visible: boolean;

  equipoId: string | null;
  equipoFbibId: string | null;

  fecha: string | null;
  hora: string | null;

  nombreEquipo: string;

  rivalFbibId: string | null;
  nombreRival: string;
  logoRival: string | null;

  campo: string;
  local: boolean | null;

  estado: EstadoPartidoPublicacion;
}

export interface DatosPublicacionPartidos {
  temporadaId: string | null;

  nombre: string;
  titulo: string;

  idioma: IdiomaPublicacionPartidos;

  fechaInicio: string;
  fechaFin: string;

  plantilla: PlantillaPublicacionPartidos;
  fondo: string | null;

  partidos: PartidoPublicacion[];
  partidosPorImagen: number;

  estado: EstadoPublicacionPartidos;
}

export interface PublicacionPartidosPanel
  extends DatosPublicacionPartidos {
  id: string;

  creadoPor: string | null;
  actualizadoPor: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface ResumenPublicacionPartidos {
  id: string;

  nombre: string;
  titulo: string;

  idioma: IdiomaPublicacionPartidos;

  fechaInicio: string;
  fechaFin: string;

  estado: EstadoPublicacionPartidos;

  totalPartidos: number;
  totalPaginas: number;

  creadoPor: string | null;
  actualizadoPor: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CrearPublicacionPartidos {
  nombre: string;
  titulo: string;

  idioma: IdiomaPublicacionPartidos;

  fechaInicio: string;
  fechaFin: string;

  plantilla?: PlantillaPublicacionPartidos;
  fondo?: string | null;

  partidos?: PartidoPublicacion[];
  partidosPorImagen?: number;

  estado?: EstadoPublicacionPartidos;
}

export interface ActualizarPublicacionPartidos {
  nombre: string;
  titulo: string;

  idioma: IdiomaPublicacionPartidos;

  fechaInicio: string;
  fechaFin: string;

  plantilla: PlantillaPublicacionPartidos;
  fondo: string | null;

  partidos: PartidoPublicacion[];
  partidosPorImagen: number;

  estado: EstadoPublicacionPartidos;
}

export interface PartidoPeriodoFbibPublicacion {
  partidoFbibId: string;

  equipoId: string;
  equipoFbibId: string;

  fecha: string;
  hora: string | null;

  nombreEquipo: string;

  rivalFbibId: string | null;
  nombreRival: string;
  logoRival: string | null;

  campo: string;
  local: boolean;
}

export interface RivalFbibPublicacion {
  id: string;

  nombre: string;
  nombreCorto: string | null;

  clubId: string | null;
  clubNombre: string | null;

  escudo: string | null;
}

export interface ErrorCampoPublicacion {
  campo: string;
  mensaje: string;
}

export interface RespuestaHistorialPublicaciones {
  ok: boolean;

  data: {
    publicaciones:
      ResumenPublicacionPartidos[];

    total: number;
  } | null;

  error: string | null;
}

export interface RespuestaPublicacionPartidos {
  ok: boolean;

  data: {
    publicacion:
      PublicacionPartidosPanel;
  } | null;

  error: string | null;

  errores?: ErrorCampoPublicacion[];
}

export interface RespuestaPartidosPeriodoFbib {
  ok: boolean;

  data: {
    partidos:
      PartidoPeriodoFbibPublicacion[];

    total: number;

    fechaInicio: string;
    fechaFin: string;
  } | null;

  error: string | null;
}

export interface RespuestaBusquedaRivalesFbib {
  ok: boolean;

  data: {
    resultados:
      RivalFbibPublicacion[];

    total: number;
  } | null;

  error: string | null;
}

export interface RespuestaLogoRival {
  ok: boolean;

  data: {
    url: string;
  } | null;

  error: string | null;
}