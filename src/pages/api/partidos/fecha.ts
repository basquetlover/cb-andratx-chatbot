
import type { APIRoute } from "astro";

import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  obtenerPartidosCombinados,
} from "@servicios/backend/partidos/obtenerPartidosCombinados";

import type {
  PartidoEquipoFbib,
} from "@tipos/FbibEquipoPublico";

import type {
  RespuestaPartidosPorFechaApi,
} from "@tipos/PartidosPorFecha";

// ======================================================
// CONFIGURACIÓN
// ======================================================

export const prerender = false;

const cabeceras = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

// ======================================================
// TIPOS INTERNOS
// ======================================================

interface FilaEquipo {
  id: string;
  nombre: string | null;
  temporada_id: string | null;
}

// ======================================================
// VALIDACIONES
// ======================================================

function esUuidValido(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function esFechaValida(
  fecha: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return false;
  }

  const anio = Number(
    fecha.slice(0, 4),
  );

  if (
    anio < 2020 ||
    anio > 2100
  ) {
    return false;
  }

  const valor = new Date(
    `${fecha}T00:00:00Z`,
  );

  return (
    !Number.isNaN(
      valor.getTime(),
    ) &&
    valor.toISOString().slice(0, 10) ===
      fecha
  );
}

// ======================================================
// RESPUESTAS
// ======================================================

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

// ======================================================
// OBTENER EQUIPO DISPONIBLE PARA EL CHATBOT
// ======================================================

async function obtenerEquipoChatbot(
  equipoId: string,
): Promise<FilaEquipo | null> {
  /**
   * Se comprueba que:
   *
   * - El equipo existe.
   * - Está activo.
   * - Está habilitado para el chatbot.
   *
   * No se exige id_equipo_fbib.
   *
   * Así también pueden consultarse
   * partidos manuales o amistosos
   * de equipos sin vinculación FBIB.
   */

  const {
    data,
    error,
  } = await supabaseServidor
    .from("equipos")
    .select(`
      id,
      nombre,
      temporada_id
    `)
    .eq(
      "id",
      equipoId,
    )
    .eq(
      "activo",
      true,
    )
    .eq(
      "chatbot",
      true,
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se ha podido consultar el equipo: ${error.message}`,
    );
  }

  return data
    ? (data as FilaEquipo)
    : null;
}

// ======================================================
// ORDENACIÓN DE PARTIDOS
// ======================================================

function ordenarPartidos(
  partidos: PartidoEquipoFbib[],
): PartidoEquipoFbib[] {
  return [...partidos].sort(
    (primero, segundo) => {
      const fechaPrimero =
        `${primero.fecha ?? ""}T` +
        `${primero.hora ?? "99:99"}`;

      const fechaSegundo =
        `${segundo.fecha ?? ""}T` +
        `${segundo.hora ?? "99:99"}`;

      return (
        fechaPrimero.localeCompare(
          fechaSegundo,
        ) ||
        primero.id.localeCompare(
          segundo.id,
        )
      );
    },
  );
}

// ======================================================
// GET /api/partidos/fecha
// ======================================================

export const GET: APIRoute = async ({
  url,
}) => {
  // --------------------------------------------------
  // 1. LEER PARÁMETROS
  // --------------------------------------------------

  const equipoId =
    url.searchParams
      .get("equipoId")
      ?.trim() ?? "";

  const desde =
    url.searchParams
      .get("desde")
      ?.trim() ?? "";

  const hasta =
    url.searchParams
      .get("hasta")
      ?.trim() ?? "";

  // --------------------------------------------------
  // 2. VALIDAR EQUIPO
  // --------------------------------------------------

  if (!esUuidValido(equipoId)) {
    return respuestaError(
      "El identificador del equipo no es válido",
      400,
    );
  }

  // --------------------------------------------------
  // 3. VALIDAR FECHAS
  // --------------------------------------------------

  if (
    !esFechaValida(desde) ||
    !esFechaValida(hasta)
  ) {
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

  // --------------------------------------------------
  // 4. CONSULTAR PARTIDOS
  // --------------------------------------------------

  try {
    const equipo =
      await obtenerEquipoChatbot(
        equipoId,
      );

    if (!equipo) {
      return respuestaError(
        "El equipo no existe o no está disponible para esta consulta",
        404,
      );
    }

    /**
     * SERVICIO CENTRAL
     *
     * No consultamos la FBIB directamente.
     *
     * El servicio central ya resuelve:
     *
     * - Partidos originales FBIB.
     * - Partidos FBIB sin guardar en DB.
     * - Correcciones de fecha y hora.
     * - Correcciones de instalación.
     * - Correcciones de equipos.
     * - Partidos manuales CBA.
     * - Amistosos.
     * - Duplicados por ID FBIB.
     *
     * También aplica el filtro por
     * fecha DESPUÉS de las correcciones.
     */

    const resultado =
      await obtenerPartidosCombinados({
        equipoId,

        inicio: desde,
        fin: hasta,
      });

    // --------------------------------------------------
    // 5. VERIFICAR TEMPORADA
    // --------------------------------------------------

    /**
     * La consulta debe pertenecer
     * a la temporada activa.
     *
     * Evita devolver accidentalmente
     * partidos de un equipo asociado
     * a otra temporada.
     */

    if (
      !resultado.temporadaId ||
      equipo.temporada_id !==
        resultado.temporadaId ||
      !resultado.equipos.some(
        (disponible) =>
          disponible.id ===
          equipo.id,
      )
    ) {
      return respuestaError(
        "El equipo no pertenece a la temporada activa",
        404,
      );
    }

    // --------------------------------------------------
    // 6. ORDENAR RESULTADOS
    // --------------------------------------------------

    /**
     * PartidoCombinado extiende
     * PartidoEquipoFbib.
     *
     * Por ello podemos mantener el
     * contrato del frontend sin
     * transformar ni perder datos.
     */

    const partidos:
      PartidoEquipoFbib[] =
        ordenarPartidos(
          resultado.partidos,
        );

    // --------------------------------------------------
    // 7. RESPUESTA
    // --------------------------------------------------

    return Response.json(
      {
        ok: true,

        data: {
          equipo: {
            id:
              equipo.id,

            nombre:
              equipo.nombre?.trim() ||
              "Equipo",
          },

          rango: {
            desde,
            hasta,
          },

          partidos,
        },
      } satisfies RespuestaPartidosPorFechaApi,
      {
        status: 200,
        headers: cabeceras,
      },
    );
  } catch (error) {
    console.error(
      "Error en GET /api/partidos/fecha:",
      error,
    );

    return respuestaError(
      "No se han podido consultar los partidos del equipo",
      500,
    );
  }
};

// ======================================================
// MÉTODOS NO PERMITIDOS
// ======================================================

export const ALL: APIRoute =
  async () =>
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
