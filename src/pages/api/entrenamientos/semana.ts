import type { APIRoute } from "astro";

import { obtenerEntrenamientosSemana } from "../../../servicios/backend/entrenamientos/obtenerEntrenamientosSemana";

export const prerender = false;

function esUuidValido(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const equipoId = url.searchParams.get("equipoId")?.trim();

    if (!equipoId) {
      return Response.json(
        {
          ok: false,
          data: null,
          error: "Falta el identificador del equipo",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }

    if (!esUuidValido(equipoId)) {
      return Response.json(
        {
          ok: false,
          data: null,
          error: "El identificador del equipo no es válido",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }

    const resultado = await obtenerEntrenamientosSemana(equipoId);

    return Response.json(
      {
        ok: true,
        data: resultado,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    console.error("Error en GET /api/entrenamientos/semana:", error);

    return Response.json(
      {
        ok: false,
        data: null,
        error: "No se han podido obtener los entrenamientos",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }
};

export const ALL: APIRoute = async () => {
  return Response.json(
    {
      ok: false,
      data: null,
      error: "Método no permitido",
    },
    {
      status: 405,
      headers: {
        Allow: "GET",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
};