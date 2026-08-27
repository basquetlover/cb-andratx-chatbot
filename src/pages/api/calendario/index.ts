import type { APIRoute } from "astro";

import { obtenerDatosEsbFbib } from "@servicios/fbib/cliente/obtenerDatosEsbFbib";
import { supabaseServidor } from "@servicios/supabase/servidor";

export const prerender = false;

type TipoEventoCalendario =
  | "evento"
  | "entreno"
  | "entreno-modificado"
  | "entreno-cancelado"
  | "partido-casa"
  | "partido-fuera";

interface EventoCalendarioClub {
  id: string;
  titulo: string;
  fecha: string;
  fechaFin?: string | null;
  tipo: TipoEventoCalendario;
  horaInicio?: string | null;
  horaFin?: string | null;
  ubicacion?: string | null;
  descripcion?: string | null;
  color?: string | null;
  url?: string | null;
  equipoId?: string | null;
  equipoNombre?: string | null;
  alcance?: "club" | "equipo";
}

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

interface FilaEquipo {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  temporada_id: string;
  id_equipo_fbib: string | null;
}

interface FilaEntrenamiento {
  id: string;
  equipo_id: string | null;
  temporada_id: string | null;
  instalacion_id: string | null;
  dia_semana: number | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  observaciones: string | null;
  activo: boolean | null;
}

interface FilaExcepcion {
  id: string;
  equipo_id: string | null;
  entrenamiento_id: string | null;
  instalacion_id: string | null;
  tipo: string | null;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string | null;
}

interface FilaInstalacion {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  direccion: string | null;
  localidad: string | null;
}

interface OcurrenciaEntrenamiento {
  id: string;
  equipoId: string;
  entrenamientoId: string | null;
  instalacionId: string | null;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  observaciones: string | null;
  motivo: string | null;
  estado:
    | "normal"
    | "modificado"
    | "cancelado";
}

interface FechaHoraPartido {
  fecha: string;
  hora: string | null;
}

const cabecerasJson = {
  "Cache-Control":
    "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
  "Content-Type":
    "application/json; charset=utf-8",
  "X-Content-Type-Options":
    "nosniff",
};

function respuestaError(
  error: string,
  estado: number,
): Response {
  return Response.json(
    {
      ok: false,
      data: null,
      error,
    },
    {
      status: estado,
      headers: cabecerasJson,
    },
  );
}

function rellenarNumero(
  numero: number,
): string {
  return String(numero).padStart(
    2,
    "0",
  );
}

function crearFechaIso(
  anio: number,
  mes: number,
  dia: number,
): string {
  return `${anio}-${rellenarNumero(
    mes,
  )}-${rellenarNumero(dia)}`;
}

function convertirFechaUtc(
  fecha: string,
): Date {
  const [anio, mes, dia] =
    fecha.split("-").map(
      Number,
    );

  return new Date(
    Date.UTC(
      anio,
      mes - 1,
      dia,
    ),
  );
}

function convertirDateAFechaIso(
  fecha: Date,
): string {
  return crearFechaIso(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth() + 1,
    fecha.getUTCDate(),
  );
}

function sumarDias(
  fecha: Date,
  dias: number,
): Date {
  const resultado =
    new Date(fecha);

  resultado.setUTCDate(
    resultado.getUTCDate() +
      dias,
  );

  return resultado;
}

function obtenerRangoMes(
  anio: number,
  mes: number,
): {
  inicio: string;
  fin: string;
} {
  const ultimoDia =
    new Date(
      Date.UTC(
        anio,
        mes,
        0,
      ),
    ).getUTCDate();

  return {
    inicio:
      crearFechaIso(
        anio,
        mes,
        1,
      ),

    fin:
      crearFechaIso(
        anio,
        mes,
        ultimoDia,
      ),
  };
}

function obtenerDiaSemanaIso(
  fecha: string,
): number {
  const dia =
    convertirFechaUtc(
      fecha,
    ).getUTCDay();

  return dia === 0
    ? 7
    : dia;
}

function normalizarHora(
  hora:
    | string
    | null
    | undefined,
): string | null {
  if (
    typeof hora !== "string"
  ) {
    return null;
  }

  const valor =
    hora.trim();

  const coincidencia =
    valor.match(
      /^(\d{1,2}):(\d{2})/,
    );

  if (!coincidencia) {
    return null;
  }

  return `${rellenarNumero(
    Number(coincidencia[1]),
  )}:${coincidencia[2]}`;
}

function normalizarTexto(
  valor: unknown,
): string {
  if (
    typeof valor !== "string"
  ) {
    return "";
  }

  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .trim()
    .toLowerCase();
}

function obtenerNombreEquipo(
  equipo: FilaEquipo,
): string {
  return (
    equipo.nombre?.trim() ||
    equipo.nombre_corto?.trim() ||
    "Equipo"
  );
}

function fechaPertenecePeriodo(
  fecha: string,
  fechaInicio: string | null,
  fechaFin: string | null,
): boolean {
  if (
    fechaInicio &&
    fecha < fechaInicio
  ) {
    return false;
  }

  if (
    fechaFin &&
    fecha > fechaFin
  ) {
    return false;
  }

  return true;
}

function esTipoCancelacion(
  tipo: string | null,
): boolean {
  const valor =
    normalizarTexto(tipo);

  return (
    valor.includes("cancel") ||
    valor.includes("anulad") ||
    valor.includes("suspend")
  );
}

function esTipoExtra(
  tipo: string | null,
): boolean {
  const valor =
    normalizarTexto(tipo);

  return (
    valor.includes("extra") ||
    valor.includes("adicional") ||
    valor.includes("puntual")
  );
}

function crearClaveOcurrencia(
  equipoId: string,
  entrenamientoId: string,
  fecha: string,
): string {
  return [
    equipoId,
    entrenamientoId,
    fecha,
  ].join(":");
}

function generarOcurrenciasHabituales(
  entrenamientos:
    FilaEntrenamiento[],
  inicio: string,
  fin: string,
): Map<
  string,
  OcurrenciaEntrenamiento
> {
  const ocurrencias =
    new Map<
      string,
      OcurrenciaEntrenamiento
    >();

  entrenamientos.forEach(
    (entrenamiento) => {
      if (
        !entrenamiento.equipo_id ||
        !entrenamiento.id ||
        !entrenamiento.dia_semana
      ) {
        return;
      }

      let fechaActual =
        convertirFechaUtc(
          inicio,
        );

      const fechaFinal =
        convertirFechaUtc(
          fin,
        );

      while (
        fechaActual <=
        fechaFinal
      ) {
        const fecha =
          convertirDateAFechaIso(
            fechaActual,
          );

        if (
          obtenerDiaSemanaIso(
            fecha,
          ) ===
            entrenamiento.dia_semana &&
          fechaPertenecePeriodo(
            fecha,
            entrenamiento.fecha_inicio,
            entrenamiento.fecha_fin,
          )
        ) {
          const clave =
            crearClaveOcurrencia(
              entrenamiento.equipo_id,
              entrenamiento.id,
              fecha,
            );

          ocurrencias.set(
            clave,
            {
              id:
                `entrenamiento-${entrenamiento.id}-${fecha}`,

              equipoId:
                entrenamiento.equipo_id,

              entrenamientoId:
                entrenamiento.id,

              instalacionId:
                entrenamiento.instalacion_id,

              fecha,

              horaInicio:
                normalizarHora(
                  entrenamiento.hora_inicio,
                ),

              horaFin:
                normalizarHora(
                  entrenamiento.hora_fin,
                ),

              observaciones:
                entrenamiento.observaciones,

              motivo: null,
              estado: "normal",
            },
          );
        }

        fechaActual =
          sumarDias(
            fechaActual,
            1,
          );
      }
    },
  );

  return ocurrencias;
}

function aplicarExcepciones(
  ocurrencias: Map<
    string,
    OcurrenciaEntrenamiento
  >,
  entrenamientos:
    FilaEntrenamiento[],
  excepciones:
    FilaExcepcion[],
): OcurrenciaEntrenamiento[] {
  const entrenamientosPorId =
    new Map(
      entrenamientos.map(
        (entrenamiento) => [
          entrenamiento.id,
          entrenamiento,
        ],
      ),
    );

  const extras:
    OcurrenciaEntrenamiento[] =
    [];

  excepciones.forEach(
    (excepcion) => {
      if (
        !excepcion.id ||
        !excepcion.equipo_id ||
        !excepcion.fecha
      ) {
        return;
      }

      const entrenamientoBase =
        excepcion.entrenamiento_id
          ? entrenamientosPorId.get(
              excepcion.entrenamiento_id,
            )
          : undefined;

      const cancelada =
        esTipoCancelacion(
          excepcion.tipo,
        );

      const extra =
        esTipoExtra(
          excepcion.tipo,
        );

      const ocurrenciaExcepcion:
        OcurrenciaEntrenamiento = {
        id:
          `excepcion-${excepcion.id}`,

        equipoId:
          excepcion.equipo_id,

        entrenamientoId:
          excepcion.entrenamiento_id,

        instalacionId:
          excepcion.instalacion_id ??
          entrenamientoBase?.instalacion_id ??
          null,

        fecha:
          excepcion.fecha,

        horaInicio:
          normalizarHora(
            excepcion.hora_inicio,
          ) ??
          normalizarHora(
            entrenamientoBase?.hora_inicio,
          ),

        horaFin:
          normalizarHora(
            excepcion.hora_fin,
          ) ??
          normalizarHora(
            entrenamientoBase?.hora_fin,
          ),

        observaciones:
          entrenamientoBase?.observaciones ??
          null,

        motivo:
          excepcion.motivo,

        estado:
          cancelada
            ? "cancelado"
            : "modificado",
      };

      if (
        extra ||
        !excepcion.entrenamiento_id
      ) {
        extras.push(
          ocurrenciaExcepcion,
        );

        return;
      }

      const clave =
        crearClaveOcurrencia(
          excepcion.equipo_id,
          excepcion.entrenamiento_id,
          excepcion.fecha,
        );

      /*
       * Sustituimos el entrenamiento
       * habitual. De esta manera los
       * cancelados siguen apareciendo
       * en el calendario.
       */
      ocurrencias.set(
        clave,
        ocurrenciaExcepcion,
      );
    },
  );

  return [
    ...ocurrencias.values(),
    ...extras,
  ];
}

function obtenerUbicacion(
  instalacion:
    | FilaInstalacion
    | undefined,
): string | null {
  if (!instalacion) {
    return null;
  }

  const nombre =
    instalacion.nombre?.trim() ||
    instalacion.nombre_corto?.trim();

  const localidad =
    instalacion.localidad?.trim();

  if (
    nombre &&
    localidad
  ) {
    return `${nombre}, ${localidad}`;
  }

  return (
    nombre ??
    localidad ??
    null
  );
}

function convertirEntrenamientosAEventos(
  ocurrencias:
    OcurrenciaEntrenamiento[],
  equiposPorId: Map<
    string,
    FilaEquipo
  >,
  instalacionesPorId: Map<
    string,
    FilaInstalacion
  >,
): EventoCalendarioClub[] {
  return ocurrencias.flatMap(
    (ocurrencia) => {
      const equipo =
        equiposPorId.get(
          ocurrencia.equipoId,
        );

      if (!equipo) {
        return [];
      }

      const nombreEquipo =
        obtenerNombreEquipo(
          equipo,
        );

      const instalacion =
        ocurrencia.instalacionId
          ? instalacionesPorId.get(
              ocurrencia.instalacionId,
            )
          : undefined;

      let tipo:
        TipoEventoCalendario =
        "entreno";

      let titulo =
        `Entrenamiento · ${nombreEquipo}`;

      if (
        ocurrencia.estado ===
        "modificado"
      ) {
        tipo =
          "entreno-modificado";

        titulo =
          `Entrenamiento modificado · ${nombreEquipo}`;
      }

      if (
        ocurrencia.estado ===
        "cancelado"
      ) {
        tipo =
          "entreno-cancelado";

        titulo =
          `Entrenamiento cancelado · ${nombreEquipo}`;
      }

      const descripcion = [
        ocurrencia.motivo,
        ocurrencia.observaciones,
      ]
        .filter(
          (
            valor,
          ): valor is string =>
            typeof valor ===
              "string" &&
            valor.trim().length >
              0,
        )
        .join(" · ");

      return [
        {
          id: ocurrencia.id,
          titulo,
          fecha:
            ocurrencia.fecha,
          tipo,

          horaInicio:
            ocurrencia.horaInicio,

          horaFin:
            ocurrencia.horaFin,

          ubicacion:
            obtenerUbicacion(
              instalacion,
            ),

          descripcion:
            descripcion || null,

          url:
            `/equipos/${equipo.id}`,

          equipoId:
            equipo.id,

          equipoNombre:
            nombreEquipo,

          alcance:
            "equipo" as const,
        },
      ];
    },
  );
}

function esRegistro(
  valor: unknown,
): valor is Record<
  string,
  unknown
> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function obtenerValor(
  registro: Record<
    string,
    unknown
  >,
  claves: string[],
): unknown {
  for (
    const clave of claves
  ) {
    if (
      registro[clave] !==
        undefined &&
      registro[clave] !== null
    ) {
      return registro[clave];
    }
  }

  return null;
}

function obtenerTexto(
  registro: Record<
    string,
    unknown
  >,
  claves: string[],
): string | null {
  const valor =
    obtenerValor(
      registro,
      claves,
    );

  if (
    typeof valor ===
      "string" ||
    typeof valor ===
      "number"
  ) {
    const texto =
      String(valor).trim();

    return texto || null;
  }

  return null;
}

function extraerRegistrosPartidos(
  valor: unknown,
  profundidad = 0,
): Record<
  string,
  unknown
>[] {
  if (
    profundidad > 5 ||
    valor === null ||
    valor === undefined
  ) {
    return [];
  }

  if (Array.isArray(valor)) {
    return valor.flatMap(
      (elemento) =>
        extraerRegistrosPartidos(
          elemento,
          profundidad + 1,
        ),
    );
  }

  if (!esRegistro(valor)) {
    return [];
  }

  const parecePartido =
    obtenerValor(
      valor,
      [
        "idMatch",
        "matchDay",
        "nameLocalTeam",
        "nameVisitorTeam",
      ],
    ) !== null;

  if (parecePartido) {
    return [valor];
  }

  const clavesContenedoras = [
    "matches",
    "data",
    "items",
    "results",
    "partidos",
  ];

  for (
    const clave of
    clavesContenedoras
  ) {
    if (
      valor[clave] !==
      undefined
    ) {
      const registros =
        extraerRegistrosPartidos(
          valor[clave],
          profundidad + 1,
        );

      if (
        registros.length > 0
      ) {
        return registros;
      }
    }
  }

  return Object.values(
    valor,
  ).flatMap((elemento) =>
    extraerRegistrosPartidos(
      elemento,
      profundidad + 1,
    ),
  );
}

function extraerFechaHoraPartido(
  partido: Record<
    string,
    unknown
  >,
): FechaHoraPartido | null {
  const valorFecha =
    obtenerValor(
      partido,
      [
        "matchDay",
        "date",
        "fecha",
        "matchDate",
      ],
    );

  if (
    typeof valorFecha ===
    "number"
  ) {
    const fecha =
      new Date(valorFecha);

    if (
      !Number.isNaN(
        fecha.getTime(),
      )
    ) {
      return {
        fecha:
          crearFechaIso(
            fecha.getUTCFullYear(),
            fecha.getUTCMonth() +
              1,
            fecha.getUTCDate(),
          ),

        hora:
          `${rellenarNumero(
            fecha.getUTCHours(),
          )}:${rellenarNumero(
            fecha.getUTCMinutes(),
          )}`,
      };
    }
  }

  if (
    typeof valorFecha !==
    "string"
  ) {
    return null;
  }

  const texto =
    valorFecha.trim();

  const fechaIso =
    texto.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2}))?/,
    );

  if (fechaIso) {
    return {
      fecha:
        `${fechaIso[1]}-${fechaIso[2]}-${fechaIso[3]}`,

      hora:
        fechaIso[4] &&
        fechaIso[5]
          ? `${rellenarNumero(
              Number(
                fechaIso[4],
              ),
            )}:${fechaIso[5]}`
          : normalizarHora(
              obtenerTexto(
                partido,
                [
                  "hour",
                  "hora",
                  "matchHour",
                ],
              ),
            ),
    };
  }

  const fechaEspanola =
    texto.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/,
    );

  if (fechaEspanola) {
    return {
      fecha:
        crearFechaIso(
          Number(
            fechaEspanola[3],
          ),
          Number(
            fechaEspanola[2],
          ),
          Number(
            fechaEspanola[1],
          ),
        ),

      hora:
        fechaEspanola[4] &&
        fechaEspanola[5]
          ? `${rellenarNumero(
              Number(
                fechaEspanola[4],
              ),
            )}:${fechaEspanola[5]}`
          : null,
    };
  }

  return null;
}

function obtenerResultadoPartido(
  partido: Record<
    string,
    unknown
  >,
): string | null {
  const local =
    obtenerTexto(
      partido,
      [
        "localScore",
        "scoreLocal",
      ],
    );

  const visitante =
    obtenerTexto(
      partido,
      [
        "visitorScore",
        "scoreVisitor",
      ],
    );

  if (
    local === null ||
    visitante === null
  ) {
    return null;
  }

  return `Resultado: ${local} – ${visitante}`;
}

function convertirPartidoAEvento(
  partido: Record<
    string,
    unknown
  >,
  equipo: FilaEquipo,
  inicioMes: string,
  finMes: string,
): EventoCalendarioClub | null {
  const fechaHora =
    extraerFechaHoraPartido(
      partido,
    );

  if (
    !fechaHora ||
    fechaHora.fecha <
      inicioMes ||
    fechaHora.fecha >
      finMes
  ) {
    return null;
  }

  const idPartido =
    obtenerTexto(
      partido,
      [
        "idMatch",
        "id",
        "matchId",
        "universallyid",
      ],
    );

  if (!idPartido) {
    return null;
  }

  const idLocal =
    obtenerTexto(
      partido,
      [
        "idLocalTeam",
        "localTeamId",
      ],
    );

  const idVisitante =
    obtenerTexto(
      partido,
      [
        "idVisitorTeam",
        "visitorTeamId",
      ],
    );

  const nombreLocal =
    obtenerTexto(
      partido,
      [
        "nameLocalTeam",
        "localTeamName",
      ],
    ) ??
    "Equipo local";

  const nombreVisitante =
    obtenerTexto(
      partido,
      [
        "nameVisitorTeam",
        "visitorTeamName",
      ],
    ) ??
    "Equipo visitante";

  const idFbib =
    equipo.id_equipo_fbib?.trim() ??
    "";

  const juegaEnCasa =
    idLocal === idFbib ||
    (
      idVisitante !== idFbib &&
      normalizarTexto(
        nombreLocal,
      ).includes(
        normalizarTexto(
          obtenerNombreEquipo(
            equipo,
          ),
        ),
      )
    );

  const nombreInstalacion =
    obtenerTexto(
      partido,
      [
        "facilityName",
        "nameFacility",
        "courtName",
        "installationName",
        "pavilion",
      ],
    );

  const localidad =
    obtenerTexto(
      partido,
      [
        "town",
        "locality",
        "municipality",
      ],
    );

  const ubicacion = [
    nombreInstalacion,
    localidad,
  ]
    .filter(
      (
        valor,
      ): valor is string =>
        Boolean(valor),
    )
    .join(", ");

  return {
    id:
      `fbib-${idPartido}`,

    titulo:
      `${nombreLocal} – ${nombreVisitante}`,

    fecha:
      fechaHora.fecha,

    tipo:
      juegaEnCasa
        ? "partido-casa"
        : "partido-fuera",

    horaInicio:
      fechaHora.hora,

    horaFin: null,

    ubicacion:
      ubicacion || null,

    descripcion:
      obtenerResultadoPartido(
        partido,
      ),

    url:
      `https://www.fbib.es/partido/${encodeURIComponent(
        idPartido,
      )}`,

    equipoId:
      equipo.id,

    equipoNombre:
      obtenerNombreEquipo(
        equipo,
      ),

    alcance: "equipo",
  };
}

async function obtenerPartidosEquipo(
  equipo: FilaEquipo,
  mes: number,
  inicioMes: string,
  finMes: string,
): Promise<
  EventoCalendarioClub[]
> {
  if (
    !equipo.id_equipo_fbib
  ) {
    return [];
  }

  const idFbib =
    equipo.id_equipo_fbib.trim();

  if (!idFbib) {
    return [];
  }

  try {
    const resultado =
      await obtenerDatosEsbFbib(
        `/Match/getByTeamAndMonth/${encodeURIComponent(
          idFbib,
        )}/${mes}`,
      );

    return extraerRegistrosPartidos(
      resultado,
    ).flatMap(
      (partido) => {
        const evento =
          convertirPartidoAEvento(
            partido,
            equipo,
            inicioMes,
            finMes,
          );

        return evento
          ? [evento]
          : [];
      },
    );
  } catch (error) {
    /*
     * Un error puntual de la FBIB
     * no debe impedir mostrar los
     * entrenamientos del club.
     */
    console.error(
      `Error obteniendo los partidos FBIB de ${obtenerNombreEquipo(
        equipo,
      )}:`,
      error,
    );

    return [];
  }
}

function eliminarEventosDuplicados(
  eventos:
    EventoCalendarioClub[],
): EventoCalendarioClub[] {
  const eventosPorClave =
    new Map<
      string,
      EventoCalendarioClub
    >();

  eventos.forEach(
    (evento) => {
      const clave = [
        evento.id,
        evento.fecha,
        evento.tipo,
      ].join(":");

      if (
        !eventosPorClave.has(
          clave,
        )
      ) {
        eventosPorClave.set(
          clave,
          evento,
        );
      }
    },
  );

  return Array.from(
    eventosPorClave.values(),
  ).sort(
    (primero, segundo) => {
      const comparacionFecha =
        primero.fecha.localeCompare(
          segundo.fecha,
        );

      if (
        comparacionFecha !== 0
      ) {
        return comparacionFecha;
      }

      return (
        primero.horaInicio ??
        "99:99"
      ).localeCompare(
        segundo.horaInicio ??
          "99:99",
      );
    },
  );
}

export const GET: APIRoute =
  async ({ url }) => {
    const anio =
      Number(
        url.searchParams.get(
          "anio",
        ),
      );

    const mes =
      Number(
        url.searchParams.get(
          "mes",
        ),
      );

    if (
      !Number.isInteger(anio) ||
      anio < 2020 ||
      anio > 2100
    ) {
      return respuestaError(
        "El año solicitado no es válido.",
        400,
      );
    }

    if (
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12
    ) {
      return respuestaError(
        "El mes solicitado no es válido.",
        400,
      );
    }

    try {
      const {
        data: temporadaEncontrada,
        error: errorTemporada,
      } =
        await supabaseServidor
          .from("temporadas")
          .select("id, nombre")
          .eq("activa", true)
          .limit(1)
          .maybeSingle();

      if (errorTemporada) {
        throw new Error(
          `No se ha podido obtener la temporada activa: ${errorTemporada.message}`,
        );
      }

      if (
        !temporadaEncontrada?.id
      ) {
        return Response.json(
          {
            ok: true,

            data: {
              temporadaId:
                null,

              eventos: [],
            },

            error: null,
          },
          {
            status: 200,
            headers:
              cabecerasJson,
          },
        );
      }

      const temporada =
        temporadaEncontrada as FilaTemporada;

      const {
        data: equiposEncontrados,
        error: errorEquipos,
      } =
        await supabaseServidor
          .from("equipos")
          .select(`
            id,
            nombre,
            nombre_corto,
            temporada_id,
            id_equipo_fbib
          `)
          .eq(
            "temporada_id",
            temporada.id,
          )
          .eq("activo", true)
          .order("nombre", {
            ascending: true,
          });

      if (errorEquipos) {
        throw new Error(
          `No se han podido obtener los equipos: ${errorEquipos.message}`,
        );
      }

      const equipos =
        (
          equiposEncontrados ??
          []
        ) as FilaEquipo[];

      if (
        equipos.length === 0
      ) {
        return Response.json(
          {
            ok: true,

            data: {
              temporadaId:
                temporada.id,

              eventos: [],
            },

            error: null,
          },
          {
            status: 200,
            headers:
              cabecerasJson,
          },
        );
      }

      const idsEquipos =
        equipos.map(
          (equipo) =>
            equipo.id,
        );

      const rangoMes =
        obtenerRangoMes(
          anio,
          mes,
        );

      const [
        resultadoEntrenamientos,
        resultadoExcepciones,
      ] = await Promise.all([
        supabaseServidor
          .from("entrenamientos")
          .select(`
            id,
            equipo_id,
            temporada_id,
            instalacion_id,
            dia_semana,
            hora_inicio,
            hora_fin,
            fecha_inicio,
            fecha_fin,
            observaciones,
            activo
          `)
          .eq(
            "temporada_id",
            temporada.id,
          )
          .eq("activo", true)
          .in(
            "equipo_id",
            idsEquipos,
          ),

        supabaseServidor
          .from(
            "excepciones_entrenamientos",
          )
          .select(`
            id,
            equipo_id,
            entrenamiento_id,
            instalacion_id,
            tipo,
            fecha,
            hora_inicio,
            hora_fin,
            motivo
          `)
          .in(
            "equipo_id",
            idsEquipos,
          )
          .gte(
            "fecha",
            rangoMes.inicio,
          )
          .lte(
            "fecha",
            rangoMes.fin,
          ),
      ]);

      if (
        resultadoEntrenamientos.error
      ) {
        throw new Error(
          `No se han podido obtener los entrenamientos: ${resultadoEntrenamientos.error.message}`,
        );
      }

      if (
        resultadoExcepciones.error
      ) {
        throw new Error(
          `No se han podido obtener las excepciones: ${resultadoExcepciones.error.message}`,
        );
      }

      const entrenamientos =
        (
          resultadoEntrenamientos.data ??
          []
        ) as FilaEntrenamiento[];

      const excepciones =
        (
          resultadoExcepciones.data ??
          []
        ) as FilaExcepcion[];

      const idsInstalaciones =
        Array.from(
          new Set(
            [
              ...entrenamientos.map(
                (entrenamiento) =>
                  entrenamiento.instalacion_id,
              ),

              ...excepciones.map(
                (excepcion) =>
                  excepcion.instalacion_id,
              ),
            ].filter(
              (
                id,
              ): id is string =>
                typeof id ===
                  "string" &&
                id.length > 0,
            ),
          ),
        );

      let instalaciones:
        FilaInstalacion[] =
        [];

      if (
        idsInstalaciones.length >
        0
      ) {
        const {
          data,
          error,
        } =
          await supabaseServidor
            .from(
              "instalaciones",
            )
            .select(`
              id,
              nombre,
              nombre_corto,
              direccion,
              localidad
            `)
            .in(
              "id",
              idsInstalaciones,
            );

        if (error) {
          throw new Error(
            `No se han podido obtener las instalaciones: ${error.message}`,
          );
        }

        instalaciones =
          (
            data ?? []
          ) as FilaInstalacion[];
      }

      const equiposPorId =
        new Map(
          equipos.map(
            (equipo) => [
              equipo.id,
              equipo,
            ],
          ),
        );

      const instalacionesPorId =
        new Map(
          instalaciones.map(
            (instalacion) => [
              instalacion.id,
              instalacion,
            ],
          ),
        );

      const ocurrencias =
        generarOcurrenciasHabituales(
          entrenamientos,
          rangoMes.inicio,
          rangoMes.fin,
        );

      const ocurrenciasFinales =
        aplicarExcepciones(
          ocurrencias,
          entrenamientos,
          excepciones,
        );

      const eventosEntrenamientos =
        convertirEntrenamientosAEventos(
          ocurrenciasFinales,
          equiposPorId,
          instalacionesPorId,
        );

      const resultadosPartidos =
        await Promise.allSettled(
          equipos.map(
            (equipo) =>
              obtenerPartidosEquipo(
                equipo,
                mes,
                rangoMes.inicio,
                rangoMes.fin,
              ),
          ),
        );

      const eventosPartidos =
        resultadosPartidos.flatMap(
          (resultado) =>
            resultado.status ===
            "fulfilled"
              ? resultado.value
              : [],
        );

      const eventos =
        eliminarEventosDuplicados(
          [
            ...eventosEntrenamientos,
            ...eventosPartidos,
          ],
        );

      return Response.json(
        {
          ok: true,

          data: {
            temporadaId:
              temporada.id,

            temporadaNombre:
              temporada.nombre,

            eventos,
          },

          error: null,
        },
        {
          status: 200,
          headers:
            cabecerasJson,
        },
      );
    } catch (error) {
      console.error(
        "Error en GET /api/calendario:",
        error,
      );

      return respuestaError(
        "No se ha podido obtener el calendario del club.",
        500,
      );
    }
  };

export const ALL: APIRoute =
  async () => {
    return Response.json(
      {
        ok: false,
        data: null,
        error:
          "Método no permitido.",
      },
      {
        status: 405,

        headers: {
          ...cabecerasJson,
          Allow: "GET",
        },
      },
    );
  };