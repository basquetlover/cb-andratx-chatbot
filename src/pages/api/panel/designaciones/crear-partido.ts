
import type { APIRoute } from "astro";

import {
  obtenerUsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import {
  comprobarPermisoUsuario,
} from "@servicios/seguridad/comprobarPermisoUsuario";

import {
  NOMBRE_COOKIE_SESION,
} from "@servicios/seguridad/cookieSesion";

import {
  crearPartidoManualDesignaciones,
  ErrorCrearPartidoManualDesignaciones,
} from "@servicios/backend/designaciones/crearPartidoManualDesignaciones";

// ======================================================
// C.B. ANDRATX
// API - CREACIÓN MANUAL DE PARTIDOS
//
// POST /api/panel/designaciones/crear-partido
//
// Exclusivo para partidos CBA.
// No permite crear partidos FBIB.
// No contiene lógica de escritura SQL.
// ======================================================

export const prerender = false;

// ======================================================
// CONFIGURACIÓN
// ======================================================

const MAXIMO_BYTES_JSON = 16384;

const CABECERAS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

type Registro = Record<string, unknown>;

// ======================================================
// ERRORES DE PETICIÓN
// ======================================================

class ErrorPeticionCrearPartido extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name = "ErrorPeticionCrearPartido";
    this.status = status;
  }
}

// ======================================================
// RESPUESTAS
// ======================================================

function responder(
  contenido: unknown,
  status = 200,
  cabeceras: Record<string, string> = {},
): Response {
  return Response.json(contenido, {
    status,
    headers: {
      ...CABECERAS,
      ...cabeceras,
    },
  });
}

function responderError(
  mensaje: string,
  status = 400,
): Response {
  return responder(
    {
      ok: false,
      data: null,
      error: mensaje,
    },
    status,
  );
}

// ======================================================
// VALIDAR ORIGEN
// ======================================================

function comprobarOrigen(
  request: Request,
): void {
  const origen =
    request.headers.get("origin");

  const origenEsperado =
    new URL(request.url).origin;

  if (
    !origen ||
    origen !== origenEsperado
  ) {
    throw new ErrorPeticionCrearPartido(
      "El origen de la solicitud no es válido.",
      403,
    );
  }

  const sitioFetch =
    request.headers.get("sec-fetch-site");

  if (
    sitioFetch &&
    sitioFetch !== "same-origin" &&
    sitioFetch !== "none"
  ) {
    throw new ErrorPeticionCrearPartido(
      "No se permiten solicitudes desde otros sitios.",
      403,
    );
  }
}

// ======================================================
// LEER JSON CON LÍMITE
// ======================================================

async function leerJsonLimitado(
  request: Request,
): Promise<unknown> {
  const tipoContenido =
    request.headers.get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();

  if (tipoContenido !== "application/json") {
    throw new ErrorPeticionCrearPartido(
      "La solicitud debe utilizar application/json.",
      415,
    );
  }

  const longitudDeclarada =
    request.headers.get("content-length");

  if (longitudDeclarada !== null) {
    const longitud =
      Number(longitudDeclarada);

    if (
      !Number.isSafeInteger(longitud) ||
      longitud < 0 ||
      longitud > MAXIMO_BYTES_JSON
    ) {
      throw new ErrorPeticionCrearPartido(
        "El contenido supera el tamaño permitido.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ErrorPeticionCrearPartido(
      "No se han recibido los datos del partido.",
      400,
    );
  }

  const lector =
    request.body.getReader();

  const bloques: Uint8Array[] = [];

  let totalBytes = 0;

  try {
    while (true) {
      const resultado =
        await lector.read();

      if (resultado.done) {
        break;
      }

      totalBytes +=
        resultado.value.byteLength;

      if (
        totalBytes > MAXIMO_BYTES_JSON
      ) {
        await lector.cancel();

        throw new ErrorPeticionCrearPartido(
          "El contenido supera el tamaño permitido.",
          413,
        );
      }

      bloques.push(resultado.value);
    }
  } finally {
    lector.releaseLock();
  }

  if (totalBytes === 0) {
    throw new ErrorPeticionCrearPartido(
      "La solicitud está vacía.",
      400,
    );
  }

  const contenidoBytes =
    new Uint8Array(totalBytes);

  let posicion = 0;

  for (const bloque of bloques) {
    contenidoBytes.set(
      bloque,
      posicion,
    );

    posicion += bloque.byteLength;
  }

  let contenidoTexto: string;

  try {
    contenidoTexto =
      new TextDecoder(
        "utf-8",
        {
          fatal: true,
        },
      ).decode(contenidoBytes);
  } catch {
    throw new ErrorPeticionCrearPartido(
      "La codificación del contenido no es válida.",
      400,
    );
  }

  try {
    return JSON.parse(
      contenidoTexto,
    ) as unknown;
  } catch {
    throw new ErrorPeticionCrearPartido(
      "El JSON enviado no es válido.",
      400,
    );
  }
}

// ======================================================
// VALIDAR ESTRUCTURA
// ======================================================

function esRegistro(
  valor: unknown,
): valor is Registro {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function validarContenido(
  contenido: unknown,
): Registro {
  if (!esRegistro(contenido)) {
    throw new ErrorPeticionCrearPartido(
      "Debes enviar los datos del partido como un objeto JSON.",
      400,
    );
  }

  // La API solo permite nuevas altas manuales.
  // Un partido existente se edita desde
  // /api/panel/designaciones/partido.

  if (
    contenido.id !== undefined &&
    contenido.id !== null
  ) {
    throw new ErrorPeticionCrearPartido(
      "Esta API no permite modificar partidos existentes.",
      400,
    );
  }

  // No aceptar identificadores federativos
  // en la creación manual.

  if (
    contenido.idPartidoFbib !== undefined &&
    contenido.idPartidoFbib !== null
  ) {
    throw new ErrorPeticionCrearPartido(
      "Los partidos FBIB no pueden crearse manualmente desde este formulario.",
      400,
    );
  }

  if (
    contenido.origen !== undefined &&
    contenido.origen !== "cba"
  ) {
    throw new ErrorPeticionCrearPartido(
      "El origen del partido debe ser CBA.",
      400,
    );
  }

  return contenido;
}

// ======================================================
// POST
// ======================================================

export const POST: APIRoute = async ({
  request,
  cookies,
}) => {
  // ----------------------------------------------------
  // 1. SESIÓN
  // ----------------------------------------------------

  const tokenSesion =
    cookies.get(
      NOMBRE_COOKIE_SESION,
    )?.value;

  if (!tokenSesion) {
    return responderError(
      "Debes iniciar sesión.",
      401,
    );
  }

  let sesion: Awaited<
    ReturnType<typeof obtenerUsuarioSesion>
  >;

  try {
    sesion =
      await obtenerUsuarioSesion(
        tokenSesion,
      );
  } catch (error) {
    console.error(
      "[DESIGNACIONES CBA] Error verificando sesión:",
      error,
    );

    return responderError(
      "No se ha podido comprobar la sesión.",
      500,
    );
  }

  if (!sesion) {
    cookies.delete(
      NOMBRE_COOKIE_SESION,
      {
        path: "/",
      },
    );

    return responderError(
      "La sesión ha caducado.",
      401,
    );
  }

  // ----------------------------------------------------
  // 2. PERMISOS
  // ----------------------------------------------------

  let puedeCrear = false;

  try {
    puedeCrear =
      await comprobarPermisoUsuario(
        sesion.acceso,
        "designaciones.crear",
      );
  } catch (error) {
    console.error(
      "[DESIGNACIONES CBA] Error comprobando permisos:",
      error,
    );

    return responderError(
      "No se han podido comprobar tus permisos.",
      500,
    );
  }

  if (!puedeCrear) {
    return responderError(
      "No tienes permiso para crear partidos.",
      403,
    );
  }

  // ----------------------------------------------------
  // 3. ORIGEN Y CONTENIDO
  // ----------------------------------------------------

  try {
    comprobarOrigen(request);

    const contenido =
      await leerJsonLimitado(
        request,
      );

    const datos =
      validarContenido(contenido);

    // --------------------------------------------------
    // 4. CREACIÓN DESDE EL SERVICIO BACKEND
    // --------------------------------------------------

    const resultado =
      await crearPartidoManualDesignaciones(
        datos,
      );

    // --------------------------------------------------
    // 5. RESPUESTA
    // --------------------------------------------------

    const urlPartido =
      "/panel/designaciones/partido?" +
      new URLSearchParams({
        idPartido: resultado.id,
      }).toString();

    return responder(
      {
        ok: true,

        data: {
          id: resultado.id,
          numeroPartido:
            resultado.numeroPartido,

          temporadaId:
            resultado.temporadaId,

          equipoId:
            resultado.equipoId,

          origen:
            resultado.origen,

          estado:
            resultado.estado,

          fecha:
            resultado.fecha,

          hora:
            resultado.hora,

          equipoLocal:
            resultado.equipoLocal,

          equipoVisitante:
            resultado.equipoVisitante,

          creado: true,

          url: urlPartido,
        },

        error: null,
      },
      201,
    );
  } catch (error) {
    // --------------------------------------------------
    // ERRORES CONTROLADOS DE NEGOCIO
    // --------------------------------------------------

    if (
      error instanceof
      ErrorCrearPartidoManualDesignaciones
    ) {
      if (error.status >= 500) {
        console.error(
          "[DESIGNACIONES CBA] Error creando partido:",
          error,
        );
      }

      return responderError(
        error.status >= 500
          ? "No se ha podido crear el partido."
          : error.message,
        error.status,
      );
    }

    // --------------------------------------------------
    // ERRORES DE PETICIÓN
    // --------------------------------------------------

    if (
      error instanceof
      ErrorPeticionCrearPartido
    ) {
      return responderError(
        error.message,
        error.status,
      );
    }

    // --------------------------------------------------
    // ERRORES INESPERADOS
    // --------------------------------------------------

    console.error(
      "[DESIGNACIONES CBA] Error inesperado:",
      error,
    );

    return responderError(
      "Ha ocurrido un error inesperado al crear el partido.",
      500,
    );
  }
};

// ======================================================
// OTROS MÉTODOS
// ======================================================

export const ALL: APIRoute = async () => {
  return responder(
    {
      ok: false,
      data: null,
      error: "Método no permitido.",
    },
    405,
    {
      Allow: "POST",
    },
  );
};
