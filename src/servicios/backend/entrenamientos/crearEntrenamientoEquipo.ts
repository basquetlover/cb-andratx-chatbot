import { supabaseServidor } from "../../supabase/servidor";

import type {
  DiaSemanaEntrenamiento,
  EntrenamientoHabitualEquipoPanel,
  InstalacionEntrenamientoPanel,
} from "@tipos/EntrenamientosEquipoPanel";

export interface ErrorCampoEntrenamiento {
  campo: string;
  mensaje: string;
}

export class ErrorCrearEntrenamientoEquipo extends Error {
  status: number;
  errores: ErrorCampoEntrenamiento[];

  constructor(
    mensaje: string,
    status = 400,
    errores: ErrorCampoEntrenamiento[] = [],
  ) {
    super(mensaje);

    this.name = "ErrorCrearEntrenamientoEquipo";
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

interface FilaEquipo {
  id: string;
  temporada_id: string;
}

interface FilaInstalacion {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  direccion: string | null;
  localidad: string | null;
  activa: boolean | null;
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
    throw new ErrorCrearEntrenamientoEquipo(
      "Los datos enviados no son válidos.",
      400,
    );
  }

  const errores: ErrorCampoEntrenamiento[] = [];

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
    throw new ErrorCrearEntrenamientoEquipo(
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

export async function crearEntrenamientoEquipo(
  equipoId: string,
  datos: unknown,
): Promise<EntrenamientoHabitualEquipoPanel> {
  const idNormalizado = equipoId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorCrearEntrenamientoEquipo(
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

  const datosValidados = validarDatos(datos);

  const {
    data: equipoEncontrado,
    error: errorEquipo,
  } = await supabaseServidor
    .from("equipos")
    .select("id, temporada_id")
    .eq("id", idNormalizado)
    .maybeSingle();

  if (errorEquipo) {
    throw new ErrorCrearEntrenamientoEquipo(
      `No se ha podido comprobar el equipo: ${errorEquipo.message}`,
      500,
    );
  }

  if (
    !equipoEncontrado?.id ||
    !equipoEncontrado.temporada_id
  ) {
    throw new ErrorCrearEntrenamientoEquipo(
      "El equipo no existe.",
      404,
    );
  }

  const equipo = equipoEncontrado as FilaEquipo;

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
    throw new ErrorCrearEntrenamientoEquipo(
      `No se ha podido comprobar la instalación: ${errorInstalacion.message}`,
      500,
    );
  }

  if (!instalacionEncontrada?.id) {
    throw new ErrorCrearEntrenamientoEquipo(
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

  if (!instalacion.activa) {
    throw new ErrorCrearEntrenamientoEquipo(
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
    data: entrenamientoCreado,
    error: errorCreacion,
  } = await supabaseServidor
    .from("entrenamientos")
    .insert({
      equipo_id: idNormalizado,
      instalacion_id:
        datosValidados.instalacionId,
      temporada_id: equipo.temporada_id,
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
    .single();

  if (errorCreacion) {
    throw new ErrorCrearEntrenamientoEquipo(
      `No se ha podido crear el entrenamiento: ${errorCreacion.message}`,
      500,
    );
  }

  if (!entrenamientoCreado?.id) {
    throw new ErrorCrearEntrenamientoEquipo(
      "No se ha podido recuperar el entrenamiento creado.",
      500,
    );
  }

  const entrenamiento =
    entrenamientoCreado as FilaEntrenamiento;

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