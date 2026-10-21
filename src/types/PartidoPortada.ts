
export type EstadoPartidoPortada =
  | "programado"
  | "en-juego"
  | "finalizado"
  | "aplazado";

export interface EquipoPartidoPortada {
  id: string | null;
  nombre: string;
  escudo: string | null;
  esClub: boolean;
}

export interface PartidoPortada {
  id: string;

  fecha: string;
  hora: string | null;

  jornada: string | null;
  estado: EstadoPartidoPortada;

  // Categoría real del partido (FBIB o CBA).
  categoria?: string | null;

  equipoLocal: EquipoPartidoPortada;
  equipoVisitante: EquipoPartidoPortada;

  puntosLocal: number | null;
  puntosVisitante: number | null;

  ubicacion: string | null;
  enlaceFbib: string | null;
}

export interface PeriodoPartidosPortada {
  // Martes 20:00 a martes siguiente 20:00.
  inicio: string;
  fin: string;

  // Fecha en Europe/Madrid, YYYY-MM-DD.
  fechaActual: string;

  partidos: PartidoPortada[];
}

export interface DiaPartidosPortada {
  fecha: string;
  esHoy: boolean;
  partidos: PartidoPortada[];
}
