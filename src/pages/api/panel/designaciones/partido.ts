
import type { APIRoute } from "astro";

import { randomUUID } from "node:crypto";

import {
  obtenerDatosEsbFbib,
} from "@servicios/fbib/cliente/obtenerDatosEsbFbib";

import {
  obtenerUsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import {
  comprobarPermisoUsuario,
} from "@servicios/seguridad/comprobarPermisoUsuario";

import {
  NOMBRE_COOKIE_SESION,
} from "@servicios/seguridad/cookieSesion";

import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

// ======================================================
// CONFIGURACIÓN
// ======================================================

export const prerender = false;

const CODIGO_POSTAL_ANDRATX = "07150";
const TAMANO_MAXIMO_JSON = 65536;
const MAXIMO_ASIGNACIONES = 30;

const FUNCIONES_VALIDAS = new Set([
  "AP",
  "AX",
  "AN",
  "CR",
  "OP",
  "AY",
]);

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CABECERAS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

type Registro = Record<string, unknown>;

type EstadoPartido =
  | "sin_designar"
  | "pendiente"
  | "realizado";

// ======================================================
// TIPOS
// ======================================================

interface DatosPartido {
  id: string | null;
  origen: "fbib" | "cba";
  idPartidoFbib: string | null;

  fecha: string;
  hora: string;

  equipoLocal: string;
  equipoVisitante: string;

  categoria: string;
  grupo: string;
  jornada: string;
  competicion: string;

  instalacionId: string | null;

  nivelMinimoPista: string;
  nivelMinimoMesa: string;

  anotaciones: string;
}

interface DatosAsignacion {
  id: string | null;
  personaId: string;
  funcionDesignada: string;
  funcionRealizada: string | null;
  orden: number;
  anotaciones: string;
}

interface PeticionGuardado {
  partido: DatosPartido;
  asignaciones: DatosAsignacion[];
}

interface FilaPartido {
  id: string;
  origen: string;
  numero_partido: string | null;
  id_partido_fbib: string | null;
  temporada_id: string;
}

interface FilaAsignacion {
  id: string;
}

interface EquipoDesignable {
  id: string;
  idFbib: string;
}

interface PartidoFbibValidado {
  idPartidoFbib: string;
  temporadaId: string;
  equipoId: string;
}

class ErrorDesignaciones extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);
    this.name = "ErrorDesignaciones";
    this.status = status;
  }
}

// ======================================================
// RESPUESTAS
// ======================================================

function responder(
  contenido: unknown,
  status = 200,
): Response {
  return Response.json(contenido, {
    status,
    headers: CABECERAS,
  });
}

function responderError(
  mensaje: string,
  status = 400,
): Response {
  return responder(
    {
      ok: false,
      data: null,
      error: mensaje,
    },
    status,
  );
}

// ======================================================
// UTILIDADES
// ======================================================

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

function texto(valor: unknown): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function textoLimitado(
  valor: unknown,
  nombre: string,
  maximo: number,
): string {
  const resultado = texto(valor);

  if (resultado.length > maximo) {
    throw new ErrorDesignaciones(
      `${nombre} no puede superar ${maximo} caracteres.`,
    );
  }

  return resultado;
}

function uuidValido(valor: string): boolean {
  return REGEX_UUID.test(valor);
}

function fechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T12:00:00Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

function horaValida(valor: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(valor)) {
    return false;
  }

  const [horas, minutos] =
    valor.split(":").map(Number);

  return (
    horas >= 0 &&
    horas <= 23 &&
    minutos >= 0 &&
    minutos <= 59
  );
}

function coleccionFbib(valor: unknown): unknown[] {
  if (Array.isArray(valor)) {
    return valor;
  }

  const datos = registro(valor);

  if (!datos) {
    return [];
  }

  for (const clave of ["matches", "data", "results"]) {
    const contenido = datos[clave];

    if (Array.isArray(contenido)) {
      return contenido;
    }

    if (registro(contenido)) {
      return coleccionFbib(contenido);
    }
  }

  if ("idMatch" in datos) {
    return [datos];
  }

  const valores = Object.values(datos);

  if (
    valores.length > 0 &&
    valores.every((valor) => registro(valor) !== null)
  ) {
    return valores;
  }

  return [];
}

function calcularEstado(
  asignaciones: DatosAsignacion[],
): EstadoPartido {
  if (asignaciones.length === 0) {
    return "sin_designar";
  }

  return asignaciones.every(
    (asignacion) =>
      asignacion.funcionRealizada !== null,
  )
    ? "realizado"
    : "pendiente";
}

// ======================================================
// VALIDAR JSON
// ======================================================

async function leerJson(
  request: Request,
): Promise<unknown> {
  const tipo = request.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();

  if (tipo !== "application/json") {
    throw new ErrorDesignaciones(
      "El contenido debe ser JSON.",
      415,
    );
  }

  const longitud = Number(
    request.headers.get("content-length") ?? "0",
  );

  if (
    !Number.isFinite(longitud) ||
    longitud < 0 ||
    longitud > TAMANO_MAXIMO_JSON
  ) {
    throw new ErrorDesignaciones(
      "La solicitud supera el tamaño permitido.",
      413,
    );
  }

  if (!request.body) {
    throw new ErrorDesignaciones(
      "La solicitud está vacía.",
    );
  }

  const lector = request.body.getReader();
  const fragmentos: Uint8Array[] = [];
  let bytes = 0;

  try {
    while (true) {
      const { done, value } = await lector.read();

      if (done) break;

      bytes += value.byteLength;

      if (bytes > TAMANO_MAXIMO_JSON) {
        await lector.cancel();

        throw new ErrorDesignaciones(
          "La solicitud supera el tamaño permitido.",
          413,
        );
      }

      fragmentos.push(value);
    }
  } finally {
    lector.releaseLock();
  }

  const contenido = new Uint8Array(bytes);
  let posicion = 0;

  for (const fragmento of fragmentos) {
    contenido.set(fragmento, posicion);
    posicion += fragmento.byteLength;
  }

  try {
    return JSON.parse(
      new TextDecoder("utf-8", {
        fatal: true,
      }).decode(contenido),
    ) as unknown;
  } catch {
    throw new ErrorDesignaciones(
      "El JSON enviado no es válido.",
    );
  }
}

// ======================================================
// VALIDAR PARTIDO
// ======================================================

function validarPartido(
  valor: unknown,
): DatosPartido {
  const datos = registro(valor);

  if (!datos) {
    throw new ErrorDesignaciones(
      "Faltan los datos del partido.",
    );
  }

  const origen = texto(datos.origen);

  if (origen !== "fbib" && origen !== "cba") {
    throw new ErrorDesignaciones(
      "El origen del partido no es válido.",
    );
  }

  const id = texto(datos.id) || null;

  if (id && !uuidValido(id)) {
    throw new ErrorDesignaciones(
      "El identificador del partido no es válido.",
    );
  }

  const idPartidoFbib =
    texto(datos.idPartidoFbib) || null;

  if (
    idPartidoFbib &&
    !/^\d+$/.test(idPartidoFbib)
  ) {
    throw new ErrorDesignaciones(
      "El identificador FBIB no es válido.",
    );
  }

  const fecha = texto(datos.fecha);
  const hora = texto(datos.hora);

  if (!fechaValida(fecha)) {
    throw new ErrorDesignaciones(
      "La fecha del partido no es válida.",
    );
  }

  if (hora && !horaValida(hora)) {
    throw new ErrorDesignaciones(
      "La hora del partido no es válida.",
    );
  }

  const equipoLocal = textoLimitado(
    datos.equipoLocal,
    "El equipo local",
    200,
  );

  const equipoVisitante = textoLimitado(
    datos.equipoVisitante,
    "El equipo visitante",
    200,
  );

  if (!equipoLocal || !equipoVisitante) {
    throw new ErrorDesignaciones(
      "Debes indicar los dos equipos.",
    );
  }

  const instalacionId =
    texto(datos.instalacionId) || null;

  if (
    instalacionId &&
    !uuidValido(instalacionId)
  ) {
    throw new ErrorDesignaciones(
      "La instalación seleccionada no es válida.",
    );
  }

  return {
    id,
    origen,
    idPartidoFbib,
    fecha,
    hora,
    equipoLocal,
    equipoVisitante,

    categoria: textoLimitado(
      datos.categoria,
      "La categoría",
      150,
    ),

    grupo: textoLimitado(
      datos.grupo,
      "El grupo",
      150,
    ),

    jornada: textoLimitado(
      datos.jornada,
      "La jornada",
      50,
    ),

    competicion: textoLimitado(
      datos.competicion,
      "La competición",
      200,
    ),

    instalacionId,

    nivelMinimoPista: textoLimitado(
      datos.nivelMinimoPista,
      "El nivel de pista",
      100,
    ),

    nivelMinimoMesa: textoLimitado(
      datos.nivelMinimoMesa,
      "El nivel de mesa",
      100,
    ),

    anotaciones: textoLimitado(
      datos.anotaciones,
      "Las anotaciones",
      5000,
    ),
  };
}

// ======================================================
// VALIDAR ASIGNACIONES
// ======================================================

function validarAsignaciones(
  valor: unknown,
): DatosAsignacion[] {
  if (!Array.isArray(valor)) {
    throw new ErrorDesignaciones(
      "Debes enviar una lista de asignaciones.",
    );
  }

  if (valor.length > MAXIMO_ASIGNACIONES) {
    throw new ErrorDesignaciones(
      "Se ha superado el máximo de asignaciones.",
    );
  }

  const idsRecibidos = new Set<string>();

  return valor.map((elemento, indice) => {
    const fila = registro(elemento);

    if (!fila) {
      throw new ErrorDesignaciones(
        `La asignación ${indice + 1} no es válida.`,
      );
    }

    const id = texto(fila.id) || null;
    const personaId = texto(fila.personaId);

    const funcionDesignada =
      texto(fila.funcionDesignada);

    const funcionRealizada =
      texto(fila.funcionRealizada) || null;

    if (id && !uuidValido(id)) {
      throw new ErrorDesignaciones(
        `El ID de la asignación ${indice + 1} no es válido.`,
      );
    }

    if (id && idsRecibidos.has(id)) {
      throw new ErrorDesignaciones(
        "Hay identificadores de asignación duplicados.",
      );
    }

    if (id) {
      idsRecibidos.add(id);
    }

    if (!uuidValido(personaId)) {
      throw new ErrorDesignaciones(
        `Selecciona una persona válida en la designación ${indice + 1}.`,
      );
    }

    if (!FUNCIONES_VALIDAS.has(funcionDesignada)) {
      throw new ErrorDesignaciones(
        `La función designada de la fila ${indice + 1} no es válida.`,
      );
    }

    if (
      funcionRealizada !== null &&
      !FUNCIONES_VALIDAS.has(funcionRealizada)
    ) {
      throw new ErrorDesignaciones(
        `La función realizada de la fila ${indice + 1} no es válida.`,
      );
    }

    return {
      id,
      personaId,
      funcionDesignada,
      funcionRealizada,
      orden: indice,

      anotaciones: textoLimitado(
        fila.anotaciones,
        `Las anotaciones de la fila ${indice + 1}`,
        2000,
      ),
    };
  });
}

function validarPeticion(
  valor: unknown,
): PeticionGuardado {
  const datos = registro(valor);

  if (!datos) {
    throw new ErrorDesignaciones(
      "No se han recibido datos válidos.",
    );
  }

  return {
    partido: validarPartido(datos.partido),
    asignaciones: validarAsignaciones(
      datos.asignaciones,
    ),
  };
}

// ======================================================
// VALIDAR PERSONAL
// ======================================================

async function validarPersonal(
  asignaciones: DatosAsignacion[],
): Promise<void> {
  const ids = Array.from(
    new Set(
      asignaciones.map(
        (asignacion) => asignacion.personaId,
      ),
    ),
  );

  if (ids.length === 0) {
    return;
  }

  const { data, error } = await supabaseServidor
    .from("designaciones_personal")
    .select("id")
    .in("id", ids);

  if (error) {
    throw new ErrorDesignaciones(
      "No se ha podido comprobar el personal.",
      500,
    );
  }

  const encontrados = new Set(
    (data ?? []).map(
      (persona) => String(persona.id),
    ),
  );

  if (ids.some((id) => !encontrados.has(id))) {
    throw new ErrorDesignaciones(
      "Una o varias personas seleccionadas no existen.",
    );
  }

  // La habilitación es orientativa.
  // No restringimos las funciones que pueden realizar.
}

// ======================================================
// VALIDAR INSTALACIÓN
// ======================================================

async function validarInstalacion(
  instalacionId: string | null,
): Promise<void> {
  if (!instalacionId) {
    return;
  }

  const { data, error } = await supabaseServidor
    .from("instalaciones")
    .select("id")
    .eq("id", instalacionId)
    .maybeSingle();

  if (error) {
    throw new ErrorDesignaciones(
      "No se ha podido comprobar la instalación.",
      500,
    );
  }

  if (!data?.id) {
    throw new ErrorDesignaciones(
      "La instalación seleccionada no existe.",
    );
  }
}

// ======================================================
// EQUIPOS DESIGNABLES Y TEMPORADA
// ======================================================

async function obtenerEquiposDesignables(): Promise<{
  temporadaId: string;
  equipos: EquipoDesignable[];
}> {
  const {
    data: temporada,
    error: errorTemporada,
  } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (errorTemporada || !temporada?.id) {
    throw new ErrorDesignaciones(
      "No se ha podido obtener la temporada activa.",
      500,
    );
  }

  const temporadaId = String(temporada.id);

  const { data, error } = await supabaseServidor
    .from("equipos")
    .select("id, id_equipo_fbib")
    .eq("temporada_id", temporadaId)
    .eq("activo", true)
    .eq("designable", true);

  if (error) {
    throw new ErrorDesignaciones(
      "No se han podido consultar los equipos designables.",
      500,
    );
  }

  const equipos = (data ?? [])
    .map((equipo) => ({
      id: String(equipo.id),
      idFbib: String(
        equipo.id_equipo_fbib ?? "",
      ).trim(),
    }))
    .filter((equipo) => equipo.idFbib.length > 0);

  if (equipos.length === 0) {
    throw new ErrorDesignaciones(
      "No hay equipos FBIB designables configurados.",
    );
  }

  return {
    temporadaId,
    equipos,
  };
}

// ======================================================
// ORDEN DE CONSULTA DE LOS MESES
// ======================================================

function mesesPorProximidad(
  fechaReferencia: string,
): number[] {
  const mesReferencia =
    Number(fechaReferencia.slice(5, 7));

  return Array.from(
    { length: 12 },
    (_, indice) => indice + 1,
  ).sort((a, b) => {
    const distancia = (mes: number) => {
      const diferencia = Math.abs(
        mes - mesReferencia,
      );

      return Math.min(
        diferencia,
        12 - diferencia,
      );
    };

    return (
      distancia(a) - distancia(b) ||
      a - b
    );
  });
}

// ======================================================
// VALIDAR PARTIDO FBIB
// ======================================================

async function validarPartidoFbib(
  idPartidoFbib: string,
  fechaReferencia: string,
): Promise<PartidoFbibValidado> {
  const {
    temporadaId,
    equipos,
  } = await obtenerEquiposDesignables();

  const meses = mesesPorProximidad(
    fechaReferencia,
  );

  let consultasCorrectas = 0;
  let consultasFallidas = 0;

  // Buscamos primero en el mes de la fecha
  // del formulario y ampliamos la búsqueda.
  //
  // La fecha puede haber sido modificada en
  // el editor, por eso no dependemos únicamente
  // del primer mes consultado.

  for (const mes of meses) {
    const consultas = equipos.map(
      async (equipo) => {
        const respuesta =
          await obtenerDatosEsbFbib(
            `/Match/getByTeamAndMonth/${encodeURIComponent(
              equipo.idFbib,
            )}/${mes}`,
          );

        return {
          equipo,
          partidos: coleccionFbib(respuesta),
        };
      },
    );

    const resultados =
      await Promise.allSettled(consultas);

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

      const {
        equipo,
        partidos,
      } = resultado.value;

      for (const valor of partidos) {
        const partido = registro(valor);

        if (
          !partido ||
          String(partido.idMatch ?? "").trim() !==
            idPartidoFbib
        ) {
          continue;
        }

        const local = String(
          partido.idLocalTeam ?? "",
        ).trim();

        const visitante = String(
          partido.idVisitorTeam ?? "",
        ).trim();

        const participa =
          local === equipo.idFbib ||
          visitante === equipo.idFbib;

        if (!participa) {
          continue;
        }

        const codigoPostal = String(
          partido.postalCodeField ?? "",
        ).replace(/\s+/g, "");

        if (codigoPostal !== CODIGO_POSTAL_ANDRATX) {
          throw new ErrorDesignaciones(
            "Este partido FBIB no se disputa en una sede con código postal 07150.",
            403,
          );
        }

        return {
          idPartidoFbib,
          temporadaId,
          equipoId: equipo.id,
        };
      }
    }
  }

  if (consultasCorrectas === 0) {
    throw new ErrorDesignaciones(
      "No se ha podido consultar FBIB.",
      502,
    );
  }

  if (consultasFallidas > 0) {
    throw new ErrorDesignaciones(
      "No se han podido completar todas las consultas FBIB. Inténtalo de nuevo.",
      502,
    );
  }

  throw new ErrorDesignaciones(
    "El partido FBIB no pertenece a un equipo designable o no se ha encontrado.",
    404,
  );
}

// ======================================================
// PARTIDOS EXISTENTES
// ======================================================

async function obtenerPartidoExistente(
  id: string,
): Promise<FilaPartido> {
  const { data, error } = await supabaseServidor
    .from("designaciones_partidos")
    .select(`
      id,
      origen,
      numero_partido,
      id_partido_fbib,
      temporada_id
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new ErrorDesignaciones(
      "No se ha podido consultar el partido.",
      500,
    );
  }

  if (!data?.id) {
    throw new ErrorDesignaciones(
      "El partido no existe.",
      404,
    );
  }

  return data as FilaPartido;
}

async function buscarPartidoFbibExistente(
  idFbib: string,
): Promise<FilaPartido | null> {
  const { data, error } = await supabaseServidor
    .from("designaciones_partidos")
    .select(`
      id,
      origen,
      numero_partido,
      id_partido_fbib,
      temporada_id
    `)
    .eq("origen", "fbib")
    .eq("id_partido_fbib", idFbib)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ErrorDesignaciones(
      "No se ha podido comprobar si el partido ya existe.",
      500,
    );
  }

  return data as FilaPartido | null;
}

// ======================================================
// CREAR PARTIDO FBIB
// ======================================================

async function crearPartidoFbib(
  datos: DatosPartido,
  validado: PartidoFbibValidado,
  estado: EstadoPartido,
): Promise<string> {
  const ahora = new Date().toISOString();

  const { data, error } = await supabaseServidor
    .from("designaciones_partidos")
    .insert({
      origen: "fbib",

      numero_partido:
        validado.idPartidoFbib,

      id_partido_fbib:
        validado.idPartidoFbib,

      temporada_id:
        validado.temporadaId,

      equipo_id:
        validado.equipoId,

      fecha: datos.fecha,
      hora: datos.hora || null,

      equipo_local:
        datos.equipoLocal,

      equipo_visitante:
        datos.equipoVisitante,

      categoria:
        datos.categoria || null,

      grupo:
        datos.grupo || null,

      jornada:
        datos.jornada || null,

      competicion:
        datos.competicion || null,

      instalacion_id:
        datos.instalacionId,

      nivel_minimo_pista:
        datos.nivelMinimoPista || null,

      nivel_minimo_mesa:
        datos.nivelMinimoMesa || null,

      anotaciones:
        datos.anotaciones || null,

      estado,
      excluido: false,

      created_at: ahora,
      updated_at: ahora,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new ErrorDesignaciones(
      "No se ha podido crear el partido FBIB.",
      500,
    );
  }

  return String(data.id);
}

// ======================================================
// ACTUALIZAR PARTIDO EXISTENTE
// ======================================================

async function actualizarDatosPartido(
  partidoId: string,
  datos: DatosPartido,
  estado: EstadoPartido,
): Promise<void> {
  const { error } = await supabaseServidor
    .from("designaciones_partidos")
    .update({
      fecha: datos.fecha,
      hora: datos.hora || null,

      equipo_local:
        datos.equipoLocal,

      equipo_visitante:
        datos.equipoVisitante,

      categoria:
        datos.categoria || null,

      grupo:
        datos.grupo || null,

      jornada:
        datos.jornada || null,

      competicion:
        datos.competicion || null,

      instalacion_id:
        datos.instalacionId,

      nivel_minimo_pista:
        datos.nivelMinimoPista || null,

      nivel_minimo_mesa:
        datos.nivelMinimoMesa || null,

      anotaciones:
        datos.anotaciones || null,

      estado,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", partidoId);

  if (error) {
    throw new ErrorDesignaciones(
      "No se han podido actualizar los datos del partido.",
      500,
    );
  }
}

// ======================================================
// GUARDAR ASIGNACIONES
// ======================================================

async function guardarAsignaciones(
  partidoId: string,
  asignaciones: DatosAsignacion[],
): Promise<void> {
  const {
    data: actuales,
    error: errorActuales,
  } = await supabaseServidor
    .from("designaciones_asignaciones")
    .select("id")
    .eq("partido_id", partidoId);

  if (errorActuales) {
    throw new ErrorDesignaciones(
      "No se han podido consultar las asignaciones existentes.",
      500,
    );
  }

  const existentes =
    (actuales ?? []) as FilaAsignacion[];

  const idsExistentes = new Set(
    existentes.map(
      (asignacion) => asignacion.id,
    ),
  );

  for (const asignacion of asignaciones) {
    if (
      asignacion.id &&
      !idsExistentes.has(asignacion.id)
    ) {
      throw new ErrorDesignaciones(
        "Una designación no pertenece a este partido. Recarga la ficha.",
        409,
      );
    }
  }

  const ahora = new Date().toISOString();

  for (const asignacion of asignaciones) {
    const datos = {
      partido_id: partidoId,
      persona_id: asignacion.personaId,

      funcion_designada:
        asignacion.funcionDesignada,

      funcion_realizada:
        asignacion.funcionRealizada,

      orden:
        asignacion.orden,

      anotaciones:
        asignacion.anotaciones || null,

      updated_at: ahora,
    };

    if (asignacion.id) {
      const { error } = await supabaseServidor
        .from("designaciones_asignaciones")
        .update(datos)
        .eq("id", asignacion.id)
        .eq("partido_id", partidoId);

      if (error) {
        throw new ErrorDesignaciones(
          "No se ha podido actualizar una designación.",
          500,
        );
      }
    } else {
      const { error } = await supabaseServidor
        .from("designaciones_asignaciones")
        .insert({
          id: randomUUID(),
          ...datos,
          created_at: ahora,
        });

      if (error) {
        throw new ErrorDesignaciones(
          "No se ha podido crear una designación.",
          500,
        );
      }
    }
  }

  const idsConservados = new Set(
    asignaciones
      .map((asignacion) => asignacion.id)
      .filter(
        (id): id is string => id !== null,
      ),
  );

  const idsEliminar = existentes
    .map((asignacion) => asignacion.id)
    .filter((id) => !idsConservados.has(id));

  if (idsEliminar.length > 0) {
    const { error } = await supabaseServidor
      .from("designaciones_asignaciones")
      .delete()
      .eq("partido_id", partidoId)
      .in("id", idsEliminar);

    if (error) {
      throw new ErrorDesignaciones(
        "No se han podido eliminar las designaciones retiradas.",
        500,
      );
    }
  }
}

// ======================================================
// GUARDADO PRINCIPAL
// ======================================================

async function guardarPartido(
  peticion: PeticionGuardado,
): Promise<{
  idPartido: string;
  estado: EstadoPartido;
  creado: boolean;
}> {
  const {
    partido,
    asignaciones,
  } = peticion;

  await Promise.all([
    validarPersonal(asignaciones),
    validarInstalacion(partido.instalacionId),
  ]);

  const estado = calcularEstado(asignaciones);

  let partidoId = partido.id;
  let creado = false;

  if (partidoId) {
    // PARTIDO YA GUARDADO

    const existente =
      await obtenerPartidoExistente(partidoId);

    if (existente.origen !== partido.origen) {
      throw new ErrorDesignaciones(
        "No se puede modificar el origen del partido.",
      );
    }

    if (
      existente.origen === "fbib" &&
      existente.id_partido_fbib !==
        partido.idPartidoFbib
    ) {
      throw new ErrorDesignaciones(
        "No se puede modificar el número FBIB.",
      );
    }

    if (
      existente.origen === "cba" &&
      partido.idPartidoFbib !== null
    ) {
      throw new ErrorDesignaciones(
        "Un partido CBA no puede tener identificador FBIB.",
      );
    }
  } else {
    // PARTIDO FBIB SIN GUARDAR

    if (
      partido.origen !== "fbib" ||
      !partido.idPartidoFbib
    ) {
      throw new ErrorDesignaciones(
        "Para crear partidos CBA debe utilizarse el formulario de creación manual.",
      );
    }

    if (asignaciones.length === 0) {
      throw new ErrorDesignaciones(
        "Debes añadir una designación antes de guardar el partido FBIB.",
      );
    }

    if (
      asignaciones.some(
        (asignacion) =>
          asignacion.id !== null,
      )
    ) {
      throw new ErrorDesignaciones(
        "Las asignaciones de un partido nuevo no pueden tener identificadores existentes.",
      );
    }

    // Verificación federativa antes de insertar.

    const validado =
      await validarPartidoFbib(
        partido.idPartidoFbib,
        partido.fecha,
      );

    // Comprobar si otro usuario lo ha guardado.

    const existente =
      await buscarPartidoFbibExistente(
        partido.idPartidoFbib,
      );

    if (existente) {
      throw new ErrorDesignaciones(
        "Este partido ya ha sido guardado. Recarga la página para recuperar sus designaciones.",
        409,
      );
    }

    partidoId = await crearPartidoFbib(
      partido,
      validado,
      estado,
    );

    creado = true;
  }

  if (!partidoId) {
    throw new ErrorDesignaciones(
      "No se ha podido identificar el partido.",
      500,
    );
  }

  try {
    await guardarAsignaciones(
      partidoId,
      asignaciones,
    );

    await actualizarDatosPartido(
      partidoId,
      partido,
      estado,
    );
  } catch (error) {
    // Compensación de mejor esfuerzo para
    // los registros creados en esta petición.
    //
    // No equivale a una transacción atómica.

    if (creado) {
      const {
        error: errorAsignaciones,
      } = await supabaseServidor
        .from("designaciones_asignaciones")
        .delete()
        .eq("partido_id", partidoId);

      if (!errorAsignaciones) {
        const {
          error: errorPartido,
        } = await supabaseServidor
          .from("designaciones_partidos")
          .delete()
          .eq("id", partidoId);

        if (errorPartido) {
          console.error(
            "[DESIGNACIONES] No se ha podido compensar el partido:",
            errorPartido,
          );
        }
      } else {
        console.error(
          "[DESIGNACIONES] No se han podido compensar las asignaciones:",
          errorAsignaciones,
        );
      }
    }

    throw error;
  }

  return {
    idPartido: partidoId,
    estado,
    creado,
  };
}

// ======================================================
// POST
// ======================================================

export const POST: APIRoute = async ({
  cookies,
  request,
}) => {
  const tokenSesion = cookies.get(
    NOMBRE_COOKIE_SESION,
  )?.value;

  if (!tokenSesion) {
    return responderError(
      "Debes iniciar sesión.",
      401,
    );
  }

  let sesion;

  try {
    sesion = await obtenerUsuarioSesion(
      tokenSesion,
    );
  } catch (error) {
    console.error(
      "[DESIGNACIONES] Error de sesión:",
      error,
    );

    return responderError(
      "No se ha podido comprobar la sesión.",
      500,
    );
  }

  if (!sesion) {
    cookies.delete(
      NOMBRE_COOKIE_SESION,
      { path: "/" },
    );

    return responderError(
      "La sesión ha caducado.",
      401,
    );
  }

  try {
    const puedeEditar =
      await comprobarPermisoUsuario(
        sesion.acceso,
        "designaciones.editar",
      );

    if (!puedeEditar) {
      return responderError(
        "No tienes permiso para modificar designaciones.",
        403,
      );
    }

    // Validación de origen de la petición.

    const origen = request.headers.get("origin");

    if (
      !origen ||
      origen !== new URL(request.url).origin
    ) {
      return responderError(
        "El origen de la solicitud no es válido.",
        403,
      );
    }

    const contenido = await leerJson(request);
    const peticion = validarPeticion(contenido);

    if (!peticion.partido.id) {
      const puedeCrear =
        await comprobarPermisoUsuario(
          sesion.acceso,
          "designaciones.crear",
        );

      if (!puedeCrear) {
        return responderError(
          "No tienes permiso para crear designaciones.",
          403,
        );
      }
    }

    const resultado =
      await guardarPartido(peticion);

    return responder(
      {
        ok: true,

        data: {
          idPartido:
            resultado.idPartido,

          estado:
            resultado.estado,

          creado:
            resultado.creado,

          url:
            `/panel/designaciones/partido?idPartido=${encodeURIComponent(
              resultado.idPartido,
            )}`,
        },

        error: null,
      },
      resultado.creado ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof ErrorDesignaciones) {
      if (error.status >= 500) {
        console.error(
          "[DESIGNACIONES] Error guardando partido:",
          error,
        );
      }

      return responderError(
        error.status >= 500
          ? "No se han podido guardar las designaciones."
          : error.message,
        error.status,
      );
    }

    console.error(
      "[DESIGNACIONES] Error inesperado:",
      error,
    );

    return responderError(
      "Ha ocurrido un error al guardar el partido.",
      500,
    );
  }
};

// ======================================================
// MÉTODOS NO PERMITIDOS
// ======================================================

export const ALL: APIRoute = async () => {
  return Response.json(
    {
      ok: false,
      data: null,
      error: "Método no permitido.",
    },
    {
      status: 405,
      headers: {
        ...CABECERAS,
        Allow: "POST",
      },
    },
  );
};
