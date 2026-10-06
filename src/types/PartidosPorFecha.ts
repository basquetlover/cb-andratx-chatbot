import type { PartidoEquipoFbib } from "@tipos/FbibEquipoPublico";

export interface RangoFechasPartidos {
  desde: string;
  hasta: string;
}

export interface ResultadoPartidosPorFecha {
  equipo: {
    id: string;
    nombre: string;
  };
  rango: RangoFechasPartidos;
  partidos: PartidoEquipoFbib[];
}

export interface RespuestaPartidosPorFechaApi {
  ok: boolean;
  data: ResultadoPartidosPorFecha | null;
  error?: string;
}