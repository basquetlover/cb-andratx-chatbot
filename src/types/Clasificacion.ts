import type { ClasificacionEquipoFbib } from "@tipos/FbibEquipoPublico";

export interface ResultadoClasificacion {
  equipo: {
    id: string;
    nombre: string;
  };
  clasificaciones: ClasificacionEquipoFbib[];
  enlaceFbib: string;
}

export interface RespuestaClasificacionApi {
  ok: boolean;
  data: ResultadoClasificacion | null;
  error?: string;
}