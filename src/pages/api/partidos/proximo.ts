
import type { APIRoute } from "astro";

import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  obtenerPartidosCombinados,
} from "@servicios/backend/partidos/obtenerPartidosCombinados";

import type {
  PartidoCombinado,
} from "@servicios/backend/partidos/obtenerPartidosCombinados";

import type {
  ProximoPartido,
  RespuestaProximoPartido,
} from "@tipos/Partido";

// ======================================================
// CONFIGURACIÓN
// ======================================================

export const prerender = false;

const ZONA_HORARIA = "Europe/Madrid";

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

interface FechaActualMadrid {
  anio: number;
  mes: number;
  fecha: string;
  hora: string;
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

// ======================================================
// FECHA ACTUAL EN MALLORCA
// ======================================================

function obtenerFechaActualMadrid(): FechaActualMadrid {
  const partes =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: ZONA_HORARIA,

        year: "numeric",
        month: "2-digit",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit",

        hourCycle: "h23",
      },
    ).formatToParts(
      new Date(),
    );

  function obtener(
    tipo: Intl.DateTimeFormatPartTypes,
  ): string {
    return (
      partes.find(
        (parte) =>
          parte.type === tipo,
      )?.value ?? ""
    );
  }

  const anio = Number(
    obtener("year"),
  );

  const mes = Number(
    obtener("month"),
  );

  const dia =
    obtener("day");

  const hora =
    obtener("hour");

  const minuto =
    obtener("minute");

  return {
    anio,
    mes,

    fecha:
      `${anio}-` +
      `${String(mes).padStart(2, "0")}-` +
      dia,

    hora:
      `${hora}:${minuto}`,
  };
}

// ======================================================
// LÍMITE DE CONSULTA
// ======================================================

function obtenerFinTemporada(
  fechaActual: FechaActualMadrid,
): string {
  /**
   * La temporada deportiva del club
   * se considera de agosto a julio.
   *
   * Se consultan los partidos futuros
   * hasta el final de esa temporada.
   *
   * El servicio central filtra después
   * de aplicar las fechas corregidas
   * de Supabase.
   */

  const anioFin =
    fechaActual.mes >= 8
      ? fechaActual.anio + 1
      : fechaActual.anio;

  return `${anioFin}-07-31`;
}

// ======================================================
// TEMPORADA ACTIVA
// ======================================================

async function obtenerTemporadaActiva(): Promise<
  string | null
> {
  const {
    data,
    error,
  } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq(
      "activa",
      true,
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error consultando la temporada activa: ${error.message}`,
    );
  }

  return data?.id
    ? String(data.id)
    : null;
}

// ======================================================
// EQUIPO DISPONIBLE PARA EL CHATBOT
// ======================================================

async function obtenerEquipoChatbot(
  equipoId: string,
  temporadaId: string,
): Promise<FilaEquipo | null> {
  /**
   * Debe ser un equipo:
   *
   * - De la temporada activa.
   * - Activo.
   * - Habilitado para el chatbot.
   *
   * No se exige ID FBIB.
   *
   * Los equipos sin vinculación FBIB
   * pueden tener partidos manuales.
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
      "temporada_id",
      temporadaId,
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
      `Error consultando el equipo: ${error.message}`,
    );
  }

  return data
    ? (data as FilaEquipo)
    : null;
}

// ======================================================
// DETERMINAR SI UN PARTIDO ES FUTURO
// ======================================================

function esPartidoFuturo(
  partido: PartidoCombinado,
  fechaActual: FechaActualMadrid,
): boolean {
  if (!partido.fecha) {
    return false;
  }

  /**
   * Solo consideramos los partidos
   * programados.
   *
   * Se excluyen:
   *
   * - Finalizados.
   * - En juego.
   * - Aplazados.
   */

  if (
    partido.estadoPortada !==
    "programado"
  ) {
    return false;
  }

  // Partido posterior a hoy.
  if (
    partido.fecha >
    fechaActual.fecha
  ) {
    return true;
  }

  // Partido anterior a hoy.
  if (
    partido.fecha <
    fechaActual.fecha
  ) {
    return false;
  }

  /**
   * El partido se disputa hoy.
   *
   * Si todavía no se conoce la hora,
   * no debemos descartarlo.
   */

  if (!partido.hora) {
    return true;
  }

  return (
    partido.hora >=
    fechaActual.hora
  );
}

// ======================================================
// ORDENACIÓN DE PARTIDOS
// ======================================================

function crearClaveOrden(
  partido: PartidoCombinado,
): string {
  /**
   * Cuando no hay hora publicada,
   * colocamos el partido al final
   * de su día.
   */

  return (
    `${partido.fecha ?? ""}T` +
    `${partido.hora ?? "23:59"}`
  );
}

// ======================================================
// SELECCIONAR EL PRÓXIMO PARTIDO
// ======================================================

function seleccionarProximoPartido(
  partidos: PartidoCombinado[],
  fechaActual: FechaActualMadrid,
): PartidoCombinado | null {
  const candidatos =
    partidos
      .filter(
        (partido) =>
          esPartidoFuturo(
            partido,
            fechaActual,
          ),
      )
      .sort(
        (primero, segundo) => {
          return (
            crearClaveOrden(
              primero,
            ).localeCompare(
              crearClaveOrden(
                segundo,
              ),
            ) ||
            primero.id.localeCompare(
              segundo.id,
            )
          );
        },
      );

  return candidatos[0] ?? null;
}

// ======================================================
// INSTALACIÓN DEL PARTIDO
// ======================================================

function convertirInstalacion(
  partido: PartidoCombinado,
): ProximoPartido["instalacion"] {
  /**
   * La instalación ya ha sido
   * resuelta por el servicio central.
   *
   * Si hay una instalación corregida
   * en Supabase, estos campos
   * corresponden a esa instalación.
   */

  const id =
    partido.instalacionId;

  const nombre =
    partido.ubicacion ??
    partido.campo;

  const direccion =
    partido.direccion;

  const localidad =
    partido.localidad;

  const codigoPostal =
    partido.codigoPostal;

  const tieneInstalacion = Boolean(
    id ||
    nombre ||
    direccion ||
    localidad ||
    codigoPostal,
  );

  if (!tieneInstalacion) {
    return null;
  }

  return {
    id,

    nombre,
    direccion,
    localidad,
    codigoPostal,

    /**
     * El servicio central actual
     * no proporciona coordenadas.
     *
     * No se deben inventar ni
     * reutilizar las de una instalación
     * FBIB si ha sido corregida.
     */
    latitud: null,
    longitud: null,
  };
}

// ======================================================
// ADAPTAR PARTIDO AL CONTRATO DEL ASISTENTE
// ======================================================

function convertirProximoPartido(
  partido: PartidoCombinado,
): ProximoPartido | null {
  if (!partido.fecha) {
    return null;
  }

  /**
   * Para los partidos FBIB se conserva
   * su identificador federativo.
   *
   * Los partidos manuales utilizan
   * su identificador CBA.
   */

  const id =
    partido.idPartidoFbib ??
    partido.id;

  const escudoLocal =
    partido.local.escudo;

  const escudoVisitante =
    partido.visitante.escudo;

  return {
    id,

    fecha:
      partido.fecha,

    hora:
      partido.hora,

    jornada:
      partido.jornadaTexto ??
      (
        partido.jornada !== null
          ? String(
              partido.jornada,
            )
          : null
      ),

    categoria:
      partido.categoria,

    competicion:
      partido.competicion,

    grupo:
      partido.grupo,

    estado:
      "Pendiente",

    // --------------------------------------------------
    // EQUIPO LOCAL
    // --------------------------------------------------

    equipoLocal: {
      nombre:
        partido.local.nombre,

      puntos:
        partido.resultado?.local ??
        null,

      escudo:
        escudoLocal,
    },

    // --------------------------------------------------
    // EQUIPO VISITANTE
    // --------------------------------------------------

    equipoVisitante: {
      nombre:
        partido.visitante.nombre,

      puntos:
        partido.resultado?.visitante ??
        null,

      escudo:
        escudoVisitante,
    },

    // --------------------------------------------------
    // INSTALACIÓN
    // --------------------------------------------------

    instalacion:
      convertirInstalacion(
        partido,
      ),

    // --------------------------------------------------
    // ENLACE FBIB
    // --------------------------------------------------

    /**
     * Un amistoso CBA no tiene
     * página de partido FBIB.
     *
     * Por tanto, urlFbib será null
     * y el componente React ocultará
     * automáticamente ese enlace.
     */

    urlFbib:
      partido.enlaceFbib,

    // --------------------------------------------------
    // COMPATIBILIDAD CON FORMATOS ANTERIORES
    // --------------------------------------------------

    logoLocal:
      escudoLocal,

    localClubLogo:
      escudoLocal,

    logoVisitor:
      escudoVisitante,

    logoVisitant:
      escudoVisitante,

    visitorClubLogo:
      escudoVisitante,
  };
}

// ======================================================
// RESPUESTAS JSON
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
    } satisfies RespuestaProximoPartido,
    {
      status,
      headers: cabeceras,
    },
  );
}

// ======================================================
// GET /api/partidos/proximo
// ======================================================

export const GET: APIRoute = async ({
  url,
}) => {
  // --------------------------------------------------
  // 1. PARÁMETROS
  // --------------------------------------------------

  const equipoId =
    url.searchParams
      .get("equipoId")
      ?.trim() ?? "";

  // --------------------------------------------------
  // 2. VALIDAR EQUIPO
  // --------------------------------------------------

  if (
    !equipoId ||
    !esUuidValido(
      equipoId,
    )
  ) {
    return respuestaError(
      "El identificador del equipo no es válido",
      400,
    );
  }

  // --------------------------------------------------
  // 3. CONSULTAR
  // --------------------------------------------------

  try {
    const temporadaId =
      await obtenerTemporadaActiva();

    if (!temporadaId) {
      return respuestaError(
        "No hay ninguna temporada activa",
        404,
      );
    }

    const equipo =
      await obtenerEquipoChatbot(
        equipoId,
        temporadaId,
      );

    if (!equipo) {
      return respuestaError(
        "El equipo no existe o no está disponible para esta consulta",
        404,
      );
    }

    // ------------------------------------------------
    // 4. PERÍODO DE CONSULTA
    // ------------------------------------------------

    const fechaActual =
      obtenerFechaActualMadrid();

    const fechaInicio =
      fechaActual.fecha;

    const fechaFin =
      obtenerFinTemporada(
        fechaActual,
      );

    // ------------------------------------------------
    // 5. CONSULTAR SERVICIO CENTRAL
    // ------------------------------------------------

    /**
     * ÚNICA FUENTE DE PARTIDOS.
     *
     * La consulta incluye:
     *
     * - Todos los partidos FBIB.
     * - Correcciones guardadas en DB.
     * - Partidos manuales CBA.
     * - Amistosos.
     *
     * La prioridad entre FBIB y DB
     * se resuelve en el servicio central.
     */

    const resultado =
      await obtenerPartidosCombinados({
        equipoId,

        inicio:
          fechaInicio,

        fin:
          fechaFin,
      });

    if (
      resultado.temporadaId !==
      temporadaId
    ) {
      throw new Error(
        "La temporada consultada no coincide con la temporada activa.",
      );
    }

    // ------------------------------------------------
    // 6. SELECCIONAR EL MÁS PRÓXIMO
    // ------------------------------------------------

    const partidoSeleccionado =
      seleccionarProximoPartido(
        resultado.partidos,
        fechaActual,
      );

    // ------------------------------------------------
    // 7. ADAPTAR AL FORMATO EXISTENTE
    // ------------------------------------------------

    const partido =
      partidoSeleccionado
        ? convertirProximoPartido(
            partidoSeleccionado,
          )
        : null;

    // ------------------------------------------------
    // 8. RESPUESTA
    // ------------------------------------------------

    return Response.json(
      {
        ok: true,

        data: {
          equipo: {
            id:
              equipo.id,

            nombre:
              equipo.nombre?.trim() ??
              "Equipo",
          },

          partido,
        },
      } satisfies RespuestaProximoPartido,
      {
        status: 200,
        headers: cabeceras,
      },
    );
  } catch (error) {
    console.error(
      "Error en GET /api/partidos/proximo:",
      error,
    );

    return respuestaError(
      "No se ha podido obtener el próximo partido",
      500,
    );
  }
};

// ======================================================
// MÉTODOS NO PERMITIDOS
// ======================================================

export const ALL: APIRoute =
  async () => {
    return Response.json(
      {
        ok: false,

        data: null,

        error:
          "Método no permitido",
      } satisfies RespuestaProximoPartido,
      {
        status: 405,

        headers: {
          ...cabeceras,

          Allow: "GET",
        },
      },
    );
  };
