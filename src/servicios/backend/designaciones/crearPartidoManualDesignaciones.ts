
import { randomUUID } from "node:crypto";

import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  obtenerInstalacionesDesignaciones,
} from "@servicios/backend/designaciones/obtenerInstalacionesDesignaciones";

// ======================================================
// C.B. ANDRATX
// CREACIÓN MANUAL DE PARTIDOS
//
// Solo backend.
// No realiza consultas FBIB.
// No modifica asignaciones.
// No utiliza funciones SQL ni triggers.
// ======================================================

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REGEX_HORA =
  /^([01]\d|2[0-3]):[0-5]\d$/;

const REGEX_FECHA =
  /^\d{4}-\d{2}-\d{2}$/;

const NIVELES_VALIDOS = [
  "Escuela",
  "Iniciación",
  "Auxiliar",
  "Entrenador",
  "Técnico",
  "Responsable",
] as const;

// ======================================================
// TIPOS PÚBLICOS
// ======================================================

export type PosicionEquipoCba =
  | "local"
  | "visitante";

export interface DatosCrearPartidoManual {
  equipoId: string;
  posicionEquipoCba: PosicionEquipoCba;

  nombreRival: string;

  fecha: string;
  hora: string;

  categoria?: string | null;
  grupo?: string | null;
  jornada?: string | null;
  competicion?: string | null;

  instalacionId?: string | null;

  nivelMinimoPista?: string | null;
  nivelMinimoMesa?: string | null;

  anotaciones?: string | null;
}

export interface ResultadoCrearPartidoManual {
  id: string;
  numeroPartido: string;

  temporadaId: string;
  equipoId: string;

  origen: "cba";
  estado: "sin_designar";

  fecha: string;
  hora: string;

  equipoLocal: string;
  equipoVisitante: string;

  creado: true;
}

// ======================================================
// TIPOS INTERNOS
// ======================================================

type Registro = Record<string, unknown>;

interface TemporadaActiva {
  id: string;
  nombre: string;
  prefijo: string;
}

interface EquipoValidado {
  id: string;
  nombre: string;
}

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

interface FilaEquipo {
  id: string;
  nombre: string | null;
}

interface DatosValidados {
  equipoId: string;
  posicionEquipoCba: PosicionEquipoCba;
  nombreRival: string;

  fecha: string;
  hora: string;

  categoria: string | null;
  grupo: string | null;
  jornada: string | null;
  competicion: string | null;

  instalacionId: string | null;

  nivelMinimoPista: string | null;
  nivelMinimoMesa: string | null;

  anotaciones: string | null;
}

// ======================================================
// ERRORES
// ======================================================

export class ErrorCrearPartidoManualDesignaciones
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorCrearPartidoManualDesignaciones";

    this.status = status;
  }
}

// ======================================================
// UTILIDADES
// ======================================================

function esRegistro(
  valor: unknown,
): valor is Registro {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function texto(
  valor: unknown,
): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function validarUuid(
  valor: string,
): boolean {
  return REGEX_UUID.test(valor);
}

function campoObligatorio(
  valor: unknown,
  nombre: string,
  maximo: number,
): string {
  const resultado = texto(valor);

  if (
    typeof valor !== "string" ||
    !resultado ||
    resultado.length > maximo
  ) {
    throw new ErrorCrearPartidoManualDesignaciones(
      `El campo ${nombre} es obligatorio y no puede superar ${maximo} caracteres.`,
    );
  }

  return resultado;
}

function campoOpcional(
  valor: unknown,
  nombre: string,
  maximo: number,
): string | null {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  if (typeof valor !== "string") {
    throw new ErrorCrearPartidoManualDesignaciones(
      `El campo ${nombre} no es válido.`,
    );
  }

  const resultado = valor.trim();

  if (resultado.length > maximo) {
    throw new ErrorCrearPartidoManualDesignaciones(
      `El campo ${nombre} no puede superar ${maximo} caracteres.`,
    );
  }

  return resultado || null;
}

function fechaValida(
  valor: string,
): boolean {
  if (!REGEX_FECHA.test(valor)) {
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

function validarNivel(
  valor: string | null,
  nombre: string,
): void {
  if (!valor) {
    return;
  }

  if (
    !NIVELES_VALIDOS.some(
      (nivel) => nivel === valor,
    )
  ) {
    throw new ErrorCrearPartidoManualDesignaciones(
      `El ${nombre} debe ser uno de los seis niveles establecidos.`,
    );
  }
}

// ======================================================
// VALIDACIÓN DEL FORMULARIO
// ======================================================

export function validarDatosCrearPartidoManual(
  contenido: unknown,
): DatosValidados {
  if (!esRegistro(contenido)) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "Los datos del partido no son válidos.",
    );
  }

  const equipoId = campoObligatorio(
    contenido.equipoId,
    "equipo",
    100,
  );

  if (!validarUuid(equipoId)) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "Selecciona un equipo CBA válido.",
    );
  }

  const posicionEquipoCba =
    contenido.posicionEquipoCba;

  if (
    posicionEquipoCba !== "local" &&
    posicionEquipoCba !== "visitante"
  ) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "Debes indicar si el equipo CBA juega como local o visitante.",
    );
  }

  const nombreRival = campoObligatorio(
    contenido.nombreRival,
    "nombre del rival",
    200,
  );

  const fecha = campoObligatorio(
    contenido.fecha,
    "fecha",
    10,
  );

  if (!fechaValida(fecha)) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "Introduce una fecha válida.",
    );
  }

  const hora = campoObligatorio(
    contenido.hora,
    "hora",
    5,
  );

  if (!REGEX_HORA.test(hora)) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "La hora debe tener el formato HH:MM.",
    );
  }

  const categoria = campoOpcional(
    contenido.categoria,
    "categoría",
    150,
  );

  const grupo = campoOpcional(
    contenido.grupo,
    "grupo",
    150,
  );

  const jornada = campoOpcional(
    contenido.jornada,
    "jornada",
    100,
  );

  const competicion = campoOpcional(
    contenido.competicion,
    "competición",
    200,
  );

  const instalacionId = campoOpcional(
    contenido.instalacionId,
    "instalación",
    100,
  );

  if (
    instalacionId &&
    !validarUuid(instalacionId)
  ) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "La instalación seleccionada no es válida.",
    );
  }

  const nivelMinimoPista = campoOpcional(
    contenido.nivelMinimoPista,
    "nivel mínimo de pista",
    100,
  );

  const nivelMinimoMesa = campoOpcional(
    contenido.nivelMinimoMesa,
    "nivel mínimo de mesa",
    100,
  );

  validarNivel(
    nivelMinimoPista,
    "nivel mínimo de pista",
  );

  validarNivel(
    nivelMinimoMesa,
    "nivel mínimo de mesa",
  );

  const anotaciones = campoOpcional(
    contenido.anotaciones,
    "anotaciones",
    5000,
  );

  return {
    equipoId,
    posicionEquipoCba,
    nombreRival,
    fecha,
    hora,
    categoria,
    grupo,
    jornada,
    competicion,
    instalacionId,
    nivelMinimoPista,
    nivelMinimoMesa,
    anotaciones,
  };
}

// ======================================================
// TEMPORADA ACTIVA
// ======================================================

function obtenerPrefijoTemporada(
  nombre: string,
): string {
  const coincidencia = nombre.match(
    /(?:^|[^\d])((?:19|20)\d{2})\s*[/\-–]\s*((?:19|20)?\d{2})(?!\d)/,
  );

  if (!coincidencia) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "La temporada activa no tiene un formato válido para generar códigos CBA.",
      422,
    );
  }

  const inicio = Number(coincidencia[1]);

  const textoFinal = coincidencia[2];

  const final = textoFinal.length === 2
    ? Math.floor(inicio / 100) * 100 +
      Number(textoFinal)
    : Number(textoFinal);

  if (final !== inicio + 1) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "La temporada debe indicar dos años consecutivos.",
      422,
    );
  }

  return (
    String(inicio).slice(-2) +
    String(final).slice(-2)
  );
}

async function obtenerTemporadaActiva():
Promise<TemporadaActiva> {
  const { data, error } =
    await supabaseServidor
      .from("temporadas")
      .select("id, nombre")
      .eq("activa", true)
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "No se ha podido consultar la temporada activa.",
      500,
    );
  }

  if (!data?.id) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "No hay ninguna temporada activa.",
      404,
    );
  }

  const temporada = data as FilaTemporada;

  return {
    id: temporada.id,
    nombre: texto(temporada.nombre),
    prefijo: obtenerPrefijoTemporada(
      texto(temporada.nombre),
    ),
  };
}

// ======================================================
// VALIDAR EQUIPO
// ======================================================

async function obtenerEquipoDesignable(
  equipoId: string,
  temporadaId: string,
): Promise<EquipoValidado> {
  const { data, error } =
    await supabaseServidor
      .from("equipos")
      .select("id, nombre")
      .eq("id", equipoId)
      .eq("temporada_id", temporadaId)
      .eq("activo", true)
      .eq("designable", true)
      .maybeSingle();

  if (error) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "No se ha podido verificar el equipo.",
      500,
    );
  }

  if (!data?.id) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "El equipo no pertenece a la temporada activa o no está habilitado para designaciones.",
      400,
    );
  }

  const equipo = data as FilaEquipo;

  const nombre = texto(equipo.nombre);

  if (!nombre) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "El equipo seleccionado no tiene nombre configurado.",
      422,
    );
  }

  return {
    id: equipo.id,
    nombre,
  };
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

  const resultado =
    await obtenerInstalacionesDesignaciones({
      instalacionSeleccionadaId:
        instalacionId,
      incluirInactivas: false,
    });

  const instalacion =
    resultado.instalaciones.find(
      (elemento) =>
        elemento.id === instalacionId,
    );

  if (!instalacion) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "La instalación seleccionada no existe.",
    );
  }

  if (!instalacion.activa) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "No puedes crear un partido en una instalación inactiva.",
    );
  }
}

// ======================================================
// GENERACIÓN DE NUMERACIÓN
// ======================================================

async function obtenerSiguienteNumero(
  temporadaId: string,
  prefijo: string,
): Promise<string> {
  const expresion = new RegExp(
    `^CBA-${prefijo}(\\d{3,})$`,
  );

  let ultimoNumero = 0;
  let desde = 0;

  // Paginación explícita para no depender
  // del límite de filas de Supabase.

  while (true) {
    const { data, error } =
      await supabaseServidor
        .from("designaciones_partidos")
        .select("numero_partido")
        .eq("temporada_id", temporadaId)
        .eq("origen", "cba")
        .like(
          "numero_partido",
          `CBA-${prefijo}%`,
        )
        .order("numero_partido", {
          ascending: true,
        })
        .range(desde, desde + 499);

    if (error) {
      throw new ErrorCrearPartidoManualDesignaciones(
        "No se ha podido consultar la numeración existente.",
        500,
      );
    }

    const filas = data ?? [];

    for (const fila of filas) {
      const numeroPartido = texto(
        fila.numero_partido,
      );

      const coincidencia =
        expresion.exec(numeroPartido);

      if (!coincidencia) {
        continue;
      }

      const numero = Number(
        coincidencia[1],
      );

      if (
        Number.isSafeInteger(numero) &&
        numero > ultimoNumero
      ) {
        ultimoNumero = numero;
      }
    }

    if (filas.length < 500) {
      break;
    }

    desde += filas.length;
  }

  if (ultimoNumero >= 999999) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "Se ha alcanzado el límite de numeración de esta temporada.",
      409,
    );
  }

  return (
    `CBA-${prefijo}` +
    String(ultimoNumero + 1).padStart(
      3,
      "0",
    )
  );
}

// ======================================================
// CREAR PARTIDO
// ======================================================

export async function crearPartidoManualDesignaciones(
  contenido: unknown,
): Promise<ResultadoCrearPartidoManual> {
  const datos =
    validarDatosCrearPartidoManual(
      contenido,
    );

  const temporada =
    await obtenerTemporadaActiva();

  const [equipo] = await Promise.all([
    obtenerEquipoDesignable(
      datos.equipoId,
      temporada.id,
    ),
    validarInstalacion(
      datos.instalacionId,
    ),
  ]);

  const equipoLocal =
    datos.posicionEquipoCba === "local"
      ? equipo.nombre
      : datos.nombreRival;

  const equipoVisitante =
    datos.posicionEquipoCba === "visitante"
      ? equipo.nombre
      : datos.nombreRival;

  if (
    equipoLocal.localeCompare(
      equipoVisitante,
      "es",
      {
        sensitivity: "base",
      },
    ) === 0
  ) {
    throw new ErrorCrearPartidoManualDesignaciones(
      "El equipo local y el visitante no pueden tener el mismo nombre.",
    );
  }

  const numeroPartido =
    await obtenerSiguienteNumero(
      temporada.id,
      temporada.prefijo,
    );

  const partidoId = randomUUID();
  const ahora = new Date().toISOString();

  const { data, error } =
    await supabaseServidor
      .from("designaciones_partidos")
      .insert({
        id: partidoId,

        origen: "cba",
        numero_partido: numeroPartido,
        id_partido_fbib: null,

        temporada_id: temporada.id,
        equipo_id: equipo.id,

        fecha: datos.fecha,
        hora: datos.hora,

        equipo_local: equipoLocal,
        equipo_visitante: equipoVisitante,

        categoria: datos.categoria,
        grupo: datos.grupo,
        jornada: datos.jornada,
        competicion: datos.competicion,

        instalacion_id:
          datos.instalacionId,

        nivel_minimo_pista:
          datos.nivelMinimoPista,

        nivel_minimo_mesa:
          datos.nivelMinimoMesa,

        estado: "sin_designar",
        excluido: false,

        anotaciones: datos.anotaciones,

        created_at: ahora,
        updated_at: ahora,
      })
      .select("id, numero_partido")
      .single();

  if (error || !data?.id) {
    console.error(
      "[DESIGNACIONES CBA] Error creando partido:",
      {
        codigo: error?.code,
        mensaje: error?.message,
      },
    );

    throw new ErrorCrearPartidoManualDesignaciones(
      "No se ha podido registrar el partido CBA.",
      500,
    );
  }

  return {
    id: String(data.id),
    numeroPartido: String(
      data.numero_partido,
    ),

    temporadaId: temporada.id,
    equipoId: equipo.id,

    origen: "cba",
    estado: "sin_designar",

    fecha: datos.fecha,
    hora: datos.hora,

    equipoLocal,
    equipoVisitante,

    creado: true,
  };
}
