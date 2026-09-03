import type {
  APIRoute,
} from "astro";

import {
  obtenerOpcionesSociosPanel,
  ErrorObtenerOpcionesSociosPanel,
} from "@servicios/backend/socios/obtenerOpcionesSociosPanel";

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

function crearRespuestaError(
  error: string,
  estado: number,
): Response {
  return crearRespuesta(
    {
      ok: false,
      data: null,
      error,
      errores: [],
    },
    estado,
  );
}

export const GET: APIRoute =
  async ({
    cookies,
  }) => {
    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return crearRespuestaError(
        "Debes iniciar sesión para consultar las opciones de socios.",
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
        "Error comprobando la sesión para consultar las opciones de socios:",
        error,
      );

      return crearRespuestaError(
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

      return crearRespuestaError(
        "La sesión no es válida o ha caducado.",
        401,
      );
    }

    let autorizado = false;

    try {
      autorizado =
        await comprobarPermisoUsuario(
          sesion.acceso,
          "socios.ver",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso socios.ver para consultar las opciones:",
        error,
      );

      return crearRespuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return crearRespuestaError(
        "No tienes permiso para consultar las opciones de socios.",
        403,
      );
    }

    try {
      const opciones =
        await obtenerOpcionesSociosPanel();

      return crearRespuesta(
        {
          ok: true,
          data: {
            opciones,
          },
          error: null,
          errores: [],
        },
        200,
      );
    } catch (error) {
      console.error(
        "Error en GET /api/panel/socios/opciones:",
        error,
      );

      if (
        error instanceof
        ErrorObtenerOpcionesSociosPanel
      ) {
        return crearRespuestaError(
          error.message,
          error.status,
        );
      }

      return crearRespuestaError(
        "No se han podido obtener las opciones de socios.",
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
          Allow: "GET",
        },
      },
    );
  };