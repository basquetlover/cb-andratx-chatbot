import { supabaseServidor } from "../../supabase/servidor";

import type {
  EntrenamientoSemana,
  EstadoEntrenamientoCalendario,
  EstadoPeriodoEntrenamientos,
  InstalacionEntrenamiento,
  ResultadoEntrenamientos,
} from "@tipos/Entrenamiento";

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

interface FilaExcepcionEntrenamiento {
  id: string;
  created_at: string;
  equipo_id: string | null;
  entrenamiento_id: string | null;
  instalacion_id: string | null;
  tipo: string | null;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string | null;
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

interface OcurrenciaEntrenamiento {
  id: string;
  entrenamientoId: string | null;
  fecha: string;
  diaSemana: number;
  horaInicio: string | null;
  horaFin: string | null;
  observaciones: string | null;
  instalacionId: string | null;
  estado: EstadoEntrenamientoCalendario;
}

interface RangoFechas {
  inicio: string;
  fin: string;
}

function obtenerFechaMadrid(
  fecha: Date,
): string {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(fecha);

  const anio =
    partes.find(
      (parte) =>
        parte.type === "year",
    )?.value;

  const mes =
    partes.find(
      (parte) =>
        parte.type === "month",
    )?.value;

  const dia =
    partes.find(
      (parte) =>
        parte.type === "day",
    )?.value;

  if (!anio || !mes || !dia) {
    throw new Error(
      "No se ha podido calcular la fecha actual",
    );
  }

  return `${anio}-${mes}-${dia}`;
}

function convertirFechaUTC(
  fecha: string,
): Date {
  const [anio, mes, dia] =
    fecha.split("-").map(Number);

  return new Date(
    Date.UTC(
      anio,
      mes - 1,
      dia,
    ),
  );
}

function formatearFechaUTC(
  fecha: Date,
): string {
  return fecha
    .toISOString()
    .slice(0, 10);
}

function sumarDias(
  fecha: Date,
  cantidad: number,
): Date {
  const resultado =
    new Date(fecha);

  resultado.setUTCDate(
    resultado.getUTCDate() +
      cantidad,
  );

  return resultado;
}

function obtenerDiaSemanaISO(
  fecha: string,
): number {
  const diaSemana =
    convertirFechaUTC(
      fecha,
    ).getUTCDay();

  return diaSemana === 0
    ? 7
    : diaSemana;
}

function calcularSemana(
  fechaReferencia: string,
): RangoFechas {
  const fechaActual =
    convertirFechaUTC(
      fechaReferencia,
    );

  const diaSemanaJS =
    fechaActual.getUTCDay();

  const diaSemanaISO =
    diaSemanaJS === 0
      ? 7
      : diaSemanaJS;

  const inicioSemana =
    sumarDias(
      fechaActual,
      1 - diaSemanaISO,
    );

  const finSemana =
    sumarDias(
      inicioSemana,
      6,
    );

  return {
    inicio:
      formatearFechaUTC(
        inicioSemana,
      ),

    fin:
      formatearFechaUTC(
        finSemana,
      ),
  };
}

function calcularRangoCalendario(
  fechaActual: string,
): RangoFechas {
  const [anio, mes] =
    fechaActual
      .split("-")
      .map(Number);

  const inicioMesActual =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        1,
      ),
    );

  const finMesSiguiente =
    new Date(
      Date.UTC(
        anio,
        mes + 1,
        0,
      ),
    );

  return {
    inicio:
      formatearFechaUTC(
        inicioMesActual,
      ),

    fin:
      formatearFechaUTC(
        finMesSiguiente,
      ),
  };
}

function fechaPerteneceAlPeriodo(
  fecha: string,
  fechaInicio: string | null,
  fechaFin: string | null,
): boolean {
  if (
    fechaInicio &&
    fecha < fechaInicio
  ) {
    return false;
  }

  if (
    fechaFin &&
    fecha > fechaFin
  ) {
    return false;
  }

  return true;
}

function normalizarTexto(
  valor: string | null,
): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .trim()
    .toLowerCase();
}

function esExcepcionCancelacion(
  tipo: string | null,
): boolean {
  const tipoNormalizado =
    normalizarTexto(tipo);

  return (
    tipoNormalizado.includes(
      "cancel",
    ) ||
    tipoNormalizado.includes(
      "anul",
    ) ||
    tipoNormalizado.includes(
      "suspend",
    )
  );
}

function generarOcurrenciasHabituales(
  entrenamientos:
    FilaEntrenamiento[],
  rango: RangoFechas,
): OcurrenciaEntrenamiento[] {
  const resultado:
    OcurrenciaEntrenamiento[] = [];

  let fecha =
    convertirFechaUTC(
      rango.inicio,
    );

  const fechaFin =
    convertirFechaUTC(
      rango.fin,
    );

  while (fecha <= fechaFin) {
    const fechaIso =
      formatearFechaUTC(fecha);

    const diaSemana =
      obtenerDiaSemanaISO(
        fechaIso,
      );

    entrenamientos.forEach(
      (entrenamiento) => {
        if (
          entrenamiento.dia_semana !==
            diaSemana ||
          !fechaPerteneceAlPeriodo(
            fechaIso,
            entrenamiento.fecha_inicio,
            entrenamiento.fecha_fin,
          )
        ) {
          return;
        }

        resultado.push({
          id: entrenamiento.id,

          entrenamientoId:
            entrenamiento.id,

          fecha: fechaIso,
          diaSemana,

          horaInicio:
            entrenamiento.hora_inicio,

          horaFin:
            entrenamiento.hora_fin,

          observaciones:
            entrenamiento.observaciones,

          instalacionId:
            entrenamiento.instalacion_id,

          estado: "normal",
        });
      },
    );

    fecha =
      sumarDias(fecha, 1);
  }

  return resultado;
}

function crearClaveOcurrencia(
  entrenamientoId: string,
  fecha: string,
): string {
  return `${entrenamientoId}:${fecha}`;
}

function aplicarExcepciones(
  ocurrenciasHabituales:
    OcurrenciaEntrenamiento[],
  entrenamientosPorId: Map<
    string,
    FilaEntrenamiento
  >,
  excepciones:
    FilaExcepcionEntrenamiento[],
  rango: RangoFechas,
): OcurrenciaEntrenamiento[] {
  const ocurrenciasPorClave =
    new Map<
      string,
      OcurrenciaEntrenamiento
    >();

  ocurrenciasHabituales.forEach(
    (ocurrencia) => {
      if (
        !ocurrencia.entrenamientoId
      ) {
        return;
      }

      ocurrenciasPorClave.set(
        crearClaveOcurrencia(
          ocurrencia.entrenamientoId,
          ocurrencia.fecha,
        ),
        ocurrencia,
      );
    },
  );

  excepciones.forEach(
    (excepcion) => {
      if (
        !excepcion.fecha ||
        excepcion.fecha <
          rango.inicio ||
        excepcion.fecha >
          rango.fin
      ) {
        return;
      }

      const cancelada =
        esExcepcionCancelacion(
          excepcion.tipo,
        );

      if (
        excepcion.entrenamiento_id
      ) {
        const clave =
          crearClaveOcurrencia(
            excepcion.entrenamiento_id,
            excepcion.fecha,
          );

        const ocurrenciaActual =
          ocurrenciasPorClave.get(
            clave,
          );

        const entrenamientoBase =
          entrenamientosPorId.get(
            excepcion.entrenamiento_id,
          );

        if (
          !ocurrenciaActual &&
          !entrenamientoBase
        ) {
          return;
        }

        ocurrenciasPorClave.set(
          clave,
          {
            id:
              entrenamientoBase?.id ??
              excepcion.id,

            entrenamientoId:
              excepcion.entrenamiento_id,

            fecha:
              excepcion.fecha,

            diaSemana:
              obtenerDiaSemanaISO(
                excepcion.fecha,
              ),

            horaInicio:
              excepcion.hora_inicio ??
              ocurrenciaActual?.horaInicio ??
              entrenamientoBase?.hora_inicio ??
              null,

            horaFin:
              excepcion.hora_fin ??
              ocurrenciaActual?.horaFin ??
              entrenamientoBase?.hora_fin ??
              null,

            observaciones:
              excepcion.motivo?.trim() ||
              ocurrenciaActual?.observaciones ||
              entrenamientoBase?.observaciones ||
              null,

            instalacionId:
              excepcion.instalacion_id ??
              ocurrenciaActual?.instalacionId ??
              entrenamientoBase?.instalacion_id ??
              null,

            estado: cancelada
              ? "cancelado"
              : "modificado",
          },
        );

        return;
      }

      /*
       * Una excepción sin
       * entrenamiento_id es una
       * sesión adicional o puntual.
       *
       * Si su tipo es una
       * cancelación, se conserva
       * igualmente para mostrarla
       * en el calendario.
       */
      const clave =
        `excepcion:${excepcion.id}:${excepcion.fecha}`;

      ocurrenciasPorClave.set(
        clave,
        {
          id: excepcion.id,

          entrenamientoId: null,

          fecha:
            excepcion.fecha,

          diaSemana:
            obtenerDiaSemanaISO(
              excepcion.fecha,
            ),

          horaInicio:
            excepcion.hora_inicio,

          horaFin:
            excepcion.hora_fin,

          observaciones:
            excepcion.motivo,

          instalacionId:
            excepcion.instalacion_id,

          estado: cancelada
            ? "cancelado"
            : "modificado",
        },
      );
    },
  );

  return Array.from(
    ocurrenciasPorClave.values(),
  ).sort(
    (primero, segundo) => {
      const comparacionFecha =
        primero.fecha.localeCompare(
          segundo.fecha,
        );

      if (
        comparacionFecha !== 0
      ) {
        return comparacionFecha;
      }

      return (
        primero.horaInicio ?? ""
      ).localeCompare(
        segundo.horaInicio ??
          "",
      );
    },
  );
}

function convertirInstalacion(
  fila: FilaInstalacion,
): InstalacionEntrenamiento {
  return {
    id: fila.id,
    nombre: fila.nombre,

    nombreCorto:
      fila.nombre_corto,

    direccion:
      fila.direccion,

    localidad:
      fila.localidad,

    codigoPostal:
      fila.codigo_postal,

    latitud:
      fila.latitud,

    longitud:
      fila.longitud,
  };
}

function convertirOcurrencias(
  ocurrencias:
    OcurrenciaEntrenamiento[],
  instalacionesPorId: Map<
    string,
    InstalacionEntrenamiento
  >,
): EntrenamientoSemana[] {
  return ocurrencias.map(
    (ocurrencia) => ({
      id: ocurrencia.id,
      fecha: ocurrencia.fecha,

      diaSemana:
        ocurrencia.diaSemana,

      horaInicio:
        ocurrencia.horaInicio,

      horaFin:
        ocurrencia.horaFin,

      observaciones:
        ocurrencia.observaciones,

      estado:
        ocurrencia.estado,

      instalacion:
        ocurrencia.instalacionId
          ? instalacionesPorId.get(
              ocurrencia.instalacionId,
            ) ?? null
          : null,
    }),
  );
}

export async function obtenerEntrenamientosSemana(
  equipoId: string,
): Promise<ResultadoEntrenamientos> {
  const {
    data: temporada,
    error: errorTemporada,
  } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (errorTemporada) {
    throw new Error(
      `Error al obtener la temporada activa: ${errorTemporada.message}`,
    );
  }

  if (!temporada?.id) {
    throw new Error(
      "No hay ninguna temporada activa",
    );
  }

  const {
    data: equipo,
    error: errorEquipo,
  } = await supabaseServidor
    .from("equipos")
    .select("id, nombre")
    .eq("id", equipoId)
    .eq(
      "temporada_id",
      String(temporada.id),
    )
    .eq("chatbot", true)
    .maybeSingle();

  if (errorEquipo) {
    throw new Error(
      `Error al obtener el equipo: ${errorEquipo.message}`,
    );
  }

  if (!equipo?.id) {
    throw new Error(
      "El equipo no existe o no está disponible",
    );
  }

  const {
    data: entrenamientos,
    error: errorEntrenamientos,
  } = await supabaseServidor
    .from("entrenamientos")
    .select(`
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
    `)
    .eq("equipo_id", equipoId)
    .eq(
      "temporada_id",
      String(temporada.id),
    )
    .eq("activo", true)
    .order("dia_semana", {
      ascending: true,
    })
    .order("hora_inicio", {
      ascending: true,
    });

  if (errorEntrenamientos) {
    throw new Error(
      `Error al obtener los entrenamientos: ${errorEntrenamientos.message}`,
    );
  }

  const filasEntrenamientos =
    (entrenamientos ??
      []) as FilaEntrenamiento[];

  const fechaActual =
    obtenerFechaMadrid(
      new Date(),
    );

  const todosTienenFechaInicio =
    filasEntrenamientos.length >
      0 &&
    filasEntrenamientos.every(
      (entrenamiento) =>
        entrenamiento.fecha_inicio !==
        null,
    );

  const todosTienenFechaFin =
    filasEntrenamientos.length >
      0 &&
    filasEntrenamientos.every(
      (entrenamiento) =>
        entrenamiento.fecha_fin !==
        null,
    );

  const fechasInicio =
    filasEntrenamientos
      .map(
        (entrenamiento) =>
          entrenamiento.fecha_inicio,
      )
      .filter(
        (
          fecha,
        ): fecha is string =>
          fecha !== null,
      )
      .sort();

  const fechasFin =
    filasEntrenamientos
      .map(
        (entrenamiento) =>
          entrenamiento.fecha_fin,
      )
      .filter(
        (
          fecha,
        ): fecha is string =>
          fecha !== null,
      )
      .sort();

  const fechaInicioPeriodo =
    todosTienenFechaInicio
      ? fechasInicio[0] ?? null
      : null;

  const fechaFinPeriodo =
    todosTienenFechaFin
      ? fechasFin.at(-1) ?? null
      : null;

  let estadoPeriodo:
    EstadoPeriodoEntrenamientos =
      "actual";

  let fechaReferencia =
    fechaActual;

  if (
    fechaInicioPeriodo &&
    fechaActual <
      fechaInicioPeriodo
  ) {
    estadoPeriodo =
      "antes-inicio";

    fechaReferencia =
      fechaInicioPeriodo;
  } else if (
    fechaFinPeriodo &&
    fechaActual >
      fechaFinPeriodo
  ) {
    estadoPeriodo =
      "despues-fin";

    fechaReferencia =
      fechaFinPeriodo;
  }

  const rangoSemana =
    calcularSemana(
      fechaReferencia,
    );

  const rangoCalendario =
    calcularRangoCalendario(
      fechaActual,
    );

  const inicioConsultaExcepciones =
    rangoSemana.inicio <
    rangoCalendario.inicio
      ? rangoSemana.inicio
      : rangoCalendario.inicio;

  const finConsultaExcepciones =
    rangoSemana.fin >
    rangoCalendario.fin
      ? rangoSemana.fin
      : rangoCalendario.fin;

  const {
    data: excepciones,
    error: errorExcepciones,
  } = await supabaseServidor
    .from(
      "excepciones_entrenamientos",
    )
    .select(`
      id,
      created_at,
      equipo_id,
      entrenamiento_id,
      instalacion_id,
      tipo,
      fecha,
      hora_inicio,
      hora_fin,
      motivo
    `)
    .eq("equipo_id", equipoId)
    .gte(
      "fecha",
      inicioConsultaExcepciones,
    )
    .lte(
      "fecha",
      finConsultaExcepciones,
    )
    .order("fecha", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (errorExcepciones) {
    throw new Error(
      `Error al obtener las excepciones de entrenamientos: ${errorExcepciones.message}`,
    );
  }

  const filasExcepciones =
    (excepciones ??
      []) as FilaExcepcionEntrenamiento[];

  const entrenamientosPorId =
    new Map(
      filasEntrenamientos.map(
        (entrenamiento) => [
          entrenamiento.id,
          entrenamiento,
        ],
      ),
    );

  const ocurrenciasSemana =
    aplicarExcepciones(
      generarOcurrenciasHabituales(
        filasEntrenamientos,
        rangoSemana,
      ),
      entrenamientosPorId,
      filasExcepciones,
      rangoSemana,
    );

  const ocurrenciasCalendario =
    aplicarExcepciones(
      generarOcurrenciasHabituales(
        filasEntrenamientos,
        rangoCalendario,
      ),
      entrenamientosPorId,
      filasExcepciones,
      rangoCalendario,
    );

  const idsInstalaciones =
    Array.from(
      new Set(
        [
          ...ocurrenciasSemana,
          ...ocurrenciasCalendario,
        ]
          .map(
            (ocurrencia) =>
              ocurrencia.instalacionId,
          )
          .filter(
            (
              id,
            ): id is string =>
              typeof id ===
                "string" &&
              id.length > 0,
          ),
      ),
    );

  let instalaciones:
    FilaInstalacion[] = [];

  if (
    idsInstalaciones.length > 0
  ) {
    const { data, error } =
      await supabaseServidor
        .from("instalaciones")
        .select(`
          id,
          nombre,
          nombre_corto,
          direccion,
          localidad,
          codigo_postal,
          latitud,
          longitud
        `)
        .in(
          "id",
          idsInstalaciones,
        );

    if (error) {
      throw new Error(
        `Error al obtener las instalaciones: ${error.message}`,
      );
    }

    instalaciones =
      (data ??
        []) as FilaInstalacion[];
  }

  const instalacionesPorId =
    new Map(
      instalaciones.map(
        (instalacion) => [
          instalacion.id,
          convertirInstalacion(
            instalacion,
          ),
        ],
      ),
    );

  return {
    equipo: {
      id: equipo.id,
      nombre: equipo.nombre,
    },

    semana: {
      inicio:
        rangoSemana.inicio,

      fin:
        rangoSemana.fin,
    },

    periodo: {
      estado:
        estadoPeriodo,

      fechaInicio:
        fechaInicioPeriodo,

      fechaFin:
        fechaFinPeriodo,
    },

    entrenamientos:
      convertirOcurrencias(
        ocurrenciasSemana,
        instalacionesPorId,
      ),

    entrenamientosCalendario:
      convertirOcurrencias(
        ocurrenciasCalendario,
        instalacionesPorId,
      ),
  };
}