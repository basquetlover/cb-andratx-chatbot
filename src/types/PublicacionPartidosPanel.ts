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
  orden: number;

  origen:
    OrigenPartidoPublicacion;

  estado:
    EstadoPartidoPublicacion;

  visible: boolean;

  /*
   * Identificador del partido de la FBIB.
   * Es null en partidos creados manualmente.
   */
  partidoFbibId: string | null;

  /*
   * UUID del equipo guardado en nuestra
   * tabla equipos.
   *
   * Se mantiene opcional para soportar
   * configuraciones antiguas.
   */
  equipoId?: string | null;

  /*
   * Identificador utilizado para consultar
   * el equipo en la FBIB.
   */
  equipoFbibId?: string | null;

  /*
   * Imagen del equipo guardada en nuestra
   * base de datos.
   */
  imagenEquipo?: string | null;

  /*
   * Texto editable que aparecerá en la
   * publicación.
   */
  nombreEquipo: string;

  fecha: string | null;
  hora: string | null;

  rivalFbibId: string | null;

  /*
   * Se guarda para identificar y buscar
   * al rival, aunque en la publicación
   * solamente se muestre su escudo.
   */
  nombreRival: string;

  logoRival: string | null;

  /*
   * Campo original recibido de la FBIB o
   * introducido manualmente.
   */
  campo: string;

  /*
   * Datos separados para decidir qué
   * ubicación mostrar:
   *
   * - Fuera de Andratx: municipio.
   * - En Andratx: pabellón.
   *
   * Son opcionales para mantener la
   * compatibilidad con publicaciones
   * guardadas anteriormente.
   */
  municipio?: string | null;
  pabellon?: string | null;

  local: boolean | null;
}

export interface DatosPublicacionPartidos {
  temporadaId: string | null;

  nombre: string;
  titulo: string;

  idioma:
    IdiomaPublicacionPartidos;

  fechaInicio: string;
  fechaFin: string;

  plantilla:
    PlantillaPublicacionPartidos;

  fondo: string | null;

  partidos:
    PartidoPublicacion[];

  partidosPorImagen: number;

  estado:
    EstadoPublicacionPartidos;
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

  idioma:
    IdiomaPublicacionPartidos;

  fechaInicio: string;
  fechaFin: string;

  estado:
    EstadoPublicacionPartidos;

  totalPartidos: number;
  totalPaginas: number;

  creadoPor: string | null;
  actualizadoPor: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CrearPublicacionPartidos {
  temporadaId?: string | null;

  nombre: string;
  titulo: string;

  idioma:
    IdiomaPublicacionPartidos;

  fechaInicio: string;
  fechaFin: string;

  plantilla?:
    PlantillaPublicacionPartidos;

  fondo?: string | null;

  partidos?:
    PartidoPublicacion[];

  partidosPorImagen?: number;

  estado?:
    EstadoPublicacionPartidos;
}

export interface ActualizarPublicacionPartidos {
  temporadaId?: string | null;

  nombre: string;
  titulo: string;

  idioma:
    IdiomaPublicacionPartidos;

  fechaInicio: string;
  fechaFin: string;

  plantilla:
    PlantillaPublicacionPartidos;

  fondo: string | null;

  partidos:
    PartidoPublicacion[];

  partidosPorImagen: number;

  estado:
    EstadoPublicacionPartidos;
}

export interface PartidoPeriodoFbibPublicacion {
  partidoFbibId: string;

  /*
   * UUID del equipo en nuestra base de
   * datos.
   */
  equipoId: string;

  /*
   * Identificador del equipo en la FBIB.
   */
  equipoFbibId: string;

  imagenEquipo?: string | null;

  fecha: string;
  hora: string | null;

  nombreEquipo: string;

  rivalFbibId: string | null;
  nombreRival: string;
  logoRival: string | null;

  campo: string;

  municipio?: string | null;
  pabellon?: string | null;

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

  errores?:
    ErrorCampoPublicacion[];
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