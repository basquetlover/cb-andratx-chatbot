import type { APIRoute } from "astro";

import {
  ErrorActualizarEquipo,
  actualizarDatosEquipo,
} from "@servicios/backend/equipos/actualizarDatosEquipo";

import {
  ErrorActualizarIntegracionesEquipo,
  actualizarIntegracionesEquipo,
} from "@servicios/backend/equipos/actualizarIntegracionesEquipo";

import {
  ErrorActualizarPatrocinadoresEquipo,
  actualizarPatrocinadoresEquipo,
  obtenerPatrocinadoresDisponiblesEquipo,
} from "@servicios/backend/equipos/actualizarPatrocinadoresEquipo";

import {
  ErrorObtenerEquipoDetalle,
  obtenerEquipoDetallePanel,
} from "@servicios/backend/equipos/obtenerEquipoDetallePanel";

export const prerender = false;

interface SolicitudActualizacion {
  seccion?: unknown;
  datos?: unknown;
}

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

export const PATCH: APIRoute = async ({
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
            "No se ha indicado el equipo que se quiere actualizar.",
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

    const solicitud =
      contenido as SolicitudActualizacion;

    if (
      solicitud.seccion === "datos-generales"
    ) {
      const datosGenerales =
        await actualizarDatosEquipo(
          equipoId,
          solicitud.datos,
        );

      return crearRespuesta(
        {
          ok: true,
          data: {
            datosGenerales,
          },
          error: null,
          errores: [],
        },
        200,
      );
    }

    if (solicitud.seccion === "integraciones") {
      const integraciones =
        await actualizarIntegracionesEquipo(
          equipoId,
          solicitud.datos,
        );

      return crearRespuesta(
        {
          ok: true,
          data: {
            integraciones,
          },
          error: null,
          errores: [],
        },
        200,
      );
    }

    if (
      solicitud.seccion === "patrocinadores"
    ) {
      const patrocinadores =
        await actualizarPatrocinadoresEquipo(
          equipoId,
          solicitud.datos,
        );

      return crearRespuesta(
        {
          ok: true,
          data: {
            patrocinadores,
          },
          error: null,
          errores: [],
        },
        200,
      );
    }

    return crearRespuesta(
      {
        ok: false,
        data: null,
        error:
          "La sección indicada no es válida.",
        errores: [
          {
            campo: "seccion",
            mensaje:
              "La sección indicada no es válida.",
          },
        ],
      },
      400,
    );
  } catch (error) {
    if (error instanceof ErrorActualizarEquipo) {
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

    if (
      error instanceof
      ErrorActualizarIntegracionesEquipo
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

    if (
      error instanceof
      ErrorActualizarPatrocinadoresEquipo
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
      "Error actualizando el equipo:",
      error,
    );

    return crearRespuesta(
      {
        ok: false,
        data: null,
        error:
          "Se ha producido un error al actualizar el equipo.",
        errores: [],
      },
      500,
    );
  }
};

export const GET: APIRoute = async ({
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
            "No se ha indicado el equipo que se quiere consultar.",
        },
        400,
      );
    }

    const seccion = new URL(
      request.url,
    ).searchParams.get("seccion");

    if (seccion === "patrocinadores") {
      const patrocinadores =
        await obtenerPatrocinadoresDisponiblesEquipo();

      return crearRespuesta(
        {
          ok: true,
          data: {
            patrocinadores,
          },
          error: null,
        },
        200,
      );
    }

    if (seccion) {
      return crearRespuesta(
        {
          ok: false,
          data: null,
          error:
            "La sección indicada no es válida.",
        },
        400,
      );
    }

    const equipo =
      await obtenerEquipoDetallePanel(
        equipoId,
      );

    return crearRespuesta(
      {
        ok: true,
        data: {
          equipo,
        },
        error: null,
      },
      200,
    );
  } catch (error) {
    if (
      error instanceof ErrorObtenerEquipoDetalle
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

    if (
      error instanceof
      ErrorActualizarPatrocinadoresEquipo
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
      "Error obteniendo el equipo:",
      error,
    );

    return crearRespuesta(
      {
        ok: false,
        data: null,
        error:
          "Se ha producido un error al obtener el equipo.",
      },
      500,
    );
  }
};