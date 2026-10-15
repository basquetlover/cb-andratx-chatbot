
import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

// ======================================================
// C.B. ANDRATX
// ESTADÍSTICAS DE DESIGNACIONES
//
// Servicio backend de solo lectura.
//
// - Árbitros y oficiales de mesa.
// - Temporada activa o temporada seleccionada.
// - Partidos únicos por persona.
// - Funciones realmente realizadas.
// - Evolución mensual.
// - Distribución de funciones.
// ======================================================

// ======================================================
// TIPOS
// ======================================================

export type FuncionDesignacion =
  | "AP"
  | "AX"
  | "AN"
  | "CR"
  | "OP"
  | "AY";

export interface EstadisticasPersona {
  id: string;
  codigo: string;
  nombreCompleto: string;
  activo: boolean;

  habilitacion: string;
  nivelPista: string | null;
  nivelMesa: string | null;

  partidosRealizados: number;
  actuacionesRealizadas: number;
  designacionesPendientes: number;

  funciones: Record<FuncionDesignacion, number>;
}

export interface EstadisticasMensuales {
  mes: string;
  partidos: number;
  actuaciones: number;
  personas: number;
}

export interface ResumenEstadisticasDesignaciones {
  totalPersonal: number;
  personalActivo: number;

  totalPartidos: number;
  partidosConDesignaciones: number;
  partidosConActuaciones: number;

  actuacionesRealizadas: number;
  designacionesPendientes: number;

  personasConActuaciones: number;
}

export interface ResultadoEstadisticasDesignaciones {
  temporada: {
    id: string;
    nombre: string;
  };

  resumen: ResumenEstadisticasDesignaciones;

  porPersona: EstadisticasPersona[];
  porMes: EstadisticasMensuales[];

  porFuncion: Record<FuncionDesignacion, number>;

  avisos: string[];
}

// ======================================================
// FILAS SUPABASE
// ======================================================

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

interface FilaPersonal {
  id: string;
  codigo: string | null;
  nombre_completo: string | null;
  activo: boolean | null;
  habilitacion: string | null;
  nivel_pista: string | null;
  nivel_mesa: string | null;
}

interface FilaPartido {
  id: string;
  fecha: string | null;
  excluido: boolean | null;
}

interface FilaAsignacion {
  id: string;
  partido_id: string;
  persona_id: string;
  funcion_designada: string | null;
  funcion_realizada: string | null;
}

// ======================================================
// CONFIGURACIÓN
// ======================================================

const FUNCIONES: FuncionDesignacion[] = [
  "AP",
  "AX",
  "AN",
  "CR",
  "OP",
  "AY",
];

const TAMANO_PAGINA = 500;

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ======================================================
// ERRORES
// ======================================================

export class ErrorEstadisticasDesignaciones
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);
    this.name = "ErrorEstadisticasDesignaciones";
    this.status = status;
  }
}

// ======================================================
// UTILIDADES
// ======================================================

function texto(valor: unknown): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function esFuncion(
  valor: unknown,
): valor is FuncionDesignacion {
  return (
    typeof valor === "string" &&
    FUNCIONES.includes(
      valor as FuncionDesignacion,
    )
  );
}

function contadoresFunciones():
Record<FuncionDesignacion, number> {
  return {
    AP: 0,
    AX: 0,
    AN: 0,
    CR: 0,
    OP: 0,
    AY: 0,
  };
}

function mesPartido(
  fecha: string | null,
): string | null {
  if (!fecha) {
    return null;
  }

  const valor = fecha.slice(0, 7);

  return /^\d{4}-(0[1-9]|1[0-2])$/.test(valor)
    ? valor
    : null;
}

// ======================================================
// TEMPORADA
// ======================================================

async function obtenerTemporada(
  temporadaId?: string | null,
): Promise<FilaTemporada> {
  if (temporadaId && !REGEX_UUID.test(temporadaId)) {
    throw new ErrorEstadisticasDesignaciones(
      "El identificador de temporada no es válido.",
      400,
    );
  }

  let consulta = supabaseServidor
    .from("temporadas")
    .select("id, nombre");

  if (temporadaId) {
    consulta = consulta.eq("id", temporadaId);
  } else {
    consulta = consulta.eq("activa", true);
  }

  const { data, error } = await consulta
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ErrorEstadisticasDesignaciones(
      "No se ha podido consultar la temporada.",
    );
  }

  if (!data?.id) {
    throw new ErrorEstadisticasDesignaciones(
      "No se ha encontrado la temporada solicitada.",
      404,
    );
  }

  return data as FilaTemporada;
}

// ======================================================
// CONSULTAS PAGINADAS
// ======================================================

async function obtenerPersonal():
Promise<FilaPersonal[]> {
  const resultado: FilaPersonal[] = [];

  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await supabaseServidor
      .from("designaciones_personal")
      .select(`
        id,
        codigo,
        nombre_completo,
        activo,
        habilitacion,
        nivel_pista,
        nivel_mesa
      `)
      .order("id", { ascending: true })
      .range(desde, desde + TAMANO_PAGINA - 1);

    if (error) {
      throw new ErrorEstadisticasDesignaciones(
        "No se ha podido consultar el personal.",
      );
    }

    const filas = (data ?? []) as FilaPersonal[];
    resultado.push(...filas);

    if (filas.length < TAMANO_PAGINA) {
      break;
    }
  }

  return resultado;
}

async function obtenerPartidos(
  temporadaId: string,
): Promise<FilaPartido[]> {
  const resultado: FilaPartido[] = [];

  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await supabaseServidor
      .from("designaciones_partidos")
      .select("id, fecha, excluido")
      .eq("temporada_id", temporadaId)
      .order("id", { ascending: true })
      .range(desde, desde + TAMANO_PAGINA - 1);

    if (error) {
      throw new ErrorEstadisticasDesignaciones(
        "No se han podido consultar los partidos.",
      );
    }

    const filas = (data ?? []) as FilaPartido[];
    resultado.push(...filas);

    if (filas.length < TAMANO_PAGINA) {
      break;
    }
  }

  return resultado;
}

async function obtenerAsignaciones(
  partidosIds: string[],
): Promise<FilaAsignacion[]> {
  if (partidosIds.length === 0) {
    return [];
  }

  const resultado: FilaAsignacion[] = [];

  // Lotes reducidos para evitar consultas
  // con listas demasiado extensas de UUID.

  const TAMANO_LOTE = 100;

  for (
    let inicio = 0;
    inicio < partidosIds.length;
    inicio += TAMANO_LOTE
  ) {
    const lote = partidosIds.slice(
      inicio,
      inicio + TAMANO_LOTE,
    );

    for (
      let desde = 0;
      ;
      desde += TAMANO_PAGINA
    ) {
      const { data, error } = await supabaseServidor
        .from("designaciones_asignaciones")
        .select(`
          id,
          partido_id,
          persona_id,
          funcion_designada,
          funcion_realizada
        `)
        .in("partido_id", lote)
        .order("id", { ascending: true })
        .range(
          desde,
          desde + TAMANO_PAGINA - 1,
        );

      if (error) {
        throw new ErrorEstadisticasDesignaciones(
          "No se han podido consultar las asignaciones.",
        );
      }

      const filas =
        (data ?? []) as FilaAsignacion[];

      resultado.push(...filas);

      if (filas.length < TAMANO_PAGINA) {
        break;
      }
    }
  }

  return resultado;
}

// ======================================================
// SERVICIO PRINCIPAL
// ======================================================

export async function obtenerEstadisticasDesignaciones(
  temporadaId?: string | null,
): Promise<ResultadoEstadisticasDesignaciones> {
  const avisos: string[] = [];

  const temporada = await obtenerTemporada(
    temporadaId,
  );

  const [personal, todosPartidos] =
    await Promise.all([
      obtenerPersonal(),
      obtenerPartidos(temporada.id),
    ]);

  // Los partidos excluidos no intervienen
  // en las estadísticas de esta sección.

  const partidos = todosPartidos.filter(
    (partido) => partido.excluido !== true,
  );

  const mapaPartidos = new Map(
    partidos.map(
      (partido) => [partido.id, partido],
    ),
  );

  const asignaciones = await obtenerAsignaciones(
    partidos.map((partido) => partido.id),
  );

  // ====================================================
  // PREPARAR PERSONAL
  // ====================================================

  const estadisticasPersonal = new Map<
    string,
    EstadisticasPersona
  >();

  const partidosPorPersona = new Map<
    string,
    Set<string>
  >();

  for (const persona of personal) {
    estadisticasPersonal.set(
      persona.id,
      {
        id: persona.id,
        codigo: texto(persona.codigo),
        nombreCompleto:
          texto(persona.nombre_completo),
        activo: persona.activo === true,

        habilitacion:
          texto(persona.habilitacion),

        nivelPista:
          texto(persona.nivel_pista) || null,

        nivelMesa:
          texto(persona.nivel_mesa) || null,

        partidosRealizados: 0,
        actuacionesRealizadas: 0,
        designacionesPendientes: 0,

        funciones: contadoresFunciones(),
      },
    );

    partidosPorPersona.set(
      persona.id,
      new Set(),
    );
  }

  // ====================================================
  // CONTADORES GENERALES
  // ====================================================

  const porFuncion = contadoresFunciones();

  const partidosConDesignaciones =
    new Set<string>();

  const partidosConActuaciones =
    new Set<string>();

  const meses = new Map<
    string,
    {
      partidos: Set<string>;
      actuaciones: number;
      personas: Set<string>;
    }
  >();

  let actuacionesRealizadas = 0;
  let designacionesPendientes = 0;
  let asignacionesSinPersona = 0;

  // ====================================================
  // PROCESAR ASIGNACIONES
  // ====================================================

  for (const asignacion of asignaciones) {
    const partido = mapaPartidos.get(
      asignacion.partido_id,
    );

    if (!partido) {
      continue;
    }

    partidosConDesignaciones.add(
      partido.id,
    );

    const estadisticaPersona =
      estadisticasPersonal.get(
        asignacion.persona_id,
      );

    if (!estadisticaPersona) {
      asignacionesSinPersona++;
      continue;
    }

    const funcionRealizada =
      asignacion.funcion_realizada;

    if (!esFuncion(funcionRealizada)) {
      // Una designación todavía no realizada
      // se contabiliza como pendiente.

      estadisticaPersona.designacionesPendientes++;
      designacionesPendientes++;
      continue;
    }

    // Contabilizar la actuación real.

    estadisticaPersona.actuacionesRealizadas++;

    estadisticaPersona.funciones[
      funcionRealizada
    ]++;

    porFuncion[funcionRealizada]++;

    actuacionesRealizadas++;

    // Un mismo partido solo cuenta una vez
    // para cada persona.

    partidosPorPersona
      .get(asignacion.persona_id)
      ?.add(partido.id);

    partidosConActuaciones.add(partido.id);

    // Evolución mensual.

    const mes = mesPartido(
      partido.fecha,
    );

    if (!mes) {
      continue;
    }

    if (!meses.has(mes)) {
      meses.set(mes, {
        partidos: new Set(),
        actuaciones: 0,
        personas: new Set(),
      });
    }

    const estadisticaMes = meses.get(mes)!;

    estadisticaMes.partidos.add(
      partido.id,
    );

    estadisticaMes.actuaciones++;

    estadisticaMes.personas.add(
      asignacion.persona_id,
    );
  }

  // ====================================================
  // ACTUALIZAR PARTIDOS POR PERSONA
  // ====================================================

  for (const [
    personaId,
    estadistica,
  ] of estadisticasPersonal) {
    estadistica.partidosRealizados =
      partidosPorPersona.get(
        personaId,
      )?.size ?? 0;
  }

  // ====================================================
  // ORDENAR RESULTADOS
  // ====================================================

  const porPersona = Array.from(
    estadisticasPersonal.values(),
  ).sort((a, b) =>
    b.partidosRealizados - a.partidosRealizados ||
    b.actuacionesRealizadas - a.actuacionesRealizadas ||
    a.nombreCompleto.localeCompare(
      b.nombreCompleto,
      "es",
    ),
  );

  const porMes: EstadisticasMensuales[] =
    Array.from(meses.entries())
      .sort(([mesA], [mesB]) =>
        mesA.localeCompare(mesB),
      )
      .map(([mes, datos]) => ({
        mes,
        partidos: datos.partidos.size,
        actuaciones: datos.actuaciones,
        personas: datos.personas.size,
      }));

  if (asignacionesSinPersona > 0) {
    avisos.push(
      `${asignacionesSinPersona} asignaciones no se han contabilizado individualmente porque su persona no está disponible.`,
    );
  }

  // ====================================================
  // RESPUESTA
  // ====================================================

  return {
    temporada: {
      id: temporada.id,
      nombre:
        texto(temporada.nombre) ||
        "Temporada",
    },

    resumen: {
      totalPersonal:
        personal.length,

      personalActivo:
        personal.filter(
          (persona) => persona.activo === true,
        ).length,

      totalPartidos:
        partidos.length,

      partidosConDesignaciones:
        partidosConDesignaciones.size,

      partidosConActuaciones:
        partidosConActuaciones.size,

      actuacionesRealizadas,

      designacionesPendientes,

      personasConActuaciones:
        porPersona.filter(
          (persona) =>
            persona.partidosRealizados > 0,
        ).length,
    },

    porPersona,
    porMes,
    porFuncion,
    avisos,
  };
}
