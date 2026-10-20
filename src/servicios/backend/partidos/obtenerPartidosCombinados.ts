
import { supabaseServidor } from "@servicios/supabase/servidor";
import { obtenerDatosEsbFbib } from "@servicios/fbib/cliente/obtenerDatosEsbFbib";
import { obtenerEscudosEquiposFbib } from "@servicios/fbib/equipos/obtenerEscudosEquiposFbib";

import type {
  PartidoEquipoFbib,
} from "@tipos/FbibEquipoPublico";

/**
 * FUENTE ÚNICA DE PARTIDOS PÚBLICOS.
 *
 * FBIB aporta todos sus partidos.
 *
 * designaciones_partidos únicamente:
 * - Corrige partidos identificados por id_partido_fbib.
 * - Añade partidos con origen "cba".
 *
 * Una fila excluida NUNCA borra un partido
 * que siga existiendo en FBIB.
 *
 * La fecha efectiva se comprueba DESPUÉS
 * de aplicar las correcciones.
 */

const CODIGO_POSTAL_CASA = "07150";

const TAMANIO_PAGINA = 500;
const TAMANIO_BLOQUE_IDS = 80;

const ESCUDO_CBA = "/favicon.svg";
const ID_CLUB_FBIB = "129";

// ======================================================
// TIPOS PÚBLICOS
// ======================================================

type Registro = Record<string, unknown>;

export type OrigenPartidoCombinado =
  | "fbib"
  | "cba";

export type EstadoPartidoPortadaCombinado =
  | "programado"
  | "en-juego"
  | "finalizado"
  | "aplazado";

export interface EquipoPartidosCombinados {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  idEquipoFbib: string | null;
}

export interface PartidoCombinado
  extends PartidoEquipoFbib {
  origen: OrigenPartidoCombinado;

  idRegistro: string | null;
  numeroPartido: string | null;
  jornadaTexto: string | null;

  /**
   * CASA/FUERA por instalación.
   *
   * No depende de quién figura como
   * equipo local o visitante.
   *
   * null = no se puede determinar
   * con los datos disponibles.
   */
  esEnCasa: boolean | null;

  equiposIdsClub: string[];
  equipoIdClub: string | null;

  instalacionId: string | null;

  ubicacion: string | null;
  direccion: string | null;
  localidad: string | null;
  codigoPostal: string | null;

  estadoPortada:
    EstadoPartidoPortadaCombinado;
}

export interface OpcionesPartidosCombinados {
  inicio: string;
  fin: string;

  /**
   * UUID interno de la tabla equipos.
   * No es el identificador de la FBIB.
   */
  equipoId?: string | null;
}

export interface ResultadoPartidosCombinados {
  temporadaId: string | null;

  equipos: EquipoPartidosCombinados[];

  partidos: PartidoCombinado[];
}

// ======================================================
// TIPOS DE BASE DE DATOS
// ======================================================

interface FilaEquipo {
  id: string;

  nombre: string | null;
  nombre_corto: string | null;

  id_equipo_fbib: string | null;
}

interface FilaGuardada {
  id: string;

  origen: string | null;

  numero_partido: string | null;
  id_partido_fbib: string | null;

  equipo_id: string | null;

  fecha: string | null;
  hora: string | null;

  equipo_local: string | null;
  equipo_visitante: string | null;

  categoria: string | null;
  grupo: string | null;
  jornada: string | null;
  competicion: string | null;

  instalacion_id: string | null;

  excluido: boolean | null;

  updated_at: string | null;
}

interface FilaInstalacion {
  id: string;

  nombre: string | null;
  nombre_corto: string | null;

  direccion: string | null;
  localidad: string | null;
}

interface FbibEncontrado {
  datos: Registro;

  equiposIdsClub: Set<string>;
}

// ======================================================
// UTILIDADES
// ======================================================

function registro(
  valor: unknown,
): Registro | null {
  return valor !== null &&
    typeof valor === "object" &&
    !Array.isArray(valor)
    ? (valor as Registro)
    : null;
}

function texto(
  valor: unknown,
): string | null {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return null;
  }

  return String(valor).trim() || null;
}

function numero(
  valor: unknown,
): number | null {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const resultado = Number(valor);

  return Number.isFinite(resultado)
    ? resultado
    : null;
}

function coleccion(
  valor: unknown,
): unknown[] {
  if (Array.isArray(valor)) {
    return valor;
  }

  const objeto = registro(valor);

  if (!objeto) {
    return [];
  }

  for (const clave of [
    "matches",
    "data",
    "results",
  ]) {
    const contenido = objeto[clave];

    if (Array.isArray(contenido)) {
      return contenido;
    }

    const anidado = registro(
      contenido,
    );

    if (anidado) {
      return Object.values(anidado);
    }
  }

  return [];
}

// ======================================================
// FECHAS Y HORAS
// ======================================================

function fechaHora(
  valor: unknown,
): {
  fecha: string | null;
  hora: string | null;
} {
  const coincidencia = texto(
    valor,
  )?.match(
    /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/,
  );

  return {
    fecha: coincidencia?.[1] ?? null,
    hora: coincidencia?.[2] ?? null,
  };
}

function horaDb(
  valor: unknown,
): string | null {
  return (
    texto(valor)?.match(
      /^(\d{2}:\d{2})/,
    )?.[1] ?? null
  );
}

function fechaHoraCompleta(
  fecha: string | null,
  hora: string | null,
): string | null {
  if (!fecha) {
    return null;
  }

  return hora
    ? `${fecha}T${hora}:00`
    : fecha;
}

function validarFecha(
  valor: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const fecha = new Date(
    `${valor}T12:00:00Z`,
  );

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) ===
      valor
  );
}

function mesesEnRango(
  inicio: string,
  fin: string,
): number[] {
  const encontrados = new Set<number>();

  const actual = new Date(
    `${inicio.slice(0, 7)}-01T12:00:00Z`,
  );

  const ultimo = new Date(
    `${fin.slice(0, 7)}-01T12:00:00Z`,
  );

  while (actual <= ultimo) {
    encontrados.add(
      actual.getUTCMonth() + 1,
    );

    actual.setUTCMonth(
      actual.getUTCMonth() + 1,
    );
  }

  return [...encontrados];
}

// ======================================================
// TEXTO E IMÁGENES
// ======================================================

function normalizar(
  valor: unknown,
): string {
  return (texto(valor) ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function normalizarImagen(
  valor: unknown,
): string | null {
  const imagen = texto(valor);

  if (!imagen) {
    return null;
  }

  if (
    imagen.startsWith("https://") ||
    imagen.startsWith("data:image/")
  ) {
    return imagen;
  }

  if (imagen.startsWith("http://")) {
    return `https://${imagen.slice(7)}`;
  }

  if (imagen.startsWith("/")) {
    return `https://www.fbib.es${imagen}`;
  }

  if (
    /^[A-Za-z0-9+/]+=*$/.test(
      imagen,
    )
  ) {
    return `data:image/png;base64,${imagen}`;
  }

  return null;
}

// ======================================================
// ESTADO FBIB
// ======================================================

function estadoPortada(
  datos: Registro,
): EstadoPartidoPortadaCombinado {
  const enJuego =
    datos.isLive === true ||
    datos.isLive === 1 ||
    normalizar(datos.isLive) === "true";

  if (enJuego) {
    return "en-juego";
  }

  const informacion = [
    "state",
    "publicMessage",
    "description",
    "observations",
    "typeResult",
  ]
    .map((clave) =>
      normalizar(datos[clave]),
    )
    .join(" ");

  if (
    /aplaz|ajorn|suspend|suspes/.test(
      informacion,
    )
  ) {
    return "aplazado";
  }

  const visible = ![
    false,
    0,
    "false",
    "0",
    "no",
  ].includes(
    datos.resultsVisibles as never,
  );

  const tieneResultado =
    (
      numero(datos.localScore) ??
      numero(datos.localPoints) ??
      numero(datos.resultLocal)
    ) !== null &&
    (
      numero(datos.visitorScore) ??
      numero(datos.visitorPoints) ??
      numero(datos.resultVisitor)
    ) !== null;

  return visible && tieneResultado
    ? "finalizado"
    : "programado";
}

// ======================================================
// INSTALACIONES Y CASA/FUERA
// ======================================================

function obtenerPostalFbib(
  datos: Registro,
): string | null {
  return (
    texto(
      datos.postalCodeField,
    )?.replace(
      /\s+/g,
      "",
    ) ?? null
  );
}

/**
 * La tabla instalaciones existente
 * no tiene un campo codigo_postal
 * confirmado.
 *
 * Se aprovechan direccion, localidad
 * y los nombres reconocibles.
 *
 * Si no se puede determinar la
 * ubicación, se devuelve null.
 */
function casaDesdeInstalacion(
  instalacion: FilaInstalacion,
): boolean | null {
  const direccion =
    texto(instalacion.direccion) ?? "";

  const codigo =
    direccion.match(
      /\b\d{5}\b/,
    )?.[0];

  if (codigo) {
    return codigo ===
      CODIGO_POSTAL_CASA;
  }

  const localidad = normalizar(
    instalacion.localidad,
  );

  if (localidad) {
    return (
      localidad === "andratx" ||
      localidad === "07150 andratx"
    );
  }

  const nombre = normalizar(
    `${instalacion.nombre ?? ""} ${
      instalacion.nombre_corto ?? ""
    }`,
  );

  if (
    /\b(es vinyet|palau municipal d.esports d.andratx)\b/.test(
      nombre,
    )
  ) {
    return true;
  }

  return null;
}

function ubicacionFbib(
  datos: Registro,
): string | null {
  const campo = texto(
    datos.nameField,
  );

  const localidad = texto(
    datos.nameTown,
  );

  if (
    campo &&
    localidad &&
    !normalizar(campo).includes(
      normalizar(localidad),
    )
  ) {
    return `${campo} · ${localidad}`;
  }

  return campo ?? localidad;
}

// ======================================================
// IDENTIFICACIÓN DE EQUIPOS CBA
// ======================================================

function idsClubParticipantes(
  datos: Registro,
  equipos: EquipoPartidosCombinados[],
): string[] {
  const ids = new Set([
    texto(datos.idLocalTeam),
    texto(datos.idVisitorTeam),
  ]);

  return equipos
    .filter(
      (equipo) =>
        equipo.idEquipoFbib &&
        ids.has(
          equipo.idEquipoFbib,
        ),
    )
    .map(
      (equipo) => equipo.id,
    );
}

function posicionEquipo(
  idLocal: string | null,
  idVisitante: string | null,
  localNombre: string,
  visitanteNombre: string,
  equipo: EquipoPartidosCombinados | null,
): PartidoEquipoFbib["posicionEquipo"] {
  if (!equipo) {
    return null;
  }

  if (
    equipo.idEquipoFbib &&
    idLocal === equipo.idEquipoFbib
  ) {
    return "local";
  }

  if (
    equipo.idEquipoFbib &&
    idVisitante ===
      equipo.idEquipoFbib
  ) {
    return "visitante";
  }

  const nombre = normalizar(
    equipo.nombre,
  );

  if (
    nombre &&
    normalizar(localNombre) === nombre
  ) {
    return "local";
  }

  if (
    nombre &&
    normalizar(visitanteNombre) ===
      nombre
  ) {
    return "visitante";
  }

  return null;
}

function elegirEquipo(
  ids: string[],
  equiposPorId: Map<
    string,
    EquipoPartidosCombinados
  >,
  equipoSolicitadoId: string | null,
): EquipoPartidosCombinados | null {
  const id =
    equipoSolicitadoId &&
    ids.includes(equipoSolicitadoId)
      ? equipoSolicitadoId
      : ids[0];

  return id
    ? equiposPorId.get(id) ?? null
    : null;
}

// ======================================================
// TEMPORADA Y EQUIPOS
// ======================================================

async function cargarTemporadaYEquipos(
  equipoId: string | null,
): Promise<{
  temporadaId: string | null;
  equipos: EquipoPartidosCombinados[];
}> {
  const temporada =
    await supabaseServidor
      .from("temporadas")
      .select("id")
      .eq("activa", true)
      .limit(1)
      .maybeSingle();

  if (temporada.error) {
    throw new Error(
      `Error consultando la temporada activa: ${temporada.error.message}`,
    );
  }

  const temporadaId = texto(
    temporada.data?.id,
  );

  if (!temporadaId) {
    return {
      temporadaId: null,
      equipos: [],
    };
  }

  let consulta =
    supabaseServidor
      .from("equipos")
      .select(`
        id,
        nombre,
        nombre_corto,
        id_equipo_fbib
      `)
      .eq(
        "temporada_id",
        temporadaId,
      )
      .eq("activo", true);

  if (equipoId) {
    consulta = consulta.eq(
      "id",
      equipoId,
    );
  }

  const resultado = await consulta;

  if (resultado.error) {
    throw new Error(
      `Error consultando los equipos: ${resultado.error.message}`,
    );
  }

  const equipos = (
    (resultado.data ?? []) as FilaEquipo[]
  ).map((fila) => ({
    id: fila.id,

    nombre:
      texto(fila.nombre) ??
      texto(fila.nombre_corto) ??
      "Equipo",

    nombreCorto: texto(
      fila.nombre_corto,
    ),

    idEquipoFbib: texto(
      fila.id_equipo_fbib,
    ),
  }));

  return {
    temporadaId,
    equipos,
  };
}

// ======================================================
// PARTIDOS GUARDADOS POR FECHA
// ======================================================

async function leerGuardadosPorFecha(
  temporadaId: string,
  inicio: string,
  fin: string,
): Promise<FilaGuardada[]> {
  const filas: FilaGuardada[] = [];

  for (
    let desde = 0;
    ;
    desde += TAMANIO_PAGINA
  ) {
    const respuesta =
      await supabaseServidor
        .from("designaciones_partidos")
        .select(`
          id,
          origen,
          numero_partido,
          id_partido_fbib,
          equipo_id,
          fecha,
          hora,
          equipo_local,
          equipo_visitante,
          categoria,
          grupo,
          jornada,
          competicion,
          instalacion_id,
          excluido,
          updated_at
        `)
        .eq(
          "temporada_id",
          temporadaId,
        )
        .gte("fecha", inicio)
        .lte("fecha", fin)
        .order(
          "fecha",
          { ascending: true },
        )
        .order(
          "id",
          { ascending: true },
        )
        .range(
          desde,
          desde + TAMANIO_PAGINA - 1,
        );

    if (respuesta.error) {
      throw new Error(
        `Error consultando partidos guardados: ${respuesta.error.message}`,
      );
    }

    const pagina = (
      respuesta.data ?? []
    ) as FilaGuardada[];

    filas.push(...pagina);

    if (
      pagina.length < TAMANIO_PAGINA
    ) {
      break;
    }
  }

  return filas;
}

// ======================================================
// CORRECCIONES POR ID FBIB
// ======================================================

async function leerGuardadosPorIdsFbib(
  temporadaId: string,
  ids: string[],
): Promise<FilaGuardada[]> {
  const filas: FilaGuardada[] = [];

  for (
    let indice = 0;
    indice < ids.length;
    indice += TAMANIO_BLOQUE_IDS
  ) {
    const bloque = ids.slice(
      indice,
      indice + TAMANIO_BLOQUE_IDS,
    );

    const respuesta =
      await supabaseServidor
        .from("designaciones_partidos")
        .select(`
          id,
          origen,
          numero_partido,
          id_partido_fbib,
          equipo_id,
          fecha,
          hora,
          equipo_local,
          equipo_visitante,
          categoria,
          grupo,
          jornada,
          competicion,
          instalacion_id,
          excluido,
          updated_at
        `)
        .eq(
          "temporada_id",
          temporadaId,
        )
        .eq("origen", "fbib")
        .in(
          "id_partido_fbib",
          bloque,
        );

    if (respuesta.error) {
      throw new Error(
        `Error consultando correcciones FBIB: ${respuesta.error.message}`,
      );
    }

    filas.push(
      ...(
        (respuesta.data ?? []) as
          FilaGuardada[]
      ),
    );
  }

  return filas;
}

// ======================================================
// CONSULTA FBIB
// ======================================================

async function consultarFbib(
  equipos: EquipoPartidosCombinados[],
  inicio: string,
  fin: string,
): Promise<
  Map<string, FbibEncontrado>
> {
  const meses = mesesEnRango(
    inicio,
    fin,
  );

  const equiposFbib =
    equipos.filter(
      (equipo) =>
        equipo.idEquipoFbib,
    );

  const tareas =
    equiposFbib.flatMap(
      (equipo) =>
        meses.map(
          async (mes) => ({
            equipo,

            filas: coleccion(
              await obtenerDatosEsbFbib(
                `/Match/getByTeamAndMonth/${
                  encodeURIComponent(
                    equipo.idEquipoFbib!,
                  )
                }/${mes}`,
              ),
            ),
          }),
        ),
    );

  const respuestas =
    await Promise.allSettled(
      tareas,
    );

  const partidos = new Map<
    string,
    FbibEncontrado
  >();

  for (
    const respuesta of respuestas
  ) {
    if (
      respuesta.status === "rejected"
    ) {
      console.error(
        "[PARTIDOS COMBINADOS] Consulta FBIB fallida:",
        respuesta.reason,
      );

      continue;
    }

    for (
      const valor of respuesta.value.filas
    ) {
      const datos = registro(valor);

      if (!datos) {
        continue;
      }

      const fecha = fechaHora(
        datos.matchDay,
      ).fecha;

      /**
       * NO filtramos todavía por fecha.
       * Supabase podría haber cambiado
       * el partido a otro día o mes.
       */
      const id =
        texto(datos.idMatch) ??
        texto(datos.idMatchCall) ??
        texto(datos.universallyid);

      if (!id || !fecha) {
        continue;
      }

      const participante =
        respuesta.value.equipo.id;

      const anterior =
        partidos.get(id);

      if (anterior) {
        anterior.equiposIdsClub.add(
          participante,
        );
      } else {
        partidos.set(
          id,
          {
            datos,

            equiposIdsClub:
              new Set([
                participante,
              ]),
          },
        );
      }
    }
  }

  return partidos;
}

// ======================================================
// PARTIDOS MOVIDOS DESDE OTROS MESES
// ======================================================

/**
 * Si un partido corregido entra
 * desde otro mes, intentamos recuperar
 * su ficha FBIB por temporada.
 *
 * Así conservamos marcadores,
 * escudos y estado.
 *
 * Si falla la consulta FBIB,
 * el partido guardado sigue apareciendo.
 */

async function completarFbibDeOtroMes(
  encontrados: Map<
    string,
    FbibEncontrado
  >,
  guardados: FilaGuardada[],
  equiposPorId: Map<
    string,
    EquipoPartidosCombinados
  >,
): Promise<void> {
  const ausentes =
    guardados.filter(
      (fila) =>
        fila.origen === "fbib" &&
        fila.excluido !== true &&
        !!texto(
          fila.id_partido_fbib,
        ) &&
        !encontrados.has(
          texto(
            fila.id_partido_fbib,
          )!,
        ),
    );

  const porEquipo = new Map<
    string,
    Set<string>
  >();

  for (
    const fila of ausentes
  ) {
    const equipo =
      fila.equipo_id
        ? equiposPorId.get(
            fila.equipo_id,
          )
        : null;

    if (
      !equipo?.idEquipoFbib
    ) {
      continue;
    }

    const ids =
      porEquipo.get(
        equipo.id,
      ) ?? new Set<string>();

    ids.add(
      texto(
        fila.id_partido_fbib,
      )!,
    );

    porEquipo.set(
      equipo.id,
      ids,
    );
  }

  await Promise.all(
    [...porEquipo].map(
      async ([
        equipoId,
        ids,
      ]) => {
        const equipo =
          equiposPorId.get(
            equipoId,
          )!;

        try {
          const respuesta =
            await obtenerDatosEsbFbib(
              `/Match/getByTeamAllSeason/${
                encodeURIComponent(
                  equipo.idEquipoFbib!,
                )
              }`,
            );

          for (
            const valor of coleccion(
              respuesta,
            )
          ) {
            const datos =
              registro(valor);

            const id =
              datos
                ? (
                    texto(
                      datos.idMatch,
                    ) ??
                    texto(
                      datos.idMatchCall,
                    ) ??
                    texto(
                      datos.universallyid,
                    )
                  )
                : null;

            if (
              !id ||
              !ids.has(id)
            ) {
              continue;
            }

            const anterior =
              encontrados.get(id);

            if (anterior) {
              anterior.equiposIdsClub.add(
                equipoId,
              );
            } else {
              encontrados.set(
                id,
                {
                  datos: datos!,

                  equiposIdsClub:
                    new Set([
                      equipoId,
                    ]),
                },
              );
            }
          }
        } catch (error) {
          console.error(
            `[PARTIDOS COMBINADOS] No se pudo recuperar la temporada FBIB de ${equipoId}:`,
            error,
          );
        }
      },
    ),
  );
}

// ======================================================
// INSTALACIONES DE PARTIDOS GUARDADOS
// ======================================================

async function cargarInstalaciones(
  filas: FilaGuardada[],
): Promise<
  Map<string, FilaInstalacion>
> {
  const ids = [
    ...new Set(
      filas
        .map(
          (fila) =>
            texto(
              fila.instalacion_id,
            ),
        )
        .filter(
          (
            id,
          ): id is string =>
            !!id,
        ),
    ),
  ];

  const instalaciones = new Map<
    string,
    FilaInstalacion
  >();

  for (
    let indice = 0;
    indice < ids.length;
    indice += TAMANIO_BLOQUE_IDS
  ) {
    const respuesta =
      await supabaseServidor
        .from("instalaciones")
        .select(`
          id,
          nombre,
          nombre_corto,
          direccion,
          localidad
        `)
        .in(
          "id",
          ids.slice(
            indice,
            indice + TAMANIO_BLOQUE_IDS,
          ),
        );

    if (respuesta.error) {
      throw new Error(
        `Error consultando instalaciones: ${respuesta.error.message}`,
      );
    }

    for (
      const fila of (
        respuesta.data ?? []
      ) as FilaInstalacion[]
    ) {
      instalaciones.set(
        fila.id,
        fila,
      );
    }
  }

  return instalaciones;
}

// ======================================================
// PRIORIDAD ENTRE REGISTROS GUARDADOS
// ======================================================

function filaMasReciente(
  a: FilaGuardada | undefined,
  b: FilaGuardada,
): FilaGuardada {
  if (!a) {
    return b;
  }

  return (
    (
      texto(b.updated_at) ?? ""
    ) >= (
      texto(a.updated_at) ?? ""
    )
  )
    ? b
    : a;
}

// ======================================================
// CONVERSIÓN UNIFICADA
// ======================================================

async function convertirPartido(
  origen: OrigenPartidoCombinado,
  fbib: FbibEncontrado | null,
  guardado: FilaGuardada | null,

  equipos: EquipoPartidosCombinados[],

  equiposPorId: Map<
    string,
    EquipoPartidosCombinados
  >,

  instalaciones: Map<
    string,
    FilaInstalacion
  >,

  equipoSolicitadoId: string | null,

  escudosCache: Map<
    string,
    Promise<{
      local: string | null;
      visitante: string | null;
    }>
  >,
): Promise<
  PartidoCombinado | null
> {
  const raw =
    fbib?.datos ?? null;

  const idFbib =
    texto(
      guardado?.id_partido_fbib,
    ) ??
    (
      raw
        ? (
            texto(raw.idMatch) ??
            texto(raw.idMatchCall) ??
            texto(raw.universallyid)
          )
        : null
    );

  // --------------------------------------------------
  // FECHA Y HORA EFECTIVAS
  // --------------------------------------------------

  const fechaFbib =
    fechaHora(
      raw?.matchDay,
    );

  const fecha =
    guardado
      ? texto(
          guardado.fecha,
        )
      : fechaFbib.fecha;

  if (
    !fecha ||
    !validarFecha(fecha)
  ) {
    return null;
  }

  const hora =
    guardado
      ? horaDb(
          guardado.hora,
        )
      : fechaFbib.hora;

  // --------------------------------------------------
  // EQUIPOS
  // --------------------------------------------------

  const idLocal =
    texto(
      raw?.idLocalTeam,
    );

  const idVisitante =
    texto(
      raw?.idVisitorTeam,
    );

  const localNombre =
    texto(
      guardado?.equipo_local,
    ) ??
    texto(
      raw?.nameLocalTeam,
    ) ??
    "Equipo local";

  const visitanteNombre =
    texto(
      guardado?.equipo_visitante,
    ) ??
    texto(
      raw?.nameVisitorTeam,
    ) ??
    "Equipo visitante";

  const ids = new Set(
    fbib?.equiposIdsClub ?? [],
  );

  if (raw) {
    for (
      const id of idsClubParticipantes(
        raw,
        equipos,
      )
    ) {
      ids.add(id);
    }
  }

  if (
    guardado?.equipo_id &&
    equiposPorId.has(
      guardado.equipo_id,
    )
  ) {
    ids.add(
      guardado.equipo_id,
    );
  }

  const equiposIdsClub =
    [...ids];

  if (
    equipoSolicitadoId &&
    !ids.has(
      equipoSolicitadoId,
    )
  ) {
    return null;
  }

  if (
    equiposIdsClub.length === 0
  ) {
    return null;
  }

  const equipo = elegirEquipo(
    equiposIdsClub,
    equiposPorId,
    equipoSolicitadoId,
  );

  // --------------------------------------------------
  // INSTALACIÓN Y CASA/FUERA
  // --------------------------------------------------

  const instalacionId =
    texto(
      guardado?.instalacion_id,
    );

  const instalacion =
    instalacionId
      ? instalaciones.get(
          instalacionId,
        ) ?? null
      : null;

  /**
   * Si se ha seleccionado una instalación
   * en Supabase, prevalece sobre la FBIB.
   *
   * No debemos reutilizar el código postal
   * original cuando se ha cambiado
   * la instalación.
   */
  const codigoPostal =
    instalacion
      ? (
          texto(
            instalacion.direccion,
          )?.match(
            /\b\d{5}\b/,
          )?.[0] ?? null
        )
      : raw
        ? obtenerPostalFbib(
            raw,
          )
        : null;

  const esEnCasa =
    instalacion
      ? casaDesdeInstalacion(
          instalacion,
        )
      : raw
        ? (
            codigoPostal
              ? codigoPostal ===
                CODIGO_POSTAL_CASA
              : null
          )
        : null;

  const ubicacion =
    instalacion
      ? (
          texto(
            instalacion.nombre_corto,
          ) ??
          texto(
            instalacion.nombre,
          )
        )
      : raw
        ? ubicacionFbib(raw)
        : null;

  // --------------------------------------------------
  // RESULTADO Y ESTADO
  // --------------------------------------------------

  const puntosLocal =
    numero(
      raw?.localScore,
    ) ??
    numero(
      raw?.localPoints,
    ) ??
    numero(
      raw?.resultLocal,
    );

  const puntosVisitante =
    numero(
      raw?.visitorScore,
    ) ??
    numero(
      raw?.visitorPoints,
    ) ??
    numero(
      raw?.resultVisitor,
    );

  const estadoVisual =
    raw
      ? estadoPortada(raw)
      : "programado";

  const resultado =
    estadoVisual === "finalizado" &&
    puntosLocal !== null &&
    puntosVisitante !== null
      ? {
          local: puntosLocal,
          visitante: puntosVisitante,
        }
      : null;

  // --------------------------------------------------
  // ESCUDOS
  // --------------------------------------------------

  let escudoLocal =
    normalizarImagen(
      raw?.localClubLogo,
    );

  let escudoVisitante =
    normalizarImagen(
      raw?.visitorClubLogo,
    );

  if (
    raw &&
    idLocal &&
    idVisitante &&
    (
      !escudoLocal ||
      !escudoVisitante
    )
  ) {
    const clave =
      `${idLocal}:${idVisitante}`;

    let promesa =
      escudosCache.get(
        clave,
      );

    if (!promesa) {
      promesa =
        obtenerEscudosEquiposFbib(
          idLocal,
          idVisitante,
        );

      escudosCache.set(
        clave,
        promesa,
      );
    }

    const extra =
      await promesa;

    escudoLocal ??=
      extra.local;

    escudoVisitante ??=
      extra.visitante;
  }

  const esClubLocal =
    (
      idLocal &&
      equipos.some(
        (e) =>
          e.idEquipoFbib ===
          idLocal,
      )
    ) ||
    texto(
      raw?.idLocalClub,
    ) === ID_CLUB_FBIB ||
    !!(
      equipo &&
      normalizar(
        localNombre,
      ) === normalizar(
        equipo.nombre,
      )
    );

  const esClubVisitante =
    (
      idVisitante &&
      equipos.some(
        (e) =>
          e.idEquipoFbib ===
          idVisitante,
      )
    ) ||
    texto(
      raw?.idVisitorClub,
    ) === ID_CLUB_FBIB ||
    !!(
      equipo &&
      normalizar(
        visitanteNombre,
      ) === normalizar(
        equipo.nombre,
      )
    );

  if (esClubLocal) {
    escudoLocal ??=
      ESCUDO_CBA;
  }

  if (esClubVisitante) {
    escudoVisitante ??=
      ESCUDO_CBA;
  }

  // --------------------------------------------------
  // IDENTIFICADORES
  // --------------------------------------------------

  const jornadaTexto =
    texto(
      guardado?.jornada,
    ) ??
    texto(
      raw?.numMatchDay,
    );

  const id =
    idFbib
      ? `fbib-${idFbib}`
      : guardado
        ? `cba-${guardado.id}`
        : null;

  if (!id) {
    return null;
  }

  // --------------------------------------------------
  // RESULTADO UNIFICADO
  // --------------------------------------------------

  return {
    id,

    idPartidoFbib: idFbib,

    fecha,
    hora,

    fechaHora:
      fechaHoraCompleta(
        fecha,
        hora,
      ),

    local: {
      id: idLocal,
      nombre: localNombre,
      escudo: escudoLocal,
    },

    visitante: {
      id: idVisitante,
      nombre: visitanteNombre,
      escudo: escudoVisitante,
    },

    resultado,

    estado:
      resultado
        ? "finalizado"
        : "pendiente",

    /**
     * La posición real en el encuentro
     * se conserva para las tarjetas
     * de equipo y el resultado.
     *
     * NO se utiliza para decidir
     * CASA/FUERA.
     */
    posicionEquipo:
      posicionEquipo(
        idLocal,
        idVisitante,
        localNombre,
        visitanteNombre,
        equipo,
      ),

    campo: ubicacion,

    categoria:
      texto(
        guardado?.categoria,
      ) ??
      texto(
        raw?.nameCategorySigned,
      ),

    competicion:
      texto(
        guardado?.competicion,
      ) ??
      texto(
        raw?.nameCompetition,
      ),

    grupo:
      texto(
        guardado?.grupo,
      ) ??
      texto(
        raw?.nameGroup,
      ),

    jornada:
      jornadaTexto !== null &&
      /^\d+$/.test(
        jornadaTexto,
      )
        ? Number(
            jornadaTexto,
          )
        : null,

    enlaceFbib:
      idFbib
        ? `https://www.fbib.es/partido/${
            encodeURIComponent(
              idFbib,
            )
          }`
        : null,

    origen,

    idRegistro:
      guardado?.id ?? null,

    numeroPartido:
      texto(
        guardado?.numero_partido,
      ) ??
      idFbib,

    jornadaTexto,

    esEnCasa,

    equiposIdsClub,

    equipoIdClub:
      equipo?.id ?? null,

    instalacionId,

    ubicacion,

    direccion:
      instalacion
        ? texto(
            instalacion.direccion,
          )
        : texto(
            raw?.adressField,
          ),

    localidad:
      instalacion
        ? texto(
            instalacion.localidad,
          )
        : texto(
            raw?.nameTown,
          ),

    codigoPostal,

    estadoPortada:
      estadoVisual,
  };
}

// ======================================================
// FUNCIÓN PRINCIPAL
// ======================================================

export async function obtenerPartidosCombinados(
  opciones: OpcionesPartidosCombinados,
): Promise<ResultadoPartidosCombinados> {
  const inicio =
    opciones.inicio.trim();

  const fin =
    opciones.fin.trim();

  const equipoSolicitadoId =
    opciones.equipoId?.trim() ||
    null;

  // --------------------------------------------------
  // 1. VALIDACIONES
  // --------------------------------------------------

  if (
    !validarFecha(inicio) ||
    !validarFecha(fin) ||
    inicio > fin
  ) {
    throw new Error(
      "El rango de fechas de partidos no es válido.",
    );
  }

  if (
    equipoSolicitadoId &&
    !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(
      equipoSolicitadoId,
    )
  ) {
    throw new Error(
      "El identificador del equipo no es válido.",
    );
  }

  // --------------------------------------------------
  // 2. TEMPORADA Y EQUIPOS
  // --------------------------------------------------

  const {
    temporadaId,
    equipos,
  } =
    await cargarTemporadaYEquipos(
      equipoSolicitadoId,
    );

  if (
    !temporadaId ||
    equipos.length === 0
  ) {
    return {
      temporadaId,
      equipos,
      partidos: [],
    };
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

  // --------------------------------------------------
  // 3. FBIB + GUARDADOS DEL PERÍODO
  // --------------------------------------------------

  const [
    fbibEncontrados,
    guardadosPorFecha,
  ] = await Promise.all([
    consultarFbib(
      equipos,
      inicio,
      fin,
    ),

    leerGuardadosPorFecha(
      temporadaId,
      inicio,
      fin,
    ),
  ]);

  // --------------------------------------------------
  // 4. CORRECCIONES POR ID FBIB
  // --------------------------------------------------

  /**
   * Esta consulta es imprescindible.
   *
   * Ejemplo:
   *
   * FBIB: partido el 31 de octubre.
   * DB: corregido al 1 de noviembre.
   *
   * Al consultar octubre encontramos
   * el partido FBIB, pero debemos buscar
   * su corrección aunque la fecha de DB
   * ya sea noviembre.
   */
  const guardadosPorId =
    await leerGuardadosPorIdsFbib(
      temporadaId,
      [
        ...fbibEncontrados.keys(),
      ],
    );

  const guardadosMap =
    new Map<
      string,
      FilaGuardada
    >();

  for (
    const fila of [
      ...guardadosPorFecha,
      ...guardadosPorId,
    ]
  ) {
    guardadosMap.set(
      fila.id,

      filaMasReciente(
        guardadosMap.get(
          fila.id,
        ),
        fila,
      ),
    );
  }

  const guardados =
    [
      ...guardadosMap.values(),
    ];

  // --------------------------------------------------
  // 5. FBIB DE PARTIDOS MOVIDOS DE MES
  // --------------------------------------------------

  await completarFbibDeOtroMes(
    fbibEncontrados,
    guardadosPorFecha,
    equiposPorId,
  );

  // --------------------------------------------------
  // 6. MAPA DE CORRECCIONES
  // --------------------------------------------------

  const correcciones =
    new Map<
      string,
      FilaGuardada
    >();

  for (
    const fila of guardados
  ) {
    const id = texto(
      fila.id_partido_fbib,
    );

    if (
      fila.origen === "fbib" &&
      id &&
      fila.excluido !== true
    ) {
      correcciones.set(
        id,

        filaMasReciente(
          correcciones.get(
            id,
          ),
          fila,
        ),
      );
    }
  }

  // --------------------------------------------------
  // 7. INSTALACIONES
  // --------------------------------------------------

  const instalaciones =
    await cargarInstalaciones(
      guardados.filter(
        (fila) =>
          fila.excluido !== true,
      ),
    );

  const cacheEscudos =
    new Map<
      string,
      Promise<{
        local: string | null;
        visitante: string | null;
      }>
    >();

  // --------------------------------------------------
  // 8. TODOS LOS PARTIDOS FBIB
  // --------------------------------------------------

  const tareas:
    Promise<
      PartidoCombinado | null
    >[] = [];

  for (
    const [
      idFbib,
      partidoFbib,
    ] of fbibEncontrados
  ) {
    tareas.push(
      convertirPartido(
        "fbib",

        partidoFbib,

        correcciones.get(
          idFbib,
        ) ?? null,

        equipos,
        equiposPorId,
        instalaciones,
        equipoSolicitadoId,
        cacheEscudos,
      ),
    );
  }

  // --------------------------------------------------
  // 9. PARTIDOS CBA Y FBIB GUARDADOS SIN RAW
  // --------------------------------------------------

  for (
    const fila of guardados
  ) {
    if (
      fila.excluido === true ||
      (
        fila.origen !== "fbib" &&
        fila.origen !== "cba"
      )
    ) {
      continue;
    }

    /**
     * Si el partido FBIB ya se procesó,
     * no se vuelve a insertar.
     */
    if (
      fila.origen === "fbib" &&
      texto(
        fila.id_partido_fbib,
      ) &&
      fbibEncontrados.has(
        texto(
          fila.id_partido_fbib,
        )!,
      )
    ) {
      continue;
    }

    /**
     * Los partidos CBA se añaden.
     *
     * Los FBIB guardados cuyo original
     * no se ha podido consultar también
     * aparecen, siempre que no estén
     * marcados como excluidos.
     */
    tareas.push(
      convertirPartido(
        fila.origen,

        null,
        fila,

        equipos,
        equiposPorId,
        instalaciones,
        equipoSolicitadoId,
        cacheEscudos,
      ),
    );
  }

  // --------------------------------------------------
  // 10. FECHA EFECTIVA Y DUPLICADOS
  // --------------------------------------------------

  const resultados =
    await Promise.all(
      tareas,
    );

  const sinDuplicar =
    new Map<
      string,
      PartidoCombinado
    >();

  for (
    const partido of resultados
  ) {
    if (
      partido &&
      partido.fecha &&
      partido.fecha >= inicio &&
      partido.fecha <= fin
    ) {
      sinDuplicar.set(
        partido.id,
        partido,
      );
    }
  }

  // --------------------------------------------------
  // 11. ORDENAR
  // --------------------------------------------------

  const partidos = [
    ...sinDuplicar.values(),
  ].sort(
    (a, b) =>
      (
        a.fechaHora ?? ""
      ).localeCompare(
        b.fechaHora ?? "",
      ) ||
      a.local.nombre.localeCompare(
        b.local.nombre,
        "es",
      ),
  );

  // --------------------------------------------------
  // 12. RESPUESTA
  // --------------------------------------------------

  return {
    temporadaId,
    equipos,
    partidos,
  };
}
