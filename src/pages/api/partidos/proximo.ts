import type { APIRoute } from "astro";

import { obtenerVinculacionEquipoFbib } from "../../../servicios/backend/equipos/obtenerVinculacionEquipoFbib";
import { obtenerProximoPartidoFbib } from "../../../servicios/fbib/partidos/obtenerProximoPartidoFbib";

export const prerender = false;

function esUuidValido(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

export const GET: APIRoute = async ({ url }) => {
  const equipoId = url.searchParams.get("equipoId")?.trim() ?? "";

  if (!equipoId || !esUuidValido(equipoId)) {
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

  try {
    const vinculacion = await obtenerVinculacionEquipoFbib(equipoId);
    const partido = await obtenerProximoPartidoFbib(vinculacion.idEquipoFbib);

    return Response.json(
      {
        ok: true,
        data: {
          equipo: {
            id: vinculacion.equipoId,
            nombre: vinculacion.nombre,
          },
          partido,
        },
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
    console.error("Error en GET /api/partidos/proximo:", error);

    return Response.json(
      {
        ok: false,
        data: null,
        error: "No se ha podido obtener el próximo partido",
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