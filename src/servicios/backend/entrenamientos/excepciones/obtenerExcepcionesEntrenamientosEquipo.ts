import { supabaseServidor } from "../../../supabase/servidor";

import type {
  EntrenamientoReferenciaExcepcion,
  ExcepcionEntrenamientoPanel,
  InstalacionExcepcionEntrenamiento,
  ResultadoExcepcionesEntrenamientosPanel,
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

interface FilaEntrenamiento {
  id: string;
  equipo_id: string | null;
  temporada_id: string | null;
  instalacion_id: string | null;
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
  activa: boolean | null;
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

function normalizarHora(
  valor: unknown,
): string | null {
  const hora = normalizarTexto(valor);

  if (!hora) {
    return null;
  }

  return hora.slice(0, 5);
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

function convertirInstalacion(
  fila: FilaInstalacion,
): InstalacionExcepcionEntrenamiento {
  return {
    id: fila.id,
    nombre:
      normalizarTexto(fila.nombre) ??
      normalizarTexto(fila.nombre_corto) ??
      "Instalación sin nombre",
    nombreCorto:
      normalizarTexto(fila.nombre_corto),
    direccion:
      normalizarTexto(fila.direccion),
    localidad:
      normalizarTexto(fila.localidad),
    activa: Boolean(fila.activa),
  };
}

export async function obtenerExcepcionesEntrenamientosEquipo(
  equipoId: string,
  temporadaId: string,
): Promise<ResultadoExcepcionesEntrenamientosPanel> {
  const equipoIdLimpio = equipoId.trim();
  const temporadaIdLimpio =
    temporadaId.trim();

  if (!equipoIdLimpio) {
    throw new Error(
      "No se ha proporcionado el equipo.",
    );
  }

  if (!temporadaIdLimpio) {
    throw new Error(
      "No se ha proporcionado la temporada.",
    );
  }

  const [
    resultadoExcepciones,
    resultadoEntrenamientos,
    resultadoInstalaciones,
  ] = await Promise.all([
    supabaseServidor
      .from("excepciones_entrenamientos")
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
      .eq("equipo_id", equipoIdLimpio)
      .order("fecha", {
        ascending: true,
        nullsFirst: false,
      })
      .order("hora_inicio", {
        ascending: true,
        nullsFirst: false,
      }),

    supabaseServidor
      .from("entrenamientos")
      .select(`
        id,
        equipo_id,
        temporada_id,
        instalacion_id,
        dia_semana,
        hora_inicio,
        hora_fin,
        fecha_inicio,
        fecha_fin,
        observaciones,
        activo
      `)
      .eq("equipo_id", equipoIdLimpio)
      .eq(
        "temporada_id",
        temporadaIdLimpio,
      )
      .order("dia_semana", {
        ascending: true,
        nullsFirst: false,
      })
      .order("hora_inicio", {
        ascending: true,
        nullsFirst: false,
      }),

    supabaseServidor
      .from("instalaciones")
      .select(`
        id,
        nombre,
        nombre_corto,
        direccion,
        localidad,
        activa
      `)
      .order("nombre", {
        ascending: true,
      }),
  ]);

  if (resultadoExcepciones.error) {
    throw new Error(
      `No se han podido obtener las excepciones: ${resultadoExcepciones.error.message}`,
    );
  }

  if (resultadoEntrenamientos.error) {
    throw new Error(
      `No se han podido obtener los entrenamientos: ${resultadoEntrenamientos.error.message}`,
    );
  }

  if (resultadoInstalaciones.error) {
    throw new Error(
      `No se han podido obtener las instalaciones: ${resultadoInstalaciones.error.message}`,
    );
  }

  const filasExcepciones =
    (resultadoExcepciones.data ??
      []) as FilaExcepcion[];

  const filasEntrenamientos =
    (resultadoEntrenamientos.data ??
      []) as FilaEntrenamiento[];

  const filasInstalaciones =
    (resultadoInstalaciones.data ??
      []) as FilaInstalacion[];

  const instalaciones =
    filasInstalaciones.map(
      convertirInstalacion,
    );

  const instalacionesPorId = new Map(
    instalaciones.map((instalacion) => [
      instalacion.id,
      instalacion,
    ]),
  );

  const entrenamientos: EntrenamientoReferenciaExcepcion[] =
    filasEntrenamientos.map(
      (entrenamiento) => ({
        id: entrenamiento.id,
        equipoId:
          normalizarTexto(
            entrenamiento.equipo_id,
          ) ?? equipoIdLimpio,
        temporadaId:
          normalizarTexto(
            entrenamiento.temporada_id,
          ) ?? temporadaIdLimpio,
        diaSemana:
          typeof entrenamiento.dia_semana ===
          "number"
            ? entrenamiento.dia_semana
            : null,
        horaInicio:
          normalizarHora(
            entrenamiento.hora_inicio,
          ),
        horaFin:
          normalizarHora(
            entrenamiento.hora_fin,
          ),
        fechaInicio:
          normalizarTexto(
            entrenamiento.fecha_inicio,
          ),
        fechaFin:
          normalizarTexto(
            entrenamiento.fecha_fin,
          ),
        observaciones:
          normalizarTexto(
            entrenamiento.observaciones,
          ),
        activo:
          Boolean(entrenamiento.activo),
        instalacion:
          instalacionesPorId.get(
            entrenamiento.instalacion_id ??
              "",
          ) ?? null,
      }),
    );

  const entrenamientosPorId = new Map(
    entrenamientos.map(
      (entrenamiento) => [
        entrenamiento.id,
        entrenamiento,
      ],
    ),
  );

  const excepciones: ExcepcionEntrenamientoPanel[] =
    filasExcepciones.map(
      (excepcion) => {
        const entrenamientoId =
          normalizarTexto(
            excepcion.entrenamiento_id,
          );

        const instalacionId =
          normalizarTexto(
            excepcion.instalacion_id,
          );

        return {
          id: excepcion.id,
          equipoId:
            normalizarTexto(
              excepcion.equipo_id,
            ),
          entrenamientoId,
          instalacionId,
          tipo: normalizarTipo(
            excepcion.tipo,
          ),
          fecha:
            normalizarTexto(
              excepcion.fecha,
            ),
          horaInicio:
            normalizarHora(
              excepcion.hora_inicio,
            ),
          horaFin:
            normalizarHora(
              excepcion.hora_fin,
            ),
          motivo:
            normalizarTexto(
              excepcion.motivo,
            ),
          createdAt:
            excepcion.created_at,
          updatedAt:
            excepcion.updated_at,
          entrenamiento:
            entrenamientoId
              ? entrenamientosPorId.get(
                  entrenamientoId,
                ) ?? null
              : null,
          instalacion:
            instalacionId
              ? instalacionesPorId.get(
                  instalacionId,
                ) ?? null
              : null,
        };
      },
    );

  return {
    excepciones,
    entrenamientos,
    instalaciones,
  };
}