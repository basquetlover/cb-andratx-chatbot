import { supabaseServidor } from "../../supabase/servidor";

import type {
  DiaSemanaEntrenamiento,
  EntrenamientoHabitualEquipoPanel,
  InstalacionEntrenamientoPanel,
} from "@tipos/EntrenamientosEquipoPanel";

export interface ErrorCampoActualizarEntrenamiento {
  campo: string;
  mensaje: string;
}

export class ErrorActualizarEntrenamientoEquipo extends Error {
  status: number;
  errores: ErrorCampoActualizarEntrenamiento[];

  constructor(
    mensaje: string,
    status = 400,
    errores: ErrorCampoActualizarEntrenamiento[] = [],
  ) {
    super(mensaje);

    this.name =
      "ErrorActualizarEntrenamientoEquipo";

    this.status = status;
    this.errores = errores;
  }
}

interface DatosEntrenamientoValidados {
  instalacionId: string;
  diaSemana: DiaSemanaEntrenamiento;
  horaInicio: string;
  horaFin: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  observaciones: string | null;
  activo: boolean;
}

interface FilaEntrenamientoExistente {
  id: string;
  instalacion_id: string;
}

interface FilaEntrenamiento {
  id: string;
  equipo_id: string;
  instalacion_id: string;
  temporada_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  observaciones: string | null;
  activo: boolean | null;
}

interface FilaInstalacion {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  direccion: string | null;
  localidad: string | null;
  activa: boolean | null;
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function obtenerTexto(
  valor: unknown,
): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function obtenerTextoOpcional(
  valor: unknown,
): string | null {
  if (
    valor === null ||
    valor === undefined
  ) {
    return null;
  }

  if (typeof valor !== "string") {
    return null;
  }

  return valor.trim() || null;
}

function validarHora(valor: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    valor,
  );
}

function validarFecha(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

function normalizarHora(
  valor: string | null | undefined,
): string {
  return valor?.slice(0, 5) ?? "";
}

function convertirInstalacion(
  fila: FilaInstalacion,
): InstalacionEntrenamientoPanel {
  return {
    id: fila.id,
    nombre:
      fila.nombre?.trim() ||
      "Instalación sin nombre",
    nombreCorto:
      fila.nombre_corto?.trim() ?? "",
    direccion: fila.direccion?.trim() ?? "",
    localidad: fila.localidad?.trim() ?? "",
    activa: Boolean(fila.activa),
  };
}

function validarDatos(
  datos: unknown,
): DatosEntrenamientoValidados {
  if (!esObjeto(datos)) {
    throw new ErrorActualizarEntrenamientoEquipo(
      "Los datos enviados no son válidos.",
      400,
    );
  }

  const errores:
    ErrorCampoActualizarEntrenamiento[] = [];

  const instalacionId = obtenerTexto(
    datos.instalacionId,
  );

  if (!validarUuid(instalacionId)) {
    errores.push({
      campo: "instalacionId",
      mensaje:
        "Selecciona una instalación válida.",
    });
  }

  let diaSemana: DiaSemanaEntrenamiento = 1;

  if (
    typeof datos.diaSemana !== "number" ||
    !Number.isInteger(datos.diaSemana) ||
    datos.diaSemana < 1 ||
    datos.diaSemana > 7
  ) {
    errores.push({
      campo: "diaSemana",
      mensaje:
        "Selecciona un día de la semana válido.",
    });
  } else {
    diaSemana =
      datos.diaSemana as DiaSemanaEntrenamiento;
  }

  const horaInicio = obtenerTexto(
    datos.horaInicio,
  );

  const horaFin = obtenerTexto(
    datos.horaFin,
  );

  if (!validarHora(horaInicio)) {
    errores.push({
      campo: "horaInicio",
      mensaje:
        "Introduce una hora de inicio válida.",
    });
  }

  if (!validarHora(horaFin)) {
    errores.push({
      campo: "horaFin",
      mensaje:
        "Introduce una hora de finalización válida.",
    });
  }

  if (
    validarHora(horaInicio) &&
    validarHora(horaFin) &&
    horaFin <= horaInicio
  ) {
    errores.push({
      campo: "horaFin",
      mensaje:
        "La hora de finalización debe ser posterior a la hora de inicio.",
    });
  }

  const fechaInicio =
    obtenerTextoOpcional(datos.fechaInicio);

  const fechaFin =
    obtenerTextoOpcional(datos.fechaFin);

  if (
    fechaInicio &&
    !validarFecha(fechaInicio)
  ) {
    errores.push({
      campo: "fechaInicio",
      mensaje:
        "La fecha de inicio no es válida.",
    });
  }

  if (fechaFin && !validarFecha(fechaFin)) {
    errores.push({
      campo: "fechaFin",
      mensaje:
        "La fecha de finalización no es válida.",
    });
  }

  if (
    fechaInicio &&
    fechaFin &&
    validarFecha(fechaInicio) &&
    validarFecha(fechaFin) &&
    fechaFin < fechaInicio
  ) {
    errores.push({
      campo: "fechaFin",
      mensaje:
        "La fecha de finalización no puede ser anterior a la fecha de inicio.",
    });
  }

  const observaciones =
    obtenerTextoOpcional(datos.observaciones);

  if (
    observaciones &&
    observaciones.length > 1000
  ) {
    errores.push({
      campo: "observaciones",
      mensaje:
        "Las observaciones no pueden superar los 1000 caracteres.",
    });
  }

  let activo = true;

  if (typeof datos.activo !== "boolean") {
    errores.push({
      campo: "activo",
      mensaje:
        "El estado del entrenamiento no es válido.",
    });
  } else {
    activo = datos.activo;
  }

  if (errores.length > 0) {
    throw new ErrorActualizarEntrenamientoEquipo(
      "Revisa los campos indicados.",
      400,
      errores,
    );
  }

  return {
    instalacionId,
    diaSemana,
    horaInicio,
    horaFin,
    fechaInicio,
    fechaFin,
    observaciones,
    activo,
  };
}

export async function actualizarEntrenamientoEquipo(
  equipoId: string,
  entrenamientoId: string,
  datos: unknown,
): Promise<EntrenamientoHabitualEquipoPanel> {
  const equipoIdNormalizado = equipoId.trim();

  const entrenamientoIdNormalizado =
    entrenamientoId.trim();

  if (!validarUuid(equipoIdNormalizado)) {
    throw new ErrorActualizarEntrenamientoEquipo(
      "El identificador del equipo no es válido.",
      400,
      [
        {
          campo: "equipoId",
          mensaje:
            "El identificador del equipo no es válido.",
        },
      ],
    );
  }

  if (
    !validarUuid(entrenamientoIdNormalizado)
  ) {
    throw new ErrorActualizarEntrenamientoEquipo(
      "El identificador del entrenamiento no es válido.",
      400,
      [
        {
          campo: "entrenamientoId",
          mensaje:
            "El identificador del entrenamiento no es válido.",
        },
      ],
    );
  }

  const datosValidados = validarDatos(datos);

  const {
    data: entrenamientoEncontrado,
    error: errorEntrenamiento,
  } = await supabaseServidor
    .from("entrenamientos")
    .select("id, instalacion_id")
    .eq("id", entrenamientoIdNormalizado)
    .eq("equipo_id", equipoIdNormalizado)
    .maybeSingle();

  if (errorEntrenamiento) {
    throw new ErrorActualizarEntrenamientoEquipo(
      `No se ha podido comprobar el entrenamiento: ${errorEntrenamiento.message}`,
      500,
    );
  }

  if (!entrenamientoEncontrado?.id) {
    throw new ErrorActualizarEntrenamientoEquipo(
      "El entrenamiento no existe o no pertenece al equipo.",
      404,
    );
  }

  const entrenamientoExistente =
    entrenamientoEncontrado as FilaEntrenamientoExistente;

  const {
    data: instalacionEncontrada,
    error: errorInstalacion,
  } = await supabaseServidor
    .from("instalaciones")
    .select(
      `
        id,
        nombre,
        nombre_corto,
        direccion,
        localidad,
        activa
      `,
    )
    .eq(
      "id",
      datosValidados.instalacionId,
    )
    .maybeSingle();

  if (errorInstalacion) {
    throw new ErrorActualizarEntrenamientoEquipo(
      `No se ha podido comprobar la instalación: ${errorInstalacion.message}`,
      500,
    );
  }

  if (!instalacionEncontrada?.id) {
    throw new ErrorActualizarEntrenamientoEquipo(
      "La instalación seleccionada no existe.",
      400,
      [
        {
          campo: "instalacionId",
          mensaje:
            "Selecciona una instalación válida.",
        },
      ],
    );
  }

  const instalacion =
    instalacionEncontrada as FilaInstalacion;

  const mantieneInstalacionActual =
    entrenamientoExistente.instalacion_id ===
    instalacion.id;

  if (
    !instalacion.activa &&
    !mantieneInstalacionActual
  ) {
    throw new ErrorActualizarEntrenamientoEquipo(
      "La instalación seleccionada no está activa.",
      400,
      [
        {
          campo: "instalacionId",
          mensaje:
            "Selecciona una instalación activa.",
        },
      ],
    );
  }

  const {
    data: entrenamientoActualizado,
    error: errorActualizacion,
  } = await supabaseServidor
    .from("entrenamientos")
    .update({
      instalacion_id:
        datosValidados.instalacionId,
      dia_semana: datosValidados.diaSemana,
      hora_inicio: datosValidados.horaInicio,
      hora_fin: datosValidados.horaFin,
      fecha_inicio:
        datosValidados.fechaInicio,
      fecha_fin: datosValidados.fechaFin,
      observaciones:
        datosValidados.observaciones,
      activo: datosValidados.activo,
    })
    .eq("id", entrenamientoIdNormalizado)
    .eq("equipo_id", equipoIdNormalizado)
    .select(
      `
        id,
        equipo_id,
        instalacion_id,
        temporada_id,
        dia_semana,
        hora_inicio,
        hora_fin,
        fecha_inicio,
        fecha_fin,
        observaciones,
        activo
      `,
    )
    .maybeSingle();

  if (errorActualizacion) {
    throw new ErrorActualizarEntrenamientoEquipo(
      `No se ha podido actualizar el entrenamiento: ${errorActualizacion.message}`,
      500,
    );
  }

  if (!entrenamientoActualizado?.id) {
    throw new ErrorActualizarEntrenamientoEquipo(
      "El entrenamiento ya no está disponible.",
      404,
    );
  }

  const entrenamiento =
    entrenamientoActualizado as FilaEntrenamiento;

  return {
    id: entrenamiento.id,
    equipoId: entrenamiento.equipo_id,
    temporadaId:
      entrenamiento.temporada_id,
    instalacionId:
      entrenamiento.instalacion_id,
    instalacion:
      convertirInstalacion(instalacion),
    diaSemana:
      entrenamiento.dia_semana as DiaSemanaEntrenamiento,
    horaInicio: normalizarHora(
      entrenamiento.hora_inicio,
    ),
    horaFin: normalizarHora(
      entrenamiento.hora_fin,
    ),
    fechaInicio:
      entrenamiento.fecha_inicio,
    fechaFin: entrenamiento.fecha_fin,
    observaciones:
      entrenamiento.observaciones?.trim() ??
      "",
    activo: Boolean(entrenamiento.activo),
  };
}