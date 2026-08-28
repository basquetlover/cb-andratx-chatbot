import type {
  APIRoute,
} from "astro";

import {
  crearPublicacionPartidos,
  ErrorCrearPublicacionPartidos,
} from "@servicios/backend/publicaciones/partidos/crearPublicacionPartidos";

import {
  ErrorObtenerHistorialPublicaciones,
  obtenerHistorialPublicacionesPartidos,
} from "@servicios/backend/publicaciones/partidos/obtenerHistorialPublicacionesPartidos";

import {
  obtenerUsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import {
  comprobarPermisoUsuario,
} from "@servicios/seguridad/comprobarPermisoUsuario";

import {
  NOMBRE_COOKIE_SESION,
} from "@servicios/seguridad/cookieSesion";

import type {
  EstadoPublicacionPartidos,
} from "@tipos/PublicacionPartidosPanel";

export const prerender = false;

const cabecerasRespuesta = {
  "Cache-Control":
    "no-store, max-age=0",
  "Content-Type":
    "application/json; charset=utf-8",
  "X-Content-Type-Options":
    "nosniff",
};

const ESTADOS_PERMITIDOS =
  new Set<EstadoPublicacionPartidos>([
    "borrador",
    "finalizada",
    "archivada",
  ]);

function crearRespuesta(
  contenido: unknown,
  estado: number,
): Response {
  return Response.json(
    contenido,
    {
      status: estado,
      headers:
        cabecerasRespuesta,
    },
  );
}

function respuestaError(
  error: string,
  estado: number,
  errores: unknown[] = [],
): Response {
  return crearRespuesta(
    {
      ok: false,
      data: null,
      error,
      errores,
    },
    estado,
  );
}

async function obtenerSesionApi(
  cookies: Parameters<
    APIRoute
  >[0]["cookies"],
) {
  const tokenSesion =
    cookies.get(
      NOMBRE_COOKIE_SESION,
    )?.value;

  if (!tokenSesion) {
    return {
      sesion: null,
      respuesta: respuestaError(
        "Debes iniciar sesión para gestionar las publicaciones.",
        401,
      ),
    };
  }

  try {
    const sesion =
      await obtenerUsuarioSesion(
        tokenSesion,
      );

    if (!sesion) {
      cookies.delete(
        NOMBRE_COOKIE_SESION,
        {
          path: "/",
        },
      );

      return {
        sesion: null,
        respuesta: respuestaError(
          "La sesión no es válida o ha caducado.",
          401,
        ),
      };
    }

    return {
      sesion,
      respuesta: null,
    };
  } catch (error) {
    console.error(
      "Error comprobando la sesión de publicaciones:",
      error,
    );

    return {
      sesion: null,
      respuesta: respuestaError(
        "No se ha podido comprobar la sesión.",
        500,
      ),
    };
  }
}

export const GET: APIRoute =
  async ({
    cookies,
    url,
  }) => {
    const resultadoSesion =
      await obtenerSesionApi(
        cookies,
      );

    if (
      !resultadoSesion.sesion
    ) {
      return (
        resultadoSesion.respuesta ??
        respuestaError(
          "No se ha podido comprobar la sesión.",
          500,
        )
      );
    }

    const sesion =
      resultadoSesion.sesion;

    let autorizado = false;

    try {
      autorizado =
        await comprobarPermisoUsuario(
          sesion.acceso,
          "publicaciones.gestionar",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso publicaciones.gestionar:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return respuestaError(
        "No tienes permiso para consultar las publicaciones.",
        403,
      );
    }

    const estadoParametro =
      url.searchParams
        .get("estado")
        ?.trim() ?? "";

    const incluirArchivadas =
      url.searchParams.get(
        "incluirArchivadas",
      ) === "true";

    const limiteParametro =
      Number(
        url.searchParams.get(
          "limite",
        ),
      );

    let estado:
      | EstadoPublicacionPartidos
      | null = null;

    if (estadoParametro) {
      if (
        !ESTADOS_PERMITIDOS.has(
          estadoParametro as EstadoPublicacionPartidos,
        )
      ) {
        return respuestaError(
          "El estado utilizado para filtrar no es válido.",
          400,
        );
      }

      estado =
        estadoParametro as EstadoPublicacionPartidos;
    }

    try {
      const publicaciones =
        await obtenerHistorialPublicacionesPartidos(
          {
            estado,
            incluirArchivadas,
            limite:
              Number.isInteger(
                limiteParametro,
              )
                ? limiteParametro
                : undefined,
          },
        );

      return crearRespuesta(
        {
          ok: true,
          data: {
            publicaciones,
            total:
              publicaciones.length,
          },
          error: null,
        },
        200,
      );
    } catch (error) {
      console.error(
        "Error en GET /api/panel/publicaciones/partidos:",
        error,
      );

      if (
        error instanceof
        ErrorObtenerHistorialPublicaciones
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se ha podido obtener el historial de publicaciones.",
        500,
      );
    }
  };

export const POST: APIRoute =
  async ({
    cookies,
    request,
  }) => {
    const resultadoSesion =
      await obtenerSesionApi(
        cookies,
      );

    if (
      !resultadoSesion.sesion
    ) {
      return (
        resultadoSesion.respuesta ??
        respuestaError(
          "No se ha podido comprobar la sesión.",
          500,
        )
      );
    }

    const sesion =
      resultadoSesion.sesion;

    let autorizado = false;

    try {
      autorizado =
        await comprobarPermisoUsuario(
          sesion.acceso,
          "publicaciones.gestionar",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso publicaciones.gestionar:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return respuestaError(
        "No tienes permiso para crear publicaciones.",
        403,
      );
    }

    let contenido: unknown;

    try {
      contenido =
        await request.json();
    } catch {
      return respuestaError(
        "El cuerpo de la petición no contiene un JSON válido.",
        400,
      );
    }

    try {
      const publicacion =
        await crearPublicacionPartidos(
          sesion.usuario.id,
          contenido,
        );

      return crearRespuesta(
        {
          ok: true,
          data: {
            publicacion,
          },
          error: null,
          errores: [],
        },
        201,
      );
    } catch (error) {
      console.error(
        "Error en POST /api/panel/publicaciones/partidos:",
        error,
      );

      if (
        error instanceof
        ErrorCrearPublicacionPartidos
      ) {
        return respuestaError(
          error.message,
          error.status,
          error.errores,
        );
      }

      return respuestaError(
        "No se ha podido crear la publicación.",
        500,
      );
    }
  };

export const ALL: APIRoute =
  async () => {
    return Response.json(
      {
        ok: false,
        data: null,
        error:
          "Método no permitido.",
        errores: [],
      },
      {
        status: 405,
        headers: {
          ...cabecerasRespuesta,
          Allow: "GET, POST",
        },
      },
    );
  };