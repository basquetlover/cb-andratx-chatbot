
import { supabaseServidor } from "@servicios/supabase/servidor";

import {
  obtenerDatosEsbFbib,
} from "@servicios/fbib/cliente/obtenerDatosEsbFbib";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const CODIGO_POSTAL_ANDRATX = "07150";
const TAMANIO_BLOQUE = 100;

// ======================================================
// TIPOS
// ======================================================

type Registro = Record<string, unknown>;

interface EquipoDesignable {
  id: string;
  idEquipoFbib: string;
}

interface PartidoFbib {
  idMatch: string | null;

  idLocalTeam: string | null;
  idVisitorTeam: string | null;

  nameLocalTeam: string | null;
  nameVisitorTeam: string | null;

  matchDay: string | null;

  postalCodeField: string | null;

  nameCategorySigned: string | null;
  nameCompetition: string | null;
  nameGroup: string | null;
  numMatchDay: string | null;
}

interface PartidoNuevo {
  origen: "fbib";
  numero_partido: string;
  id_partido_fbib: string;

  temporada_id: string;
  equipo_id: string;

  fecha: string;
  hora: string | null;

  equipo_local: string;
  equipo_visitante: string;

  categoria: string | null;
  grupo: string | null;
  jornada: string | null;
  competicion: string | null;

  instalacion_id: null;

  estado: "sin_designar";
  excluido: false;

  created_at: string;
  updated_at: string;
}

export interface OpcionesSincronizacionFbib {
  temporadaId: string;
  inicio: string;
  fin: string;
}

export interface ResultadoSincronizacionFbib {
  consultados: number;
  encontradosAndratx: number;
  importados: number;
  existentes: number;

  fueraAndratx: number;
  sinCodigoPostal: number;
  sinIdentificador: number;
  erroresConsulta: number;

  excluidosExistentes: number;

  avisos: string[];
}

// ======================================================
// UTILIDADES
// ======================================================

function obtenerRegistro(
  valor: unknown,
): Registro | null {
  if (
    typeof valor !== "object" ||
    valor === null ||
    Array.isArray(valor)
  ) {
    return null;
  }

  return valor as Registro;
}

function convertirTexto(
  valor: unknown,
): string | null {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return null;
  }

  const limpio = String(valor).trim();

  return limpio.length > 0
    ? limpio
    : null;
}

function obtenerColeccion(
  valor: unknown,
): unknown[] {
  if (Array.isArray(valor)) {
    return valor;
  }

  const datos = obtenerRegistro(valor);

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

    const objeto = obtenerRegistro(contenido);

    if (objeto) {
      return Object.values(objeto);
    }
  }

  return [];
}

function convertirPartidoFbib(
  valor: unknown,
): PartidoFbib | null {
  const partido = obtenerRegistro(valor);

  if (!partido) {
    return null;
  }

  return {
    idMatch: convertirTexto(
      partido.idMatch,
    ),

    idLocalTeam: convertirTexto(
      partido.idLocalTeam,
    ),

    idVisitorTeam: convertirTexto(
      partido.idVisitorTeam,
    ),

    nameLocalTeam: convertirTexto(
      partido.nameLocalTeam,
    ),

    nameVisitorTeam: convertirTexto(
      partido.nameVisitorTeam,
    ),

    matchDay: convertirTexto(
      partido.matchDay,
    ),

    postalCodeField: convertirTexto(
      partido.postalCodeField,
    ),

    nameCategorySigned: convertirTexto(
      partido.nameCategorySigned,
    ),

    nameCompetition: convertirTexto(
      partido.nameCompetition,
    ),

    nameGroup: convertirTexto(
      partido.nameGroup,
    ),

    numMatchDay: convertirTexto(
      partido.numMatchDay,
    ),
  };
}

function obtenerFechaHora(
  valor: string | null,
): {
  fecha: string | null;
  hora: string | null;
} {
  const coincidencia = valor?.match(
    /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/,
  );

  return {
    fecha: coincidencia?.[1] ?? null,
    hora: coincidencia?.[2] ?? null,
  };
}

function fechaValida(
  valor: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
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
    meses.add(
      fecha.getUTCMonth() + 1,
    );

    fecha.setUTCMonth(
      fecha.getUTCMonth() + 1,
    );
  }

  return Array.from(meses);
}

function normalizarCodigoPostal(
  valor: string | null,
): string | null {
  if (!valor) {
    return null;
  }

  const codigo = valor
    .replace(/\s+/g, "")
    .trim();

  return /^\d{5}$/.test(codigo)
    ? codigo
    : null;
}

function crearResultado(): ResultadoSincronizacionFbib {
  return {
    consultados: 0,
    encontradosAndratx: 0,
    importados: 0,
    existentes: 0,

    fueraAndratx: 0,
    sinCodigoPostal: 0,
    sinIdentificador: 0,
    erroresConsulta: 0,

    excluidosExistentes: 0,

    avisos: [],
  };
}

// ======================================================
// EQUIPOS DESIGNABLES
// ======================================================

async function obtenerEquiposDesignables(
  temporadaId: string,
): Promise<EquipoDesignable[]> {
  const { data, error } = await supabaseServidor
    .from("equipos")
    .select("id, id_equipo_fbib")
    .eq("temporada_id", temporadaId)
    .eq("designable", true)
    .eq("activo", true);

  if (error) {
    throw new Error(
      `Error consultando equipos designables: ${error.message}`,
    );
  }

  return (data ?? []).flatMap((equipo) => {
    const idFbib = convertirTexto(
      equipo.id_equipo_fbib,
    );

    if (!idFbib) {
      return [];
    }

    return [{
      id: String(equipo.id),
      idEquipoFbib: idFbib,
    }];
  });
}

// ======================================================
// CONSULTA DIRECTA FBIB
// ======================================================

async function obtenerPartidosFbib(
  idEquipoFbib: string,
  mes: number,
): Promise<PartidoFbib[]> {
  const respuesta = await obtenerDatosEsbFbib(
    `/Match/getByTeamAndMonth/${encodeURIComponent(
      idEquipoFbib,
    )}/${mes}`,
  );

  return obtenerColeccion(respuesta)
    .map(convertirPartidoFbib)
    .filter(
      (partido): partido is PartidoFbib =>
        partido !== null,
    );
}

// ======================================================
// COMPROBAR PARTIDOS EXISTENTES
// ======================================================

async function obtenerPartidosExistentes(
  idsFbib: string[],
): Promise<Set<string>> {
  const encontrados = new Set<string>();

  for (
    let indice = 0;
    indice < idsFbib.length;
    indice += TAMANIO_BLOQUE
  ) {
    const bloque = idsFbib.slice(
      indice,
      indice + TAMANIO_BLOQUE,
    );

    const { data, error } = await supabaseServidor
      .from("designaciones_partidos")
      .select("id_partido_fbib")
      .eq("origen", "fbib")
      .in("id_partido_fbib", bloque);

    if (error) {
      throw new Error(
        `Error comprobando partidos existentes: ${error.message}`,
      );
    }

    for (const fila of data ?? []) {
      const id = convertirTexto(
        fila.id_partido_fbib,
      );

      if (id) {
        encontrados.add(id);
      }
    }
  }

  return encontrados;
}

// ======================================================
// EXCLUIR PARTIDOS FUERA DE ANDRATX
// ======================================================

async function excluirPartidosExistentes(
  idsFbib: string[],
): Promise<number> {
  if (idsFbib.length === 0) {
    return 0;
  }

  let totalExcluidos = 0;

  for (
    let indice = 0;
    indice < idsFbib.length;
    indice += TAMANIO_BLOQUE
  ) {
    const bloque = idsFbib.slice(
      indice,
      indice + TAMANIO_BLOQUE,
    );

    // Consultar primero los que todavía
    // aparecen como no excluidos.

    const { data, error } = await supabaseServidor
      .from("designaciones_partidos")
      .select("id")
      .eq("origen", "fbib")
      .in("id_partido_fbib", bloque)
      .eq("excluido", false);

    if (error) {
      throw new Error(
        `Error consultando partidos fuera de Andratx: ${error.message}`,
      );
    }

    const ids = (data ?? [])
      .map((fila) => fila.id)
      .filter(
        (id): id is string =>
          typeof id === "string",
      );

    if (ids.length === 0) {
      continue;
    }

    // Solo modificamos el estado de exclusión.
    // No tocamos los datos del partido,
    // las designaciones ni las funciones realizadas.

    const { error: errorActualizar } =
      await supabaseServidor
        .from("designaciones_partidos")
        .update({
          excluido: true,
          updated_at: new Date().toISOString(),
        })
        .in("id", ids)
        .eq("origen", "fbib")
        .eq("excluido", false);

    if (errorActualizar) {
      throw new Error(
        `Error excluyendo partidos fuera de Andratx: ${errorActualizar.message}`,
      );
    }

    totalExcluidos += ids.length;
  }

  return totalExcluidos;
}

// ======================================================
// SINCRONIZACIÓN PRINCIPAL
// ======================================================

export async function sincronizarPartidosFbib(
  opciones: OpcionesSincronizacionFbib,
): Promise<ResultadoSincronizacionFbib> {
  const resultado = crearResultado();

  const temporadaId = convertirTexto(
    opciones.temporadaId,
  );

  if (!temporadaId) {
    throw new Error(
      "La temporada es obligatoria.",
    );
  }

  if (
    !fechaValida(opciones.inicio) ||
    !fechaValida(opciones.fin) ||
    opciones.inicio > opciones.fin
  ) {
    throw new Error(
      "El intervalo de fechas no es válido.",
    );
  }

  // --------------------------------------------------
  // 1. EQUIPOS DESIGNABLES
  // --------------------------------------------------

  const equipos = await obtenerEquiposDesignables(
    temporadaId,
  );

  if (equipos.length === 0) {
    resultado.avisos.push(
      "No hay equipos activos configurados como designables con identificador FBIB.",
    );

    return resultado;
  }

  // --------------------------------------------------
  // 2. CONSULTAR PARTIDOS FBIB
  // --------------------------------------------------

  const meses = obtenerMeses(
    opciones.inicio,
    opciones.fin,
  );

  const consultas = equipos.flatMap(
    (equipo) =>
      meses.map(async (mes) => ({
        equipo,
        partidos: await obtenerPartidosFbib(
          equipo.idEquipoFbib,
          mes,
        ),
      })),
  );

  const respuestas = await Promise.allSettled(
    consultas,
  );

  const candidatos = new Map<
    string,
    PartidoNuevo
  >();

  // IDs cuya ubicación federativa se ha
  // comprobado y está fuera de Andratx
  // o no dispone de código postal válido.

  const idsNoPermitidos = new Set<string>();

  const idsRevisados = new Set<string>();

  // --------------------------------------------------
  // 3. VALIDAR CADA PARTIDO
  // --------------------------------------------------

  for (const respuesta of respuestas) {
    if (respuesta.status === "rejected") {
      resultado.erroresConsulta++;

      console.error(
        "[DESIGNACIONES] Error consultando FBIB:",
        respuesta.reason,
      );

      continue;
    }

    const { equipo, partidos } = respuesta.value;

    for (const partido of partidos) {
      const { fecha, hora } = obtenerFechaHora(
        partido.matchDay,
      );

      if (
        !fecha ||
        fecha < opciones.inicio ||
        fecha > opciones.fin
      ) {
        continue;
      }

      // Un equipo designable debe participar,
      // pero puede ser local o visitante.

      const participa =
        partido.idLocalTeam ===
          equipo.idEquipoFbib ||
        partido.idVisitorTeam ===
          equipo.idEquipoFbib;

      if (!participa) {
        continue;
      }

      const idFbib = partido.idMatch;

      if (!idFbib) {
        resultado.sinIdentificador++;
        continue;
      }

      if (idsRevisados.has(idFbib)) {
        continue;
      }

      idsRevisados.add(idFbib);
      resultado.consultados++;

      // ----------------------------------------------
      // FILTRO POR CÓDIGO POSTAL
      // ----------------------------------------------

      const codigoPostal =
        normalizarCodigoPostal(
          partido.postalCodeField,
        );

      if (!codigoPostal) {
        resultado.sinCodigoPostal++;

        idsNoPermitidos.add(idFbib);

        continue;
      }

      if (
        codigoPostal !==
        CODIGO_POSTAL_ANDRATX
      ) {
        resultado.fueraAndratx++;

        idsNoPermitidos.add(idFbib);

        continue;
      }

      // El partido se disputa en código
      // postal 07150, sin importar cuál
      // de los equipos figure como local.

      resultado.encontradosAndratx++;

      const ahora = new Date().toISOString();

      candidatos.set(idFbib, {
        origen: "fbib",

        numero_partido: idFbib,
        id_partido_fbib: idFbib,

        temporada_id: temporadaId,
        equipo_id: equipo.id,

        fecha,
        hora,

        equipo_local:
          partido.nameLocalTeam ??
          "Equipo local",

        equipo_visitante:
          partido.nameVisitorTeam ??
          "Equipo visitante",

        categoria:
          partido.nameCategorySigned,

        grupo:
          partido.nameGroup,

        jornada:
          partido.numMatchDay,

        competicion:
          partido.nameCompetition,

        instalacion_id: null,

        estado: "sin_designar",
        excluido: false,

        created_at: ahora,
        updated_at: ahora,
      });
    }
  }

  // --------------------------------------------------
  // 4. EXCLUIR PARTIDOS YA IMPORTADOS
  //    QUE NO SE JUEGAN EN ANDRATX
  // --------------------------------------------------

  resultado.excluidosExistentes =
    await excluirPartidosExistentes(
      Array.from(idsNoPermitidos),
    );

  // --------------------------------------------------
  // 5. COMPROBAR DUPLICADOS
  // --------------------------------------------------

  const idsCandidatos = Array.from(
    candidatos.keys(),
  );

  if (idsCandidatos.length > 0) {
    const existentes =
      await obtenerPartidosExistentes(
        idsCandidatos,
      );

    resultado.existentes = existentes.size;

    const nuevos = Array.from(
      candidatos.entries(),
    )
      .filter(
        ([id]) => !existentes.has(id),
      )
      .map(
        ([, partido]) => partido,
      );

    // ------------------------------------------------
    // 6. INSERTAR LOS NUEVOS
    // ------------------------------------------------

    for (
      let indice = 0;
      indice < nuevos.length;
      indice += TAMANIO_BLOQUE
    ) {
      const bloque = nuevos.slice(
        indice,
        indice + TAMANIO_BLOQUE,
      );

      const { error } = await supabaseServidor
        .from("designaciones_partidos")
        .insert(bloque);

      if (error) {
        throw new Error(
          `Error guardando partidos FBIB: ${error.message}`,
        );
      }

      resultado.importados += bloque.length;
    }
  }

  // --------------------------------------------------
  // 7. AVISOS
  // --------------------------------------------------

  if (resultado.excluidosExistentes > 0) {
    resultado.avisos.push(
      `Se han excluido ${resultado.excluidosExistentes} partidos FBIB ya guardados que no tienen confirmada una sede con código postal 07150.`,
    );
  }

  if (resultado.erroresConsulta > 0) {
    resultado.avisos.push(
      `${resultado.erroresConsulta} consultas FBIB han fallado.`,
    );
  }

  if (resultado.sinCodigoPostal > 0) {
    resultado.avisos.push(
      `${resultado.sinCodigoPostal} partidos no tienen código postal válido y se han descartado.`,
    );
  }

  return resultado;
}
