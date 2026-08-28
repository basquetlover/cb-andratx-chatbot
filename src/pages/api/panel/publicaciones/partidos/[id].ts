import type {
  APIRoute,
} from "astro";

import {
  actualizarPublicacionPartidos,
  ErrorActualizarPublicacionPartidos,
} from "@servicios/backend/publicaciones/partidos/actualizarPublicacionPartidos";

import {
  archivarPublicacionPartidos,
  ErrorArchivarPublicacionPartidos,
} from "@servicios/backend/publicaciones/partidos/archivarPublicacionPartidos";

import {
  ErrorObtenerPublicacionPartidos,
  obtenerPublicacionPartidos,
} from "@servicios/backend/publicaciones/partidos/obtenerPublicacionPartidos";

import {
  obtenerUsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import {
  comprobarPermisoUsuario,
} from "@servicios/seguridad/comprobarPermisoUsuario";

import {
  NOMBRE_COOKIE_SESION,
} from "@servicios/seguridad/cookieSesion";

export const prerender = false;

const cabecerasRespuesta = {
  "Cache-Control":
    "no-store, max-age=0",
  "Content-Type":
    "application/json; charset=utf-8",
  "X-Content-Type-Options":
    "nosniff",
};

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

async function comprobarAcceso(
  sesion: NonNullable<
    Awaited<
      ReturnType<
        typeof obtenerUsuarioSesion
      >
    >
  >,
): Promise<Response | null> {
  try {
    const autorizado =
      await comprobarPermisoUsuario(
        sesion.acceso,
        "publicaciones.gestionar",
      );

    if (!autorizado) {
      return respuestaError(
        "No tienes permiso para gestionar las publicaciones.",
        403,
      );
    }

    return null;
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
}

export const GET: APIRoute =
  async ({
    cookies,
    params,
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

    const errorAcceso =
      await comprobarAcceso(
        resultadoSesion.sesion,
      );

    if (errorAcceso) {
      return errorAcceso;
    }

    const publicacionId =
      params.id?.trim() ?? "";

    try {
      const publicacion =
        await obtenerPublicacionPartidos(
          publicacionId,
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
        200,
      );
    } catch (error) {
      console.error(
        `Error en GET /api/panel/publicaciones/partidos/${publicacionId}:`,
        error,
      );

      if (
        error instanceof
        ErrorObtenerPublicacionPartidos
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se ha podido obtener la publicación.",
        500,
      );
    }
  };

export const PATCH: APIRoute =
  async ({
    cookies,
    params,
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

    const errorAcceso =
      await comprobarAcceso(sesion);

    if (errorAcceso) {
      return errorAcceso;
    }

    const publicacionId =
      params.id?.trim() ?? "";

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
        await actualizarPublicacionPartidos(
          publicacionId,
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
        200,
      );
    } catch (error) {
      console.error(
        `Error en PATCH /api/panel/publicaciones/partidos/${publicacionId}:`,
        error,
      );

      if (
        error instanceof
        ErrorActualizarPublicacionPartidos
      ) {
        return respuestaError(
          error.message,
          error.status,
          error.errores,
        );
      }

      return respuestaError(
        "No se ha podido actualizar la publicación.",
        500,
      );
    }
  };

export const DELETE: APIRoute =
  async ({
    cookies,
    params,
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

    const errorAcceso =
      await comprobarAcceso(sesion);

    if (errorAcceso) {
      return errorAcceso;
    }

    const publicacionId =
      params.id?.trim() ?? "";

    try {
      const publicacion =
        await archivarPublicacionPartidos(
          publicacionId,
          sesion.usuario.id,
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
        200,
      );
    } catch (error) {
      console.error(
        `Error en DELETE /api/panel/publicaciones/partidos/${publicacionId}:`,
        error,
      );

      if (
        error instanceof
        ErrorArchivarPublicacionPartidos
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se ha podido archivar la publicación.",
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
          Allow:
            "GET, PATCH, DELETE",
        },
      },
    );
  };