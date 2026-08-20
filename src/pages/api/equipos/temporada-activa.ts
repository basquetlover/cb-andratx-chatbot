import type { APIRoute } from "astro";

import { obtenerEquiposTemporadaActiva } from "@servicios/backend/equipos/obtenerEquiposTemporadaChatbotActiva";

export const prerender = false;

const cabeceras = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export const GET: APIRoute = async () => {
  try {
    const resultado = await obtenerEquiposTemporadaActiva();

    if (!resultado) {
      return Response.json(
        {
          ok: true,
          data: {
            temporadaId: null,
            equipos: [],
          },
          total: 0,
        },
        {
          status: 200,
          headers: cabeceras,
        },
      );
    }

    return Response.json(
      {
        ok: true,
        data: resultado,
        total: resultado.equipos.length,
      },
      {
        status: 200,
        headers: cabeceras,
      },
    );
  } catch (error) {
    console.error("Error en GET /api/equipos/temporada-activa:", error);

    return Response.json(
      {
        ok: false,
        data: null,
        total: 0,
        error: "No se ha podido obtener la lista de equipos",
      },
      {
        status: 500,
        headers: cabeceras,
      },
    );
  }
};

export const ALL: APIRoute = async () => {
  return Response.json(
    {
      ok: false,
      error: "Método no permitido",
    },
    {
      status: 405,
      headers: {
        ...cabeceras,
        Allow: "GET",
      },
    },
  );
};