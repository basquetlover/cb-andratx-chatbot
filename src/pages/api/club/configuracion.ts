import type { APIRoute } from "astro";

import { obtenerConfiguracionClub } from "../../../servicios/backend/club/obtenerConfiguracionClub";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const configuracion = await obtenerConfiguracionClub();

    if (!configuracion) {
      return Response.json(
        {
          ok: false,
          data: null,
          error: "No se ha encontrado la configuración del club",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }

    return Response.json(
      {
        ok: true,
        data: configuracion,
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
    console.error("Error en GET /api/club/configuracion:", error);

    return Response.json(
      {
        ok: false,
        data: null,
        error: "No se ha podido obtener la configuración del club",
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