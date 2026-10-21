
import {
  obtenerPartidosCombinados,
} from "@servicios/backend/partidos/obtenerPartidosCombinados";

import type {
  EquipoPartidosCombinados,
  PartidoCombinado,
} from "@servicios/backend/partidos/obtenerPartidosCombinados";

import type {
  EquipoPartidoPortada,
  PartidoPortada,
  PeriodoPartidosPortada,
} from "@tipos/PartidoPortada";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const ZONA_HORARIA = "Europe/Madrid";
const HORA_CAMBIO_SEMANA = 20;
const ESCUDO_CLUB = "/favicon.svg";

// ======================================================
// ERRORES
// ======================================================

export class ErrorObtenerPartidosPortada extends Error {
  status: number;

  constructor(mensaje: string, status = 500) {
    super(mensaje);

    this.name = "ErrorObtenerPartidosPortada";
    this.status = status;
  }
}

// ======================================================
// TIPOS INTERNOS
// ======================================================

interface PartesFechaHora {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

interface PeriodoCalculado {
  inicio: Date;
  fin: Date;
  fechaInicio: string;
  fechaFin: string;
  fechaActual: string;
}

type PosicionClub = "local" | "visitante";

// ======================================================
// UTILIDADES
// ======================================================

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

function crearFechaIso(
  anio: number,
  mes: number,
  dia: number,
): string {
  return (
    `${anio}-` +
    `${dosDigitos(mes)}-` +
    dosDigitos(dia)
  );
}

function normalizarTexto(
  valor: string | null | undefined,
): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ======================================================
// FECHA Y HORA DE MALLORCA
// ======================================================

function obtenerPartesMadrid(
  fecha: Date,
): PartesFechaHora {
  const partes = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: ZONA_HORARIA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    },
  ).formatToParts(fecha);

  function obtener(
    tipo: Intl.DateTimeFormatPartTypes,
  ): number {
    return Number(
      partes.find(
        (parte) => parte.type === tipo,
      )?.value ?? 0,
    );
  }

  return {
    anio: obtener("year"),
    mes: obtener("month"),
    dia: obtener("day"),
    hora: obtener("hour"),
    minuto: obtener("minute"),
    segundo: obtener("second"),
  };
}

// ======================================================
// HORA DE MALLORCA A UTC
// ======================================================

function convertirHoraMadridAUtc(
  partes: PartesFechaHora,
): Date {
  const objetivoLocal = Date.UTC(
    partes.anio,
    partes.mes - 1,
    partes.dia,
    partes.hora,
    partes.minuto,
    partes.segundo,
  );

  let candidato = objetivoLocal;

  for (
    let intento = 0;
    intento < 4;
    intento += 1
  ) {
    const convertido = obtenerPartesMadrid(
      new Date(candidato),
    );

    const candidatoLocal = Date.UTC(
      convertido.anio,
      convertido.mes - 1,
      convertido.dia,
      convertido.hora,
      convertido.minuto,
      convertido.segundo,
    );

    const diferencia =
      candidatoLocal - objetivoLocal;

    if (diferencia === 0) {
      break;
    }

    candidato -= diferencia;
  }

  return new Date(candidato);
}

// ======================================================
// PERÍODO SEMANAL
// MARTES 20:00 A MARTES SIGUIENTE 20:00
// ======================================================

function obtenerPeriodoActual(
  ahora = new Date(),
): PeriodoCalculado {
  const partesAhora = obtenerPartesMadrid(ahora);

  const fechaHoy = new Date(
    Date.UTC(
      partesAhora.anio,
      partesAhora.mes - 1,
      partesAhora.dia,
    ),
  );

  const diaSemana = fechaHoy.getUTCDay();

  const diasDesdeMartes =
    (diaSemana - 2 + 7) % 7;

  const inicioLocal = new Date(fechaHoy);

  inicioLocal.setUTCDate(
    inicioLocal.getUTCDate() - diasDesdeMartes,
  );

  // Antes de las 20:00 del martes se
  // mantiene la semana anterior.
  if (
    diaSemana === 2 &&
    partesAhora.hora < HORA_CAMBIO_SEMANA
  ) {
    inicioLocal.setUTCDate(
      inicioLocal.getUTCDate() - 7,
    );
  }

  const finLocal = new Date(inicioLocal);

  finLocal.setUTCDate(
    finLocal.getUTCDate() + 7,
  );

  const inicio = convertirHoraMadridAUtc({
    anio: inicioLocal.getUTCFullYear(),
    mes: inicioLocal.getUTCMonth() + 1,
    dia: inicioLocal.getUTCDate(),
    hora: HORA_CAMBIO_SEMANA,
    minuto: 0,
    segundo: 0,
  });

  const fin = convertirHoraMadridAUtc({
    anio: finLocal.getUTCFullYear(),
    mes: finLocal.getUTCMonth() + 1,
    dia: finLocal.getUTCDate(),
    hora: HORA_CAMBIO_SEMANA,
    minuto: 0,
    segundo: 0,
  });

  return {
    inicio,
    fin,

    fechaInicio: crearFechaIso(
      inicioLocal.getUTCFullYear(),
      inicioLocal.getUTCMonth() + 1,
      inicioLocal.getUTCDate(),
    ),

    fechaFin: crearFechaIso(
      finLocal.getUTCFullYear(),
      finLocal.getUTCMonth() + 1,
      finLocal.getUTCDate(),
    ),

    fechaActual: crearFechaIso(
      partesAhora.anio,
      partesAhora.mes,
      partesAhora.dia,
    ),
  };
}

// ======================================================
// FILTRAR POR PERÍODO EXACTO
// ======================================================

function perteneceAlPeriodo(
  partido: PartidoCombinado,
  periodo: PeriodoCalculado,
): boolean {
  const fecha = partido.fecha;

  if (!fecha) {
    return false;
  }

  if (
    fecha < periodo.fechaInicio ||
    fecha > periodo.fechaFin
  ) {
    return false;
  }

  if (
    fecha > periodo.fechaInicio &&
    fecha < periodo.fechaFin
  ) {
    return true;
  }

  const horaCambio =
    `${dosDigitos(HORA_CAMBIO_SEMANA)}:00`;

  if (fecha === periodo.fechaInicio) {
    // Si no tiene hora, pertenece al
    // período cuyo martes es el inicio.
    return !partido.hora ||
      partido.hora >= horaCambio;
  }

  if (fecha === periodo.fechaFin) {
    return Boolean(
      partido.hora &&
      partido.hora < horaCambio,
    );
  }

  return false;
}

// ======================================================
// IDENTIFICAR EL EQUIPO DEL CLUB
// ======================================================

function obtenerPosicionClub(
  partido: PartidoCombinado,
  equipos: EquipoPartidosCombinados[],
): PosicionClub {
  if (partido.posicionEquipo === "local") {
    return "local";
  }

  if (partido.posicionEquipo === "visitante") {
    return "visitante";
  }

  const equiposParticipantes = equipos.filter(
    (equipo) =>
      partido.equiposIdsClub.includes(equipo.id),
  );

  const idsFbib = new Set(
    equiposParticipantes
      .map((equipo) => equipo.idEquipoFbib)
      .filter(Boolean),
  );

  if (
    partido.local.id &&
    idsFbib.has(partido.local.id)
  ) {
    return "local";
  }

  if (
    partido.visitante.id &&
    idsFbib.has(partido.visitante.id)
  ) {
    return "visitante";
  }

  const nombreLocal = normalizarTexto(
    partido.local.nombre,
  );

  const nombreVisitante = normalizarTexto(
    partido.visitante.nombre,
  );

  const coincideLocal = equiposParticipantes.some(
    (equipo) =>
      nombreLocal === normalizarTexto(equipo.nombre) ||
      (
        equipo.nombreCorto !== null &&
        nombreLocal === normalizarTexto(
          equipo.nombreCorto,
        )
      ),
  );

  const coincideVisitante = equiposParticipantes.some(
    (equipo) =>
      nombreVisitante === normalizarTexto(equipo.nombre) ||
      (
        equipo.nombreCorto !== null &&
        nombreVisitante === normalizarTexto(
          equipo.nombreCorto,
        )
      ),
  );

  if (coincideLocal && !coincideVisitante) {
    return "local";
  }

  if (coincideVisitante && !coincideLocal) {
    return "visitante";
  }

  // Sin datos suficientes, no inventar
  // otra posición.
  return "local";
}

// ======================================================
// CONVERTIR EQUIPO
// ======================================================

function convertirEquipoPortada(
  nombre: string,
  id: string | null,
  escudo: string | null,
  esClub: boolean,
): EquipoPartidoPortada {
  return {
    id,
    nombre,
    escudo:
      escudo ??
      (esClub ? ESCUDO_CLUB : null),
    esClub,
  };
}

// ======================================================
// JORNADA
// ======================================================

function obtenerJornadaPortada(
  partido: PartidoCombinado,
): string | null {
  const jornada =
    partido.jornadaTexto?.trim() ??
    (
      partido.jornada !== null
        ? String(partido.jornada)
        : null
    );

  if (jornada) {
    if (
      normalizarTexto(jornada).startsWith(
        "jornada",
      )
    ) {
      return jornada;
    }

    return `Jornada ${jornada}`;
  }

  if (partido.origen === "cba") {
    return "PARTIDO CBA";
  }

  return null;
}

// ======================================================
// CONVERTIR PARTIDO A PORTADA
// ======================================================

function convertirPartidoPortada(
  partido: PartidoCombinado,
  equipos: EquipoPartidosCombinados[],
): PartidoPortada | null {
  if (!partido.fecha) {
    return null;
  }

  const posicionClub = obtenerPosicionClub(
    partido,
    equipos,
  );

  const cbaEsLocalReal =
    posicionClub === "local";

  const equipoLocalReal = convertirEquipoPortada(
    partido.local.nombre,
    partido.local.id,
    partido.local.escudo,
    cbaEsLocalReal,
  );

  const equipoVisitanteReal = convertirEquipoPortada(
    partido.visitante.nombre,
    partido.visitante.id,
    partido.visitante.escudo,
    !cbaEsLocalReal,
  );

  const equipoCba = cbaEsLocalReal
    ? equipoLocalReal
    : equipoVisitanteReal;

  const equipoRival = cbaEsLocalReal
    ? equipoVisitanteReal
    : equipoLocalReal;

  // Resultado real, antes de ajustar
  // la posición visual CASA/FUERA.
  const puntosLocalReales =
    partido.resultado?.local ?? null;

  const puntosVisitanteReales =
    partido.resultado?.visitante ?? null;

  const puntosCba = cbaEsLocalReal
    ? puntosLocalReales
    : puntosVisitanteReales;

  const puntosRival = cbaEsLocalReal
    ? puntosVisitanteReales
    : puntosLocalReales;

  // La posición visual se determina por
  // la instalación, no solo por el acta.
  const cbaEnPrimeraPosicion =
    partido.esEnCasa === true
      ? true
      : partido.esEnCasa === false
        ? false
        : cbaEsLocalReal;

  const equipoLocal = cbaEnPrimeraPosicion
    ? equipoCba
    : equipoRival;

  const equipoVisitante = cbaEnPrimeraPosicion
    ? equipoRival
    : equipoCba;

  const puntosLocal = cbaEnPrimeraPosicion
    ? puntosCba
    : puntosRival;

  const puntosVisitante = cbaEnPrimeraPosicion
    ? puntosRival
    : puntosCba;

  return {
    id: partido.id,

    fecha: partido.fecha,
    hora: partido.hora,

    jornada:
      obtenerJornadaPortada(partido),

    estado:
      partido.estadoPortada,

    // ==============================================
    // CATEGORÍA REAL DEL PARTIDO
    // ==============================================
    //
    // El servicio central ya la obtiene:
    // - De FBIB (nameCategorySigned).
    // - De las correcciones de CBA.
    // - De los partidos manuales.
    //
    // Antes se perdía al crear el
    // objeto PartidoPortada.

    categoria:
      partido.categoria?.trim() || null,

    equipoLocal: {
      ...equipoLocal,
      esClub: cbaEnPrimeraPosicion,
    },

    equipoVisitante: {
      ...equipoVisitante,
      esClub: !cbaEnPrimeraPosicion,
    },

    puntosLocal,
    puntosVisitante,

    ubicacion:
      partido.ubicacion ??
      partido.campo ??
      partido.localidad,

    enlaceFbib:
      partido.enlaceFbib,
  };
}

// ======================================================
// ORDENAR PARTIDOS
// ======================================================

function ordenarPartidos(
  partidos: PartidoPortada[],
): PartidoPortada[] {
  return [...partidos].sort(
    (primero, segundo) => {
      const fechaPrimero =
        `${primero.fecha}T` +
        `${primero.hora ?? "23:59"}`;

      const fechaSegundo =
        `${segundo.fecha}T` +
        `${segundo.hora ?? "23:59"}`;

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
// OBTENER PARTIDOS DE PORTADA
// ======================================================

export async function obtenerPartidosPortada(
  ahora = new Date(),
): Promise<PeriodoPartidosPortada> {
  const periodo = obtenerPeriodoActual(ahora);

  // La fuente central ya aplica las
  // correcciones, añade los partidos
  // manuales y resuelve duplicados.

  let resultado: Awaited<
    ReturnType<typeof obtenerPartidosCombinados>
  >;

  try {
    resultado = await obtenerPartidosCombinados({
      inicio: periodo.fechaInicio,
      fin: periodo.fechaFin,
    });
  } catch (error) {
    console.error(
      "[PARTIDOS PORTADA] Error consultando partidos combinados:",
      error,
    );

    throw new ErrorObtenerPartidosPortada(
      "No se han podido consultar los partidos de la semana.",
      500,
    );
  }

  const partidosDelPeriodo =
    resultado.partidos.filter(
      (partido) =>
        perteneceAlPeriodo(partido, periodo),
    );

  const convertidos =
    partidosDelPeriodo.flatMap<PartidoPortada>(
      (partido) => {
        const convertido = convertirPartidoPortada(
          partido,
          resultado.equipos,
        );

        return convertido
          ? [convertido]
          : [];
      },
    );

  const partidosPorId =
    new Map<string, PartidoPortada>();

  for (const partido of convertidos) {
    partidosPorId.set(
      partido.id,
      partido,
    );
  }

  const partidos = ordenarPartidos(
    [...partidosPorId.values()],
  );

  return {
    inicio: periodo.inicio.toISOString(),
    fin: periodo.fin.toISOString(),
    fechaActual: periodo.fechaActual,
    partidos,
  };
}
