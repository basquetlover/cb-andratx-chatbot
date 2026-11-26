
import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  esFuncionLiquidacion,
  type FuncionLiquidacion,
} from "@servicios/backend/designaciones/tarifasLiquidaciones";

// ======================================================
// TIPOS PÚBLICOS
// ======================================================

export interface PeriodoLiquidacion {
  fechaInicio: string;
  fechaFin: string;
}

export interface PersonaLiquidacion {
  id: string;
  codigo: string;
  nombreCompleto: string;
  activo: boolean;
}

export interface PartidoLiquidacion {
  id: string;
  numeroPartido: string;
  categoria: string;
  fecha: string;
  hora: string | null;
}

export interface ActuacionLiquidacion {
  id: string;
  personaId: string;
  partidoId: string;
  funcionRealizada: FuncionLiquidacion;
}

export interface ResultadoDatosLiquidaciones {
  periodo: PeriodoLiquidacion;

  personas: PersonaLiquidacion[];

  partidos: PartidoLiquidacion[];

  actuaciones: ActuacionLiquidacion[];

  resumen: {
    totalPersonas: number;
    totalPartidos: number;
    totalActuaciones: number;
  };

  avisos: string[];
}

// ======================================================
// TIPOS DE SUPABASE
// ======================================================

interface FilaPersonal {
  id: string;
  codigo: string | null;
  nombre_completo: string | null;
  activo: boolean | null;
}

interface FilaPartido {
  id: string;
  numero_partido: string | null;
  categoria: string | null;
  fecha: string | null;
  hora: string | null;
  excluido: boolean | null;
}

interface FilaAsignacion {
  id: string;
  partido_id: string | null;
  persona_id: string | null;
  funcion_realizada: string | null;
}

// ======================================================
// CONFIGURACIÓN
// ======================================================

const TAMANO_PAGINA = 500;

const TAMANO_LOTE = 100;

const ZONA_HORARIA = "Europe/Madrid";

const REGEX_FECHA =
  /^\d{4}-\d{2}-\d{2}$/;

// ======================================================
// ERRORES
// ======================================================

export class ErrorLiquidacionesDesignaciones
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name =
      "ErrorLiquidacionesDesignaciones";

    this.status = status;
  }
}

// ======================================================
// UTILIDADES
// ======================================================

function texto(valor: unknown): string {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return "";
  }

  return String(valor).trim();
}

function normalizarHora(
  valor: string | null,
): string | null {
  const hora = texto(valor);

  if (!hora) {
    return null;
  }

  const resultado = hora.match(
    /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/,
  );

  if (!resultado) {
    return null;
  }

  return `${resultado[1]}:${resultado[2]}`;
}

// ======================================================
// VALIDACIÓN DE FECHAS
// ======================================================

function fechaValida(
  valor: unknown,
): valor is string {
  if (
    typeof valor !== "string" ||
    !REGEX_FECHA.test(valor)
  ) {
    return false;
  }

  const fecha = new Date(
    `${valor}T12:00:00Z`,
  );

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

export function validarPeriodoLiquidacion(
  periodo: PeriodoLiquidacion,
): PeriodoLiquidacion {
  if (!fechaValida(periodo.fechaInicio)) {
    throw new ErrorLiquidacionesDesignaciones(
      "La fecha inicial no es válida.",
      400,
    );
  }

  if (!fechaValida(periodo.fechaFin)) {
    throw new ErrorLiquidacionesDesignaciones(
      "La fecha final no es válida.",
      400,
    );
  }

  if (periodo.fechaInicio > periodo.fechaFin) {
    throw new ErrorLiquidacionesDesignaciones(
      "La fecha inicial no puede ser posterior a la fecha final.",
      400,
    );
  }

  return {
    fechaInicio: periodo.fechaInicio,
    fechaFin: periodo.fechaFin,
  };
}

// ======================================================
// PERIODO PREDETERMINADO
// ======================================================

export function obtenerPeriodoLiquidacionActual():
  PeriodoLiquidacion {
  const partes = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: ZONA_HORARIA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(new Date());

  const anio =
    partes.find(
      (parte) => parte.type === "year",
    )?.value ?? "";

  const mes =
    partes.find(
      (parte) => parte.type === "month",
    )?.value ?? "";

  const dia =
    partes.find(
      (parte) => parte.type === "day",
    )?.value ?? "";

  return {
    fechaInicio: `${anio}-${mes}-01`,

    fechaFin: `${anio}-${mes}-${dia}`,
  };
}

// ======================================================
// OBTENER PARTIDOS DEL PERIODO
// ======================================================

async function obtenerPartidosPeriodo(
  periodo: PeriodoLiquidacion,
): Promise<PartidoLiquidacion[]> {
  const partidos: PartidoLiquidacion[] = [];

  for (
    let desde = 0;
    ;
    desde += TAMANO_PAGINA
  ) {
    const { data, error } =
      await supabaseServidor
        .from("designaciones_partidos")
        .select(`
          id,
          numero_partido,
          categoria,
          fecha,
          hora,
          excluido
        `)
        .gte(
          "fecha",
          periodo.fechaInicio,
        )
        .lte(
          "fecha",
          periodo.fechaFin,
        )
        .order("fecha", {
          ascending: true,
        })
        .order("hora", {
          ascending: true,
          nullsFirst: false,
        })
        .order("id", {
          ascending: true,
        })
        .range(
          desde,
          desde + TAMANO_PAGINA - 1,
        );

    if (error) {
      console.error(
        "[LIQUIDACIONES] Error consultando partidos:",
        error,
      );

      throw new ErrorLiquidacionesDesignaciones(
        "No se han podido consultar los partidos del periodo.",
      );
    }

    const filas =
      (data ?? []) as FilaPartido[];

    for (const fila of filas) {
      // Los partidos excluidos no se liquidan.

      if (fila.excluido === true) {
        continue;
      }

      if (
        !fila.id ||
        !fechaValida(fila.fecha)
      ) {
        continue;
      }

      partidos.push({
        id: fila.id,

        numeroPartido:
          texto(fila.numero_partido) || "—",

        categoria:
          texto(fila.categoria) ||
          "Sin categoría",

        fecha: fila.fecha,

        hora: normalizarHora(fila.hora),
      });
    }

    if (filas.length < TAMANO_PAGINA) {
      break;
    }
  }

  return partidos;
}

// ======================================================
// OBTENER ASIGNACIONES DE LOS PARTIDOS
// ======================================================

async function obtenerAsignacionesPartidos(
  partidosIds: string[],
): Promise<FilaAsignacion[]> {
  if (partidosIds.length === 0) {
    return [];
  }

  const asignaciones: FilaAsignacion[] = [];

  const idsUnicos = Array.from(
    new Set(partidosIds),
  );

  for (
    let inicio = 0;
    inicio < idsUnicos.length;
    inicio += TAMANO_LOTE
  ) {
    const lote = idsUnicos.slice(
      inicio,
      inicio + TAMANO_LOTE,
    );

    for (
      let desde = 0;
      ;
      desde += TAMANO_PAGINA
    ) {
      const { data, error } =
        await supabaseServidor
          .from("designaciones_asignaciones")
          .select(`
            id,
            partido_id,
            persona_id,
            funcion_realizada
          `)
          .in(
            "partido_id",
            lote,
          )
          .not(
            "funcion_realizada",
            "is",
            null,
          )
          .order("id", {
            ascending: true,
          })
          .range(
            desde,
            desde + TAMANO_PAGINA - 1,
          );

      if (error) {
        console.error(
          "[LIQUIDACIONES] Error consultando asignaciones:",
          error,
        );

        throw new ErrorLiquidacionesDesignaciones(
          "No se han podido consultar las actuaciones realizadas.",
        );
      }

      const filas =
        (data ?? []) as FilaAsignacion[];

      asignaciones.push(...filas);

      if (filas.length < TAMANO_PAGINA) {
        break;
      }
    }
  }

  return asignaciones;
}

// ======================================================
// OBTENER PERSONAL
// ======================================================

async function obtenerPersonalLiquidacion(
  personasIds: string[],
): Promise<PersonaLiquidacion[]> {
  if (personasIds.length === 0) {
    return [];
  }

  const personas: PersonaLiquidacion[] = [];

  const idsUnicos = Array.from(
    new Set(personasIds),
  );

  for (
    let inicio = 0;
    inicio < idsUnicos.length;
    inicio += TAMANO_LOTE
  ) {
    const lote = idsUnicos.slice(
      inicio,
      inicio + TAMANO_LOTE,
    );

    for (
      let desde = 0;
      ;
      desde += TAMANO_PAGINA
    ) {
      const { data, error } =
        await supabaseServidor
          .from("designaciones_personal")
          .select(`
            id,
            codigo,
            nombre_completo,
            activo
          `)
          .in(
            "id",
            lote,
          )
          .order("id", {
            ascending: true,
          })
          .range(
            desde,
            desde + TAMANO_PAGINA - 1,
          );

      if (error) {
        console.error(
          "[LIQUIDACIONES] Error consultando personal:",
          error,
        );

        throw new ErrorLiquidacionesDesignaciones(
          "No se han podido consultar los árbitros y oficiales de mesa.",
        );
      }

      const filas =
        (data ?? []) as FilaPersonal[];

      for (const fila of filas) {
        if (!fila.id) {
          continue;
        }

        personas.push({
          id: fila.id,

          codigo:
            texto(fila.codigo) ||
            "Sin licencia",

          nombreCompleto:
            texto(fila.nombre_completo) ||
            "Persona sin nombre",

          activo: fila.activo !== false,
        });
      }

      if (filas.length < TAMANO_PAGINA) {
        break;
      }
    }
  }

  return personas;
}

// ======================================================
// RESPUESTA VACÍA
// ======================================================

function crearResultadoVacio(
  periodo: PeriodoLiquidacion,
  avisos: string[] = [],
): ResultadoDatosLiquidaciones {
  return {
    periodo,

    personas: [],

    partidos: [],

    actuaciones: [],

    resumen: {
      totalPersonas: 0,
      totalPartidos: 0,
      totalActuaciones: 0,
    },

    avisos,
  };
}

// ======================================================
// SERVICIO PRINCIPAL
// ======================================================

export async function obtenerLiquidacionesDesignaciones(
  periodoSolicitado: PeriodoLiquidacion =
    obtenerPeriodoLiquidacionActual(),
): Promise<ResultadoDatosLiquidaciones> {
  const periodo =
    validarPeriodoLiquidacion(
      periodoSolicitado,
    );

  const avisos: string[] = [];

  // ----------------------------------------------------
  // 1. OBTENER PARTIDOS
  // ----------------------------------------------------

  const partidos =
    await obtenerPartidosPeriodo(
      periodo,
    );

  if (partidos.length === 0) {
    return crearResultadoVacio(
      periodo,
    );
  }

  const mapaPartidos = new Map(
    partidos.map(
      (partido) => [
        partido.id,
        partido,
      ],
    ),
  );

  // ----------------------------------------------------
  // 2. OBTENER ASIGNACIONES
  // ----------------------------------------------------

  const asignaciones =
    await obtenerAsignacionesPartidos(
      partidos.map(
        (partido) => partido.id,
      ),
    );

  if (asignaciones.length === 0) {
    return crearResultadoVacio(
      periodo,
    );
  }

  // ----------------------------------------------------
  // 3. VALIDAR ACTUACIONES REALIZADAS
  // ----------------------------------------------------

  const actuacionesValidas:
    ActuacionLiquidacion[] = [];

  const asignacionesProcesadas =
    new Set<string>();

  let asignacionesInvalidas = 0;

  for (const asignacion of asignaciones) {
    if (
      !asignacion.id ||
      !asignacion.persona_id ||
      !asignacion.partido_id
    ) {
      asignacionesInvalidas++;

      continue;
    }

    if (
      asignacionesProcesadas.has(
        asignacion.id,
      )
    ) {
      continue;
    }

    asignacionesProcesadas.add(
      asignacion.id,
    );

    if (
      !mapaPartidos.has(
        asignacion.partido_id,
      )
    ) {
      asignacionesInvalidas++;

      continue;
    }

    const funcion =
      asignacion.funcion_realizada;

    if (!esFuncionLiquidacion(funcion)) {
      asignacionesInvalidas++;

      continue;
    }

    actuacionesValidas.push({
      id: asignacion.id,

      personaId:
        asignacion.persona_id,

      partidoId:
        asignacion.partido_id,

      funcionRealizada: funcion,
    });
  }

  if (asignacionesInvalidas > 0) {
    avisos.push(
      `${asignacionesInvalidas} asignaciones no se han incluido porque contienen datos incorrectos o funciones no válidas.`,
    );
  }

  if (actuacionesValidas.length === 0) {
    return crearResultadoVacio(
      periodo,
      avisos,
    );
  }

  // ----------------------------------------------------
  // 4. OBTENER PERSONAL CON ACTUACIONES
  // ----------------------------------------------------

  const personasIds = Array.from(
    new Set(
      actuacionesValidas.map(
        (actuacion) =>
          actuacion.personaId,
      ),
    ),
  );

  const personas =
    await obtenerPersonalLiquidacion(
      personasIds,
    );

  const mapaPersonas = new Map(
    personas.map(
      (persona) => [
        persona.id,
        persona,
      ],
    ),
  );

  // ----------------------------------------------------
  // 5. COMPROBAR RELACIONES
  // ----------------------------------------------------

  const actuaciones:
    ActuacionLiquidacion[] = [];

  let actuacionesSinPersona = 0;

  for (const actuacion of actuacionesValidas) {
    if (
      !mapaPersonas.has(
        actuacion.personaId,
      )
    ) {
      actuacionesSinPersona++;

      continue;
    }

    actuaciones.push(actuacion);
  }

  if (actuacionesSinPersona > 0) {
    avisos.push(
      `${actuacionesSinPersona} actuaciones no se han incluido porque no se ha encontrado la persona correspondiente.`,
    );
  }

  // ----------------------------------------------------
  // 6. SELECCIONAR PARTIDOS Y PERSONAL
  // ----------------------------------------------------

  const partidosRealizadosIds =
    new Set(
      actuaciones.map(
        (actuacion) =>
          actuacion.partidoId,
      ),
    );

  const personasRealizadasIds =
    new Set(
      actuaciones.map(
        (actuacion) =>
          actuacion.personaId,
      ),
    );

  const partidosRealizados =
    partidos.filter(
      (partido) =>
        partidosRealizadosIds.has(
          partido.id,
        ),
    );

  const personasRealizadas =
    personas.filter(
      (persona) =>
        personasRealizadasIds.has(
          persona.id,
        ),
    );

  // ----------------------------------------------------
  // 7. COMPROBAR DATOS INCOMPLETOS
  // ----------------------------------------------------

  const personasSinLicencia =
    personasRealizadas.filter(
      (persona) =>
        persona.codigo === "Sin licencia",
    ).length;

  const personasSinNombre =
    personasRealizadas.filter(
      (persona) =>
        persona.nombreCompleto ===
        "Persona sin nombre",
    ).length;

  const partidosSinHora =
    partidosRealizados.filter(
      (partido) => !partido.hora,
    ).length;

  const partidosSinCategoria =
    partidosRealizados.filter(
      (partido) =>
        partido.categoria === "Sin categoría",
    ).length;

  const partidosSinNumero =
    partidosRealizados.filter(
      (partido) =>
        partido.numeroPartido === "—",
    ).length;

  if (personasSinLicencia > 0) {
    avisos.push(
      `${personasSinLicencia} personas no tienen un número de licencia registrado.`,
    );
  }

  if (personasSinNombre > 0) {
    avisos.push(
      `${personasSinNombre} personas no tienen un nombre registrado.`,
    );
  }

  if (partidosSinHora > 0) {
    avisos.push(
      `${partidosSinHora} partidos no tienen una hora válida registrada.`,
    );
  }

  if (partidosSinCategoria > 0) {
    avisos.push(
      `${partidosSinCategoria} partidos no tienen categoría registrada.`,
    );
  }

  if (partidosSinNumero > 0) {
    avisos.push(
      `${partidosSinNumero} partidos no tienen número de partido registrado.`,
    );
  }

  // ----------------------------------------------------
  // 8. DEVOLVER RESULTADOS
  // ----------------------------------------------------

  return {
    periodo,

    personas:
      personasRealizadas,

    partidos:
      partidosRealizados,

    actuaciones,

    resumen: {
      totalPersonas:
        personasRealizadas.length,

      totalPartidos:
        partidosRealizados.length,

      totalActuaciones:
        actuaciones.length,
    },

    avisos,
  };
}
