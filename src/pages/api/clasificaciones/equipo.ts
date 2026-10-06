import type { APIRoute } from "astro";

import { obtenerVinculacionEquipoFbib } from "@servicios/backend/equipos/obtenerVinculacionEquipoFbib";
import { obtenerFichaEquipoFbib } from "@servicios/fbib/equipos/obtenerFichaEquipoFbib";
import { obtenerClasificacionesEquipoFbib } from "@servicios/fbib/equipos/obtenerClasificacionesEquipoFbib";

import type { RespuestaClasificacionApi } from "@tipos/Clasificacion";

export const prerender = false;

const cabeceras = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export const GET: APIRoute = async ({ url }) => {
  const equipoId = url.searchParams.get("equipoId")?.trim() ?? "";

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      equipoId,
    )
  ) {
    return Response.json(
      {
        ok: false,
        data: null,
        error: "El identificador del equipo no es válido",
      } satisfies RespuestaClasificacionApi,
      { status: 400, headers: cabeceras },
    );
  }

  try {
    const vinculacion = await obtenerVinculacionEquipoFbib(equipoId);
    const ficha = await obtenerFichaEquipoFbib(vinculacion.idEquipoFbib);

    if (!ficha) {
      throw new Error("No se ha podido obtener la ficha FBIB del equipo");
    }

    const clasificaciones = await obtenerClasificacionesEquipoFbib(
      vinculacion.idEquipoFbib,
      ficha.grupos,
    );

    return Response.json(
      {
        ok: true,
        data: {
          equipo: {
            id: vinculacion.equipoId,
            nombre: vinculacion.nombre?.trim() || ficha.nombre,
          },
          clasificaciones,
          enlaceFbib: ficha.enlaceFbib,
        },
      } satisfies RespuestaClasificacionApi,
      { status: 200, headers: cabeceras },
    );
  } catch (error) {
    console.error("Error en GET /api/clasificaciones/equipo:", error);

    return Response.json(
      {
        ok: false,
        data: null,
        error: "No se ha podido consultar la clasificación del equipo",
      } satisfies RespuestaClasificacionApi,
      { status: 500, headers: cabeceras },
    );
  }
};

export const ALL: APIRoute = async () => {
  return Response.json(
    {
      ok: false,
      data: null,
      error: "Método no permitido",
    } satisfies RespuestaClasificacionApi,
    {
      status: 405,
      headers: {
        ...cabeceras,
        Allow: "GET",
      },
    },
  );
};