export type EstadoCarnetSocio =
  | "pendiente"
  | "activo"
  | "bloqueado"
  | "caducado";

export type FiltroActividadSocio =
  | "todos"
  | "activos"
  | "inactivos";

export type FiltroEstadoCarnetSocio =
  | EstadoCarnetSocio
  | "todos";

export interface TemporadaResumenSocio {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}

export interface CarnetTemporadaSocio {
  id: string;
  socioId: string;
  temporadaId: string;

  numeroSocio: number;
  numeroCarnet: string;

  tipoSocio: string | null;
  estado: EstadoCarnetSocio;

  fechaAlta: string;
  fechaCaducidad: string;

  motivoBloqueo: string | null;

  activadoAt: string | null;
  activadoPor: string | null;

  bloqueadoAt: string | null;
  bloqueadoPor: string | null;

  versionAcceso: number;

  passwordUpdatedAt: string;

  intentosFallidos: number;
  bloqueadoHasta: string | null;
  ultimoAccesoAt: string | null;

  emailBienvenidaEnviadoAt:
    | string
    | null;

  accesoBloqueado: boolean;

  createdAt: string;
  updatedAt: string;

  temporada:
    TemporadaResumenSocio;
}

export interface ResumenSocioPanel {
  id: string;

  nombre: string;
  apellidos: string;
  nombreCompleto: string;

  email: string;
  telefono: string | null;

  activo: boolean;

  carnetActual:
    CarnetTemporadaSocio | null;

  totalCarnets: number;

  createdAt: string;
  updatedAt: string;
}

export interface SocioPanel
  extends ResumenSocioPanel {
  observaciones: string | null;

  carnets:
    CarnetTemporadaSocio[];
}

export interface OpcionTipoSocio {
  valor: string;
  nombre: string;
}

export interface OpcionesSociosPanel {
  temporadaActiva:
    TemporadaResumenSocio | null;

  temporadas:
    TemporadaResumenSocio[];

  tiposSocio:
    OpcionTipoSocio[];
}

export interface CrearCarnetTemporadaSocio {
  temporadaId: string;
  tipoSocio: string;

  estado:
    | "pendiente"
    | "activo";

  fechaAlta: string;
  fechaCaducidad: string;
}

export interface ActualizarCarnetTemporadaSocio {
  tipoSocio: string;

  estado:
    EstadoCarnetSocio;

  fechaAlta: string;
  fechaCaducidad: string;

  motivoBloqueo?:
    | string
    | null;
}

export interface CrearSocioPanel {
  nombre: string;
  apellidos: string;

  email: string;
  telefono?: string | null;

  observaciones?:
    | string
    | null;

  activo: boolean;

  carnet:
    CrearCarnetTemporadaSocio;
}

export interface ActualizarSocioPanel {
  nombre: string;
  apellidos: string;

  email: string;
  telefono: string | null;

  observaciones:
    | string
    | null;

  activo: boolean;
}

export interface CredencialesCarnetSocio {
  email: string;

  numeroSocio: number;
  numeroCarnet: string;

  /*
   * La contraseña se devuelve únicamente
   * al crear el carnet. Nunca se almacena
   * sin cifrar en la base de datos.
   */
  passwordCarnet: string;
}

export interface ResultadoCrearSocio {
  socio: SocioPanel;

  carnet:
    CarnetTemporadaSocio;

  credenciales:
    CredencialesCarnetSocio;

  emailEnviado: boolean;
}

export type ResultadoCrearSocioPanel =
  ResultadoCrearSocio;

export interface ResultadoCrearCarnetSocio {
  socio: SocioPanel;

  carnet:
    CarnetTemporadaSocio;

  credenciales:
    CredencialesCarnetSocio;

  emailEnviado: boolean;
}

export type ResultadoCrearCarnetSocioPanel =
  ResultadoCrearCarnetSocio;

export interface FiltrosListadoSociosPanel {
  busqueda?: string;

  activo?:
    FiltroActividadSocio;

  estado?:
    FiltroEstadoCarnetSocio;

  temporadaId?: string;

  pagina?: number;
  limite?: number;
}

export type FiltrosSociosPanel =
  FiltrosListadoSociosPanel;

export interface ResultadoListadoSociosPanel {
  socios:
    ResumenSocioPanel[];

  total: number;

  pagina: number;
  limite: number;
  totalPaginas: number;
}

export type MotivoResultadoEscaneoCarnet =
  | "valido"
  | "formato-invalido"
  | "no-encontrado"
  | "socio-desactivado"
  | "carnet-pendiente"
  | "carnet-bloqueado"
  | "carnet-caducado";

export type MotivoEscaneoCarnet =
  MotivoResultadoEscaneoCarnet;

export interface SocioResultadoEscaneo {
  id: string;

  nombre: string;
  apellidos: string;
  nombreCompleto: string;

  email: string;
  telefono: string | null;

  activo: boolean;
}

export interface ResultadoEscaneoCarnet {
  encontrado: boolean;
  valido: boolean;

  motivo:
    MotivoResultadoEscaneoCarnet;

  mensaje: string;

  numeroCarnet: string | null;

  socio:
    SocioResultadoEscaneo | null;

  carnet:
    CarnetTemporadaSocio | null;
}

export interface DatosAccesoCarnetSocio {
  email: string;
  password: string;
}

export interface SocioCarnetPublico {
  id: string;

  nombre: string;
  apellidos: string;
  nombreCompleto: string;
}

export interface CarnetSocioPublico {
  socio:
    SocioCarnetPublico;

  carnet: {
    id: string;

    numeroSocio: number;
    numeroCarnet: string;

    tipoSocio: string | null;

    estado:
      EstadoCarnetSocio;

    fechaAlta: string;
    fechaCaducidad: string;

    temporada: {
      id: string;
      nombre: string;
    };
  };
}

export interface SesionCarnetSocio {
  socioId: string;
  carnetId: string;

  temporadaId: string;

  versionAcceso: number;

  expiraAt: string;
}

export interface ResultadoDesbloquearAccesoSocio {
  socioId: string;
  carnetId: string;

  intentosFallidos: number;
  bloqueadoHasta: string | null;
  accesoBloqueado: boolean;
}

export interface ErrorCampoSocio {
  campo: string;
  mensaje: string;
}

export interface RespuestaListadoSociosPanel {
  ok: boolean;

  data:
    | ResultadoListadoSociosPanel
    | null;

  error: string | null;

  errores?:
    ErrorCampoSocio[];
}

export interface RespuestaSocioPanel {
  ok: boolean;

  data: {
    socio: SocioPanel;
  } | null;

  error: string | null;

  errores?:
    ErrorCampoSocio[];
}

export interface RespuestaCrearSocioPanel {
  ok: boolean;

  data:
    | ResultadoCrearSocio
    | null;

  error: string | null;

  errores?:
    ErrorCampoSocio[];
}

export interface RespuestaCrearCarnetSocio {
  ok: boolean;

  data:
    | ResultadoCrearCarnetSocio
    | null;

  error: string | null;

  errores?:
    ErrorCampoSocio[];
}

export interface RespuestaOpcionesSociosPanel {
  ok: boolean;

  data: {
    opciones:
      OpcionesSociosPanel;
  } | null;

  error: string | null;
}

export interface RespuestaEscanearCarnet {
  ok: boolean;

  data: {
    resultado:
      ResultadoEscaneoCarnet;
  } | null;

  error: string | null;
}

export interface RespuestaAccesoCarnetSocio {
  ok: boolean;

  data: {
    carnet:
      CarnetSocioPublico;
  } | null;

  error: string | null;
}

export interface RespuestaDesbloquearAccesoSocio {
  ok: boolean;

  data:
    | ResultadoDesbloquearAccesoSocio
    | null;

  error: string | null;
}