
import type { APIRoute } from "astro";

import {
  obtenerEntrenamientosSemana,
} from "../../../servicios/backend/entrenamientos/obtenerEntrenamientosSemana";

import {
  comprobarAccesoSocio,
} from "../../../servicios/backend/socios/comprobarAccesoSocio";

export const prerender = false;

const cabecerasRespuesta = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",

  "Pragma": "no-cache",

  "Expires": "0",

  "Vary": "Cookie",

  "Content-Type":
    "application/json; charset=utf-8",

  "X-Content-Type-Options":
    "nosniff",
};

function crearRespuesta(
  contenido: {
    ok: boolean;
    data: unknown;
    error?: string | null;
  },
  estado: number,
): Response {
  return Response.json(
    contenido,
    {
      status: estado,
      headers: cabecerasRespuesta,
    },
  );
}

function respuestaError(
  mensaje: string,
  estado: number,
): Response {
  return crearRespuesta(
    {
      ok: false,
      data: null,
      error: mensaje,
    },
    estado,
  );
}

function esUuidValido(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

export const GET: APIRoute = async (
  contexto,
) => {
  try {
    // Comprobar acceso del socio

    const acceso =
      await comprobarAccesoSocio(
        contexto.cookies,
      );

    if (!acceso.autorizado) {
      if (
        acceso.estadoHttp === 401
      ) {
        return respuestaError(
          "Debes iniciar sesión como socio para consultar los entrenamientos.",
          401,
        );
      }

      if (
        acceso.estadoHttp === 403
      ) {
        return respuestaError(
          "Tu carnet de socio no está activo o no permite consultar los entrenamientos.",
          403,
        );
      }

      return respuestaError(
        "No se ha podido comprobar tu acceso como socio. Inténtalo de nuevo.",
        503,
      );
    }

    // Obtener y validar el equipo

    const url = new URL(
      contexto.request.url,
    );

    const equipoId =
      url.searchParams
        .get("equipoId")
        ?.trim();

    if (!equipoId) {
      return respuestaError(
        "Falta el identificador del equipo.",
        400,
      );
    }

    if (
      !esUuidValido(equipoId)
    ) {
      return respuestaError(
        "El identificador del equipo no es válido.",
        400,
      );
    }

    // Consultar entrenamientos

    const resultado =
      await obtenerEntrenamientosSemana(
        equipoId,
      );

    return crearRespuesta(
      {
        ok: true,
        data: resultado,
        error: null,
      },
      200,
    );
  } catch (error) {
    console.error(
      "Error en GET /api/entrenamientos/semana:",
      error,
    );

    return respuestaError(
      "No se han podido obtener los entrenamientos.",
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
