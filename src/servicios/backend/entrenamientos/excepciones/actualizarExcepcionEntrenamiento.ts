import { supabaseServidor } from "../../../supabase/servidor";

import type {
  DatosExcepcionEntrenamiento,
  ExcepcionEntrenamientoPanel,
  TipoExcepcionEntrenamiento,
} from "../../../../types/ExcepcionesEntrenamientosPanel";

interface FilaExcepcion {
  id: string;
  created_at: string;
  updated_at: string | null;
  equipo_id: string | null;
  entrenamiento_id: string | null;
  instalacion_id: string | null;
  tipo: string | null;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string | null;
}

export class ErrorActualizarExcepcionEntrenamiento extends Error {
  status: number;
  campo: string | null;

  constructor(
    mensaje: string,
    status = 400,
    campo: string | null = null,
  ) {
    super(mensaje);

    this.name =
      "ErrorActualizarExcepcionEntrenamiento";

    this.status = status;
    this.campo = campo;
  }
}

function normalizarTexto(
  valor: unknown,
): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto.length > 0 ? texto : null;
}

function normalizarTipo(
  valor: unknown,
): TipoExcepcionEntrenamiento | null {
  const tipo =
    normalizarTexto(valor)?.toLowerCase();

  if (
    tipo === "cancelacion" ||
    tipo === "modificacion" ||
    tipo === "adicional"
  ) {
    return tipo;
  }

  return null;
}

function normalizarHora(
  valor: unknown,
): string | null {
  const hora = normalizarTexto(valor);

  if (!hora) {
    return null;
  }

  const coincidencia = hora.match(
    /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/,
  );

  if (!coincidencia) {
    return null;
  }

  return `${coincidencia[1]}:${coincidencia[2]}`;
}

function fechaValida(
  fecha: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return false;
  }

  const fechaConvertida = new Date(
    `${fecha}T00:00:00.000Z`,
  );

  return (
    !Number.isNaN(
      fechaConvertida.getTime(),
    ) &&
    fechaConvertida
      .toISOString()
      .slice(0, 10) === fecha
  );
}

export async function actualizarExcepcionEntrenamiento(
  equipoId: string,
  temporadaId: string,
  excepcionId: string,
  datos: DatosExcepcionEntrenamiento,
): Promise<ExcepcionEntrenamientoPanel> {
  const equipoIdLimpio =
    normalizarTexto(equipoId);

  const temporadaIdLimpio =
    normalizarTexto(temporadaId);

  const excepcionIdLimpio =
    normalizarTexto(excepcionId);

  const tipo =
    normalizarTipo(datos.tipo);

  const fecha =
    normalizarTexto(datos.fecha);

  let entrenamientoId =
    normalizarTexto(
      datos.entrenamientoId,
    );

  let instalacionId =
    normalizarTexto(
      datos.instalacionId,
    );

  let horaInicio =
    normalizarHora(datos.horaInicio);

  let horaFin =
    normalizarHora(datos.horaFin);

  const motivo =
    normalizarTexto(datos.motivo);

  if (!equipoIdLimpio) {
    throw new ErrorActualizarExcepcionEntrenamiento(
      "No se ha proporcionado el equipo.",
      400,
      "equipoId",
    );
  }

  if (!temporadaIdLimpio) {
    throw new ErrorActualizarExcepcionEntrenamiento(
      "No se ha proporcionado la temporada.",
      400,
      "temporadaId",
    );
  }

  if (!excepcionIdLimpio) {
    throw new ErrorActualizarExcepcionEntrenamiento(
      "No se ha proporcionado la excepción.",
      400,
      "excepcionId",
    );
  }

  if (!tipo) {
    throw new ErrorActualizarExcepcionEntrenamiento(
      "El tipo de excepción no es válido.",
      400,
      "tipo",
    );
  }

  if (!fecha || !fechaValida(fecha)) {
    throw new ErrorActualizarExcepcionEntrenamiento(
      "Debes indicar una fecha válida.",
      400,
      "fecha",
    );
  }

  const {
    data: excepcionExistente,
    error: errorExcepcion,
  } = await supabaseServidor
    .from("excepciones_entrenamientos")
    .select("id")
    .eq("id", excepcionIdLimpio)
    .eq("equipo_id", equipoIdLimpio)
    .maybeSingle();

  if (errorExcepcion) {
    throw new Error(
      `No se ha podido comprobar la excepción: ${errorExcepcion.message}`,
    );
  }

  if (!excepcionExistente) {
    throw new ErrorActualizarExcepcionEntrenamiento(
      "La excepción no existe o no pertenece a este equipo.",
      404,
    );
  }

  if (
    tipo === "cancelacion" ||
    tipo === "modificacion"
  ) {
    if (!entrenamientoId) {
      throw new ErrorActualizarExcepcionEntrenamiento(
        "Debes seleccionar el entrenamiento habitual.",
        400,
        "entrenamientoId",
      );
    }

    const {
      data: entrenamiento,
      error: errorEntrenamiento,
    } = await supabaseServidor
      .from("entrenamientos")
      .select("id")
      .eq("id", entrenamientoId)
      .eq("equipo_id", equipoIdLimpio)
      .eq(
        "temporada_id",
        temporadaIdLimpio,
      )
      .maybeSingle();

    if (errorEntrenamiento) {
      throw new Error(
        `No se ha podido comprobar el entrenamiento: ${errorEntrenamiento.message}`,
      );
    }

    if (!entrenamiento) {
      throw new ErrorActualizarExcepcionEntrenamiento(
        "El entrenamiento seleccionado no pertenece a este equipo.",
        404,
        "entrenamientoId",
      );
    }
  }

  if (tipo === "cancelacion") {
    instalacionId = null;
    horaInicio = null;
    horaFin = null;
  }

  if (tipo === "modificacion") {
    const modificaInstalacion =
      Boolean(instalacionId);

    const modificaHorario =
      Boolean(horaInicio || horaFin);

    if (
      !modificaInstalacion &&
      !modificaHorario
    ) {
      throw new ErrorActualizarExcepcionEntrenamiento(
        "Debes modificar la instalación o el horario.",
        400,
        "tipo",
      );
    }

    if (
      (horaInicio && !horaFin) ||
      (!horaInicio && horaFin)
    ) {
      throw new ErrorActualizarExcepcionEntrenamiento(
        "Debes indicar la hora de inicio y la hora de finalización.",
        400,
        "horaInicio",
      );
    }
  }

  if (tipo === "adicional") {
    entrenamientoId = null;

    if (!instalacionId) {
      throw new ErrorActualizarExcepcionEntrenamiento(
        "Debes seleccionar una instalación.",
        400,
        "instalacionId",
      );
    }

    if (!horaInicio || !horaFin) {
      throw new ErrorActualizarExcepcionEntrenamiento(
        "Debes indicar el horario completo.",
        400,
        "horaInicio",
      );
    }
  }

  if (
    horaInicio &&
    horaFin &&
    horaFin <= horaInicio
  ) {
    throw new ErrorActualizarExcepcionEntrenamiento(
      "La hora de finalización debe ser posterior a la hora de inicio.",
      400,
      "horaFin",
    );
  }

  if (instalacionId) {
    const {
      data: instalacion,
      error: errorInstalacion,
    } = await supabaseServidor
      .from("instalaciones")
      .select("id")
      .eq("id", instalacionId)
      .maybeSingle();

    if (errorInstalacion) {
      throw new Error(
        `No se ha podido comprobar la instalación: ${errorInstalacion.message}`,
      );
    }

    if (!instalacion) {
      throw new ErrorActualizarExcepcionEntrenamiento(
        "La instalación seleccionada no existe.",
        404,
        "instalacionId",
      );
    }
  }

  if (
    entrenamientoId &&
    (
      tipo === "cancelacion" ||
      tipo === "modificacion"
    )
  ) {
    const {
      data: duplicada,
      error: errorDuplicada,
    } = await supabaseServidor
      .from("excepciones_entrenamientos")
      .select("id")
      .eq("equipo_id", equipoIdLimpio)
      .eq(
        "entrenamiento_id",
        entrenamientoId,
      )
      .eq("fecha", fecha)
      .in("tipo", [
        "cancelacion",
        "modificacion",
      ])
      .neq("id", excepcionIdLimpio)
      .limit(1)
      .maybeSingle();

    if (errorDuplicada) {
      throw new Error(
        `No se ha podido comprobar si ya existe otra excepción: ${errorDuplicada.message}`,
      );
    }

    if (duplicada) {
      throw new ErrorActualizarExcepcionEntrenamiento(
        "Ya existe una excepción para ese entrenamiento y fecha.",
        409,
        "fecha",
      );
    }
  }

  const {
    data: excepcionActualizada,
    error: errorActualizacion,
  } = await supabaseServidor
    .from("excepciones_entrenamientos")
    .update({
      entrenamiento_id:
        entrenamientoId,
      instalacion_id: instalacionId,
      tipo,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      motivo,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", excepcionIdLimpio)
    .eq("equipo_id", equipoIdLimpio)
    .select(`
      id,
      created_at,
      updated_at,
      equipo_id,
      entrenamiento_id,
      instalacion_id,
      tipo,
      fecha,
      hora_inicio,
      hora_fin,
      motivo
    `)
    .maybeSingle();

  if (errorActualizacion) {
    throw new Error(
      `No se ha podido actualizar la excepción: ${errorActualizacion.message}`,
    );
  }

  if (!excepcionActualizada) {
    throw new ErrorActualizarExcepcionEntrenamiento(
      "La excepción no existe o no pertenece a este equipo.",
      404,
    );
  }

  const fila =
    excepcionActualizada as FilaExcepcion;

  return {
    id: fila.id,
    equipoId: fila.equipo_id,
    entrenamientoId:
      fila.entrenamiento_id,
    instalacionId:
      fila.instalacion_id,
    tipo,
    fecha: fila.fecha,
    horaInicio:
      fila.hora_inicio?.slice(0, 5) ??
      null,
    horaFin:
      fila.hora_fin?.slice(0, 5) ??
      null,
    motivo: fila.motivo,
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
    entrenamiento: null,
    instalacion: null,
  };
}