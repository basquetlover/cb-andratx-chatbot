import type {
  ClasificacionEquipoFbib,
  FichaEquipoFbib,
  PartidoEquipoFbib,
} from "@tipos/FbibEquipoPublico";

export interface TemporadaEquipoPublico {
  id: string;
  nombre: string;
}

export interface PatrocinadorEquipoPublico {
  id: string;
  nombre: string;
  banner: string;
  enlace: string | null;
}

export interface InstalacionEntrenamientoPublico {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  direccion: string | null;
  localidad: string | null;
}

export interface EntrenamientoHabitualEquipoPublico {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  observaciones: string | null;
  instalacion: InstalacionEntrenamientoPublico | null;
}

export interface DatosFbibEquipoPublico {
  idEquipoFbib: string;
  enlaceFbib: string;
  mesConsultado: number;

  ficha: FichaEquipoFbib | null;
  partidosMes: PartidoEquipoFbib[];
  proximosPartidos: PartidoEquipoFbib[];
  clasificaciones: ClasificacionEquipoFbib[];
}

export interface DatosEquipoPublico {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  descripcion: string | null;
  imagen: string | null;

  temporada: TemporadaEquipoPublico | null;

  entrenamientosHabituales:
    EntrenamientoHabitualEquipoPublico[];

  mostrarSponsor: boolean;
  patrocinadores: PatrocinadorEquipoPublico[];

  fbib: DatosFbibEquipoPublico | null;
}