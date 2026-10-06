import type { APIRoute } from "astro";

import { obtenerVinculacionEquipoFbib } from "@servicios/backend/equipos/obtenerVinculacionEquipoFbib";
import { obtenerPartidosMesEquipoFbib } from "@servicios/fbib/equipos/obtenerPartidosEquipoFbib";

import type { PartidoEquipoFbib } from "@tipos/FbibEquipoPublico";
import type { RespuestaPartidosPorFechaApi } from "@tipos/PartidosPorFecha";

export const prerender = false;

const cabeceras = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const anio = Number(fecha.slice(0, 4));

  if (anio < 2020 || anio > 2100) {
    return false;
  }

  const valor = new Date(`${fecha}T00:00:00Z`);

  return (
    !Number.isNaN(valor.getTime()) &&
    valor.toISOString().slice(0, 10) === fecha
  );
}

function obtenerMesesDelRango(
  desde: string,
  hasta: string,
): number[] {
  const [anioInicio, mesInicio] = desde.split("-").map(Number);
  const [anioFin, mesFin] = hasta.split("-").map(Number);

  const primerMes = anioInicio * 12 + mesInicio - 1;
  const ultimoMes = anioFin * 12 + mesFin - 1;

  const meses = new Set<number>();

  /*
   * El servicio FBIB recibe equipo y número de mes, sin año.
   * Consultamos cada mes una sola vez y después filtramos
   * por fecha completa, incluido el año.
   */
  for (let mes = primerMes; mes <= ultimoMes; mes += 1) {
    meses.add((mes % 12) + 1);

    if (meses.size === 12) {
      break;
    }
  }

  return Array.from(meses);
}

function respuestaError(
  error: string,
  status: number,
): Response {
  return Response.json(
    {
      ok: false,
      data: null,
      error,
    } satisfies RespuestaPartidosPorFechaApi,
    {
      status,
      headers: cabeceras,
    },
  );
}

export const GET: APIRoute = async ({ url }) => {
  const equipoId = url.searchParams.get("equipoId")?.trim() ?? "";
  const desde = url.searchParams.get("desde")?.trim() ?? "";
  const hasta = url.searchParams.get("hasta")?.trim() ?? "";

  const uuidValido =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      equipoId,
    );

  if (!uuidValido) {
    return respuestaError(
      "El identificador del equipo no es válido",
      400,
    );
  }

  if (!esFechaValida(desde) || !esFechaValida(hasta)) {
    return respuestaError(
      "Las fechas del intervalo no son válidas",
      400,
    );
  }

  if (hasta < desde) {
    return respuestaError(
      "La fecha final no puede ser anterior a la fecha inicial",
      400,
    );
  }

  try {
    const vinculacion = await obtenerVinculacionEquipoFbib(equipoId);
    const meses = obtenerMesesDelRango(desde, hasta);

    const partidosPorId = new Map<string, PartidoEquipoFbib>();

    /*
     * Consultamos los meses de forma secuencial para no lanzar
     * todas las peticiones FBIB y de escudos simultáneamente.
     */
    for (const mes of meses) {
      const partidosMes = await obtenerPartidosMesEquipoFbib(
        vinculacion.idEquipoFbib,
        mes,
      );

      for (const partido of partidosMes) {
        if (
          partido.fecha &&
          partido.fecha >= desde &&
          partido.fecha <= hasta
        ) {
          partidosPorId.set(partido.id, partido);
        }
      }
    }

    const partidos = Array.from(partidosPorId.values()).sort(
      (primero, segundo) => {
        const fechaPrimero =
          `${primero.fecha}T${primero.hora ?? "99:99"}`;

        const fechaSegundo =
          `${segundo.fecha}T${segundo.hora ?? "99:99"}`;

        return (
          fechaPrimero.localeCompare(fechaSegundo) ||
          primero.id.localeCompare(segundo.id)
        );
      },
    );

    return Response.json(
      {
        ok: true,
        data: {
          equipo: {
            id: vinculacion.equipoId,
            nombre: vinculacion.nombre?.trim() || "Equipo",
          },
          rango: {
            desde,
            hasta,
          },
          partidos,
        },
      } satisfies RespuestaPartidosPorFechaApi,
      {
        headers: cabeceras,
      },
    );
  } catch (error) {
    console.error("Error en GET /api/partidos/fecha:", error);

    return respuestaError(
      "No se han podido consultar los partidos del equipo",
      500,
    );
  }
};

export const ALL: APIRoute = async () =>
  Response.json(
    {
      ok: false,
      data: null,
      error: "Método no permitido",
    } satisfies RespuestaPartidosPorFechaApi,
    {
      status: 405,
      headers: {
        ...cabeceras,
        Allow: "GET",
      },
    },
  );