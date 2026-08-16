import type { APIRoute } from "astro";

import { obtenerEquiposChatbotTemporadaActiva } from "../../../servicios/backend/equipos/obtenerEquiposTemporadaChatbotActiva";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const equipos =
      await obtenerEquiposChatbotTemporadaActiva();

    return Response.json(
      {
        ok: true,
        data: equipos,
        total: equipos.length,
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
    console.error(
      "Error en GET /api/equipos/chatbot:",
      error
    );

    return Response.json(
      {
        ok: false,
        data: [],
        total: 0,
        error:
          "No se ha podido obtener la lista de equipos",
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