
import type {
  APIRoute,
  APIContext,
} from "astro";

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
  validarOrigen,
} from "@servicios/seguridad/validarOrigen";

import {
  listarFamiliaresCarnetSocio,
  anadirFamiliarCarnetSocio,
  modificarFamiliarCarnetSocio,
  quitarFamiliarCarnetSocio,
  copiarFamiliaresCarnetSocio,
  ErrorFamiliaresCarnetSocioPanel,
} from "@servicios/backend/socios/familiaresCarnetSocioPanel";

import type {
  FamiliarCarnetSocio,
  RespuestaFamiliaresCarnetSocio,
} from "@tipos/FamiliaresCarnetSocio";

export const prerender = false;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_CUERPO = 4096;

type Metodo =
  | "GET"
  | "POST"
  | "PATCH"
  | "DELETE";

const cabeceras = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function responder(
  contenido: RespuestaFamiliaresCarnetSocio,
  estado = 200,
): Response {
  return Response.json(contenido, {
    status: estado,
    headers: cabeceras,
  });
}

function responderError(
  mensaje: string,
  estado: number,
): Response {
  return responder(
    {
      ok: false,
      data: null,
      error: mensaje,
    },
    estado,
  );
}

function responderFamiliares(
  familiares: FamiliarCarnetSocio[],
  copiados?: number,
): Response {
  return responder({
    ok: true,
    data: {
      familiares,
      ...(copiados === undefined
        ? {}
        : { copiados }),
    },
    error: null,
  });
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

async function comprobarAcceso(
  contexto: APIContext,
  metodo: Metodo,
): Promise<Response | null> {
  // El middleware general también valida el origen.
  if (
    metodo !== "GET" &&
    !validarOrigen(contexto.request).autorizado
  ) {
    return responderError(
      "Origen no autorizado.",
      403,
    );
  }

  const tokenSesion = contexto.cookies.get(
    NOMBRE_COOKIE_SESION,
  )?.value;

  if (!tokenSesion) {
    return responderError(
      "Debes iniciar sesión.",
      401,
    );
  }

  let sesion;

  try {
    sesion = await obtenerUsuarioSesion(tokenSesion);
  } catch (error) {
    console.error(
      "Error comprobando la sesión para familiares:",
      error,
    );

    return responderError(
      "No se ha podido comprobar la sesión.",
      500,
    );
  }

  if (!sesion) {
    contexto.cookies.delete(
      NOMBRE_COOKIE_SESION,
      { path: "/" },
    );

    return responderError(
      "La sesión ha caducado.",
      401,
    );
  }

  const permiso =
    metodo === "GET"
      ? "socios.ver"
      : "socios.editar";

  let autorizado = false;

  try {
    autorizado = await comprobarPermisoUsuario(
      sesion.acceso,
      permiso,
    );
  } catch (error) {
    console.error(
      "Error comprobando permisos de familiares:",
      error,
    );

    return responderError(
      "No se han podido comprobar los permisos.",
      500,
    );
  }

  if (!autorizado) {
    return responderError(
      "No tienes permiso para gestionar estos familiares.",
      403,
    );
  }

  return null;
}

async function leerDatos(
  request: Request,
): Promise<Record<string, unknown>> {
  const tipo = request.headers.get(
    "content-type",
  ) ?? "";

  if (
    !tipo.toLowerCase().includes(
      "application/json",
    )
  ) {
    throw new Error(
      "Debes enviar los datos en formato JSON.",
    );
  }

  const longitud = Number(
    request.headers.get("content-length") ?? 0,
  );

  if (
    Number.isFinite(longitud) &&
    longitud > MAX_CUERPO
  ) {
    throw new Error(
      "La petición es demasiado grande.",
    );
  }

  const texto = await request.text();

  if (
    !texto ||
    texto.length > MAX_CUERPO
  ) {
    throw new Error(
      "El contenido de la petición no es válido.",
    );
  }

  let datos: unknown;

  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error(
      "El JSON enviado no es válido.",
    );
  }

  if (!esObjeto(datos)) {
    throw new Error(
      "Los datos enviados no son válidos.",
    );
  }

  return datos;
}

async function ejecutar(
  contexto: APIContext,
  metodo: Metodo,
): Promise<Response> {
  const respuestaAcceso = await comprobarAcceso(
    contexto,
    metodo,
  );

  if (respuestaAcceso) {
    return respuestaAcceso;
  }

  const socioId =
    contexto.params.id?.trim() ?? "";

  const carnetId =
    contexto.params.carnetId?.trim() ?? "";

  if (
    !UUID.test(socioId) ||
    !UUID.test(carnetId)
  ) {
    return responderError(
      "El identificador del socio o del carnet no es válido.",
      400,
    );
  }

  try {
    if (metodo === "GET") {
      const familiares =
        await listarFamiliaresCarnetSocio(
          socioId,
          carnetId,
        );

      return responderFamiliares(familiares);
    }

    let datos: Record<string, unknown>;

    try {
      datos = await leerDatos(contexto.request);
    } catch (error) {
      return responderError(
        error instanceof Error
          ? error.message
          : "Petición no válida.",
        400,
      );
    }

    if (metodo === "POST") {
      if (datos.accion === "copiar") {
        if (
          typeof datos.origenCarnetId !== "string"
        ) {
          return responderError(
            "Debes seleccionar un carnet de origen.",
            400,
          );
        }

        const resultado =
          await copiarFamiliaresCarnetSocio(
            socioId,
            carnetId,
            datos.origenCarnetId,
          );

        return responderFamiliares(
          resultado.familiares,
          resultado.copiados,
        );
      }

      if (
        datos.accion !== undefined &&
        datos.accion !== "anadir"
      ) {
        return responderError(
          "La acción solicitada no existe.",
          400,
        );
      }

      const familiares =
        await anadirFamiliarCarnetSocio(
          socioId,
          carnetId,
          datos.nombreCompleto,
        );

      return responderFamiliares(familiares);
    }

    if (metodo === "PATCH") {
      if (
        typeof datos.familiarId !== "string"
      ) {
        return responderError(
          "Debes indicar el familiar que quieres modificar.",
          400,
        );
      }

      const familiares =
        await modificarFamiliarCarnetSocio(
          socioId,
          carnetId,
          datos.familiarId,
          datos.nombreCompleto,
        );

      return responderFamiliares(familiares);
    }

    if (metodo === "DELETE") {
      if (
        typeof datos.familiarId !== "string"
      ) {
        return responderError(
          "Debes indicar el familiar que quieres quitar.",
          400,
        );
      }

      const familiares =
        await quitarFamiliarCarnetSocio(
          socioId,
          carnetId,
          datos.familiarId,
        );

      return responderFamiliares(familiares);
    }

    return responderError(
      "Método no permitido.",
      405,
    );
  } catch (error) {
    if (
      error instanceof
      ErrorFamiliaresCarnetSocioPanel
    ) {
      return responderError(
        error.message,
        error.status,
      );
    }

    console.error(
      "Error en la API de familiares:",
      {
        socioId,
        carnetId,
        metodo,
        error,
      },
    );

    return responderError(
      "Error interno al gestionar familiares.",
      500,
    );
  }
}

export const GET: APIRoute = (contexto) =>
  ejecutar(contexto, "GET");

export const POST: APIRoute = (contexto) =>
  ejecutar(contexto, "POST");

export const PATCH: APIRoute = (contexto) =>
  ejecutar(contexto, "PATCH");

export const DELETE: APIRoute = (contexto) =>
  ejecutar(contexto, "DELETE");

export const ALL: APIRoute = async () =>
  Response.json(
    {
      ok: false,
      data: null,
      error: "Método no permitido.",
    } satisfies RespuestaFamiliaresCarnetSocio,
    {
      status: 405,
      headers: {
        ...cabeceras,
        Allow: "GET, POST, PATCH, DELETE",
      },
    },
  );
