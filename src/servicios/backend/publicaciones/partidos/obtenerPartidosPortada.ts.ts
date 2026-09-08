import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  obtenerDatosEsbFbib,
} from "@servicios/fbib/cliente/obtenerDatosEsbFbib";

import type {
  EstadoPartidoPortada,
  EquipoPartidoPortada,
  PartidoPortada,
  PeriodoPartidosPortada,
} from "@tipos/PartidoPortada";

const ZONA_HORARIA =
  "Europe/Madrid";

const ID_CLUB_ANDRATX =
  "129";

const URL_ESCUDO_CLUB =
  "/favicon.svg";

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

  idLocalClub?: unknown;
  idVisitorClub?: unknown;

  idLocalTeam?: unknown;
  idVisitorTeam?: unknown;

  nameLocalTeam?: unknown;
  nameVisitorTeam?: unknown;

  localClubLogo?: unknown;
  visitorClubLogo?: unknown;

  matchDay?: unknown;

  numMatchDay?: unknown;

  nameField?: unknown;
  nameTown?: unknown;

  localScore?: unknown;
  visitorScore?: unknown;

  localPoints?: unknown;
  visitorPoints?: unknown;

  resultLocal?: unknown;
  resultVisitor?: unknown;

  resultsVisibles?: unknown;
  idMatchResult?: unknown;

  isLive?: unknown;
  state?: unknown;

  publicMessage?: unknown;
  description?: unknown;
  observations?: unknown;
  typeResult?: unknown;
}

interface PartesFechaHora {
  anio: number;
  mes: number;
  dia: number;

  hora: number;
  minuto: number;
  segundo: number;
}

interface FechaPartidoConvertida {
  fecha: string;
  hora: string;

  instante: Date;
}

interface PeriodoCalculado {
  inicio: Date;
  fin: Date;

  fechaInicio: string;
  fechaFin: string;
  fechaActual: string;
}

interface ResultadoConsultaFbib {
  correcto: boolean;
  partidos: PartidoFbibCrudo[];
}

export class ErrorObtenerPartidosPortada
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerPartidosPortada";

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

function convertirTextoNullable(
  valor: unknown,
): string | null {
  const texto =
    convertirTexto(valor);

  return texto || null;
}

function convertirNumeroNullable(
  valor: unknown,
): number | null {
  if (
    typeof valor === "number" &&
    Number.isFinite(valor)
  ) {
    return Math.trunc(valor);
  }

  if (
    typeof valor === "string"
  ) {
    const texto =
      valor.trim();

    if (!texto) {
      return null;
    }

    const numero =
      Number(texto);

    if (
      Number.isFinite(numero)
    ) {
      return Math.trunc(numero);
    }
  }

  return null;
}

function convertirBooleano(
  valor: unknown,
): boolean {
  if (
    valor === true ||
    valor === 1
  ) {
    return true;
  }

  if (
    typeof valor === "string"
  ) {
    const texto =
      valor
        .trim()
        .toLowerCase();

    return (
      texto === "true" ||
      texto === "1" ||
      texto === "si" ||
      texto === "sí"
    );
  }

  return false;
}

function esValorFalso(
  valor: unknown,
): boolean {
  if (
    valor === false ||
    valor === 0
  ) {
    return true;
  }

  if (
    typeof valor === "string"
  ) {
    const texto =
      valor
        .trim()
        .toLowerCase();

    return (
      texto === "false" ||
      texto === "0" ||
      texto === "no"
    );
  }

  return false;
}

function normalizarTexto(
  valor: string,
): string {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

function normalizarImagen(
  valor: unknown,
): string | null {
  const imagen =
    convertirTexto(valor);

  if (!imagen) {
    return null;
  }

  if (
    imagen.startsWith(
      "https://",
    )
  ) {
    return imagen;
  }

  if (
    imagen.startsWith(
      "http://",
    )
  ) {
    return imagen.replace(
      "http://",
      "https://",
    );
  }

  if (
    imagen.startsWith(
      "data:image/",
    )
  ) {
    return imagen;
  }

  if (
    imagen.startsWith("/")
  ) {
    return `https://www.fbib.es${imagen}`;
  }

  return null;
}

function rellenarDosDigitos(
  valor: number,
): string {
  return String(valor)
    .padStart(2, "0");
}

function crearFechaIso(
  anio: number,
  mes: number,
  dia: number,
): string {
  return (
    `${anio}-` +
    `${rellenarDosDigitos(mes)}-` +
    rellenarDosDigitos(dia)
  );
}

function obtenerPartesFechaHoraMadrid(
  fecha: Date,
): PartesFechaHora {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          ZONA_HORARIA,

        year: "numeric",
        month: "2-digit",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",

        hourCycle: "h23",
      },
    ).formatToParts(
      fecha,
    );

  const obtenerParte = (
    tipo:
      Intl.DateTimeFormatPartTypes,
  ): number => {
    const parte =
      partes.find(
        (elemento) =>
          elemento.type ===
          tipo,
      )?.value;

    return Number(
      parte ?? 0,
    );
  };

  return {
    anio:
      obtenerParte("year"),

    mes:
      obtenerParte("month"),

    dia:
      obtenerParte("day"),

    hora:
      obtenerParte("hour"),

    minuto:
      obtenerParte("minute"),

    segundo:
      obtenerParte("second"),
  };
}

/*
 * Convierte una fecha escrita como hora
 * local de Madrid en su instante UTC real.
 *
 * De este modo el periodo también funciona
 * correctamente durante los cambios de
 * horario de verano e invierno.
 */
function convertirHoraMadridAUtc(
  partes:
    PartesFechaHora,
): Date {
  const fechaLocalObjetivo =
    Date.UTC(
      partes.anio,
      partes.mes - 1,
      partes.dia,
      partes.hora,
      partes.minuto,
      partes.segundo,
    );

  let candidato =
    fechaLocalObjetivo;

  for (
    let intento = 0;
    intento < 3;
    intento += 1
  ) {
    const partesCandidato =
      obtenerPartesFechaHoraMadrid(
        new Date(candidato),
      );

    const fechaLocalCandidato =
      Date.UTC(
        partesCandidato.anio,
        partesCandidato.mes - 1,
        partesCandidato.dia,
        partesCandidato.hora,
        partesCandidato.minuto,
        partesCandidato.segundo,
      );

    const diferencia =
      fechaLocalCandidato -
      fechaLocalObjetivo;

    if (
      diferencia === 0
    ) {
      break;
    }

    candidato -=
      diferencia;
  }

  return new Date(
    candidato,
  );
}

function obtenerPeriodoActual(
  ahora = new Date(),
): PeriodoCalculado {
  const partesAhora =
    obtenerPartesFechaHoraMadrid(
      ahora,
    );

  const fechaLocalActual =
    new Date(
      Date.UTC(
        partesAhora.anio,
        partesAhora.mes - 1,
        partesAhora.dia,
      ),
    );

  const diaSemana =
    fechaLocalActual.getUTCDay();

  const diasDesdeMartes =
    (
      diaSemana -
      2 +
      7
    ) % 7;

  const inicioLocal =
    new Date(
      Date.UTC(
        partesAhora.anio,
        partesAhora.mes - 1,
        partesAhora.dia -
          diasDesdeMartes,
        20,
        0,
        0,
      ),
    );

  const antesDeLasOcho =
    partesAhora.hora < 20;

  if (
    diaSemana === 2 &&
    antesDeLasOcho
  ) {
    inicioLocal.setUTCDate(
      inicioLocal.getUTCDate() -
        7,
    );
  }

  const finLocal =
    new Date(
      inicioLocal.getTime(),
    );

  finLocal.setUTCDate(
    finLocal.getUTCDate() +
      7,
  );

  const inicio =
    convertirHoraMadridAUtc({
      anio:
        inicioLocal
          .getUTCFullYear(),

      mes:
        inicioLocal
          .getUTCMonth() + 1,

      dia:
        inicioLocal
          .getUTCDate(),

      hora: 20,
      minuto: 0,
      segundo: 0,
    });

  const fin =
    convertirHoraMadridAUtc({
      anio:
        finLocal
          .getUTCFullYear(),

      mes:
        finLocal
          .getUTCMonth() + 1,

      dia:
        finLocal
          .getUTCDate(),

      hora: 20,
      minuto: 0,
      segundo: 0,
    });

  return {
    inicio,
    fin,

    fechaInicio:
      crearFechaIso(
        inicioLocal
          .getUTCFullYear(),

        inicioLocal
          .getUTCMonth() + 1,

        inicioLocal
          .getUTCDate(),
      ),

    fechaFin:
      crearFechaIso(
        finLocal
          .getUTCFullYear(),

        finLocal
          .getUTCMonth() + 1,

        finLocal
          .getUTCDate(),
      ),

    fechaActual:
      crearFechaIso(
        partesAhora.anio,
        partesAhora.mes,
        partesAhora.dia,
      ),
  };
}

function fechaIsoValida(
  anio: number,
  mes: number,
  dia: number,
): boolean {
  const fecha =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia,
      ),
    );

  return (
    fecha.getUTCFullYear() ===
      anio &&
    fecha.getUTCMonth() ===
      mes - 1 &&
    fecha.getUTCDate() ===
      dia
  );
}

function convertirFechaPartido(
  valor: unknown,
): FechaPartidoConvertida | null {
  const texto =
    convertirTexto(valor);

  if (!texto) {
    return null;
  }

  let anio = 0;
  let mes = 0;
  let dia = 0;

  let hora = 0;
  let minuto = 0;
  let segundo = 0;

  const formatoIso =
    texto.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2}):(\d{2})(?::(\d{2}))?/,
    );

  if (formatoIso) {
    anio =
      Number(formatoIso[1]);

    mes =
      Number(formatoIso[2]);

    dia =
      Number(formatoIso[3]);

    hora =
      Number(formatoIso[4]);

    minuto =
      Number(formatoIso[5]);

    segundo =
      Number(
        formatoIso[6] ?? 0,
      );
  } else {
    const formatoEspanol =
      texto.match(
        /^(\d{2})\/(\d{2})\/(\d{4})(?:T|\s)(\d{2}):(\d{2})(?::(\d{2}))?/,
      );

    if (!formatoEspanol) {
      return null;
    }

    dia =
      Number(
        formatoEspanol[1],
      );

    mes =
      Number(
        formatoEspanol[2],
      );

    anio =
      Number(
        formatoEspanol[3],
      );

    hora =
      Number(
        formatoEspanol[4],
      );

    minuto =
      Number(
        formatoEspanol[5],
      );

    segundo =
      Number(
        formatoEspanol[6] ??
          0,
      );
  }

  if (
    !fechaIsoValida(
      anio,
      mes,
      dia,
    ) ||
    hora < 0 ||
    hora > 23 ||
    minuto < 0 ||
    minuto > 59 ||
    segundo < 0 ||
    segundo > 59
  ) {
    return null;
  }

  return {
    fecha:
      crearFechaIso(
        anio,
        mes,
        dia,
      ),

    hora:
      `${rellenarDosDigitos(
        hora,
      )}:${rellenarDosDigitos(
        minuto,
      )}`,

    instante:
      convertirHoraMadridAUtc({
        anio,
        mes,
        dia,
        hora,
        minuto,
        segundo,
      }),
  };
}

function extraerColeccion(
  valor: unknown,
): PartidoFbibCrudo[] {
  if (Array.isArray(valor)) {
    return valor.filter(
      esObjeto,
    ) as PartidoFbibCrudo[];
  }

  if (esObjeto(valor)) {
    return Object.values(
      valor,
    ).filter(
      esObjeto,
    ) as PartidoFbibCrudo[];
  }

  return [];
}

function extraerPartidos(
  valor: unknown,
): PartidoFbibCrudo[] {
  if (Array.isArray(valor)) {
    return extraerColeccion(
      valor,
    );
  }

  if (!esObjeto(valor)) {
    return [];
  }

  const partidosDirectos =
    extraerColeccion(
      valor.matches,
    );

  if (
    partidosDirectos.length >
    0
  ) {
    return partidosDirectos;
  }

  const contenedores = [
    valor.data,
    valor.result,
    valor.value,
  ];

  for (
    const contenedor of
    contenedores
  ) {
    if (
      Array.isArray(
        contenedor,
      )
    ) {
      return extraerColeccion(
        contenedor,
      );
    }

    if (
      esObjeto(
        contenedor,
      )
    ) {
      const partidos =
        extraerColeccion(
          contenedor.matches,
        );

      if (
        partidos.length > 0
      ) {
        return partidos;
      }
    }
  }

  return [];
}

function obtenerMesesPeriodo(
  fechaInicio: string,
  fechaFin: string,
): number[] {
  const [
    anioInicio,
    mesInicio,
  ] =
    fechaInicio
      .split("-")
      .map(Number);

  const [
    anioFin,
    mesFin,
  ] =
    fechaFin
      .split("-")
      .map(Number);

  const cursor =
    new Date(
      Date.UTC(
        anioInicio,
        mesInicio - 1,
        1,
      ),
    );

  const ultimoMes =
    new Date(
      Date.UTC(
        anioFin,
        mesFin - 1,
        1,
      ),
    );

  const meses =
    new Set<number>();

  while (
    cursor <= ultimoMes
  ) {
    meses.add(
      cursor.getUTCMonth() +
        1,
    );

    cursor.setUTCMonth(
      cursor.getUTCMonth() +
        1,
    );
  }

  return Array.from(
    meses,
  );
}

function obtenerJornada(
  partido:
    PartidoFbibCrudo,
): string | null {
  const numero =
    convertirTexto(
      partido.numMatchDay,
    );

  if (!numero) {
    return null;
  }

  const normalizado =
    normalizarTexto(
      numero,
    );

  if (
    normalizado.startsWith(
      "jornada",
    )
  ) {
    return numero;
  }

  return `Jornada ${numero}`;
}

function obtenerUbicacion(
  partido:
    PartidoFbibCrudo,
): string | null {
  const municipio =
    convertirTexto(
      partido.nameTown,
    );

  const instalacion =
    convertirTexto(
      partido.nameField,
    );

  const municipioNormalizado =
    normalizarTexto(
      municipio,
    );

  if (
    municipioNormalizado.includes(
      "andratx",
    )
  ) {
    const instalacionNormalizada =
      normalizarTexto(
        instalacion,
      );

    if (
      instalacionNormalizada.includes(
        "vinyet",
      )
    ) {
      return "Poliesportiu Es Vinyet";
    }

    if (
      instalacionNormalizada.includes(
        "palau",
      ) ||
      instalacionNormalizada.includes(
        "municipal d'esports",
      ) ||
      instalacionNormalizada.includes(
        "municipal de deportes",
      )
    ) {
      return "Palau Municipal d'Esports d'Andratx";
    }

    return (
      instalacion ||
      municipio ||
      "Andratx"
    );
  }

  return (
    municipio ||
    instalacion ||
    null
  );
}

function contieneIndicadorAplazado(
  partido:
    PartidoFbibCrudo,
): boolean {
  const contenido =
    [
      partido.state,
      partido.publicMessage,
      partido.description,
      partido.observations,
      partido.typeResult,
    ]
      .map(
        convertirTexto,
      )
      .join(" ");

  const normalizado =
    normalizarTexto(
      contenido,
    );

  return (
    normalizado.includes(
      "aplaz",
    ) ||
    normalizado.includes(
      "ajorn",
    ) ||
    normalizado.includes(
      "suspend",
    ) ||
    normalizado.includes(
      "suspes",
    )
  );
}

function obtenerPuntuacionLocal(
  partido:
    PartidoFbibCrudo,
): number | null {
  return (
    convertirNumeroNullable(
      partido.localScore,
    ) ??
    convertirNumeroNullable(
      partido.localPoints,
    ) ??
    convertirNumeroNullable(
      partido.resultLocal,
    )
  );
}

function obtenerPuntuacionVisitante(
  partido:
    PartidoFbibCrudo,
): number | null {
  return (
    convertirNumeroNullable(
      partido.visitorScore,
    ) ??
    convertirNumeroNullable(
      partido.visitorPoints,
    ) ??
    convertirNumeroNullable(
      partido.resultVisitor,
    )
  );
}

function obtenerEstadoPartido(
  partido:
    PartidoFbibCrudo,

  puntosLocal: number | null,
  puntosVisitante: number | null,
): EstadoPartidoPortada {
  if (
    convertirBooleano(
      partido.isLive,
    )
  ) {
    return "en-juego";
  }

  if (
    contieneIndicadorAplazado(
      partido,
    )
  ) {
    return "aplazado";
  }

  const resultadoVisible =
    !esValorFalso(
      partido.resultsVisibles,
    );

  if (
    resultadoVisible &&
    puntosLocal !== null &&
    puntosVisitante !== null
  ) {
    return "finalizado";
  }

  return "programado";
}

function obtenerNombreEquipo(
  equipoFbibId: string,
  nombreFbib: unknown,
  equiposPorFbibId:
    Map<string, FilaEquipo>,
): string {
  const equipoClub =
    equiposPorFbibId.get(
      equipoFbibId,
    );

  if (equipoClub) {
    return (
      equipoClub.nombre?.trim() ||
      equipoClub.nombre_corto?.trim() ||
      convertirTexto(
        nombreFbib,
      ) ||
      "C.B. Andratx"
    );
  }

  return (
    convertirTexto(
      nombreFbib,
    ) ||
    "Equipo pendiente"
  );
}

function crearEquipoPartido(
  opciones: {
    equipoFbibId: string;
    clubFbibId: string;

    nombre: unknown;
    escudo: unknown;

    equiposPorFbibId:
      Map<string, FilaEquipo>;
  },
): EquipoPartidoPortada {
  const {
    equipoFbibId,
    clubFbibId,
    nombre,
    escudo,
    equiposPorFbibId,
  } = opciones;

  const esClub =
    equiposPorFbibId.has(
      equipoFbibId,
    ) ||
    clubFbibId ===
      ID_CLUB_ANDRATX;

  return {
    id:
      equipoFbibId ||
      null,

    nombre:
      obtenerNombreEquipo(
        equipoFbibId,
        nombre,
        equiposPorFbibId,
      ),

    escudo:
      esClub
        ? normalizarImagen(
            escudo,
          ) ||
          URL_ESCUDO_CLUB
        : normalizarImagen(
            escudo,
          ),

    esClub,
  };
}

function convertirPartido(
  partido:
    PartidoFbibCrudo,

  equiposPorFbibId:
    Map<string, FilaEquipo>,

  inicio: Date,
  fin: Date,
): PartidoPortada | null {
  const id =
    convertirTexto(
      partido.idMatch,
    );

  const equipoLocalId =
    convertirTexto(
      partido.idLocalTeam,
    );

  const equipoVisitanteId =
    convertirTexto(
      partido.idVisitorTeam,
    );

  const clubLocalId =
    convertirTexto(
      partido.idLocalClub,
    );

  const clubVisitanteId =
    convertirTexto(
      partido.idVisitorClub,
    );

  const fechaPartido =
    convertirFechaPartido(
      partido.matchDay,
    );

  if (
    !id ||
    !equipoLocalId ||
    !equipoVisitanteId ||
    !fechaPartido
  ) {
    return null;
  }

  const perteneceAlClub =
    equiposPorFbibId.has(
      equipoLocalId,
    ) ||
    equiposPorFbibId.has(
      equipoVisitanteId,
    ) ||
    clubLocalId ===
      ID_CLUB_ANDRATX ||
    clubVisitanteId ===
      ID_CLUB_ANDRATX;

  if (!perteneceAlClub) {
    return null;
  }

  const instante =
    fechaPartido
      .instante
      .getTime();

  if (
    instante <
      inicio.getTime() ||
    instante >=
      fin.getTime()
  ) {
    return null;
  }

  const puntosLocal =
    obtenerPuntuacionLocal(
      partido,
    );

  const puntosVisitante =
    obtenerPuntuacionVisitante(
      partido,
    );

  return {
    id,

    fecha:
      fechaPartido.fecha,

    hora:
      fechaPartido.hora,

    jornada:
      obtenerJornada(
        partido,
      ),

    estado:
      obtenerEstadoPartido(
        partido,
        puntosLocal,
        puntosVisitante,
      ),

    equipoLocal:
      crearEquipoPartido({
        equipoFbibId:
          equipoLocalId,

        clubFbibId:
          clubLocalId,

        nombre:
          partido.nameLocalTeam,

        escudo:
          partido.localClubLogo,

        equiposPorFbibId,
      }),

    equipoVisitante:
      crearEquipoPartido({
        equipoFbibId:
          equipoVisitanteId,

        clubFbibId:
          clubVisitanteId,

        nombre:
          partido.nameVisitorTeam,

        escudo:
          partido.visitorClubLogo,

        equiposPorFbibId,
      }),

    puntosLocal,
    puntosVisitante,

    ubicacion:
      obtenerUbicacion(
        partido,
      ),

    enlaceFbib:
      `https://www.fbib.es/partido/${encodeURIComponent(
        id,
      )}`,
  };
}

async function obtenerEquiposClub():
  Promise<FilaEquipo[]> {
  const {
    data:
      temporadaEncontrada,

    error:
      errorTemporada,
  } =
    await supabaseServidor
      .from(
        "temporadas",
      )
      .select("id")
      .eq(
        "activa",
        true,
      )
      .limit(1)
      .maybeSingle();

  if (errorTemporada) {
    throw new ErrorObtenerPartidosPortada(
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
    data:
      equiposEncontrados,

    error:
      errorEquipos,
  } =
    await supabaseServidor
      .from(
        "equipos",
      )
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
      .eq(
        "activo",
        true,
      )
      .not(
        "id_equipo_fbib",
        "is",
        null,
      )
      .order(
        "categoria",
        {
          ascending: true,
        },
      )
      .order(
        "nombre",
        {
          ascending: true,
        },
      );

  if (errorEquipos) {
    throw new ErrorObtenerPartidosPortada(
      `No se han podido obtener los equipos del club: ${errorEquipos.message}`,
      500,
    );
  }

  return (
    equiposEncontrados ??
    []
  ) as FilaEquipo[];
}

async function consultarPartidosFbib(
  equipos: FilaEquipo[],
  meses: number[],
): Promise<ResultadoConsultaFbib[]> {
  const consultas =
    equipos.flatMap(
      (equipo) => {
        const equipoFbibId =
          convertirTexto(
            equipo.id_equipo_fbib,
          );

        if (!equipoFbibId) {
          return [];
        }

        return meses.map(
          async (
            mes,
          ): Promise<ResultadoConsultaFbib> => {
            const ruta =
              `/Match/getByTeamAndMonth/${encodeURIComponent(
                equipoFbibId,
              )}/${mes}`;

            try {
              const resultado =
                await obtenerDatosEsbFbib(
                  ruta,
                );

              return {
                correcto: true,

                partidos:
                  extraerPartidos(
                    resultado,
                  ),
              };
            } catch (error) {
              console.error(
                `Error consultando los partidos de portada del equipo FBIB ${equipoFbibId} para el mes ${mes}:`,
                error,
              );

              return {
                correcto: false,
                partidos: [],
              };
            }
          },
        );
      },
    );

  return Promise.all(
    consultas,
  );
}

export async function obtenerPartidosPortada(
  ahora = new Date(),
): Promise<PeriodoPartidosPortada> {
  const periodo =
    obtenerPeriodoActual(
      ahora,
    );

  const equipos =
    await obtenerEquiposClub();

  if (
    equipos.length === 0
  ) {
    return {
      inicio:
        periodo.inicio
          .toISOString(),

      fin:
        periodo.fin
          .toISOString(),

      fechaActual:
        periodo.fechaActual,

      partidos: [],
    };
  }

  const equiposPorFbibId =
    new Map<
      string,
      FilaEquipo
    >();

  equipos.forEach(
    (equipo) => {
      const equipoFbibId =
        convertirTexto(
          equipo.id_equipo_fbib,
        );

      if (equipoFbibId) {
        equiposPorFbibId.set(
          equipoFbibId,
          equipo,
        );
      }
    },
  );

  const meses =
    obtenerMesesPeriodo(
      periodo.fechaInicio,
      periodo.fechaFin,
    );

  const resultados =
    await consultarPartidosFbib(
      equipos,
      meses,
    );

  const consultasCorrectas =
    resultados.filter(
      (resultado) =>
        resultado.correcto,
    ).length;

  if (
    resultados.length > 0 &&
    consultasCorrectas === 0
  ) {
    throw new ErrorObtenerPartidosPortada(
      "No se han podido consultar los partidos en la FBIB.",
      502,
    );
  }

  const partidosPorId =
    new Map<
      string,
      PartidoPortada
    >();

  resultados.forEach(
    (resultado) => {
      resultado.partidos.forEach(
        (partidoFbib) => {
          const partido =
            convertirPartido(
              partidoFbib,
              equiposPorFbibId,
              periodo.inicio,
              periodo.fin,
            );

          if (
            !partido ||
            partidosPorId.has(
              partido.id,
            )
          ) {
            return;
          }

          partidosPorId.set(
            partido.id,
            partido,
          );
        },
      );
    },
  );

  const partidos =
    Array.from(
      partidosPorId.values(),
    ).sort(
      (
        partidoA,
        partidoB,
      ) => {
        const fechaA =
          `${partidoA.fecha} ${partidoA.hora ?? "23:59"}`;

        const fechaB =
          `${partidoB.fecha} ${partidoB.hora ?? "23:59"}`;

        return (
          fechaA.localeCompare(
            fechaB,
          ) ||
          partidoA.equipoLocal.nombre.localeCompare(
            partidoB.equipoLocal.nombre,
            "es",
          )
        );
      },
    );

  return {
    inicio:
      periodo.inicio
        .toISOString(),

    fin:
      periodo.fin
        .toISOString(),

    fechaActual:
      periodo.fechaActual,

    partidos,
  };
}