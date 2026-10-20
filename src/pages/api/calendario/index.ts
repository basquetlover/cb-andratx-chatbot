
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

export const prerender = false;

// ======================================================
// TIPOS PÚBLICOS DEL CALENDARIO
// ======================================================

type TipoEventoCalendario =
  | "evento"
  | "entreno"
  | "entreno-modificado"
  | "entreno-cancelado"
  | "partido-casa"
  | "partido-fuera";

type AlcanceEventoCalendario =
  | "club"
  | "equipo"
  | "todo-club"
  | "equipos";

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
  categoria?: string | null;
  color?: string | null;
  url?: string | null;
  equipoId?: string | null;
  equipoNombre?: string | null;
  alcance?: AlcanceEventoCalendario;
  equiposIds?: string[];
}

// ======================================================
// TIPOS DE BASE DE DATOS
// ======================================================

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

interface FilaEquipo {
  id: string;
  slug: string | null;
  nombre: string | null;
  nombre_corto: string | null;
  temporada_id: string;
  id_equipo_fbib: string | null;
  categoria: string | null;
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

interface FilaRelacionEventoEquipo {
  equipo_id: string | null;
}

interface FilaEvento {
  id: string;
  temporada_id: string | null;
  titulo: string | null;
  descripcion_corta: string | null;
  descripcion: string | null;
  tipo: string | null;

  alcance:
    | "todo-club"
    | "equipos"
    | null;

  fecha_inicio: string | null;
  fecha_fin: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  todo_el_dia: boolean | null;

  instalacion_id: string | null;
  ubicacion: string | null;
  direccion: string | null;

  imagen: string | null;
  banner_notificacion: string | null;
  url_informacion: string | null;
  url_inscripcion: string | null;

  requiere_inscripcion: boolean | null;
  destacado: boolean | null;
  mostrar_calendario: boolean | null;
  estado: string | null;

  eventos_equipos:
    FilaRelacionEventoEquipo[] | null;
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

// ======================================================
// CONFIGURACIÓN
// ======================================================

const cabecerasJson = {
  "Cache-Control":
    "public, max-age=60, s-maxage=300, stale-while-revalidate=300",

  "Content-Type":
    "application/json; charset=utf-8",

  "X-Content-Type-Options":
    "nosniff",
};

// ======================================================
// RESPUESTAS DE ERROR
// ======================================================

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

// ======================================================
// UTILIDADES DE FECHAS
// ======================================================

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
  return (
    `${anio}-` +
    `${rellenarNumero(mes)}-` +
    rellenarNumero(dia)
  );
}

function convertirFechaUtc(
  fecha: string,
): Date {
  const [
    anio,
    mes,
    dia,
  ] = fecha
    .split("-")
    .map(Number);

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
    resultado.getUTCDate() + dias,
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
  hora: string | null | undefined,
): string | null {
  if (
    typeof hora !== "string"
  ) {
    return null;
  }

  const coincidencia =
    hora
      .trim()
      .match(
        /^(\d{1,2}):(\d{2})/,
      );

  if (!coincidencia) {
    return null;
  }

  return (
    `${rellenarNumero(
      Number(coincidencia[1]),
    )}:${coincidencia[2]}`
  );
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

// ======================================================
// ENTRENAMIENTOS: COMPROBACIONES
// ======================================================

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

// ======================================================
// GENERAR ENTRENAMIENTOS HABITUALES
// ======================================================

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

        fechaActual = sumarDias(
          fechaActual,
          1,
        );
      }
    },
  );

  return ocurrencias;
}

// ======================================================
// APLICAR EXCEPCIONES DE ENTRENAMIENTOS
// ======================================================

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
          entrenamientoBase
            ?.instalacion_id ??
          null,

        fecha:
          excepcion.fecha,

        horaInicio:
          normalizarHora(
            excepcion.hora_inicio,
          ) ??
          normalizarHora(
            entrenamientoBase
              ?.hora_inicio,
          ),

        horaFin:
          normalizarHora(
            excepcion.hora_fin,
          ) ??
          normalizarHora(
            entrenamientoBase
              ?.hora_fin,
          ),

        observaciones:
          entrenamientoBase
            ?.observaciones ??
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
       * La excepción sustituye
       * al entrenamiento habitual.
       *
       * Los entrenamientos cancelados
       * se mantienen visibles.
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

// ======================================================
// UBICACIÓN DE ENTRENAMIENTOS
// ======================================================

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

// ======================================================
// ENTRENAMIENTOS -> EVENTOS DEL CALENDARIO
// ======================================================

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
          id:
            ocurrencia.id,

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

          categoria:
            equipo.categoria,

          url:
            equipo.slug?.trim()
              ? `/equipos/${encodeURIComponent(
                  equipo.slug.trim(),
                )}`
              : null,

          equipoId:
            equipo.id,

          equipoNombre:
            nombreEquipo,

          alcance:
            "equipo" as const,

          equiposIds: [
            equipo.id,
          ],
        },
      ];
    },
  );
}

// ======================================================
// PARTIDOS: FUENTE ÚNICA FBIB + CBA
// ======================================================

function convertirPartidosAEventos(
  partidos: PartidoCombinado[],

  equiposPorId: Map<
    string,
    FilaEquipo
  >,
): EventoCalendarioClub[] {
  return partidos.flatMap(
    (partido) => {
      if (!partido.fecha) {
        return [];
      }

      // ----------------------------------------------
      // 1. EQUIPOS DEL CLUB PARTICIPANTES
      // ----------------------------------------------

      /*
       * Se crea UN evento por partido.
       *
       * Si hay dos equipos del CBA
       * en el mismo encuentro, se
       * conservan ambos identificadores.
       *
       * No se generan dos eventos
       * diferentes del mismo partido.
       */

      const equiposIds =
        Array.from(
          new Set(
            partido.equiposIdsClub.filter(
              (id) =>
                equiposPorId.has(
                  id,
                ),
            ),
          ),
        );

      if (
        equiposIds.length === 0
      ) {
        return [];
      }

      const idEquipoPrincipal =
        partido.equipoIdClub &&
        equiposIds.includes(
          partido.equipoIdClub,
        )
          ? partido.equipoIdClub
          : equiposIds[0];

      const equipoPrincipal =
        equiposPorId.get(
          idEquipoPrincipal,
        );

      if (!equipoPrincipal) {
        return [];
      }

      const nombreEquipo =
        obtenerNombreEquipo(
          equipoPrincipal,
        );

      // ----------------------------------------------
      // 2. CASA / FUERA
      // ----------------------------------------------

      /*
       * Nunca se calcula CASA/FUERA
       * a partir de la posición
       * local/visitante.
       *
       * Lo calcula el servicio central
       * según la instalación.
       */

      const tipo:
        TipoEventoCalendario =
        partido.esEnCasa === true
          ? "partido-casa"
          : partido.esEnCasa === false
            ? "partido-fuera"
            : "evento";

      // ----------------------------------------------
      // 3. RESULTADO
      // ----------------------------------------------

      const descripcionResultado =
        partido.resultado
          ? (
              `Resultado: ${
                partido.resultado.local
              } – ${
                partido.resultado.visitante
              }`
            )
          : null;

      // ----------------------------------------------
      // 4. JORNADA
      // ----------------------------------------------

      let descripcionJornada:
        string | null = null;

      if (
        partido.jornadaTexto
      ) {
        const texto =
          partido.jornadaTexto.trim();

        descripcionJornada =
          /^(jornada|j\.)\b/i.test(
            texto,
          )
            ? texto
            : `Jornada ${texto}`;
      } else if (
        partido.jornada !== null
      ) {
        descripcionJornada =
          `Jornada ${partido.jornada}`;
      }

      // ----------------------------------------------
      // 5. DESCRIPCIÓN
      // ----------------------------------------------

      const descripcion = [
        descripcionResultado,

        partido.competicion,

        partido.grupo,

        descripcionJornada,

        partido.estadoPortada ===
        "aplazado"
          ? "Partido aplazado"
          : null,

        partido.esEnCasa === null
          ? "Casa/fuera por confirmar"
          : null,
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

      // ----------------------------------------------
      // 6. EVENTO PÚBLICO
      // ----------------------------------------------

      return [
        {
          id:
            partido.id,

          titulo:
            `${partido.local.nombre} – ${partido.visitante.nombre}`,

          fecha:
            partido.fecha,

          tipo,

          horaInicio:
            partido.hora,

          horaFin:
            null,

          ubicacion:
            partido.ubicacion ??
            partido.campo ??
            partido.localidad,

          descripcion:
            descripcion || null,

          categoria:
            partido.categoria ??
            equipoPrincipal.categoria,

          url:
            partido.enlaceFbib,

          equipoId:
            equipoPrincipal.id,

          equipoNombre:
            nombreEquipo,

          alcance:
            "equipo" as const,

          equiposIds,
        },
      ];
    },
  );
}

// ======================================================
// EVENTOS GENERALES DEL CLUB
// ======================================================

function convertirEventosTabla(
  filas: FilaEvento[],
): EventoCalendarioClub[] {
  return filas.flatMap(
    (fila) => {
      const titulo =
        fila.titulo?.trim();

      const fechaInicio =
        fila.fecha_inicio?.trim();

      if (
        !fila.id ||
        !titulo ||
        !fechaInicio
      ) {
        return [];
      }

      const fechaFin =
        fila.fecha_fin?.trim() ||
        fechaInicio;

      const alcance =
        fila.alcance ===
        "equipos"
          ? "equipos"
          : "todo-club";

      const equiposIds =
        alcance === "equipos"
          ? Array.from(
              new Set(
                (
                  fila.eventos_equipos ??
                  []
                ).flatMap(
                  (relacion) =>
                    relacion.equipo_id
                      ? [
                          relacion.equipo_id,
                        ]
                      : [],
                ),
              ),
            )
          : [];

      const descripcion =
        fila.descripcion_corta
          ?.trim() ||
        fila.descripcion?.trim() ||
        null;

      const ubicacion =
        fila.ubicacion?.trim() ||
        fila.direccion?.trim() ||
        null;

      return [
        {
          id:
            `evento-${fila.id}`,

          titulo,

          fecha:
            fechaInicio,

          fechaFin,

          tipo:
            "evento" as const,

          horaInicio:
            fila.todo_el_dia
              ? null
              : normalizarHora(
                  fila.hora_inicio,
                ),

          horaFin:
            fila.todo_el_dia
              ? null
              : normalizarHora(
                  fila.hora_fin,
                ),

          ubicacion,

          descripcion,

          categoria:
            null,

          url:
            fila.url_informacion
              ?.trim() ||
            null,

          equipoId:
            null,

          equipoNombre:
            null,

          alcance,

          equiposIds,
        },
      ];
    },
  );
}

// ======================================================
// PRIORIDAD VISUAL DE EVENTOS
// ======================================================

function obtenerPrioridadTipo(
  tipo: TipoEventoCalendario,
): number {
  if (
    tipo === "evento"
  ) {
    return 0;
  }

  if (
    tipo ===
      "partido-casa" ||
    tipo ===
      "partido-fuera"
  ) {
    return 1;
  }

  if (
    tipo ===
      "entreno-modificado" ||
    tipo ===
      "entreno-cancelado"
  ) {
    return 2;
  }

  return 3;
}

// ======================================================
// ELIMINAR EVENTOS DUPLICADOS Y ORDENAR
// ======================================================

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
        evento.fechaFin ?? "",
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

      const comparacionTipo =
        obtenerPrioridadTipo(
          primero.tipo,
        ) -
        obtenerPrioridadTipo(
          segundo.tipo,
        );

      if (
        comparacionTipo !== 0
      ) {
        return comparacionTipo;
      }

      const comparacionHora =
        (
          primero.horaInicio ??
          "99:99"
        ).localeCompare(
          segundo.horaInicio ??
            "99:99",
        );

      if (
        comparacionHora !== 0
      ) {
        return comparacionHora;
      }

      return primero.titulo.localeCompare(
        segundo.titulo,
        "es",
      );
    },
  );
}

// ======================================================
// GET /api/calendario?anio=AAAA&mes=MM
// ======================================================

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

    // --------------------------------------------------
    // 1. VALIDAR PARÁMETROS
    // --------------------------------------------------

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
      const rangoMes =
        obtenerRangoMes(
          anio,
          mes,
        );

      // ------------------------------------------------
      // 2. TEMPORADA ACTIVA
      // ------------------------------------------------

      const {
        data: temporadaEncontrada,
        error: errorTemporada,
      } = await supabaseServidor
        .from("temporadas")
        .select("id, nombre")
        .eq(
          "activa",
          true,
        )
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
              temporadaId: null,
              temporadaNombre: null,
              eventos: [],
            },

            error: null,
          },
          {
            status: 200,
            headers: cabecerasJson,
          },
        );
      }

      const temporada =
        temporadaEncontrada as FilaTemporada;

      // ------------------------------------------------
      // 3. EQUIPOS Y EVENTOS
      // ------------------------------------------------

      const [
        resultadoEquipos,
        resultadoEventos,
      ] = await Promise.all([
        supabaseServidor
          .from("equipos")
          .select(`
            id,
            nombre,
            nombre_corto,
            slug,
            temporada_id,
            id_equipo_fbib,
            categoria
          `)
          .eq(
            "temporada_id",
            temporada.id,
          )
          .eq(
            "activo",
            true,
          )
          .order(
            "nombre",
            {
              ascending: true,
            },
          ),

        supabaseServidor
          .from("eventos")
          .select(`
            id,
            temporada_id,
            titulo,
            descripcion_corta,
            descripcion,
            tipo,
            alcance,
            fecha_inicio,
            fecha_fin,
            hora_inicio,
            hora_fin,
            todo_el_dia,
            instalacion_id,
            ubicacion,
            direccion,
            imagen,
            banner_notificacion,
            url_informacion,
            url_inscripcion,
            requiere_inscripcion,
            destacado,
            mostrar_calendario,
            estado,
            eventos_equipos (
              equipo_id
            )
          `)
          .eq(
            "estado",
            "publicado",
          )
          .eq(
            "mostrar_calendario",
            true,
          )
          .lte(
            "fecha_inicio",
            rangoMes.fin,
          )
          .gte(
            "fecha_fin",
            rangoMes.inicio,
          )
          .or(
            `temporada_id.eq.${temporada.id},temporada_id.is.null`,
          ),
      ]);

      if (
        resultadoEquipos.error
      ) {
        throw new Error(
          `No se han podido obtener los equipos: ${resultadoEquipos.error.message}`,
        );
      }

      if (
        resultadoEventos.error
      ) {
        throw new Error(
          `No se han podido obtener los eventos: ${resultadoEventos.error.message}`,
        );
      }

      const equipos =
        (
          resultadoEquipos.data ??
          []
        ) as FilaEquipo[];

      const eventosTabla =
        convertirEventosTabla(
          (
            resultadoEventos.data ??
            []
          ) as FilaEvento[],
        );

      const idsEquipos =
        equipos.map(
          (equipo) =>
            equipo.id,
        );

      // ------------------------------------------------
      // 4. ENTRENAMIENTOS Y EXCEPCIONES
      // ------------------------------------------------

      let entrenamientos:
        FilaEntrenamiento[] =
        [];

      let excepciones:
        FilaExcepcion[] =
        [];

      if (
        idsEquipos.length > 0
      ) {
        const [
          resultadoEntrenamientos,
          resultadoExcepciones,
        ] = await Promise.all([
          supabaseServidor
            .from(
              "entrenamientos",
            )
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
            .eq(
              "activo",
              true,
            )
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

        entrenamientos =
          (
            resultadoEntrenamientos.data ??
            []
          ) as FilaEntrenamiento[];

        excepciones =
          (
            resultadoExcepciones.data ??
            []
          ) as FilaExcepcion[];
      }

      // ------------------------------------------------
      // 5. INSTALACIONES DE ENTRENAMIENTOS
      // ------------------------------------------------

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
        idsInstalaciones.length > 0
      ) {
        const {
          data,
          error,
        } = await supabaseServidor
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

      // ------------------------------------------------
      // 6. MAPAS DE REFERENCIA
      // ------------------------------------------------

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

      // ------------------------------------------------
      // 7. GENERAR ENTRENAMIENTOS
      // ------------------------------------------------

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

      // ------------------------------------------------
      // 8. OBTENER PARTIDOS COMBINADOS
      // ------------------------------------------------

      /*
       * ÚNICA CONSULTA GLOBAL.
       *
       * No se ejecuta una consulta
       * individual por cada equipo.
       *
       * El servicio central combina
       * partidos FBIB y partidos CBA.
       *
       * Si falla la consulta de
       * partidos, el calendario
       * conserva los demás eventos.
       */

      let eventosPartidos:
        EventoCalendarioClub[] =
        [];

      try {
        const resultadoPartidos =
          await obtenerPartidosCombinados({
            inicio:
              rangoMes.inicio,

            fin:
              rangoMes.fin,
          });

        if (
          resultadoPartidos.temporadaId !==
          temporada.id
        ) {
          throw new Error(
            "La temporada de los partidos no coincide con la del calendario.",
          );
        }

        eventosPartidos =
          convertirPartidosAEventos(
            resultadoPartidos.partidos,
            equiposPorId,
          );
      } catch (error) {
        console.error(
          "Error cargando los partidos combinados del calendario:",
          error,
        );
      }

      // ------------------------------------------------
      // 9. UNIFICAR TODOS LOS EVENTOS
      // ------------------------------------------------

      const eventos =
        eliminarEventosDuplicados(
          [
            ...eventosTabla,
            ...eventosPartidos,
            ...eventosEntrenamientos,
          ],
        );

      // ------------------------------------------------
      // 10. DEVOLVER RESPUESTA
      // ------------------------------------------------

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
          headers: cabecerasJson,
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
