import {
  supabaseServidor,
} from "../../supabase/servidor";

import type {
  CarnetSocioPublico,
  EstadoCarnetSocio,
  SesionCarnetSocio,
} from "@tipos/SocioPanel";

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

  bloqueado_hasta: string | null;

  socio:
    | FilaSocioSesion
    | FilaSocioSesion[]
    | null;

  temporada:
    | FilaTemporadaSesion
    | FilaTemporadaSesion[]
    | null;
}

export class ErrorObtenerCarnetSocioSesion
  extends Error {
  constructor(
    mensaje: string,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerCarnetSocioSesion";
  }
}

function obtenerRelacionUnica<T>(
  valor:
    | T
    | T[]
    | null,
): T | null {
  if (Array.isArray(valor)) {
    return valor[0] ?? null;
  }

  return valor;
}

function convertirTexto(
  valor: unknown,
): string {
  if (
    typeof valor === "string" ||
    typeof valor === "number"
  ) {
    return String(valor).trim();
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
        parte.type === "year",
    )?.value;

  const mes =
    partes.find(
      (parte) =>
        parte.type === "month",
    )?.value;

  const dia =
    partes.find(
      (parte) =>
        parte.type === "day",
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
  fecha: string | null,
): boolean {
  if (!fecha) {
    return false;
  }

  const tiempo =
    new Date(fecha)
      .getTime();

  return (
    Number.isFinite(tiempo) &&
    tiempo > Date.now()
  );
}

function sesionCaducada(
  expiraAt: string,
): boolean {
  const tiempo =
    new Date(
      expiraAt,
    ).getTime();

  return (
    !Number.isFinite(tiempo) ||
    tiempo <= Date.now()
  );
}

function sesionTieneFormatoValido(
  sesion:
    SesionCarnetSocio,
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
    sesion.versionAcceso >= 1 &&
    typeof sesion.expiraAt ===
      "string" &&
    sesion.expiraAt.trim(),
  );
}

export async function obtenerCarnetSocioSesion(
  sesion:
    SesionCarnetSocio,
): Promise<CarnetSocioPublico | null> {
  if (
    !sesionTieneFormatoValido(
      sesion,
    ) ||
    sesionCaducada(
      sesion.expiraAt,
    )
  ) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabaseServidor
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
      .limit(1)
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
        error,
      },
    );

    throw new ErrorObtenerCarnetSocioSesion(
      `No se ha podido comprobar la sesión del socio: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const fila =
    data as
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
    return null;
  }

  if (
    socio.activo !== true ||
    temporada.activa !== true
  ) {
    return null;
  }

  if (
    fila.estado !==
    "activo"
  ) {
    return null;
  }

  if (
    fila.version_acceso !==
    sesion.versionAcceso
  ) {
    return null;
  }

  /*
   * Si el administrador incrementa
   * version_acceso, todas las sesiones
   * creadas con la versión anterior dejan
   * de funcionar inmediatamente.
   */

  if (
    fechaPosteriorAhora(
      fila.bloqueado_hasta,
    )
  ) {
    return null;
  }

  const hoy =
    obtenerFechaMadrid();

  if (
    fila.fecha_alta >
      hoy ||
    fila.fecha_caducidad <
      hoy
  ) {
    return null;
  }

  if (
    temporada.fecha_inicio &&
    hoy <
      temporada.fecha_inicio
  ) {
    return null;
  }

  if (
    temporada.fecha_fin &&
    hoy >
      temporada.fecha_fin
  ) {
    return null;
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
    return null;
  }

  const nombre =
    convertirTexto(
      socio.nombre,
    ) || "Socio";

  const apellidos =
    convertirTexto(
      socio.apellidos,
    );

  const numeroCarnet =
    convertirTexto(
      fila.numero_carnet,
    );

  if (!numeroCarnet) {
    return null;
  }

  return {
    socio: {
      id:
        socio.id,

      nombre,
      apellidos,

      nombreCompleto:
        [nombre, apellidos]
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
          ) || "Temporada",
      },
    },
  };
}