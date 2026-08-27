export type EstadoPeriodoEntrenamientos =
  | "actual"
  | "antes-inicio"
  | "despues-fin";

  export type EstadoEntrenamientoCalendario =
  | "normal"
  | "modificado"
  | "cancelado";

export interface InstalacionEntrenamiento {
  id: string;
  nombre: string | null;
  nombreCorto: string | null;
  direccion: string | null;
  localidad: string | null;
  codigoPostal: string | null;
  latitud: string | null;
  longitud: string | null;
}

export interface EntrenamientoSemana {
  id: string;
  fecha: string;
  diaSemana: number;
  horaInicio: string | null;
  horaFin: string | null;
  observaciones: string | null;
  instalacion: InstalacionEntrenamiento | null;
  estado: EstadoEntrenamientoCalendario;
}

export interface ResultadoEntrenamientos {
  equipo: {
    id: string;
    nombre: string | null;
  };
  semana: {
    inicio: string;
    fin: string;
  };
  periodo: {
    estado: EstadoPeriodoEntrenamientos;
    fechaInicio: string | null;
    fechaFin: string | null;
  };
  entrenamientos: EntrenamientoSemana[];
  entrenamientosCalendario: EntrenamientoSemana[];
}

export interface RespuestaEntrenamientosApi {
  ok: boolean;
  data: ResultadoEntrenamientos | null;
  error?: string;
}