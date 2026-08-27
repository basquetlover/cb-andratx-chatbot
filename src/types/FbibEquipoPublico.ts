export type EstadoPartidoFbib =
  | "pendiente"
  | "finalizado";

export interface GrupoEquipoFbib {
  id: string;
  nombre: string;
  competicion: string;
  categoria: string | null;
  temporada: string | null;
  enlaceFbib: string;
}

export interface FichaEquipoFbib {
  id: string;
  nombre: string;
  clubId: string | null;
  clubNombre: string | null;
  categoria: string | null;
  temporada: string | null;

  campo: {
    nombre: string | null;
    direccion: string | null;
    codigoPostal: string | null;
  };

  diaPartido: number | null;
  horaPartido: string | null;

  grupos: GrupoEquipoFbib[];
  enlaceFbib: string;
}

export interface EquipoPartidoFbib {
  id: string | null;
  nombre: string;
  escudo: string | null;
}

export interface PartidoEquipoFbib {
  id: string;
  idPartidoFbib: string | null;

  fecha: string | null;
  hora: string | null;
  fechaHora: string | null;

  local: EquipoPartidoFbib;
  visitante: EquipoPartidoFbib;

  resultado: {
    local: number;
    visitante: number;
  } | null;

  estado: EstadoPartidoFbib;

  posicionEquipo:
    | "local"
    | "visitante"
    | null;

  campo: string | null;
  categoria: string | null;
  competicion: string | null;
  grupo: string | null;
  jornada: number | null;

  enlaceFbib: string | null;
}

export interface FilaClasificacionFbib {
  posicion: number;
  equipoId: string | null;
  equipoNombre: string;

  jugados: number;
  ganados: number;
  perdidos: number;
  noPresentados: number;
  empatados: number;
  puntosFavor: number;
  puntosContra: number;
  puntosClasificacion: number;

  esEquipoActual: boolean;
}

export interface ClasificacionEquipoFbib {
  grupo: GrupoEquipoFbib;
  filas: FilaClasificacionFbib[];
  enlaceFbib: string;
}