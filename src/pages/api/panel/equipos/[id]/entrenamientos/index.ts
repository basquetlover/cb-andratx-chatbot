import type { APIRoute } from "astro";

import {
  ErrorCrearEntrenamientoEquipo,
  crearEntrenamientoEquipo,
} from "@servicios/backend/entrenamientos/crearEntrenamientoEquipo";

import {
  ErrorObtenerEntrenamientosEquipo,
  obtenerEntrenamientosEquipo,
} from "@servicios/backend/entrenamientos/obtenerEntrenamientosEquipo";

export const prerender = false;

function crearRespuesta(
  contenido: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(contenido), {
    status,
    headers: {
      "Content-Type":
        "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
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

export const GET: APIRoute = async ({
  params,
}) => {
  try {
    const equipoId = params.id?.trim();

    if (!equipoId) {
      return crearRespuesta(
        {
          ok: false,
          data: null,
          error:
            "No se ha indicado el equipo que se quiere consultar.",
        },
        400,
      );
    }

    const entrenamientos =
      await obtenerEntrenamientosEquipo(
        equipoId,
      );

    return crearRespuesta(
      {
        ok: true,
        data: {
          entrenamientos,
        },
        error: null,
      },
      200,
    );
  } catch (error) {
    if (
      error instanceof
      ErrorObtenerEntrenamientosEquipo
    ) {
      return crearRespuesta(
        {
          ok: false,
          data: null,
          error: error.message,
        },
        error.status,
      );
    }

    console.error(
      "Error obteniendo los entrenamientos del equipo:",
      error,
    );

    return crearRespuesta(
      {
        ok: false,
        data: null,
        error:
          "Se ha producido un error al obtener los entrenamientos.",
      },
      500,
    );
  }
};

export const POST: APIRoute = async ({
  request,
  params,
}) => {
  try {
    const equipoId = params.id?.trim();

    if (!equipoId) {
      return crearRespuesta(
        {
          ok: false,
          data: null,
          error:
            "No se ha indicado el equipo para el que se quiere crear el entrenamiento.",
          errores: [
            {
              campo: "equipoId",
              mensaje:
                "El identificador del equipo es obligatorio.",
            },
          ],
        },
        400,
      );
    }

    const tipoContenido =
      request.headers.get("content-type") ?? "";

    if (
      !tipoContenido
        .toLowerCase()
        .includes("application/json")
    ) {
      return crearRespuesta(
        {
          ok: false,
          data: null,
          error:
            "La solicitud debe enviarse en formato JSON.",
          errores: [],
        },
        415,
      );
    }

    let contenido: unknown;

    try {
      contenido = await request.json();
    } catch {
      return crearRespuesta(
        {
          ok: false,
          data: null,
          error:
            "No se ha podido leer la solicitud.",
          errores: [],
        },
        400,
      );
    }

    if (!esObjeto(contenido)) {
      return crearRespuesta(
        {
          ok: false,
          data: null,
          error:
            "El contenido de la solicitud no es válido.",
          errores: [],
        },
        400,
      );
    }

    const entrenamiento =
      await crearEntrenamientoEquipo(
        equipoId,
        contenido,
      );

    return crearRespuesta(
      {
        ok: true,
        data: {
          entrenamiento,
        },
        error: null,
        errores: [],
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof
      ErrorCrearEntrenamientoEquipo
    ) {
      return crearRespuesta(
        {
          ok: false,
          data: null,
          error: error.message,
          errores: error.errores,
        },
        error.status,
      );
    }

    console.error(
      "Error creando el entrenamiento del equipo:",
      error,
    );

    return crearRespuesta(
      {
        ok: false,
        data: null,
        error:
          "Se ha producido un error al crear el entrenamiento.",
        errores: [],
      },
      500,
    );
  }
};