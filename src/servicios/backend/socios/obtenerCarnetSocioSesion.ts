import {
  supabaseServidor,
} from "../../supabase/servidor";

import type {
  CarnetSocioPublico,
  EstadoCarnetSocio,
} from "@tipos/SocioPanel";

import type {
  DatosSesionSocio,
} from "@tipos/SocioPublico";

interface FilaSocioSesion {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  activo: boolean | null;
}

interface FilaTemporadaSesion {
  id: string;
  nombre: string | null;
  activa: boolean | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

interface FilaCarnetSesion {
  id: string;
  socio_id: string;
  temporada_id: string;

  numero_socio: number;
  numero_carnet: string;

  tipo_socio: string | null;
  estado: EstadoCarnetSocio;

  fecha_alta: string;
  fecha_caducidad: string;

  version_acceso: number;

  bloqueado_hasta:
    | string
    | null;

  socio:
    | FilaSocioSesion
    | FilaSocioSesion[]
    | null;

  temporada:
    | FilaTemporadaSesion
    | FilaTemporadaSesion[]
    | null;
}

export type MotivoErrorCarnetSocioSesion =
  | "sesion-no-valida"
  | "sesion-caducada"
  | "carnet-no-encontrado"
  | "socio-inactivo"
  | "temporada-no-activa"
  | "carnet-no-activo"
  | "sesion-revocada"
  | "acceso-bloqueado"
  | "carnet-fuera-de-fecha"
  | "datos-no-validos"
  | "error-consulta";

export class ErrorObtenerCarnetSocioSesion
  extends Error {
  motivo:
    MotivoErrorCarnetSocioSesion;

  constructor(
    mensaje: string,
    motivo:
      MotivoErrorCarnetSocioSesion =
        "error-consulta",
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerCarnetSocioSesion";

    this.motivo =
      motivo;
  }
}

function obtenerRelacionUnica<T>(
  valor:
    | T
    | T[]
    | null,
): T | null {
  if (
    Array.isArray(valor)
  ) {
    return valor[0] ?? null;
  }

  return valor;
}

function convertirTexto(
  valor: unknown,
): string {
  if (
    typeof valor ===
      "string" ||
    typeof valor ===
      "number"
  ) {
    return String(
      valor,
    ).trim();
  }

  return "";
}

function obtenerFechaMadrid():
  string {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Madrid",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const anio =
    partes.find(
      (parte) =>
        parte.type ===
        "year",
    )?.value;

  const mes =
    partes.find(
      (parte) =>
        parte.type ===
        "month",
    )?.value;

  const dia =
    partes.find(
      (parte) =>
        parte.type ===
        "day",
    )?.value;

  if (
    !anio ||
    !mes ||
    !dia
  ) {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  return `${anio}-${mes}-${dia}`;
}

function fechaPosteriorAhora(
  fecha:
    | string
    | null,
): boolean {
  if (!fecha) {
    return false;
  }

  const tiempo =
    new Date(
      fecha,
    ).getTime();

  return (
    Number.isFinite(
      tiempo,
    ) &&
    tiempo > Date.now()
  );
}

function sesionTieneFormatoValido(
  sesion:
    DatosSesionSocio,
): boolean {
  return Boolean(
    sesion &&
      typeof sesion.socioId ===
        "string" &&
      sesion.socioId.trim() &&
      typeof sesion.carnetId ===
        "string" &&
      sesion.carnetId.trim() &&
      typeof sesion.temporadaId ===
        "string" &&
      sesion.temporadaId.trim() &&
      Number.isInteger(
        sesion.versionAcceso,
      ) &&
      sesion.versionAcceso >=
        1 &&
      Number.isInteger(
        sesion.emitidoEn,
      ) &&
      sesion.emitidoEn >
        0 &&
      Number.isInteger(
        sesion.expiraEn,
      ) &&
      sesion.expiraEn >
        0,
  );
}

function comprobarSesion(
  sesion:
    DatosSesionSocio,
): void {
  if (
    !sesionTieneFormatoValido(
      sesion,
    )
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "Los datos de la sesión no son válidos.",
      "sesion-no-valida",
    );
  }

  if (
    sesion.expiraEn <=
    Date.now()
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "La sesión del socio ha caducado.",
      "sesion-caducada",
    );
  }

  const margenReloj =
    5 * 60 * 1000;

  if (
    sesion.emitidoEn >
    Date.now() + margenReloj
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "La fecha de creación de la sesión no es válida.",
      "sesion-no-valida",
    );
  }
}

export async function obtenerCarnetSocioSesion(
  sesion:
    DatosSesionSocio,
): Promise<CarnetSocioPublico> {
  comprobarSesion(
    sesion,
  );

  const {
    data,
    error,
  } = await supabaseServidor
    .from(
      "socios_temporadas",
    )
    .select(`
      id,
      socio_id,
      temporada_id,

      numero_socio,
      numero_carnet,

      tipo_socio,
      estado,

      fecha_alta,
      fecha_caducidad,

      version_acceso,
      bloqueado_hasta,

      socio:socios (
        id,
        nombre,
        apellidos,
        activo
      ),

      temporada:temporadas (
        id,
        nombre,
        activa,
        fecha_inicio,
        fecha_fin
      )
    `)
    .eq(
      "id",
      sesion.carnetId,
    )
    .eq(
      "socio_id",
      sesion.socioId,
    )
    .eq(
      "temporada_id",
      sesion.temporadaId,
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Error comprobando la sesión del carnet de socio:",
      {
        socioId:
          sesion.socioId,

        carnetId:
          sesion.carnetId,

        temporadaId:
          sesion.temporadaId,

        codigo:
          error.code,

        mensaje:
          error.message,

        detalles:
          error.details,
      },
    );

    throw new ErrorObtenerCarnetSocioSesion(
      `No se ha podido comprobar la sesión del socio: ${error.message}`,
      "error-consulta",
    );
  }

  if (!data) {
    throw new ErrorObtenerCarnetSocioSesion(
      "El carnet asociado a la sesión no existe.",
      "carnet-no-encontrado",
    );
  }

  const fila =
    data as unknown as
      FilaCarnetSesion;

  const socio =
    obtenerRelacionUnica(
      fila.socio,
    );

  const temporada =
    obtenerRelacionUnica(
      fila.temporada,
    );

  if (
    !socio ||
    !temporada
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "No se han podido obtener los datos asociados al carnet.",
      "datos-no-validos",
    );
  }

  if (
    socio.activo !== true
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "El socio está desactivado.",
      "socio-inactivo",
    );
  }

  if (
    temporada.activa !==
    true
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "El carnet no pertenece a la temporada activa.",
      "temporada-no-activa",
    );
  }

  if (
    fila.estado !==
    "activo"
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "El carnet no está activo.",
      "carnet-no-activo",
    );
  }

  if (
    Number(
      fila.version_acceso,
    ) !==
    sesion.versionAcceso
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "La sesión fue invalidada después de modificar el carnet.",
      "sesion-revocada",
    );
  }

  if (
    fechaPosteriorAhora(
      fila.bloqueado_hasta,
    )
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "El acceso al carnet está bloqueado temporalmente.",
      "acceso-bloqueado",
    );
  }

  const hoy =
    obtenerFechaMadrid();

  if (
    !fila.fecha_alta ||
    !fila.fecha_caducidad ||
    fila.fecha_alta >
      hoy ||
    fila.fecha_caducidad <
      hoy
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "El carnet todavía no es válido o ya ha caducado.",
      "carnet-fuera-de-fecha",
    );
  }

  if (
    temporada.fecha_inicio &&
    hoy <
      temporada.fecha_inicio
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "La temporada del carnet todavía no ha comenzado.",
      "carnet-fuera-de-fecha",
    );
  }

  if (
    temporada.fecha_fin &&
    hoy >
      temporada.fecha_fin
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "La temporada del carnet ya ha finalizado.",
      "carnet-fuera-de-fecha",
    );
  }

  const numeroSocio =
    Number(
      fila.numero_socio,
    );

  if (
    !Number.isSafeInteger(
      numeroSocio,
    ) ||
    numeroSocio < 1
  ) {
    throw new ErrorObtenerCarnetSocioSesion(
      "El número de socio del carnet no es válido.",
      "datos-no-validos",
    );
  }

  const nombre =
    convertirTexto(
      socio.nombre,
    ) ||
    "Socio";

  const apellidos =
    convertirTexto(
      socio.apellidos,
    );

  const numeroCarnet =
    convertirTexto(
      fila.numero_carnet,
    );

  if (!numeroCarnet) {
    throw new ErrorObtenerCarnetSocioSesion(
      "El número de carnet no es válido.",
      "datos-no-validos",
    );
  }

  return {
    socio: {
      id:
        socio.id,

      nombre,

      apellidos,

      nombreCompleto:
        [
          nombre,
          apellidos,
        ]
          .filter(Boolean)
          .join(" "),
    },

    carnet: {
      id:
        fila.id,

      numeroSocio,

      numeroCarnet,

      tipoSocio:
        fila.tipo_socio,

      estado:
        fila.estado,

      fechaAlta:
        fila.fecha_alta,

      fechaCaducidad:
        fila.fecha_caducidad,

      temporada: {
        id:
          temporada.id,

        nombre:
          convertirTexto(
            temporada.nombre,
          ) ||
          "Temporada",
      },
    },
  };
}