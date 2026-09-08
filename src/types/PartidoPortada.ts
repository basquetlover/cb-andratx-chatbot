export type EstadoPartidoPortada =
  | "programado"
  | "en-juego"
  | "finalizado"
  | "aplazado";

export interface EquipoPartidoPortada {
  id: string | null;

  nombre: string;

  escudo:
    | string
    | null;

  esClub: boolean;
}

export interface PartidoPortada {
  id: string;

  fecha: string;

  hora:
    | string
    | null;

  jornada:
    | string
    | null;

  estado:
    EstadoPartidoPortada;

  equipoLocal:
    EquipoPartidoPortada;

  equipoVisitante:
    EquipoPartidoPortada;

  puntosLocal:
    | number
    | null;

  puntosVisitante:
    | number
    | null;

  ubicacion:
    | string
    | null;

  enlaceFbib:
    | string
    | null;
}

export interface PeriodoPartidosPortada {
  /*
   * Instantes completos en formato ISO.
   *
   * El periodo comienza un martes a las
   * 20:00 y termina el martes siguiente
   * a las 20:00.
   */
  inicio: string;
  fin: string;

  /*
   * Fecha actual en Europe/Madrid y
   * formato YYYY-MM-DD.
   *
   * Se utiliza para centrar el día
   * actual aunque no tenga partidos.
   */
  fechaActual: string;

  partidos:
    PartidoPortada[];
}

export interface DiaPartidosPortada {
  fecha: string;

  esHoy: boolean;

  partidos:
    PartidoPortada[];
}