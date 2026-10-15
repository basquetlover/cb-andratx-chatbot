
import { supabaseServidor } from "@servicios/supabase/servidor";

import {
  obtenerDatosEsbFbib,
} from "@servicios/fbib/cliente/obtenerDatosEsbFbib";

import {
  obtenerInstalacionesDesignaciones,
} from "@servicios/backend/designaciones/obtenerInstalacionesDesignaciones";

import type {
  InstalacionDesignacion,
} from "@servicios/backend/designaciones/obtenerInstalacionesDesignaciones";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const CODIGO_POSTAL_ANDRATX = "07150";
const ZONA_HORARIA = "Europe/Madrid";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// ======================================================
// TIPOS PÚBLICOS
// ======================================================

export type OrigenPartidoDesignacion =
  | "fbib"
  | "cba";

export type EstadoPartidoDesignacion =
  | "sin_designar"
  | "pendiente"
  | "realizado";

export interface DatosPartidoDesignacion {
  id: string | null;
  idPartidoFbib: string | null;

  guardado: boolean;
  origen: OrigenPartidoDesignacion;

  numeroPartido: string;

  temporadaId: string;
  equipoId: string | null;

  fecha: string;
  hora: string;

  equipoLocal: string;
  equipoVisitante: string;

  categoria: string;
  grupo: string;
  jornada: string;
  competicion: string;

  instalacionId: string | null;

  nombreCampoFbib: string | null;
  codigoPostalFbib: string | null;

  nivelMinimoPista: string;
  nivelMinimoMesa: string;

  anotaciones: string;

  estado: EstadoPartidoDesignacion;
}

export interface PersonalDisponibleDesignacion {
  id: string;
  codigo: string;
  nombreCompleto: string;

  habilitacion: string;

  nivelPista: string | null;
  nivelMesa: string | null;

  grupos: string[];

  activo: boolean;
}

export interface AsignacionDetalleDesignacion {
  id: string;
  personaId: string;

  funcionDesignada: string;
  funcionRealizada: string | null;

  orden: number;
  anotaciones: string;
}

export interface ResultadoDetallePartidoDesignacion {
  partido: DatosPartidoDesignacion;
  personal: PersonalDisponibleDesignacion[];
  asignaciones: AsignacionDetalleDesignacion[];
  instalaciones: InstalacionDesignacion[];
  avisos: string[];
}

// ======================================================
// TIPOS INTERNOS
// ======================================================

type Registro = Record<string, unknown>;

interface FilaPartido {
  id: string;
  origen: string | null;
  numero_partido: string | null;
  id_partido_fbib: string | null;

  temporada_id: string;
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
  nivel_minimo_pista: string | null;
  nivel_minimo_mesa: string | null;

  anotaciones: string | null;
}

interface FilaPersonal {
  id: string;
  codigo: string | null;
  nombre_completo: string | null;
  habilitacion: string | null;
  nivel_pista: string | null;
  nivel_mesa: string | null;
  grupos: string[] | null;
  activo: boolean | null;
}

interface FilaAsignacion {
  id: string;
  persona_id: string | null;
  funcion_designada: string | null;
  funcion_realizada: string | null;
  orden: number | null;
  anotaciones: string | null;
}

interface EquipoFbib {
  id: string;
  idEquipoFbib: string;
}

interface PartidoEncontradoFbib {
  datos: Registro;
  equipo: EquipoFbib;
}

interface ResultadoInterno {
  partido: DatosPartidoDesignacion;
  asignaciones: AsignacionDetalleDesignacion[];
}

// ======================================================
// ERRORES
// ======================================================

export class ErrorDetallePartidoDesignacion
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name = "ErrorDetallePartidoDesignacion";
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

function registro(
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

    if (contenido !== undefined && contenido !== null) {
      return coleccion(contenido);
    }
  }

  if ("idMatch" in objeto) {
    return [objeto];
  }

  const valores = Object.values(objeto);

  if (
    valores.length > 0 &&
    valores.every(
      (elemento) => registro(elemento) !== null,
    )
  ) {
    return valores;
  }

  return [];
}

function obtenerFechaHora(
  valor: unknown,
): {
  fecha: string;
  hora: string;
} {
  const coincidencia = texto(valor).match(
    /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/,
  );

  return {
    fecha: coincidencia?.[1] ?? "",
    hora: coincidencia?.[2] ?? "",
  };
}

function fechaValida(valor: string): boolean {
  if (!REGEX_FECHA.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T12:00:00Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

function calcularEstado(
  asignaciones: AsignacionDetalleDesignacion[],
): EstadoPartidoDesignacion {
  if (asignaciones.length === 0) {
    return "sin_designar";
  }

  return asignaciones.every(
    (asignacion) =>
      Boolean(asignacion.funcionRealizada),
  )
    ? "realizado"
    : "pendiente";
}

function validarIdentificador(
  identificador: string,
): {
  origen: "fbib" | "guardado";
  valor: string;
} {
  const limpio = identificador.trim();

  if (limpio.startsWith("fbib:")) {
    const id = limpio.slice(5).trim();

    if (!/^\d+$/.test(id)) {
      throw new ErrorDetallePartidoDesignacion(
        "El identificador FBIB no es válido.",
        400,
      );
    }

    return {
      origen: "fbib",
      valor: id,
    };
  }

  if (!REGEX_UUID.test(limpio)) {
    throw new ErrorDetallePartidoDesignacion(
      "El identificador del partido no es válido.",
      400,
    );
  }

  return {
    origen: "guardado",
    valor: limpio,
  };
}

function obtenerMesActual(): number {
  const partes = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: ZONA_HORARIA,
      month: "numeric",
    },
  ).format(new Date());

  return Number(partes);
}

function mesesPorProximidad(
  fechaReferencia?: string | null,
): number[] {
  const mesReferencia =
    fechaReferencia && fechaValida(fechaReferencia)
      ? Number(fechaReferencia.slice(5, 7))
      : obtenerMesActual();

  return Array.from(
    { length: 12 },
    (_, indice) => indice + 1,
  ).sort((a, b) => {
    const distancia = (mes: number) => {
      const diferencia = Math.abs(
        mes - mesReferencia,
      );

      return Math.min(diferencia, 12 - diferencia);
    };

    return distancia(a) - distancia(b) || a - b;
  });
}

// ======================================================
// TEMPORADA ACTIVA
// ======================================================

async function obtenerTemporadaActiva(): Promise<string> {
  const { data, error } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ErrorDetallePartidoDesignacion(
      `Error obteniendo la temporada: ${error.message}`,
    );
  }

  if (!data?.id) {
    throw new ErrorDetallePartidoDesignacion(
      "No hay ninguna temporada activa.",
      404,
    );
  }

  return String(data.id);
}

// ======================================================
// PERSONAL DISPONIBLE
// ======================================================

async function obtenerPersonal(): Promise<
  PersonalDisponibleDesignacion[]
> {
  const { data, error } = await supabaseServidor
    .from("designaciones_personal")
    .select(`
      id,
      codigo,
      nombre_completo,
      habilitacion,
      nivel_pista,
      nivel_mesa,
      grupos,
      activo
    `)
    .order("nombre_completo", {
      ascending: true,
    });

  if (error) {
    throw new ErrorDetallePartidoDesignacion(
      `Error consultando el personal: ${error.message}`,
    );
  }

  return ((data ?? []) as FilaPersonal[])
    .map((persona) => ({
      id: persona.id,
      codigo: texto(persona.codigo),
      nombreCompleto: texto(persona.nombre_completo),
      habilitacion: texto(persona.habilitacion),
      nivelPista: texto(persona.nivel_pista) || null,
      nivelMesa: texto(persona.nivel_mesa) || null,
      grupos: Array.isArray(persona.grupos)
        ? persona.grupos
        : [],
      activo: persona.activo !== false,
    }))
    .filter(
      (persona) => persona.nombreCompleto.length > 0,
    );
}

// ======================================================
// ASIGNACIONES GUARDADAS
// ======================================================

async function obtenerAsignacionesPartido(
  partidoId: string,
): Promise<AsignacionDetalleDesignacion[]> {
  const { data, error } = await supabaseServidor
    .from("designaciones_asignaciones")
    .select(`
      id,
      persona_id,
      funcion_designada,
      funcion_realizada,
      orden,
      anotaciones
    `)
    .eq("partido_id", partidoId)
    .order("orden", {
      ascending: true,
    });

  if (error) {
    throw new ErrorDetallePartidoDesignacion(
      `Error consultando las asignaciones: ${error.message}`,
    );
  }

  return ((data ?? []) as FilaAsignacion[])
    .filter(
      (asignacion) => Boolean(asignacion.persona_id),
    )
    .map((asignacion, indice) => ({
      id: asignacion.id,
      personaId: asignacion.persona_id!,
      funcionDesignada: texto(
        asignacion.funcion_designada,
      ),
      funcionRealizada:
        texto(asignacion.funcion_realizada) || null,
      orden: asignacion.orden ?? indice,
      anotaciones: texto(asignacion.anotaciones),
    }));
}

// ======================================================
// PARTIDO GUARDADO
// ======================================================

async function obtenerPartidoGuardado(
  id: string,
): Promise<ResultadoInterno> {
  const { data, error } = await supabaseServidor
    .from("designaciones_partidos")
    .select(`
      id,
      origen,
      numero_partido,
      id_partido_fbib,
      temporada_id,
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
      nivel_minimo_pista,
      nivel_minimo_mesa,
      anotaciones
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new ErrorDetallePartidoDesignacion(
      `Error consultando el partido: ${error.message}`,
    );
  }

  if (!data?.id) {
    throw new ErrorDetallePartidoDesignacion(
      "El partido no existe.",
      404,
    );
  }

  const fila = data as FilaPartido;

  if (fila.origen !== "fbib" && fila.origen !== "cba") {
    throw new ErrorDetallePartidoDesignacion(
      "El partido tiene un origen desconocido.",
      500,
    );
  }

  const asignaciones = await obtenerAsignacionesPartido(
    fila.id,
  );

  return {
    partido: {
      id: fila.id,
      idPartidoFbib:
        texto(fila.id_partido_fbib) || null,
      guardado: true,
      origen: fila.origen,
      numeroPartido: texto(fila.numero_partido),
      temporadaId: fila.temporada_id,
      equipoId: fila.equipo_id,
      fecha: texto(fila.fecha),
      hora: texto(fila.hora).slice(0, 5),
      equipoLocal: texto(fila.equipo_local),
      equipoVisitante: texto(fila.equipo_visitante),
      categoria: texto(fila.categoria),
      grupo: texto(fila.grupo),
      jornada: texto(fila.jornada),
      competicion: texto(fila.competicion),
      instalacionId: fila.instalacion_id,
      nombreCampoFbib: null,
      codigoPostalFbib: null,
      nivelMinimoPista: texto(fila.nivel_minimo_pista),
      nivelMinimoMesa: texto(fila.nivel_minimo_mesa),
      anotaciones: texto(fila.anotaciones),
      estado: calcularEstado(asignaciones),
    },
    asignaciones,
  };
}

// ======================================================
// EQUIPOS FBIB DESIGNABLES
// ======================================================

async function obtenerEquiposFbibDesignables(
  temporadaId: string,
): Promise<EquipoFbib[]> {
  const { data, error } = await supabaseServidor
    .from("equipos")
    .select("id, id_equipo_fbib")
    .eq("temporada_id", temporadaId)
    .eq("activo", true)
    .eq("designable", true);

  if (error) {
    throw new ErrorDetallePartidoDesignacion(
      `Error consultando equipos designables: ${error.message}`,
    );
  }

  return (data ?? [])
    .filter(
      (equipo) => Boolean(texto(equipo.id_equipo_fbib)),
    )
    .map((equipo) => ({
      id: String(equipo.id),
      idEquipoFbib: texto(equipo.id_equipo_fbib),
    }));
}

// ======================================================
// COMPROBAR PARTIDO YA GUARDADO
// ======================================================

async function buscarPartidoFbibGuardado(
  idFbib: string,
  temporadaId: string,
): Promise<string | null> {
  const { data, error } = await supabaseServidor
    .from("designaciones_partidos")
    .select("id")
    .eq("origen", "fbib")
    .eq("id_partido_fbib", idFbib)
    .eq("temporada_id", temporadaId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ErrorDetallePartidoDesignacion(
      `Error comprobando el partido FBIB: ${error.message}`,
    );
  }

  return data?.id ? String(data.id) : null;
}

// ======================================================
// BÚSQUEDA FBIB POR MESES
// ======================================================

async function buscarPartidoEnFbib(
  idFbib: string,
  equipos: EquipoFbib[],
  fechaReferencia?: string | null,
): Promise<PartidoEncontradoFbib> {
  const meses = mesesPorProximidad(fechaReferencia);

  let consultasCorrectas = 0;
  let consultasFallidas = 0;

  for (const mes of meses) {
    const resultados = await Promise.allSettled(
      equipos.map(async (equipo) => {
        const respuesta = await obtenerDatosEsbFbib(
          `/Match/getByTeamAndMonth/${encodeURIComponent(
            equipo.idEquipoFbib,
          )}/${mes}`,
        );

        return {
          equipo,
          partidos: coleccion(respuesta),
        };
      }),
    );

    for (const resultado of resultados) {
      if (resultado.status === "rejected") {
        consultasFallidas++;

        console.error(
          "[DESIGNACIONES] Error consultando FBIB:",
          resultado.reason,
        );

        continue;
      }

      consultasCorrectas++;

      const { equipo, partidos } = resultado.value;

      for (const valor of partidos) {
        const fila = registro(valor);

        if (
          !fila ||
          texto(fila.idMatch) !== idFbib
        ) {
          continue;
        }

        const participa =
          texto(fila.idLocalTeam) === equipo.idEquipoFbib ||
          texto(fila.idVisitorTeam) === equipo.idEquipoFbib;

        if (!participa) {
          continue;
        }

        const { fecha } = obtenerFechaHora(fila.matchDay);

        // Cuando conocemos la fecha desde el listado,
        // exigimos que el partido localizado coincida
        // con ella. Así no aceptamos una coincidencia
        // ambigua de otra temporada.
        if (
          fechaReferencia &&
          fechaValida(fechaReferencia) &&
          fecha !== fechaReferencia
        ) {
          continue;
        }

        return {
          datos: fila,
          equipo,
        };
      }
    }
  }

  if (consultasCorrectas === 0 || consultasFallidas > 0) {
    throw new ErrorDetallePartidoDesignacion(
      "No se ha podido completar la consulta FBIB. Inténtalo de nuevo.",
      502,
    );
  }

  throw new ErrorDetallePartidoDesignacion(
    "No se ha encontrado el partido FBIB entre los equipos designables.",
    404,
  );
}

// ======================================================
// PARTIDO FBIB TODAVÍA NO GUARDADO
// ======================================================

async function obtenerPartidoTemporalFbib(
  idFbib: string,
  temporadaId: string,
  fechaReferencia?: string | null,
): Promise<ResultadoInterno> {
  const guardadoId = await buscarPartidoFbibGuardado(
    idFbib,
    temporadaId,
  );

  if (guardadoId) {
    return obtenerPartidoGuardado(guardadoId);
  }

  const equipos = await obtenerEquiposFbibDesignables(
    temporadaId,
  );

  if (equipos.length === 0) {
    throw new ErrorDetallePartidoDesignacion(
      "No hay equipos designables configurados.",
      404,
    );
  }

  const encontrado = await buscarPartidoEnFbib(
    idFbib,
    equipos,
    fechaReferencia,
  );

  const codigoPostal = texto(
    encontrado.datos.postalCodeField,
  ).replace(/\s+/g, "");

  if (codigoPostal !== CODIGO_POSTAL_ANDRATX) {
    throw new ErrorDetallePartidoDesignacion(
      "Este partido no se disputa en una sede con código postal 07150.",
      403,
    );
  }

  const { fecha, hora } = obtenerFechaHora(
    encontrado.datos.matchDay,
  );

  if (!fechaValida(fecha)) {
    throw new ErrorDetallePartidoDesignacion(
      "El partido FBIB no tiene una fecha válida.",
      422,
    );
  }

  return {
    partido: {
      id: null,
      idPartidoFbib: idFbib,
      guardado: false,
      origen: "fbib",
      numeroPartido: idFbib,
      temporadaId,
      equipoId: encontrado.equipo.id,
      fecha,
      hora,
      equipoLocal: texto(
        encontrado.datos.nameLocalTeam,
      ),
      equipoVisitante: texto(
        encontrado.datos.nameVisitorTeam,
      ),
      categoria: texto(
        encontrado.datos.nameCategorySigned,
      ),
      grupo: texto(
        encontrado.datos.nameGroup,
      ),
      jornada: texto(
        encontrado.datos.numMatchDay,
      ),
      competicion: texto(
        encontrado.datos.nameCompetition,
      ),
      instalacionId: null,
      nombreCampoFbib:
        texto(encontrado.datos.nameField) || null,
      codigoPostalFbib: codigoPostal,
      nivelMinimoPista: "",
      nivelMinimoMesa: "",
      anotaciones: "",
      estado: "sin_designar",
    },
    asignaciones: [],
  };
}

// ======================================================
// SERVICIO PRINCIPAL
// ======================================================

export async function obtenerDetallePartidoDesignacion(
  identificador: string,
  fechaReferencia?: string | null,
): Promise<ResultadoDetallePartidoDesignacion> {
  const id = validarIdentificador(identificador);

  if (
    fechaReferencia &&
    !fechaValida(fechaReferencia)
  ) {
    throw new ErrorDetallePartidoDesignacion(
      "La fecha de referencia no es válida.",
      400,
    );
  }

  const avisos: string[] = [];

  let resultado: ResultadoInterno;

  if (id.origen === "guardado") {
    resultado = await obtenerPartidoGuardado(id.valor);
  } else {
    const temporadaId = await obtenerTemporadaActiva();

    resultado = await obtenerPartidoTemporalFbib(
      id.valor,
      temporadaId,
      fechaReferencia,
    );
  }

  const [
    personal,
    resultadoInstalaciones,
  ] = await Promise.all([
    obtenerPersonal(),

    obtenerInstalacionesDesignaciones({
      instalacionSeleccionadaId:
        resultado.partido.instalacionId,
      incluirInactivas: false,
    }),
  ]);

  if (!resultado.partido.guardado) {
    avisos.push(
      "Este partido se está consultando directamente en FBIB. " +
      "No se guardará en Supabase hasta que registres su primera designación.",
    );
  }

  if (resultadoInstalaciones.totalActivas === 0) {
    avisos.push(
      "No hay instalaciones activas disponibles para seleccionar.",
    );
  }

  const instalacionSeleccionada =
    resultadoInstalaciones.instalaciones.find(
      (instalacion) =>
        instalacion.id === resultado.partido.instalacionId,
    );

  if (
    instalacionSeleccionada &&
    !instalacionSeleccionada.activa
  ) {
    avisos.push(
      "Este partido tiene asignada una instalación inactiva. " +
      "Puedes conservarla o seleccionar una instalación activa.",
    );
  }

  return {
    partido: resultado.partido,
    personal,
    asignaciones: resultado.asignaciones,
    instalaciones: resultadoInstalaciones.instalaciones,
    avisos,
  };
}
