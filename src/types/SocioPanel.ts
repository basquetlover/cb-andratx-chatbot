export type EstadoCarnetSocio =
  | "pendiente"
  | "activo"
  | "bloqueado"
  | "caducado";

export interface TemporadaResumenSocio {
  id: string;
  nombre: string;
  activa: boolean;
  fechaInicio: string | null;
  fechaFin: string | null;
}

export interface CarnetTemporadaSocio {
  id: string;
  socioId: string;
  temporadaId: string;

  numeroCarnet: string;

  tipoSocio: string | null;
  estado: EstadoCarnetSocio;

  fechaAlta: string;
  fechaCaducidad: string;

  activadoAt: string | null;

  bloqueadoAt: string | null;
  motivoBloqueo: string | null;
  bloqueadoHasta: string | null;

  emailBienvenidaEnviadoAt:
    | string
    | null;

  ultimoAccesoAt:
    | string
    | null;

  intentosFallidos: number;
  versionAcceso: number;

  createdAt: string;
  updatedAt: string;

  temporada:
    TemporadaResumenSocio;
}

export interface ResumenSocioPanel {
  id: string;

  numeroSocio: number;

  nombre: string;
  apellidos: string;
  nombreCompleto: string;

  email: string;
  telefono: string | null;

  activo: boolean;

  carnetActual:
    | CarnetTemporadaSocio
    | null;

  totalTemporadas: number;

  createdAt: string;
  updatedAt: string;
}

export interface SocioPanel
  extends ResumenSocioPanel {
  observaciones: string | null;

  historial:
    CarnetTemporadaSocio[];
}

export interface OpcionesSociosPanel {
  temporadaActual:
    | TemporadaResumenSocio
    | null;

  temporadas:
    TemporadaResumenSocio[];

  tiposSocio: string[];
}

export interface CrearSocioPanel {
  nombre: string;
  apellidos: string;
  email: string;

  telefono?:
    | string
    | null;

  observaciones?:
    | string
    | null;

  temporadaId: string;

  tipoSocio?:
    | string
    | null;

  fechaAlta: string;
  fechaCaducidad: string;

  activar: boolean;
  enviarBienvenida: boolean;
}

export interface ActualizarSocioPanel {
  nombre: string;
  apellidos: string;
  email: string;

  telefono:
    | string
    | null;

  observaciones:
    | string
    | null;

  activo: boolean;
}

export interface CrearCarnetTemporadaSocio {
  temporadaId: string;

  tipoSocio:
    | string
    | null;

  fechaAlta: string;
  fechaCaducidad: string;

  activar: boolean;
  enviarBienvenida: boolean;
}

export interface ActualizarCarnetTemporadaSocio {
  tipoSocio:
    | string
    | null;

  fechaAlta: string;
  fechaCaducidad: string;

  estado:
    EstadoCarnetSocio;

  motivoBloqueo:
    | string
    | null;
}

export interface CredencialesCarnetSocio {
  email: string;
  password: string;
}

export interface ResultadoCreacionSocio {
  socio: SocioPanel;

  credenciales:
    | CredencialesCarnetSocio
    | null;

  emailEnviado: boolean;
}

export interface ResultadoRegenerarPasswordSocio {
  socioId: string;
  carnetId: string;
  numeroCarnet: string;

  credenciales:
    CredencialesCarnetSocio;

  emailEnviado: boolean;
}

export interface DatosCarnetSocioPublico {
  socioId: string;
  carnetId: string;

  numeroSocio: number;
  numeroCarnet: string;

  nombre: string;
  apellidos: string;
  nombreCompleto: string;

  tipoSocio: string | null;

  temporada: {
    id: string;
    nombre: string;
  };

  estado:
    EstadoCarnetSocio;

  fechaAlta: string;
  fechaCaducidad: string;
}

export interface ResultadoEscaneoCarnet {
  encontrado: boolean;
  valido: boolean;

  motivo:
    | "valido"
    | "formato-invalido"
    | "no-encontrado"
    | "socio-desactivado"
    | "carnet-pendiente"
    | "carnet-bloqueado"
    | "carnet-caducado";

  mensaje: string;

  socio:
    | {
        id: string;
        numeroSocio: number;
        nombre: string;
        apellidos: string;
        nombreCompleto: string;
        email: string;
        telefono: string | null;
        activo: boolean;
      }
    | null;

  carnet:
    | CarnetTemporadaSocio
    | null;
}

export interface FiltrosListadoSocios {
  consulta?: string;

  estado?:
    | EstadoCarnetSocio
    | "todos";

  activo?:
    | "todos"
    | "activos"
    | "inactivos";

  temporadaId?: string;

  pagina?: number;
  limite?: number;
}

export interface ResultadoListadoSocios {
  socios:
    ResumenSocioPanel[];

  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ErrorCampoSocio {
  campo: string;
  mensaje: string;
}

export interface RespuestaListadoSocios {
  ok: boolean;

  data:
    | ResultadoListadoSocios
    | null;

  error: string | null;
}

export interface RespuestaSocioPanel {
  ok: boolean;

  data:
    | {
        socio: SocioPanel;
      }
    | null;

  error: string | null;

  errores?:
    ErrorCampoSocio[];
}

export interface RespuestaCrearSocio {
  ok: boolean;

  data:
    | ResultadoCreacionSocio
    | null;

  error: string | null;

  errores?:
    ErrorCampoSocio[];
}

export interface RespuestaRegenerarPassword {
  ok: boolean;

  data:
    | ResultadoRegenerarPasswordSocio
    | null;

  error: string | null;
}

export interface RespuestaOpcionesSocios {
  ok: boolean;

  data:
    | OpcionesSociosPanel
    | null;

  error: string | null;
}

export interface RespuestaEscaneoCarnet {
  ok: boolean;

  data:
    | ResultadoEscaneoCarnet
    | null;

  error: string | null;
}

export interface RespuestaAccesoCarnet {
  ok: boolean;

  data:
    | {
        carnet:
          DatosCarnetSocioPublico;
      }
    | null;

  error: string | null;

  errores?:
    ErrorCampoSocio[];
}