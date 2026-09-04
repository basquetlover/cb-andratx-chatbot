import type {
  EstadoCarnetSocio,
} from "./SocioPanel";

export interface CredencialesSocio {
  email: string;
  password: string;
}

export interface DatosSesionSocio {
  socioId: string;
  carnetId: string;
  temporadaId: string;

  versionAcceso: number;

  emitidoEn: number;
  expiraEn: number;
}

export interface TemporadaCarnetPublico {
  id: string;
  nombre: string;

  fechaInicio: string | null;
  fechaFin: string | null;
}

export interface SocioCarnetPublico {
  id: string;

  nombre: string;
  apellidos: string;
  nombreCompleto: string;

  email: string;
}

export interface DatosCarnetPublico {
  id: string;

  /*
   * El número de socio pertenece a la
   * temporada y puede volver a empezar
   * desde 1 en la siguiente.
   */
  numeroSocio: number;

  /*
   * Código completo guardado en el QR:
   * CBA-2627001
   */
  numeroCarnet: string;

  tipoSocio: string | null;
  estado: EstadoCarnetSocio;

  fechaAlta: string | null;
  fechaCaducidad: string | null;

  versionAcceso: number;
}

export interface CarnetSocioPublico {
  socio: SocioCarnetPublico;
  carnet: DatosCarnetPublico;
  temporada: TemporadaCarnetPublico;

  qr: {
    /*
     * El QR contiene únicamente el número
     * literal del carnet.
     */
    contenido: string;
  };
}

export type MotivoAccesoSocioDenegado =
  | "credenciales-invalidas"
  | "socio-desactivado"
  | "socio-bloqueado"
  | "sin-carnet"
  | "carnet-pendiente"
  | "carnet-bloqueado"
  | "carnet-caducado"
  | "temporada-no-activa"
  | "sesion-no-valida"
  | "sesion-caducada"
  | "version-no-valida";

export interface ResultadoAutenticacionSocio {
  socioId: string;
  carnetId: string;
  temporadaId: string;

  numeroSocio: number;
  numeroCarnet: string;

  versionAcceso: number;

  expiraEn: string;
}

export interface RespuestaInicioSesionSocio {
  ok: boolean;

  data: {
    sesion:
      ResultadoAutenticacionSocio;

    redirect: string;
  } | null;

  error: string | null;

  motivo?:
    MotivoAccesoSocioDenegado;
}

export interface RespuestaCarnetSocioPublico {
  ok: boolean;

  data: {
    carnet:
      CarnetSocioPublico;
  } | null;

  error: string | null;

  motivo?:
    MotivoAccesoSocioDenegado;
}

export interface RespuestaCerrarSesionSocio {
  ok: boolean;

  data: {
    sesionCerrada: boolean;
  } | null;

  error: string | null;
}