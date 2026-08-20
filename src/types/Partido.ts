export interface EquipoPartido {
  nombre: string;
  puntos: number | null;
  escudo: string | null;
}

export interface InstalacionPartido {
  id: string | null;
  nombre: string | null;
  direccion: string | null;
  localidad: string | null;
  codigoPostal: string | null;
  latitud: string | null;
  longitud: string | null;
}

export interface ProximoPartido {
  id: string;
  fecha: string;
  hora: string | null;
  jornada: string | null;
  categoria: string | null;
  competicion: string | null;
  grupo: string | null;
  estado: string | null;
  equipoLocal: EquipoPartido;
  equipoVisitante: EquipoPartido;
  instalacion: InstalacionPartido | null;
  urlFbib: string | null;
  logoLocal?: string | null;
  localClubLogo?: string | null;
  logoVisitor?: string | null;
  logoVisitant?: string | null;
  visitorClubLogo?: string | null;
}

export interface ResultadoProximoPartido {
  equipo: {
    id: string;
    nombre: string | null;
  };
  partido: ProximoPartido | null;
}

export interface RespuestaProximoPartido {
  ok: boolean;
  data: ResultadoProximoPartido | null;
  error?: string;
}