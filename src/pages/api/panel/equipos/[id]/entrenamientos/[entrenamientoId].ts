import type { APIRoute } from "astro";

import {
  ErrorActualizarEntrenamientoEquipo,
  actualizarEntrenamientoEquipo,
} from "@servicios/backend/entrenamientos/actualizarEntrenamientoEquipo";

import {
  ErrorEliminarEntrenamientoEquipo,
  eliminarEntrenamientoEquipo,
} from "@servicios/backend/entrenamientos/eliminarEntrenamientoEquipo";

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

function obtenerIdentificadores(
  params: Record<string, string | undefined>,
): {
  equipoId: string;
  entrenamientoId: string;
} | null {
  const equipoId = params.id?.trim();

  const entrenamientoId =
    params.entrenamientoId?.trim();

  if (!equipoId || !entrenamientoId) {
    return null;
  }

  return {
    equipoId,
    entrenamientoId,
  };
}

export const PATCH: APIRoute = async ({
  request,
  params,
}) => {
  try {
    const identificadores =
      obtenerIdentificadores(params);

    if (!identificadores) {
      return crearRespuesta(
        {
          ok: false,
          data: null,
          error:
            "No se ha indicado el entrenamiento que se quiere actualizar.",
          errores: [],
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
      await actualizarEntrenamientoEquipo(
        identificadores.equipoId,
        identificadores.entrenamientoId,
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
      200,
    );
  } catch (error) {
    if (
      error instanceof
      ErrorActualizarEntrenamientoEquipo
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
      "Error actualizando el entrenamiento:",
      error,
    );

    return crearRespuesta(
      {
        ok: false,
        data: null,
        error:
          "Se ha producido un error al actualizar el entrenamiento.",
        errores: [],
      },
      500,
    );
  }
};

export const DELETE: APIRoute = async ({
  params,
}) => {
  try {
    const identificadores =
      obtenerIdentificadores(params);

    if (!identificadores) {
      return crearRespuesta(
        {
          ok: false,
          data: null,
          error:
            "No se ha indicado el entrenamiento que se quiere eliminar.",
        },
        400,
      );
    }

    const entrenamientoId =
      await eliminarEntrenamientoEquipo(
        identificadores.equipoId,
        identificadores.entrenamientoId,
      );

    return crearRespuesta(
      {
        ok: true,
        data: {
          entrenamientoId,
        },
        error: null,
      },
      200,
    );
  } catch (error) {
    if (
      error instanceof
      ErrorEliminarEntrenamientoEquipo
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
      "Error eliminando el entrenamiento:",
      error,
    );

    return crearRespuesta(
      {
        ok: false,
        data: null,
        error:
          "Se ha producido un error al eliminar el entrenamiento.",
      },
      500,
    );
  }
};