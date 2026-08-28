import type {
  APIRoute,
} from "astro";

import {
  ErrorObtenerPartidosPeriodoPublicacion,
  obtenerPartidosPeriodoPublicacion,
} from "@servicios/backend/publicaciones/partidos/fbib/obtenerPartidosPeriodoPublicacion";

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

function esFechaIsoValida(
  valor: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const [
    anioTexto,
    mesTexto,
    diaTexto,
  ] = valor.split("-");

  const anio = Number(anioTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  const fecha = new Date(
    Date.UTC(anio, mes - 1, dia),
  );

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
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
        "Debes iniciar sesión para cargar los partidos.",
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
        "Error comprobando la sesión para cargar partidos FBIB:",
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
        "No tienes permiso para cargar partidos en una publicación.",
        403,
      );
    }

    const fechaInicio =
      url.searchParams
        .get("fechaInicio")
        ?.trim() ?? "";

    const fechaFin =
      url.searchParams
        .get("fechaFin")
        ?.trim() ?? "";

    if (
      !esFechaIsoValida(fechaInicio) ||
      !esFechaIsoValida(fechaFin)
    ) {
      return respuestaError(
        "Debes indicar un periodo válido.",
        400,
      );
    }

    if (fechaFin < fechaInicio) {
      return respuestaError(
        "La fecha final no puede ser anterior a la fecha inicial.",
        400,
      );
    }

    try {
      const partidos =
        await obtenerPartidosPeriodoPublicacion(
          fechaInicio,
          fechaFin,
        );

      return crearRespuesta(
        {
          ok: true,
          data: {
            partidos,
            total:
              partidos.length,
            fechaInicio,
            fechaFin,
          },
          error: null,
        },
        200,
      );
    } catch (error) {
      console.error(
        "Error en GET /api/panel/publicaciones/partidos/cargar-fbib:",
        error,
      );

      if (
        error instanceof
        ErrorObtenerPartidosPeriodoPublicacion
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se han podido cargar los partidos de la FBIB.",
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