import { supabaseServidor } from "../../supabase/servidor";

import type {
  DiaSemanaEntrenamiento,
  EntrenamientoHabitualEquipoPanel,
  EntrenamientosEquipoPanel,
  InstalacionEntrenamientoPanel,
} from "@tipos/EntrenamientosEquipoPanel";

export class ErrorObtenerEntrenamientosEquipo extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerEntrenamientosEquipo";

    this.status = status;
  }
}

interface FilaEquipo {
  id: string;
  temporada_id: string;
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

function normalizarHora(
  valor: string | null | undefined,
): string {
  if (!valor) {
    return "";
  }

  return valor.slice(0, 5);
}

function convertirDiaSemana(
  valor: number,
): DiaSemanaEntrenamiento {
  if (
    Number.isInteger(valor) &&
    valor >= 1 &&
    valor <= 7
  ) {
    return valor as DiaSemanaEntrenamiento;
  }

  return 1;
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

export async function obtenerEntrenamientosEquipo(
  equipoId: string,
): Promise<EntrenamientosEquipoPanel> {
  const idNormalizado = equipoId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorObtenerEntrenamientosEquipo(
      "El identificador del equipo no es válido.",
      400,
    );
  }

  const {
    data: equipoEncontrado,
    error: errorEquipo,
  } = await supabaseServidor
    .from("equipos")
    .select("id, temporada_id")
    .eq("id", idNormalizado)
    .maybeSingle();

  if (errorEquipo) {
    throw new ErrorObtenerEntrenamientosEquipo(
      `No se ha podido comprobar el equipo: ${errorEquipo.message}`,
      500,
    );
  }

  if (
    !equipoEncontrado?.id ||
    !equipoEncontrado.temporada_id
  ) {
    throw new ErrorObtenerEntrenamientosEquipo(
      "El equipo no existe.",
      404,
    );
  }

  const equipo = equipoEncontrado as FilaEquipo;

  const [
    resultadoEntrenamientos,
    resultadoInstalaciones,
  ] = await Promise.all([
    supabaseServidor
      .from("entrenamientos")
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
      .eq("equipo_id", idNormalizado)
      .eq(
        "temporada_id",
        equipo.temporada_id,
      )
      .order("dia_semana", {
        ascending: true,
      })
      .order("hora_inicio", {
        ascending: true,
      }),

    supabaseServidor
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
      .order("nombre", {
        ascending: true,
      }),
  ]);

  if (resultadoEntrenamientos.error) {
    throw new ErrorObtenerEntrenamientosEquipo(
      `No se han podido obtener los entrenamientos: ${resultadoEntrenamientos.error.message}`,
      500,
    );
  }

  if (resultadoInstalaciones.error) {
    throw new ErrorObtenerEntrenamientosEquipo(
      `No se han podido obtener las instalaciones: ${resultadoInstalaciones.error.message}`,
      500,
    );
  }

  const instalaciones = (
    (resultadoInstalaciones.data ??
      []) as FilaInstalacion[]
  ).map(convertirInstalacion);

  const instalacionesPorId = new Map(
    instalaciones.map((instalacion) => [
      instalacion.id,
      instalacion,
    ]),
  );

  const habituales = (
    (resultadoEntrenamientos.data ??
      []) as FilaEntrenamiento[]
  ).map(
    (
      entrenamiento,
    ): EntrenamientoHabitualEquipoPanel => ({
      id: entrenamiento.id,
      equipoId: entrenamiento.equipo_id,
      temporadaId:
        entrenamiento.temporada_id,
      instalacionId:
        entrenamiento.instalacion_id,
      instalacion:
        instalacionesPorId.get(
          entrenamiento.instalacion_id,
        ) ?? null,
      diaSemana: convertirDiaSemana(
        entrenamiento.dia_semana,
      ),
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
    }),
  );

  return {
    habituales,
    instalaciones,
  };
}