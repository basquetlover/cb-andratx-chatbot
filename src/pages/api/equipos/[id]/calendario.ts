import type {
  APIRoute,
} from "astro";

import { obtenerCalendarioEquipoPublico } from "@servicios/backend/equipos/obtenerCalendarioEquipoPublico";

export const prerender = false;

const cabeceras = {
  "Cache-Control":
    "no-store, max-age=0",

  "Content-Type":
    "application/json; charset=utf-8",

  "X-Content-Type-Options":
    "nosniff",
};

function crearError(
  mensaje: string,
  estado: number,
): Response {
  return Response.json(
    {
      ok: false,
      data: null,
      error: mensaje,
    },
    {
      status: estado,
      headers: cabeceras,
    },
  );
}

export const GET: APIRoute =
  async ({
    params,
    url,
  }) => {
    const equipoId =
      params.id?.trim() ?? "";

    const anio = Number(
      url.searchParams.get("anio"),
    );

    const mes = Number(
      url.searchParams.get("mes"),
    );

    if (
      !Number.isInteger(anio) ||
      !Number.isInteger(mes)
    ) {
      return crearError(
        "Debes indicar un año y un mes válidos.",
        400,
      );
    }

    try {
      const resultado =
        await obtenerCalendarioEquipoPublico(
          equipoId,
          anio,
          mes,
        );

      return Response.json(
        {
          ok: true,
          data: resultado,
          error: null,
        },
        {
          status: 200,
          headers: cabeceras,
        },
      );
    } catch (error) {
      console.error(
        `Error en GET /api/equipos/${equipoId}/calendario:`,
        error,
      );

      const mensaje =
        error instanceof Error
          ? error.message
          : "No se ha podido obtener el calendario.";

      const noEncontrado =
        mensaje.includes(
          "no existe",
        );

      return crearError(
        mensaje,
        noEncontrado ? 404 : 500,
      );
    }
  };

export const ALL: APIRoute =
  async () =>
    Response.json(
      {
        ok: false,
        data: null,
        error:
          "Método no permitido.",
      },
      {
        status: 405,
        headers: {
          ...cabeceras,
          Allow: "GET",
        },
      },
    );