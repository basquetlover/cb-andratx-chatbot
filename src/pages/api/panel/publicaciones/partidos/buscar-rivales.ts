import type {
  APIRoute,
} from "astro";

import {
  buscarRivalesPublicacion,
  ErrorBuscarRivalesPublicacion,
} from "@servicios/backend/publicaciones/partidos/fbib/buscarRivalesPublicacion";

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
): Response {
  return crearRespuesta(
    {
      ok: false,
      data: null,
      error,
    },
    estado,
  );
}

export const GET: APIRoute =
  async ({
    cookies,
    url,
  }) => {
    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return respuestaError(
        "Debes iniciar sesión para buscar rivales.",
        401,
      );
    }

    let sesion;

    try {
      sesion =
        await obtenerUsuarioSesion(
          tokenSesion,
        );
    } catch (error) {
      console.error(
        "Error comprobando la sesión para buscar rivales:",
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
        "La sesión no es válida o ha caducado.",
        401,
      );
    }

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
        "No tienes permiso para buscar rivales.",
        403,
      );
    }

    const consulta =
      url.searchParams
        .get("consulta")
        ?.trim() ?? "";

    if (consulta.length < 2) {
      return respuestaError(
        "Debes escribir al menos dos caracteres.",
        400,
      );
    }

    if (consulta.length > 100) {
      return respuestaError(
        "La búsqueda no puede superar los 100 caracteres.",
        400,
      );
    }

    try {
      const resultados =
        await buscarRivalesPublicacion(
          consulta,
        );

      return crearRespuesta(
        {
          ok: true,
          data: {
            resultados,
            total:
              resultados.length,
          },
          error: null,
        },
        200,
      );
    } catch (error) {
      console.error(
        "Error en GET /api/panel/publicaciones/partidos/buscar-rivales:",
        error,
      );

      if (
        error instanceof
        ErrorBuscarRivalesPublicacion
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se han podido buscar los rivales.",
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
      },
      {
        status: 405,
        headers: {
          ...cabecerasRespuesta,
          Allow: "GET",
        },
      },
    );
  };