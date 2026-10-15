
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
  ErrorGuardarPersonalDesignaciones,
  guardarPersonalDesignaciones,
} from "@servicios/backend/designaciones/guardarPersonalDesignaciones";

// ======================================================
// C.B. ANDRATX
// API PRIVADA - PERSONAL DE DESIGNACIONES
//
// POST /api/panel/designaciones/personal
//
// Crear: designaciones.crear
// Editar: designaciones.editar
//
// La lógica de negocio y las escrituras
// pertenecen al servicio backend.
// ======================================================

export const prerender = false;

// ======================================================
// CONFIGURACIÓN
// ======================================================

const MAXIMO_BYTES_JSON = 32 * 1024;

const CABECERAS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Registro = Record<string, unknown>;

// ======================================================
// ERRORES DE PETICIÓN
// ======================================================

class ErrorPeticionPersonal extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name = "ErrorPeticionPersonal";
    this.status = status;
  }
}

// ======================================================
// RESPUESTAS JSON
// ======================================================

function respuestaJson(
  contenido: unknown,
  status = 200,
  cabecerasAdicionales: Record<string, string> = {},
): Response {
  return Response.json(contenido, {
    status,
    headers: {
      ...CABECERAS,
      ...cabecerasAdicionales,
    },
  });
}

function respuestaError(
  mensaje: string,
  status = 400,
): Response {
  return respuestaJson(
    {
      ok: false,
      data: null,
      error: mensaje,
    },
    status,
  );
}

// ======================================================
// VALIDACIONES AUXILIARES
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

function obtenerId(
  datos: Registro,
): string | null {
  const valor = datos.id;

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  if (
    typeof valor !== "string" ||
    !REGEX_UUID.test(valor.trim())
  ) {
    throw new ErrorPeticionPersonal(
      "El identificador de la persona no es válido.",
      400,
    );
  }

  return valor.trim();
}

// ======================================================
// COMPROBACIÓN DE ORIGEN
// ======================================================

function comprobarOrigen(
  request: Request,
): void {
  const origen = request.headers.get("origin");

  const origenEsperado =
    new URL(request.url).origin;

  // Se exige Origin para todas las escrituras.
  // El formulario React utilizará fetch desde
  // el mismo dominio de la aplicación.

  if (
    !origen ||
    origen !== origenEsperado
  ) {
    throw new ErrorPeticionPersonal(
      "El origen de la solicitud no es válido.",
      403,
    );
  }

  // Rechazar expresamente solicitudes
  // marcadas por el navegador como cross-site.

  const sitioFetch = request.headers.get(
    "sec-fetch-site",
  );

  if (
    sitioFetch &&
    sitioFetch !== "same-origin" &&
    sitioFetch !== "none"
  ) {
    throw new ErrorPeticionPersonal(
      "No se permiten solicitudes desde otros sitios.",
      403,
    );
  }
}

// ======================================================
// LECTURA DE JSON CON LÍMITE REAL
// ======================================================

async function leerJsonLimitado(
  request: Request,
): Promise<unknown> {
  const tipoContenido = request.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();

  if (tipoContenido !== "application/json") {
    throw new ErrorPeticionPersonal(
      "La solicitud debe utilizar application/json.",
      415,
    );
  }

  const longitudCabecera =
    request.headers.get("content-length");

  if (longitudCabecera !== null) {
    const longitud = Number(
      longitudCabecera,
    );

    if (
      !Number.isSafeInteger(longitud) ||
      longitud < 0 ||
      longitud > MAXIMO_BYTES_JSON
    ) {
      throw new ErrorPeticionPersonal(
        "El contenido supera el tamaño permitido.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ErrorPeticionPersonal(
      "No se han recibido datos.",
      400,
    );
  }

  const lector = request.body.getReader();

  const partes: Uint8Array[] = [];

  let totalBytes = 0;

  try {
    while (true) {
      const {
        done,
        value,
      } = await lector.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (
        totalBytes > MAXIMO_BYTES_JSON
      ) {
        await lector.cancel();

        throw new ErrorPeticionPersonal(
          "El contenido supera el tamaño permitido.",
          413,
        );
      }

      partes.push(value);
    }
  } finally {
    lector.releaseLock();
  }

  if (totalBytes === 0) {
    throw new ErrorPeticionPersonal(
      "El contenido JSON está vacío.",
      400,
    );
  }

  const bytes = new Uint8Array(
    totalBytes,
  );

  let posicion = 0;

  for (const parte of partes) {
    bytes.set(
      parte,
      posicion,
    );

    posicion += parte.byteLength;
  }

  let contenido: string;

  try {
    contenido = new TextDecoder(
      "utf-8",
      {
        fatal: true,
      },
    ).decode(bytes);
  } catch {
    throw new ErrorPeticionPersonal(
      "El contenido no utiliza una codificación UTF-8 válida.",
      400,
    );
  }

  try {
    return JSON.parse(
      contenido,
    ) as unknown;
  } catch {
    throw new ErrorPeticionPersonal(
      "El JSON enviado no es válido.",
      400,
    );
  }
}

// ======================================================
// MÉTODO POST
// ======================================================

export const POST: APIRoute = async ({
  cookies,
  request,
}) => {
  // ----------------------------------------------------
  // 1. SESIÓN
  // ----------------------------------------------------

  const tokenSesion = cookies.get(
    NOMBRE_COOKIE_SESION,
  )?.value;

  if (!tokenSesion) {
    return respuestaError(
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
      "[DESIGNACIONES PERSONAL] Error verificando sesión:",
      error,
    );

    return respuestaError(
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

    return respuestaError(
      "La sesión ha caducado.",
      401,
    );
  }

  // ----------------------------------------------------
  // 2. ORIGEN Y DATOS
  // ----------------------------------------------------

  try {
    comprobarOrigen(request);

    const contenido =
      await leerJsonLimitado(
        request,
      );

    if (!esRegistro(contenido)) {
      throw new ErrorPeticionPersonal(
        "Debes enviar un objeto con los datos de la persona.",
        400,
      );
    }

    const id = obtenerId(
      contenido,
    );

    // --------------------------------------------------
    // 3. PERMISOS
    // --------------------------------------------------

    const permisoRequerido = id
      ? "designaciones.editar"
      : "designaciones.crear";

    let autorizado = false;

    try {
      autorizado =
        await comprobarPermisoUsuario(
          sesion.acceso,
          permisoRequerido,
        );
    } catch (error) {
      console.error(
        "[DESIGNACIONES PERSONAL] Error comprobando permisos:",
        error,
      );

      return respuestaError(
        "No se han podido comprobar tus permisos.",
        500,
      );
    }

    if (!autorizado) {
      return respuestaError(
        id
          ? "No tienes permiso para editar árbitros y oficiales de mesa."
          : "No tienes permiso para registrar árbitros y oficiales de mesa.",
        403,
      );
    }

    // --------------------------------------------------
    // 4. GUARDAR DESDE EL SERVICIO BACKEND
    // --------------------------------------------------

    const resultado =
      await guardarPersonalDesignaciones(
        contenido,
      );

    // --------------------------------------------------
    // 5. RESPONDER
    // --------------------------------------------------

    return respuestaJson(
      {
        ok: true,

        data: {
          personal:
            resultado.personal,

          creado:
            resultado.creado,

          mensaje:
            resultado.creado
              ? "La persona se ha registrado correctamente."
              : "Los datos de la persona se han actualizado correctamente.",
        },

        error: null,
      },
      resultado.creado ? 201 : 200,
    );
  } catch (error) {
    // --------------------------------------------------
    // ERRORES CONTROLADOS DEL SERVICIO
    // --------------------------------------------------

    if (
      error instanceof
      ErrorGuardarPersonalDesignaciones
    ) {
      if (error.status >= 500) {
        console.error(
          "[DESIGNACIONES PERSONAL] Error guardando:",
          error,
        );
      }

      return respuestaError(
        error.status >= 500
          ? "No se han podido guardar los datos del personal."
          : error.message,
        error.status,
      );
    }

    // --------------------------------------------------
    // ERRORES DE VALIDACIÓN DE PETICIÓN
    // --------------------------------------------------

    if (
      error instanceof
      ErrorPeticionPersonal
    ) {
      return respuestaError(
        error.message,
        error.status,
      );
    }

    // --------------------------------------------------
    // ERRORES INESPERADOS
    // --------------------------------------------------

    console.error(
      "[DESIGNACIONES PERSONAL] Error inesperado:",
      error,
    );

    return respuestaError(
      "Ha ocurrido un error inesperado al guardar el personal.",
      500,
    );
  }
};

// ======================================================
// MÉTODO GET
// ======================================================

// La consulta del listado se realiza mediante SSR
// desde /panel/designaciones/personal.
//
// No se habilita un endpoint público GET para
// exponer la información del personal.

// ======================================================
// MÉTODOS NO PERMITIDOS
// ======================================================

export const ALL: APIRoute = async () => {
  return respuestaJson(
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
