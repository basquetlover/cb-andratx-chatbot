export type DiaSemanaEntrenamiento =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7;

export interface InstalacionEntrenamientoPanel {
  id: string;
  nombre: string;
  nombreCorto: string;
  direccion: string;
  localidad: string;
  activa: boolean;
}

export interface EntrenamientoHabitualEquipoPanel {
  id: string;
  equipoId: string;
  temporadaId: string;
  instalacionId: string;
  instalacion: InstalacionEntrenamientoPanel | null;
  diaSemana: DiaSemanaEntrenamiento;
  horaInicio: string;
  horaFin: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  observaciones: string;
  activo: boolean;
}

export interface EntrenamientosEquipoPanel {
  habituales: EntrenamientoHabitualEquipoPanel[];
  instalaciones: InstalacionEntrenamientoPanel[];
}