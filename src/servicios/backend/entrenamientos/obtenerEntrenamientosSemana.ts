import { supabaseServidor } from "../../supabase/servidor";

interface FilaEntrenamiento {
  id: string;
  equipo_id: string | null;
  instalacion_id: string | null;
  temporada_id: string | null;
  dia_semana: number | null;
  hora_inicio: string | null;
  hora_fin: string | null;
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
  codigo_postal: string | null;
  latitud: string | null;
  longitud: string | null;
}

export interface EntrenamientoSemana {
  id: string;
  fecha: string;
  diaSemana: number;
  horaInicio: string | null;
  horaFin: string | null;
  observaciones: string | null;
  instalacion: {
    id: string;
    nombre: string | null;
    nombreCorto: string | null;
    direccion: string | null;
    localidad: string | null;
    codigoPostal: string | null;
    latitud: string | null;
    longitud: string | null;
  } | null;
}

export interface ResultadoEntrenamientosSemana {
  equipo: {
    id: string;
    nombre: string | null;
  };
  semana: {
    inicio: string;
    fin: string;
  };
  periodo: {
    estado: "actual" | "antes-inicio" | "despues-fin";
    fechaInicio: string | null;
    fechaFin: string | null;
  };
  entrenamientos: EntrenamientoSemana[];
}

function obtenerFechaMadrid(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);

  const año = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  const dia = partes.find((parte) => parte.type === "day")?.value;

  if (!año || !mes || !dia) {
    throw new Error("No se ha podido calcular la fecha actual");
  }

  return `${año}-${mes}-${dia}`;
}

function convertirFechaUTC(fecha: string): Date {
  const [año, mes, dia] = fecha.split("-").map(Number);

  return new Date(Date.UTC(año, mes - 1, dia));
}

function formatearFechaUTC(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function sumarDias(fecha: Date, cantidad: number): Date {
  const resultado = new Date(fecha);

  resultado.setUTCDate(resultado.getUTCDate() + cantidad);

  return resultado;
}

function calcularSemana(fechaReferencia: string): {
  inicio: string;
  fin: string;
} {
  const fechaActual = convertirFechaUTC(fechaReferencia);
  const diaSemanaJS = fechaActual.getUTCDay();
  const diaSemanaISO = diaSemanaJS === 0 ? 7 : diaSemanaJS;
  const inicioSemana = sumarDias(fechaActual, 1 - diaSemanaISO);
  const finSemana = sumarDias(inicioSemana, 6);

  return {
    inicio: formatearFechaUTC(inicioSemana),
    fin: formatearFechaUTC(finSemana),
  };
}

function fechaPerteneceAlPeriodo(fecha: string, fechaInicio: string | null, fechaFin: string | null): boolean {
  if (fechaInicio && fecha < fechaInicio) {
    return false;
  }

  if (fechaFin && fecha > fechaFin) {
    return false;
  }

  return true;
}

export async function obtenerEntrenamientosSemana(equipoId: string): Promise<ResultadoEntrenamientosSemana> {
  

  const { data: temporada, error: errorTemporada } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (errorTemporada) {
    throw new Error(`Error al obtener la temporada activa: ${errorTemporada.message}`);
  }

  if (!temporada?.id) {
    throw new Error("No hay ninguna temporada activa");
  }

  const { data: equipo, error: errorEquipo } = await supabaseServidor
    .from("equipos")
    .select("id, nombre")
    .eq("id", equipoId)
    .eq("temporada_id", String(temporada.id))
    .eq("chatbot", true)
    .maybeSingle();

  if (errorEquipo) {
    throw new Error(`Error al obtener el equipo: ${errorEquipo.message}`);
  }

  if (!equipo?.id) {
    throw new Error("El equipo no existe o no está disponible");
  }

  const { data: entrenamientos, error: errorEntrenamientos } = await supabaseServidor
    .from("entrenamientos")
    .select("id, equipo_id, instalacion_id, temporada_id, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin, observaciones, activo")
    .eq("equipo_id", equipoId)
    .eq("temporada_id", String(temporada.id))
    .eq("activo", true)
    .order("dia_semana", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (errorEntrenamientos) {
    throw new Error(`Error al obtener los entrenamientos: ${errorEntrenamientos.message}`);
  }

  const filasEntrenamientos = (entrenamientos ?? []) as FilaEntrenamiento[];

  const fechaActual = obtenerFechaMadrid(new Date());

const todosTienenFechaInicio = filasEntrenamientos.length > 0 && filasEntrenamientos.every((entrenamiento) => entrenamiento.fecha_inicio !== null);
const todosTienenFechaFin = filasEntrenamientos.length > 0 && filasEntrenamientos.every((entrenamiento) => entrenamiento.fecha_fin !== null);

const fechasInicio = filasEntrenamientos
  .map((entrenamiento) => entrenamiento.fecha_inicio)
  .filter((fecha): fecha is string => fecha !== null)
  .sort();

const fechasFin = filasEntrenamientos
  .map((entrenamiento) => entrenamiento.fecha_fin)
  .filter((fecha): fecha is string => fecha !== null)
  .sort();

const fechaInicioPeriodo = todosTienenFechaInicio ? fechasInicio[0] ?? null : null;
const fechaFinPeriodo = todosTienenFechaFin ? fechasFin.at(-1) ?? null : null;

let estadoPeriodo: "actual" | "antes-inicio" | "despues-fin" = "actual";
let fechaReferencia = fechaActual;

if (fechaInicioPeriodo && fechaActual < fechaInicioPeriodo) {
  estadoPeriodo = "antes-inicio";
  fechaReferencia = fechaInicioPeriodo;
} else if (fechaFinPeriodo && fechaActual > fechaFinPeriodo) {
  estadoPeriodo = "despues-fin";
  fechaReferencia = fechaFinPeriodo;
}

const { inicio, fin } = calcularSemana(fechaReferencia);

  const entrenamientosSemana = filasEntrenamientos
    .filter((entrenamiento) => entrenamiento.dia_semana !== null && entrenamiento.dia_semana >= 1 && entrenamiento.dia_semana <= 7)
    .map((entrenamiento) => {
      const fechaEntrenamiento = formatearFechaUTC(sumarDias(convertirFechaUTC(inicio), entrenamiento.dia_semana! - 1));

      return {
        entrenamiento,
        fechaEntrenamiento,
      };
    })
    .filter(({ entrenamiento, fechaEntrenamiento }) => fechaPerteneceAlPeriodo(fechaEntrenamiento, entrenamiento.fecha_inicio, entrenamiento.fecha_fin));

  const idsInstalaciones = Array.from(
    new Set(
      entrenamientosSemana
        .map(({ entrenamiento }) => entrenamiento.instalacion_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  let instalaciones: FilaInstalacion[] = [];

  if (idsInstalaciones.length > 0) {
    const { data, error } = await supabaseServidor
      .from("instalaciones")
      .select("id, nombre, nombre_corto, direccion, localidad, codigo_postal, latitud, longitud")
      .in("id", idsInstalaciones);

    if (error) {
      throw new Error(`Error al obtener las instalaciones: ${error.message}`);
    }

    instalaciones = (data ?? []) as FilaInstalacion[];
  }

  const instalacionesPorId = new Map(instalaciones.map((instalacion) => [instalacion.id, instalacion]));

  const resultado: EntrenamientoSemana[] = entrenamientosSemana.map(({ entrenamiento, fechaEntrenamiento }) => {
    const instalacion = entrenamiento.instalacion_id ? instalacionesPorId.get(entrenamiento.instalacion_id) : null;

    return {
      id: entrenamiento.id,
      fecha: fechaEntrenamiento,
      diaSemana: entrenamiento.dia_semana!,
      horaInicio: entrenamiento.hora_inicio,
      horaFin: entrenamiento.hora_fin,
      observaciones: entrenamiento.observaciones,
      instalacion: instalacion
        ? {
            id: instalacion.id,
            nombre: instalacion.nombre,
            nombreCorto: instalacion.nombre_corto,
            direccion: instalacion.direccion,
            localidad: instalacion.localidad,
            codigoPostal: instalacion.codigo_postal,
            latitud: instalacion.latitud,
            longitud: instalacion.longitud,
          }
        : null,
    };
  });

  return {
    equipo: {
      id: equipo.id,
      nombre: equipo.nombre,
    },
    semana: {
      inicio,
      fin,
    },
    periodo: {
      estado: estadoPeriodo,
      fechaInicio: fechaInicioPeriodo,
      fechaFin: fechaFinPeriodo,
    },
    entrenamientos: resultado,
  };
}