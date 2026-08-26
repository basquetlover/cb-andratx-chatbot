export interface TemporadaEquipoDetalle {
  id: string;
  nombre: string;
}

export interface DatosGeneralesEquipoDetalle {
  temporada: TemporadaEquipoDetalle;
  nombre: string;
  nombreCorto: string;
  slug: string;
  categoria: string;
  genero: string;
  nivel: string;
  descripcion: string;
  imagen: string | null;
  activo: boolean;
}

export interface IntegracionesEquipoDetalle {
  chatbot: boolean;
  idEquipoFbib: string;
}

export interface PatrocinadorEquipoDetalle {
  id: string;
  nombre: string;
  nombreCorto: string;
  logo: string | null;
}

export interface PatrocinadoresEquipoDetalle {
  mostrarSponsor: boolean;
  seleccionados: PatrocinadorEquipoDetalle[];
}

export interface AdministracionEquipoDetalle {
  createdAt: string;
  updatedAt: string;
}

export interface EquipoDetallePanel {
  id: string;
  datosGenerales: DatosGeneralesEquipoDetalle;
  integraciones: IntegracionesEquipoDetalle;
  patrocinadores: PatrocinadoresEquipoDetalle;
  administracion: AdministracionEquipoDetalle;
}