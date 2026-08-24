import type { APIRoute } from "astro";

import { obtenerEquiposPanel } from "@servicios/backend/equipos/obtenerEquiposPanel";

export const prerender = false;

const cabecerasRespuesta = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

export const GET: APIRoute = async () => {
  try {
    const equipos = await obtenerEquiposPanel();

    return Response.json(
      {
        ok: true,
        data: equipos,
        total: equipos.length,
      },
      {
        status: 200,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    console.error("Error en GET /api/panel/equipos:", error);

    return Response.json(
      {
        ok: false,
        data: [],
        total: 0,
        error: "No se ha podido obtener la lista de equipos.",
      },
      {
        status: 500,
        headers: cabecerasRespuesta,
      },
    );
  }
};

export const ALL: APIRoute = async () => {
  return Response.json(
    {
      ok: false,
      error: "Método no permitido.",
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