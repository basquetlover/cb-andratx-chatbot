export type TipoExcepcionEntrenamiento =
  | "cancelacion"
  | "modificacion"
  | "adicional";

export interface InstalacionExcepcionEntrenamiento {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  direccion: string | null;
  localidad: string | null;
  activa: boolean;
}

export interface EntrenamientoReferenciaExcepcion {
  id: string;
  equipoId: string;
  temporadaId: string;
  diaSemana: number | null;
  horaInicio: string | null;
  horaFin: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  observaciones: string | null;
  activo: boolean;
  instalacion: InstalacionExcepcionEntrenamiento | null;
}

export interface ExcepcionEntrenamientoPanel {
  id: string;
  equipoId: string | null;
  entrenamientoId: string | null;
  instalacionId: string | null;
  tipo: TipoExcepcionEntrenamiento | null;
  fecha: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  motivo: string | null;
  createdAt: string;
  updatedAt: string | null;
  entrenamiento: EntrenamientoReferenciaExcepcion | null;
  instalacion: InstalacionExcepcionEntrenamiento | null;
}

export interface ResultadoExcepcionesEntrenamientosPanel {
  excepciones: ExcepcionEntrenamientoPanel[];
  entrenamientos: EntrenamientoReferenciaExcepcion[];
  instalaciones: InstalacionExcepcionEntrenamiento[];
}

export interface DatosExcepcionEntrenamiento {
  tipo: TipoExcepcionEntrenamiento;
  fecha: string;
  entrenamientoId: string | null;
  instalacionId: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  motivo: string | null;
}