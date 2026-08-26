export interface TemporadaFormularioEquipo {
  id: string;
  nombre: string;
}

export interface PatrocinadorFormularioEquipo {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  logo: string | null;
}

export interface InstalacionFormularioEquipo {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  direccion: string | null;
  localidad: string | null;
}

export interface DatosFormularioEquipoPanel {
  temporada: TemporadaFormularioEquipo | null;
  categorias: string[];
  generos: string[];
  niveles: string[];
  patrocinadores: PatrocinadorFormularioEquipo[];
  instalaciones: InstalacionFormularioEquipo[];
}