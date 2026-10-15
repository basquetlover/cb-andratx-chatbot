
import { supabaseServidor } from "@servicios/supabase/servidor";

import {
  obtenerDatosEsbFbib,
} from "@servicios/fbib/cliente/obtenerDatosEsbFbib";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const CODIGO_POSTAL_ANDRATX = "07150";
const ZONA_HORARIA = "Europe/Madrid";
const TAMANIO_BLOQUE = 100;

// ======================================================
// TIPOS PÚBLICOS
// ======================================================

export type EstadoDesignacion =
  | "sin_designar"
  | "pendiente"
  | "realizado";

export type OrigenPartidoDesignacion =
  | "fbib"
  | "cba";

export interface EquipoDesignable {
  id: string;
  nombre: string;
  idEquipoFbib: string | null;
}

export interface PartidoListadoDesignacion {
  /**
   * Partido guardado: UUID de Supabase.
   *
   * Partido FBIB todavía no guardado:
   * "fbib:89116", por ejemplo.
   */
  id: string;

  origen: OrigenPartidoDesignacion;
  numeroPartido: string | null;

  fecha: string;
  hora: string | null;

  equipoLocal: string;
  equipoVisitante: string;

  categoria: string | null;
  grupo: string | null;
  jornada: string | null;
  competicion: string | null;

  instalacionId: string | null;
  nombreInstalacion: string | null;

  estado: EstadoDesignacion;
  totalDesignados: number;
  totalRealizados: number;

  /**
   * Permite al editor distinguir entre un partido
   * ya guardado y otro procedente directamente
   * de FBIB.
   */
  guardado: boolean;
  idPartidoFbib: string | null;
}

export interface DiaListadoDesignacion {
  fecha: string;
  partidos: PartidoListadoDesignacion[];
}

export interface ResumenListadoDesignaciones {
  total: number;
  fbib: number;
  cba: number;
  sinDesignar: number;
  pendientes: number;
  realizados: number;
}

export interface ResultadoListadoDesignaciones {
  temporada: {
    id: string;
    nombre: string;
  } | null;

  semana: {
    inicio: string;
    fin: string;
    anterior: string;
    siguiente: string;
    actual: string;
    esSemanaActual: boolean;
  };

  equiposDesignables: EquipoDesignable[];

  dias: DiaListadoDesignacion[];

  resumen: ResumenListadoDesignaciones;

  avisos: string[];
}

export interface OpcionesListadoDesignaciones {
  semana?: string | null;
}

// ======================================================
// TIPOS INTERNOS
// ======================================================

type RegistroFbib = Record<string, unknown>;

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

interface FilaEquipo {
  id: string;
  nombre: string | null;
  id_equipo_fbib: string | null;
}

interface FilaPartido {
  id: string;
  origen: string | null;
  numero_partido: string | null;
  id_partido_fbib: string | null;

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
}

interface FilaAsignacion {
  partido_id: string | null;
  funcion_realizada: string | null;
}

interface PartidoFbibTemporal {
  idFbib: string;

  fecha: string;
  hora: string | null;

  equipoLocal: string;
  equipoVisitante: string;

  categoria: string | null;
  grupo: string | null;
  jornada: string | null;
  competicion: string | null;

  codigoPostal: string;
}

// ======================================================
// UTILIDADES
// ======================================================

function texto(valor: unknown): string | null {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return null;
  }

  const limpio = String(valor).trim();

  return limpio || null;
}

function registro(
  valor: unknown,
): RegistroFbib | null {
  if (
    typeof valor !== "object" ||
    valor === null ||
    Array.isArray(valor)
  ) {
    return null;
  }

  return valor as RegistroFbib;
}

function coleccion(
  valor: unknown,
): unknown[] {
  if (Array.isArray(valor)) {
    return valor;
  }

  const datos = registro(valor);

  if (!datos) {
    return [];
  }

  for (const clave of [
    "matches",
    "data",
    "results",
  ]) {
    const contenido = datos[clave];

    if (Array.isArray(contenido)) {
      return contenido;
    }

    const objeto = registro(contenido);

    if (objeto) {
      return Object.values(objeto);
    }
  }

  return [];
}

// ======================================================
// FECHAS
// ======================================================

function fechaUTC(valor: string): Date {
  return new Date(`${valor}T12:00:00Z`);
}

function formatoISO(fecha: Date): string {
  const anio = fecha.getUTCFullYear();

  const mes = String(
    fecha.getUTCMonth() + 1,
  ).padStart(2, "0");

  const dia = String(
    fecha.getUTCDate(),
  ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function fechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const fecha = fechaUTC(valor);

  return (
    !Number.isNaN(fecha.getTime()) &&
    formatoISO(fecha) === valor
  );
}

function hoyEnEspana(): string {
  const partes = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: ZONA_HORARIA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(new Date());

  function obtener(tipo: string): string {
    return (
      partes.find(
        (parte) => parte.type === tipo,
      )?.value ?? ""
    );
  }

  return [
    obtener("year"),
    obtener("month"),
    obtener("day"),
  ].join("-");
}

function sumarDias(
  valor: string,
  dias: number,
): string {
  const fecha = fechaUTC(valor);

  fecha.setUTCDate(
    fecha.getUTCDate() + dias,
  );

  return formatoISO(fecha);
}

function obtenerLunes(valor: string): string {
  const dia = fechaUTC(valor).getUTCDay();

  return sumarDias(
    valor,
    dia === 0 ? -6 : 1 - dia,
  );
}

function obtenerSemana(
  solicitada?: string | null,
): ResultadoListadoDesignaciones["semana"] {
  const hoy = hoyEnEspana();

  const referencia =
    solicitada && fechaValida(solicitada)
      ? solicitada
      : hoy;

  const inicio = obtenerLunes(referencia);
  const actual = obtenerLunes(hoy);

  return {
    inicio,
    fin: sumarDias(inicio, 6),
    anterior: sumarDias(inicio, -7),
    siguiente: sumarDias(inicio, 7),
    actual,
    esSemanaActual: inicio === actual,
  };
}

function obtenerMeses(
  inicio: string,
  fin: string,
): number[] {
  const meses = new Set<number>();

  const fecha = new Date(
    `${inicio.slice(0, 7)}-01T12:00:00Z`,
  );

  const limite = new Date(
    `${fin.slice(0, 7)}-01T12:00:00Z`,
  );

  while (fecha <= limite) {
    meses.add(fecha.getUTCMonth() + 1);

    fecha.setUTCMonth(
      fecha.getUTCMonth() + 1,
    );
  }

  return Array.from(meses);
}

function obtenerFechaHoraFbib(
  valor: unknown,
): {
  fecha: string | null;
  hora: string | null;
} {
  const original = texto(valor);

  const coincidencia = original?.match(
    /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/,
  );

  return {
    fecha: coincidencia?.[1] ?? null,
    hora: coincidencia?.[2] ?? null,
  };
}

// ======================================================
// TEMPORADA Y EQUIPOS
// ======================================================

async function obtenerTemporadaActiva(): Promise<{
  id: string;
  nombre: string;
} | null> {
  const { data, error } = await supabaseServidor
    .from("temporadas")
    .select("id, nombre")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error consultando la temporada activa: ${error.message}`,
    );
  }

  if (!data?.id) {
    return null;
  }

  const temporada = data as FilaTemporada;

  return {
    id: temporada.id,
    nombre:
      texto(temporada.nombre) ??
      "Temporada activa",
  };
}

async function obtenerEquiposDesignables(
  temporadaId: string,
): Promise<EquipoDesignable[]> {
  const { data, error } = await supabaseServidor
    .from("equipos")
    .select("id, nombre, id_equipo_fbib")
    .eq("temporada_id", temporadaId)
    .eq("activo", true)
    .eq("designable", true)
    .order("nombre", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Error consultando equipos designables: ${error.message}`,
    );
  }

  return ((data ?? []) as FilaEquipo[]).map(
    (equipo) => ({
      id: equipo.id,
      nombre:
        texto(equipo.nombre) ??
        "Equipo sin nombre",
      idEquipoFbib:
        texto(equipo.id_equipo_fbib),
    }),
  );
}

// ======================================================
// CONSULTA FBIB SIN GUARDAR EN SUPABASE
// ======================================================

async function consultarPartidosFbib(
  equipos: EquipoDesignable[],
  inicio: string,
  fin: string,
): Promise<{
  partidos: PartidoFbibTemporal[];
  avisos: string[];
}> {
  const avisos: string[] = [];

  const idsEquipos = new Set(
    equipos
      .map((equipo) => equipo.idEquipoFbib)
      .filter(
        (id): id is string => Boolean(id),
      ),
  );

  if (idsEquipos.size === 0) {
    return {
      partidos: [],
      avisos,
    };
  }

  const meses = obtenerMeses(inicio, fin);

  const consultas = Array.from(idsEquipos)
    .flatMap((idEquipo) =>
      meses.map(async (mes) => {
        const respuesta =
          await obtenerDatosEsbFbib(
            `/Match/getByTeamAndMonth/${encodeURIComponent(
              idEquipo,
            )}/${mes}`,
          );

        return coleccion(respuesta);
      }),
    );

  const respuestas = await Promise.allSettled(
    consultas,
  );

  const partidos = new Map<
    string,
    PartidoFbibTemporal
  >();

  let consultasFallidas = 0;
  let sinPostal = 0;

  for (const respuesta of respuestas) {
    if (respuesta.status === "rejected") {
      consultasFallidas++;

      console.error(
        "[DESIGNACIONES] Consulta FBIB fallida:",
        respuesta.reason,
      );

      continue;
    }

    for (const valor of respuesta.value) {
      const fila = registro(valor);

      if (!fila) continue;

      const idFbib = texto(fila.idMatch);

      const { fecha, hora } =
        obtenerFechaHoraFbib(
          fila.matchDay,
        );

      if (
        !idFbib ||
        !fecha ||
        fecha < inicio ||
        fecha > fin
      ) {
        continue;
      }

      const idLocal = texto(
        fila.idLocalTeam,
      );

      const idVisitante = texto(
        fila.idVisitorTeam,
      );

      // Es suficiente con que participe uno
      // de los equipos configurados como designables.
      // NO exigimos que juegue como local.
      if (
        !(
          (idLocal && idsEquipos.has(idLocal)) ||
          (idVisitante &&
            idsEquipos.has(idVisitante))
        )
      ) {
        continue;
      }

      if (partidos.has(idFbib)) {
        continue;
      }

      const codigoPostal = texto(
        fila.postalCodeField,
      )?.replace(/\s+/g, "") ?? null;

      // Únicamente partidos disputados en
      // código postal 07150.
      if (codigoPostal !== CODIGO_POSTAL_ANDRATX) {
        if (!codigoPostal) {
          sinPostal++;
        }

        continue;
      }

      partidos.set(idFbib, {
        idFbib,
        fecha,
        hora,

        equipoLocal:
          texto(fila.nameLocalTeam) ??
          "Equipo local",

        equipoVisitante:
          texto(fila.nameVisitorTeam) ??
          "Equipo visitante",

        categoria:
          texto(fila.nameCategorySigned),

        grupo:
          texto(fila.nameGroup),

        jornada:
          texto(fila.numMatchDay),

        competicion:
          texto(fila.nameCompetition),

        codigoPostal,
      });
    }
  }

  if (consultasFallidas > 0) {
    avisos.push(
      `No se han podido completar ${consultasFallidas} consultas FBIB.`,
    );
  }

  if (sinPostal > 0) {
    avisos.push(
      `${sinPostal} partidos FBIB no tienen código postal y no se mostrarán automáticamente.`,
    );
  }

  return {
    partidos: Array.from(partidos.values()),
    avisos,
  };
}

// ======================================================
// PARTIDOS YA GUARDADOS
// ======================================================

async function obtenerPartidosGuardados(
  temporadaId: string,
  inicio: string,
  fin: string,
): Promise<FilaPartido[]> {
  const { data, error } = await supabaseServidor
    .from("designaciones_partidos")
    .select(`
      id,
      origen,
      numero_partido,
      id_partido_fbib,
      fecha,
      hora,
      equipo_local,
      equipo_visitante,
      categoria,
      grupo,
      jornada,
      competicion,
      instalacion_id,
      excluido
    `)
    .eq("temporada_id", temporadaId)
    .gte("fecha", inicio)
    .lte("fecha", fin)
    .order("fecha", {
      ascending: true,
    })
    .order("hora", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Error consultando los partidos guardados: ${error.message}`,
    );
  }

  return ((data ?? []) as FilaPartido[])
    .filter(
      (partido) =>
        partido.fecha !== null &&
        partido.excluido !== true &&
        (
          partido.origen === "fbib" ||
          partido.origen === "cba"
        ),
    );
}

// ======================================================
// FUNCIONES REALIZADAS
// ======================================================

async function obtenerAsignaciones(
  idsPartidos: string[],
): Promise<Map<string, FilaAsignacion[]>> {
  const resultado = new Map<
    string,
    FilaAsignacion[]
  >();

  for (
    let indice = 0;
    indice < idsPartidos.length;
    indice += TAMANIO_BLOQUE
  ) {
    const bloque = idsPartidos.slice(
      indice,
      indice + TAMANIO_BLOQUE,
    );

    const { data, error } = await supabaseServidor
      .from("designaciones_asignaciones")
      .select(
        "partido_id, funcion_realizada",
      )
      .in("partido_id", bloque);

    if (error) {
      throw new Error(
        `Error consultando las funciones realizadas: ${error.message}`,
      );
    }

    for (
      const asignacion of
      (data ?? []) as FilaAsignacion[]
    ) {
      if (!asignacion.partido_id) {
        continue;
      }

      const lista =
        resultado.get(
          asignacion.partido_id,
        ) ?? [];

      lista.push(asignacion);

      resultado.set(
        asignacion.partido_id,
        lista,
      );
    }
  }

  return resultado;
}

function calcularEstado(
  asignaciones: FilaAsignacion[],
): EstadoDesignacion {
  if (asignaciones.length === 0) {
    return "sin_designar";
  }

  return asignaciones.every(
    (asignacion) =>
      texto(
        asignacion.funcion_realizada,
      ) !== null,
  )
    ? "realizado"
    : "pendiente";
}

// ======================================================
// CONVERSIÓN DE PARTIDOS GUARDADOS
// ======================================================

function convertirGuardados(
  filas: FilaPartido[],
  asignacionesPorPartido: Map<
    string,
    FilaAsignacion[]
  >,
): PartidoListadoDesignacion[] {
  return filas.map((fila) => {
    const asignaciones =
      asignacionesPorPartido.get(fila.id) ??
      [];

    const totalRealizados =
      asignaciones.filter(
        (asignacion) =>
          texto(
            asignacion.funcion_realizada,
          ) !== null,
      ).length;

    return {
      id: fila.id,

      origen:
        fila.origen === "fbib"
          ? "fbib"
          : "cba",

      numeroPartido:
        texto(fila.numero_partido),

      fecha: fila.fecha!,

      hora:
        texto(fila.hora)?.slice(0, 5) ??
        null,

      equipoLocal:
        texto(fila.equipo_local) ??
        "Equipo local",

      equipoVisitante:
        texto(fila.equipo_visitante) ??
        "Equipo visitante",

      categoria:
        texto(fila.categoria),

      grupo:
        texto(fila.grupo),

      jornada:
        texto(fila.jornada),

      competicion:
        texto(fila.competicion),

      instalacionId:
        fila.instalacion_id,

      nombreInstalacion: null,

      estado:
        calcularEstado(asignaciones),

      totalDesignados:
        asignaciones.length,

      totalRealizados,

      guardado: true,

      idPartidoFbib:
        texto(fila.id_partido_fbib),
    };
  });
}

// ======================================================
// PARTIDOS FBIB SIN GUARDAR
// ======================================================

function convertirTemporales(
  partidos: PartidoFbibTemporal[],
): PartidoListadoDesignacion[] {
  return partidos.map((partido) => ({
    // Prefijo para identificar claramente
    // que todavía NO existe UUID en Supabase.
    id: `fbib:${partido.idFbib}`,

    origen: "fbib",

    numeroPartido:
      partido.idFbib,

    fecha:
      partido.fecha,

    hora:
      partido.hora,

    equipoLocal:
      partido.equipoLocal,

    equipoVisitante:
      partido.equipoVisitante,

    categoria:
      partido.categoria,

    grupo:
      partido.grupo,

    jornada:
      partido.jornada,

    competicion:
      partido.competicion,

    instalacionId: null,
    nombreInstalacion: null,

    estado: "sin_designar",
    totalDesignados: 0,
    totalRealizados: 0,

    guardado: false,

    idPartidoFbib:
      partido.idFbib,
  }));
}

// ======================================================
// DÍAS CON PARTIDOS
// ======================================================

function agruparPorDia(
  partidos: PartidoListadoDesignacion[],
): DiaListadoDesignacion[] {
  const mapa = new Map<
    string,
    PartidoListadoDesignacion[]
  >();

  for (const partido of partidos) {
    const lista =
      mapa.get(partido.fecha) ?? [];

    lista.push(partido);

    mapa.set(
      partido.fecha,
      lista,
    );
  }

  return Array.from(mapa.entries())
    .sort(([a], [b]) =>
      a.localeCompare(b),
    )
    .map(([fecha, partidosDelDia]) => ({
      fecha,

      partidos: partidosDelDia.sort(
        (a, b) =>
          (a.hora ?? "").localeCompare(
            b.hora ?? "",
          ),
      ),
    }));
}

// ======================================================
// RESUMEN
// ======================================================

function calcularResumen(
  partidos: PartidoListadoDesignacion[],
): ResumenListadoDesignaciones {
  const resumen: ResumenListadoDesignaciones = {
    total: 0,
    fbib: 0,
    cba: 0,
    sinDesignar: 0,
    pendientes: 0,
    realizados: 0,
  };

  for (const partido of partidos) {
    resumen.total++;

    if (partido.origen === "fbib") {
      resumen.fbib++;
    } else {
      resumen.cba++;
    }

    if (partido.estado === "sin_designar") {
      resumen.sinDesignar++;
    } else if (partido.estado === "pendiente") {
      resumen.pendientes++;
    } else {
      resumen.realizados++;
    }
  }

  return resumen;
}

// ======================================================
// SERVICIO PRINCIPAL
// ======================================================

export async function obtenerListadoDesignaciones(
  opciones: OpcionesListadoDesignaciones = {},
): Promise<ResultadoListadoDesignaciones> {
  const semana = obtenerSemana(
    opciones.semana,
  );

  const avisos: string[] = [];

  // 1. Temporada activa.

  const temporada =
    await obtenerTemporadaActiva();

  if (!temporada) {
    return {
      temporada: null,
      semana,
      equiposDesignables: [],
      dias: [],
      resumen: {
        total: 0,
        fbib: 0,
        cba: 0,
        sinDesignar: 0,
        pendientes: 0,
        realizados: 0,
      },
      avisos: [
        "No hay una temporada activa configurada.",
      ],
    };
  }

  // 2. Equipos designables.

  const equiposDesignables =
    await obtenerEquiposDesignables(
      temporada.id,
    );

  // 3. Consultas de SOLO LECTURA.
  // No insertamos ni actualizamos partidos.

  const [
    guardados,
    resultadoFbib,
  ] = await Promise.all([
    obtenerPartidosGuardados(
      temporada.id,
      semana.inicio,
      semana.fin,
    ),

    consultarPartidosFbib(
      equiposDesignables,
      semana.inicio,
      semana.fin,
    ),
  ]);

  avisos.push(
    ...resultadoFbib.avisos,
  );

  // 4. Consultar asignaciones únicamente
  // para los partidos guardados.

  const asignaciones =
    await obtenerAsignaciones(
      guardados.map(
        (partido) => partido.id,
      ),
    );

  const partidosGuardados =
    convertirGuardados(
      guardados,
      asignaciones,
    );

  // 5. Evitar duplicar partidos FBIB
  // ya guardados en Supabase.

  const idsFbibGuardados = new Set(
    partidosGuardados
      .filter(
        (partido) =>
          partido.origen === "fbib",
      )
      .map(
        (partido) =>
          partido.idPartidoFbib,
      )
      .filter(
        (id): id is string =>
          id !== null,
      ),
  );

  const partidosFbibSinGuardar =
    convertirTemporales(
      resultadoFbib.partidos.filter(
        (partido) =>
          !idsFbibGuardados.has(
            partido.idFbib,
          ),
      ),
    );

  // 6. Unificar FBIB y CBA.
  //
  // Los partidos guardados mantienen
  // todos sus datos modificados en la web.

  const partidos = [
    ...partidosGuardados,
    ...partidosFbibSinGuardar,
  ];

  // 7. Solo mostrar días con partidos.

  const dias = agruparPorDia(
    partidos,
  );

  return {
    temporada,
    semana,
    equiposDesignables,
    dias,
    resumen: calcularResumen(
      partidos,
    ),
    avisos,
  };
}
