import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import type {
  DatosSesionSocio,
} from "@tipos/SocioPublico";

export const NOMBRE_COOKIE_SESION_SOCIO =
  "cba_socio_sesion";

interface ContenidoTokenSesionSocio {
  version: 1;

  socioId: string;
  carnetId: string;
  temporadaId: string;

  versionAcceso: number;

  emitidoEn: number;
  expiraEn: number;
}

export interface OpcionesCookieSesionSocio {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  expires: Date;
}

function obtenerSecretoSesionSocio(): string {
  const secreto =
    import.meta.env
      .SOCIOS_SESSION_SECRET
      ?.trim();

  if (!secreto) {
    throw new Error(
      "No se ha configurado SOCIOS_SESSION_SECRET.",
    );
  }

  if (secreto.length < 32) {
    throw new Error(
      "SOCIOS_SESSION_SECRET debe contener al menos 32 caracteres.",
    );
  }

  return secreto;
}

function codificarBase64Url(
  contenido: string,
): string {
  return Buffer.from(
    contenido,
    "utf8",
  ).toString("base64url");
}

function decodificarBase64Url(
  contenido: string,
): string {
  return Buffer.from(
    contenido,
    "base64url",
  ).toString("utf8");
}

function firmarContenido(
  contenidoCodificado: string,
): string {
  return createHmac(
    "sha256",
    obtenerSecretoSesionSocio(),
  )
    .update(
      contenidoCodificado,
      "utf8",
    )
    .digest("base64url");
}

function compararFirmas(
  firmaRecibida: string,
  firmaEsperada: string,
): boolean {
  try {
    const recibida =
      Buffer.from(
        firmaRecibida,
        "base64url",
      );

    const esperada =
      Buffer.from(
        firmaEsperada,
        "base64url",
      );

    if (
      recibida.length !==
      esperada.length
    ) {
      return false;
    }

    return timingSafeEqual(
      recibida,
      esperada,
    );
  } catch {
    return false;
  }
}

function esUuid(
  valor: unknown,
): valor is string {
  return (
    typeof valor === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      valor,
    )
  );
}

function esEnteroPositivo(
  valor: unknown,
): valor is number {
  return (
    typeof valor === "number" &&
    Number.isInteger(valor) &&
    valor > 0
  );
}

function esMarcaTiempoValida(
  valor: unknown,
): valor is number {
  return (
    typeof valor === "number" &&
    Number.isInteger(valor) &&
    valor > 0
  );
}

function convertirContenidoToken(
  valor: unknown,
): ContenidoTokenSesionSocio | null {
  if (
    typeof valor !== "object" ||
    valor === null ||
    Array.isArray(valor)
  ) {
    return null;
  }

  const contenido =
    valor as Record<
      string,
      unknown
    >;

  if (
    contenido.version !== 1 ||
    !esUuid(
      contenido.socioId,
    ) ||
    !esUuid(
      contenido.carnetId,
    ) ||
    !esUuid(
      contenido.temporadaId,
    ) ||
    !esEnteroPositivo(
      contenido.versionAcceso,
    ) ||
    !esMarcaTiempoValida(
      contenido.emitidoEn,
    ) ||
    !esMarcaTiempoValida(
      contenido.expiraEn,
    )
  ) {
    return null;
  }

  return {
    version: 1,

    socioId:
      contenido.socioId,

    carnetId:
      contenido.carnetId,

    temporadaId:
      contenido.temporadaId,

    versionAcceso:
      contenido.versionAcceso,

    emitidoEn:
      contenido.emitidoEn,

    expiraEn:
      contenido.expiraEn,
  };
}

export function crearTokenSesionSocio(
  datos: {
    socioId: string;
    carnetId: string;
    temporadaId: string;

    versionAcceso: number;

    expiraEn: Date;
  },
): string {
  if (
    !esUuid(datos.socioId) ||
    !esUuid(datos.carnetId) ||
    !esUuid(datos.temporadaId)
  ) {
    throw new Error(
      "No se puede crear una sesión de socio con identificadores no válidos.",
    );
  }

  if (
    !esEnteroPositivo(
      datos.versionAcceso,
    )
  ) {
    throw new Error(
      "La versión de acceso del carnet no es válida.",
    );
  }

  const expiraEn =
    datos.expiraEn.getTime();

  if (
    Number.isNaN(expiraEn) ||
    expiraEn <= Date.now()
  ) {
    throw new Error(
      "La fecha de caducidad de la sesión no es válida.",
    );
  }

  const contenido:
    ContenidoTokenSesionSocio =
    {
      version: 1,

      socioId:
        datos.socioId,

      carnetId:
        datos.carnetId,

      temporadaId:
        datos.temporadaId,

      versionAcceso:
        datos.versionAcceso,

      emitidoEn:
        Date.now(),

      expiraEn,
    };

  const contenidoCodificado =
    codificarBase64Url(
      JSON.stringify(
        contenido,
      ),
    );

  const firma =
    firmarContenido(
      contenidoCodificado,
    );

  return `${contenidoCodificado}.${firma}`;
}

export function verificarTokenSesionSocio(
  token: string,
): DatosSesionSocio | null {
  const tokenLimpio =
    token.trim();

  if (!tokenLimpio) {
    return null;
  }

  const partes =
    tokenLimpio.split(".");

  if (partes.length !== 2) {
    return null;
  }

  const [
    contenidoCodificado,
    firmaRecibida,
  ] = partes;

  if (
    !contenidoCodificado ||
    !firmaRecibida
  ) {
    return null;
  }

  const firmaEsperada =
    firmarContenido(
      contenidoCodificado,
    );

  if (
    !compararFirmas(
      firmaRecibida,
      firmaEsperada,
    )
  ) {
    return null;
  }

  let contenidoDesconocido:
    unknown;

  try {
    contenidoDesconocido =
      JSON.parse(
        decodificarBase64Url(
          contenidoCodificado,
        ),
      );
  } catch {
    return null;
  }

  const contenido =
    convertirContenidoToken(
      contenidoDesconocido,
    );

  if (!contenido) {
    return null;
  }

  const ahora =
    Date.now();

  if (
    contenido.expiraEn <= ahora
  ) {
    return null;
  }

  /*
   * Evita aceptar tokens cuya fecha de
   * emisión esté situada claramente en el
   * futuro.
   */
  const margenReloj =
    5 * 60 * 1000;

  if (
    contenido.emitidoEn >
    ahora + margenReloj
  ) {
    return null;
  }

  return {
    socioId:
      contenido.socioId,

    carnetId:
      contenido.carnetId,

    temporadaId:
      contenido.temporadaId,

    versionAcceso:
      contenido.versionAcceso,

    emitidoEn:
      contenido.emitidoEn,

    expiraEn:
      contenido.expiraEn,
  };
}

export function obtenerOpcionesCookieSesionSocio(
  expiraEn: Date,
): OpcionesCookieSesionSocio {
  return {
    httpOnly: true,

    secure:
      import.meta.env.PROD,

    sameSite: "lax",

    path: "/",

    expires:
      expiraEn,
  };
}

export const OPCIONES_ELIMINAR_COOKIE_SESION_SOCIO =
  {
    path: "/",
  } as const;