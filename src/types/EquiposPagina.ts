export interface EquipoPagina {
  id: string;
  temporadaId: string;
  nombre: string | null;
  nombreCorto: string | null;
  slug: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  descripcion: string | null;
  imagen: string | null;
  sponsorId: string | null;
  mostrarSponsor: boolean;
  chatbot: boolean;
}

export interface DatosEquiposPagina {
  temporadaId: string | null;
  equipos: EquipoPagina[];
}

export interface RespuestaEquiposPagina {
  ok: boolean;
  data: DatosEquiposPagina | null;
  total: number;
  error?: string;
}


