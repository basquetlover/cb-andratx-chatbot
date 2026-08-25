export interface RedSocialPatrocinador {
  id: string;
  nombre: string;
  usuario: string | null;
  url: string;
  icono: string | null;
  activo: boolean;
  orden: number;
}

export interface AsignacionPatrocinadorEquipo {
  id: string;
  fechaAsignacion: string;
  asignadoPor: string;
}

export interface EquipoPatrocinadoPanel {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  mostrarSponsor: boolean;
  fechaAsignacion: string;
  asignadoPor: string;
}

export interface PatrocinadorListadoPanel {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  slug: string | null;
  descripcion: string | null;
  logo: string | null;
  banner: string | null;
  web: string | null;
  redes: RedSocialPatrocinador[];
  activo: boolean;
  createdAt: string;
  updatedAt: string | null;
  equipos: EquipoPatrocinadoPanel[];
}

export interface ResultadoPatrocinadoresPanel {
  patrocinadores: PatrocinadorListadoPanel[];
  totalPatrocinadores: number;
  patrocinadoresActivos: number;
  patrocinadoresInactivos: number;
  equiposPatrocinados: number;
  totalEquipos: number;
}

export interface DatosCrearPatrocinador {
  nombre: string;
  nombreCorto: string | null;
  slug: string;
  descripcion: string | null;
  web: string | null;
  activo: boolean;
  redes: RedSocialPatrocinador[];
  equiposIds: string[];
  logo: string | null;
  banner: string | null;
}

export interface PatrocinadorCreadoPanel {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  logo: string | null;
  banner: string | null;
  equiposAsignados: number;
}

export interface DatosInformacionPatrocinador {
  nombre: string;
  nombreCorto: string | null;
  slug: string;
  descripcion: string | null;
  web: string | null;
  activo: boolean;
}

export interface InformacionPatrocinadorActualizada extends DatosInformacionPatrocinador {
  id: string;
}