import { supabaseServidor } from "@servicios/supabase/servidor";

import {
  obtenerDatosEsbFbib,
} from "@servicios/fbib/cliente/obtenerDatosEsbFbib";

import type {
  PartidoPeriodoFbibPublicacion,
} from "@tipos/PublicacionPartidosPanel";

interface FilaTemporada {
  id: string;
}

interface FilaEquipo {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  id_equipo_fbib: string | null;
}

interface PartidoFbibCrudo {
  idMatch?: unknown;
  idLocalTeam?: unknown;
  idVisitorTeam?: unknown;

  nameLocalTeam?: unknown;
  nameVisitorTeam?: unknown;

  matchDay?: unknown;
  nameField?: unknown;
}

interface PartidoConEquipo {
  partidoFbibId: string;

  equipoId: string;
  equipoFbibId: string;

  fecha: string;
  hora: string | null;

  nombreEquipo: string;

  rivalFbibId: string | null;
  nombreRival: string;

  campo: string;
  local: boolean;
}

export class ErrorObtenerPartidosPeriodoPublicacion
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerPartidosPeriodoPublicacion";

    this.status = status;
  }
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function convertirTexto(
  valor: unknown,
): string {
  if (
    typeof valor === "string" ||
    typeof valor === "number"
  ) {
    return String(valor).trim();
  }

  return "";
}

function esFechaIsoValida(
  valor: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const [
    anioTexto,
    mesTexto,
    diaTexto,
  ] = valor.split("-");

  const anio = Number(anioTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);

  const fecha = new Date(
    Date.UTC(anio, mes - 1, dia),
  );

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

function extraerFecha(
  valor: unknown,
): string | null {
  const texto = convertirTexto(valor);

  if (!texto) {
    return null;
  }

  const formatoIso = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  );

  if (formatoIso) {
    const fecha =
      `${formatoIso[1]}-${formatoIso[2]}-${formatoIso[3]}`;

    return esFechaIsoValida(fecha)
      ? fecha
      : null;
  }

  const formatoEspanol = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})/,
  );

  if (formatoEspanol) {
    const fecha =
      `${formatoEspanol[3]}-${formatoEspanol[2]}-${formatoEspanol[1]}`;

    return esFechaIsoValida(fecha)
      ? fecha
      : null;
  }

  return null;
}

function extraerHora(
  valor: unknown,
): string | null {
  const texto = convertirTexto(valor);

  const coincidencia = texto.match(
    /(?:T|\s)([01]\d|2[0-3]):([0-5]\d)/,
  );

  if (!coincidencia) {
    return null;
  }

  return `${coincidencia[1]}:${coincidencia[2]}`;
}

function extraerPartidos(
  valor: unknown,
): PartidoFbibCrudo[] {
  if (Array.isArray(valor)) {
    return valor.filter(
      esObjeto,
    ) as PartidoFbibCrudo[];
  }

  if (!esObjeto(valor)) {
    return [];
  }

  const partidos = valor.matches;

  if (Array.isArray(partidos)) {
    return partidos.filter(
      esObjeto,
    ) as PartidoFbibCrudo[];
  }

  if (esObjeto(partidos)) {
    return Object.values(
      partidos,
    ).filter(
      esObjeto,
    ) as PartidoFbibCrudo[];
  }

  return [];
}

function obtenerMesesPeriodo(
  fechaInicio: string,
  fechaFin: string,
): number[] {
  const inicio = new Date(
    `${fechaInicio}T12:00:00Z`,
  );

  const fin = new Date(
    `${fechaFin}T12:00:00Z`,
  );

  const meses = new Set<number>();

  const cursor = new Date(
    Date.UTC(
      inicio.getUTCFullYear(),
      inicio.getUTCMonth(),
      1,
    ),
  );

  const ultimoMes = new Date(
    Date.UTC(
      fin.getUTCFullYear(),
      fin.getUTCMonth(),
      1,
    ),
  );

  while (cursor <= ultimoMes) {
    meses.add(
      cursor.getUTCMonth() + 1,
    );

    cursor.setUTCMonth(
      cursor.getUTCMonth() + 1,
    );
  }

  return Array.from(meses);
}

async function obtenerEquiposPublicacion():
  Promise<FilaEquipo[]> {
  const {
    data: temporadaEncontrada,
    error: errorTemporada,
  } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (errorTemporada) {
    throw new ErrorObtenerPartidosPeriodoPublicacion(
      `No se ha podido obtener la temporada activa: ${errorTemporada.message}`,
      500,
    );
  }

  const temporada =
    temporadaEncontrada as
      | FilaTemporada
      | null;

  if (!temporada?.id) {
    return [];
  }

  const {
    data: equiposEncontrados,
    error: errorEquipos,
  } = await supabaseServidor
    .from("equipos")
    .select(`
      id,
      nombre,
      nombre_corto,
      id_equipo_fbib
    `)
    .eq(
      "temporada_id",
      temporada.id,
    )
    .eq("activo", true)
    .not(
      "id_equipo_fbib",
      "is",
      null,
    )
    .order("categoria", {
      ascending: true,
    })
    .order("nombre", {
      ascending: true,
    });

  if (errorEquipos) {
    throw new ErrorObtenerPartidosPeriodoPublicacion(
      `No se han podido obtener los equipos del club: ${errorEquipos.message}`,
      500,
    );
  }

  return (
    equiposEncontrados ?? []
  ) as FilaEquipo[];
}

function convertirPartido(
  partido: PartidoFbibCrudo,
  equipo: FilaEquipo,
  fechaInicio: string,
  fechaFin: string,
): PartidoConEquipo | null {
  const equipoFbibId =
    convertirTexto(
      equipo.id_equipo_fbib,
    );

  const idLocal =
    convertirTexto(
      partido.idLocalTeam,
    );

  const idVisitante =
    convertirTexto(
      partido.idVisitorTeam,
    );

  const partidoFbibId =
    convertirTexto(
      partido.idMatch,
    );

  const fecha =
    extraerFecha(
      partido.matchDay,
    );

  if (
    !equipoFbibId ||
    !partidoFbibId ||
    !fecha ||
    fecha < fechaInicio ||
    fecha > fechaFin
  ) {
    return null;
  }

  const esLocal =
    idLocal === equipoFbibId;

  const esVisitante =
    idVisitante === equipoFbibId;

  if (
    !esLocal &&
    !esVisitante
  ) {
    return null;
  }

  const nombreEquipo =
    equipo.nombre?.trim() ||
    equipo.nombre_corto?.trim() ||
    "Equipo";

  const rivalFbibId =
    esLocal
      ? idVisitante
      : idLocal;

  const nombreRival =
    esLocal
      ? convertirTexto(
          partido.nameVisitorTeam,
        )
      : convertirTexto(
          partido.nameLocalTeam,
        );

  return {
    partidoFbibId,

    equipoId:
      equipo.id,

    equipoFbibId,

    fecha,

    hora:
      extraerHora(
        partido.matchDay,
      ),

    nombreEquipo,

    rivalFbibId:
      rivalFbibId || null,

    nombreRival:
      nombreRival ||
      "Rival pendiente",

    campo:
      convertirTexto(
        partido.nameField,
      ),

    local: esLocal,
  };
}

function crearUrlEscudoInterna(
  equipoFbibId: string | null,
): string | null {
  if (!equipoFbibId) {
    return null;
  }

  const parametros =
    new URLSearchParams({
      equipoFbibId,
    });

  return (
    "/api/panel/publicaciones/" +
    "partidos/escudo-fbib?" +
    parametros.toString()
  );
}

export async function obtenerPartidosPeriodoPublicacion(
  fechaInicio: string,
  fechaFin: string,
): Promise<
  PartidoPeriodoFbibPublicacion[]
> {
  const fechaInicioLimpia =
    fechaInicio.trim();

  const fechaFinLimpia =
    fechaFin.trim();

  if (
    !esFechaIsoValida(
      fechaInicioLimpia,
    ) ||
    !esFechaIsoValida(
      fechaFinLimpia,
    )
  ) {
    throw new ErrorObtenerPartidosPeriodoPublicacion(
      "El periodo seleccionado no es válido.",
      400,
    );
  }

  if (
    fechaFinLimpia <
    fechaInicioLimpia
  ) {
    throw new ErrorObtenerPartidosPeriodoPublicacion(
      "La fecha final no puede ser anterior a la fecha inicial.",
      400,
    );
  }

  const equipos =
    await obtenerEquiposPublicacion();

  if (equipos.length === 0) {
    return [];
  }

  const meses =
    obtenerMesesPeriodo(
      fechaInicioLimpia,
      fechaFinLimpia,
    );

  const consultas =
    equipos.flatMap((equipo) => {
      const equipoFbibId =
        convertirTexto(
          equipo.id_equipo_fbib,
        );

      if (!equipoFbibId) {
        return [];
      }

      return meses.map(
        async (mes) => {
          try {
            const resultado =
              await obtenerDatosEsbFbib(
                `/Match/getByTeamAndMonth/${encodeURIComponent(
                  equipoFbibId,
                )}/${mes}`,
              );

            return {
              correcto: true as const,
              equipo,
              partidos:
                extraerPartidos(
                  resultado,
                ),
            };
          } catch (error) {
            console.error(
              `Error consultando los partidos FBIB del equipo ${equipoFbibId} en el mes ${mes}:`,
              error,
            );

            return {
              correcto: false as const,
              equipo,
              partidos: [],
            };
          }
        },
      );
    });

  const resultados =
    await Promise.all(consultas);

  const consultasCorrectas =
    resultados.filter(
      (resultado) =>
        resultado.correcto,
    ).length;

  if (
    consultas.length > 0 &&
    consultasCorrectas === 0
  ) {
    throw new ErrorObtenerPartidosPeriodoPublicacion(
      "No se han podido consultar los partidos en la FBIB.",
      502,
    );
  }

  const partidosPorId =
    new Map<
      string,
      PartidoConEquipo
    >();

  resultados.forEach(
    (resultado) => {
      resultado.partidos.forEach(
        (partido) => {
          const convertido =
            convertirPartido(
              partido,
              resultado.equipo,
              fechaInicioLimpia,
              fechaFinLimpia,
            );

          if (!convertido) {
            return;
          }

          if (
            !partidosPorId.has(
              convertido.partidoFbibId,
            )
          ) {
            partidosPorId.set(
              convertido.partidoFbibId,
              convertido,
            );
          }
        },
      );
    },
  );

  return Array.from(
    partidosPorId.values(),
  )
    .sort(
      (partidoA, partidoB) => {
        const fechaA =
          `${partidoA.fecha} ${partidoA.hora ?? "23:59"}`;

        const fechaB =
          `${partidoB.fecha} ${partidoB.hora ?? "23:59"}`;

        return (
          fechaA.localeCompare(
            fechaB,
          ) ||
          partidoA.nombreEquipo.localeCompare(
            partidoB.nombreEquipo,
            "es",
          )
        );
      },
    )
    .map((partido) => ({
      partidoFbibId:
        partido.partidoFbibId,

      equipoId:
        partido.equipoId,

      equipoFbibId:
        partido.equipoFbibId,

      fecha:
        partido.fecha,

      hora:
        partido.hora,

      nombreEquipo:
        partido.nombreEquipo,

      rivalFbibId:
        partido.rivalFbibId,

      nombreRival:
        partido.nombreRival,

      logoRival:
        crearUrlEscudoInterna(
          partido.rivalFbibId,
        ),

      campo:
        partido.campo,

      local:
        partido.local,
    }));
}