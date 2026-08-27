import { supabaseServidor } from "../../supabase/servidor";

import { obtenerPartidosMesEquipoFbib } from "@servicios/fbib/equipos/obtenerPartidosEquipoFbib";

import type { PartidoEquipoFbib } from "@tipos/FbibEquipoPublico";

export type TipoEventoEquipoPublico =
  | "evento"
  | "entreno"
  | "entreno-modificado"
  | "entreno-cancelado"
  | "partido-casa"
  | "partido-fuera";

export interface EventoCalendarioEquipoPublico {
  id: string;
  titulo: string;
  fecha: string;
  fechaFin?: string | null;
  tipo: TipoEventoEquipoPublico;
  horaInicio?: string | null;
  horaFin?: string | null;
  ubicacion?: string | null;
  descripcion?: string | null;
  color?: string | null;
  url?: string | null;
}

export interface ResultadoCalendarioEquipoPublico {
  anio: number;
  mes: number;
  eventos: EventoCalendarioEquipoPublico[];
  partidos: PartidoEquipoFbib[];
}

interface FilaEquipo {
  id: string;
  temporada_id: string | null;
  id_equipo_fbib: string | null;
}

interface FilaEntrenamiento {
  id: string;
  instalacion_id: string | null;
  dia_semana: number | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  observaciones: string | null;
  activo: boolean | null;
}

interface FilaExcepcion {
  id: string;
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
}

interface OcurrenciaEntrenamiento {
  id: string;
  entrenamientoId: string | null;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  instalacionId: string | null;
  descripcion: string | null;
  estado:
    | "normal"
    | "modificado"
    | "cancelado";
}

function validarUuid(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function rellenarNumero(
  numero: number,
): string {
  return String(numero).padStart(
    2,
    "0",
  );
}

function crearFecha(
  anio: number,
  mes: number,
  dia: number,
): string {
  return `${anio}-${rellenarNumero(mes)}-${rellenarNumero(dia)}`;
}

function convertirFecha(
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

function formatearFecha(
  fecha: Date,
): string {
  return fecha
    .toISOString()
    .slice(0, 10);
}

function sumarDias(
  fecha: Date,
  dias: number,
): Date {
  const resultado =
    new Date(fecha);

  resultado.setUTCDate(
    resultado.getUTCDate() +
      dias,
  );

  return resultado;
}

function obtenerRangoMes(
  anio: number,
  mes: number,
): {
  inicio: string;
  fin: string;
} {
  const ultimoDia =
    new Date(
      Date.UTC(anio, mes, 0),
    ).getUTCDate();

  return {
    inicio:
      crearFecha(anio, mes, 1),

    fin:
      crearFecha(
        anio,
        mes,
        ultimoDia,
      ),
  };
}

function obtenerDiaSemana(
  fecha: string,
): number {
  const dia =
    convertirFecha(
      fecha,
    ).getUTCDay();

  return dia === 0 ? 7 : dia;
}

function pertenecePeriodo(
  fecha: string,
  inicio: string | null,
  fin: string | null,
): boolean {
  if (inicio && fecha < inicio) {
    return false;
  }

  if (fin && fecha > fin) {
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

function esCancelacion(
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

function crearClaveEntrenamiento(
  entrenamientoId: string,
  fecha: string,
): string {
  return `${entrenamientoId}:${fecha}`;
}

function generarEntrenamientosHabituales(
  entrenamientos: FilaEntrenamiento[],
  inicio: string,
  fin: string,
): OcurrenciaEntrenamiento[] {
  const ocurrencias:
    OcurrenciaEntrenamiento[] = [];

  let fecha =
    convertirFecha(inicio);

  const fechaFinal =
    convertirFecha(fin);

  while (fecha <= fechaFinal) {
    const fechaIso =
      formatearFecha(fecha);

    const diaSemana =
      obtenerDiaSemana(fechaIso);

    entrenamientos.forEach(
      (entrenamiento) => {
        if (
          entrenamiento.dia_semana !==
            diaSemana ||
          !pertenecePeriodo(
            fechaIso,
            entrenamiento.fecha_inicio,
            entrenamiento.fecha_fin,
          )
        ) {
          return;
        }

        ocurrencias.push({
          id:
            crearClaveEntrenamiento(
              entrenamiento.id,
              fechaIso,
            ),

          entrenamientoId:
            entrenamiento.id,

          fecha: fechaIso,

          horaInicio:
            entrenamiento.hora_inicio,

          horaFin:
            entrenamiento.hora_fin,

          instalacionId:
            entrenamiento.instalacion_id,

          descripcion:
            entrenamiento.observaciones,

          estado: "normal",
        });
      },
    );

    fecha = sumarDias(fecha, 1);
  }

  return ocurrencias;
}

function aplicarExcepciones(
  ocurrencias:
    OcurrenciaEntrenamiento[],
  entrenamientos:
    FilaEntrenamiento[],
  excepciones: FilaExcepcion[],
): OcurrenciaEntrenamiento[] {
  const entrenamientosPorId =
    new Map(
      entrenamientos.map(
        (entrenamiento) => [
          entrenamiento.id,
          entrenamiento,
        ],
      ),
    );

  const ocurrenciasPorClave =
    new Map<
      string,
      OcurrenciaEntrenamiento
    >();

  ocurrencias.forEach(
    (ocurrencia) => {
      if (
        !ocurrencia.entrenamientoId
      ) {
        return;
      }

      ocurrenciasPorClave.set(
        crearClaveEntrenamiento(
          ocurrencia.entrenamientoId,
          ocurrencia.fecha,
        ),
        ocurrencia,
      );
    },
  );

  excepciones.forEach(
    (excepcion) => {
      if (!excepcion.fecha) {
        return;
      }

      const estado =
        esCancelacion(
          excepcion.tipo,
        )
          ? "cancelado"
          : "modificado";

      if (
        excepcion.entrenamiento_id
      ) {
        const clave =
          crearClaveEntrenamiento(
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
            id: clave,

            entrenamientoId:
              excepcion.entrenamiento_id,

            fecha:
              excepcion.fecha,

            horaInicio:
              excepcion.hora_inicio ??
              ocurrenciaActual
                ?.horaInicio ??
              entrenamientoBase
                ?.hora_inicio ??
              null,

            horaFin:
              excepcion.hora_fin ??
              ocurrenciaActual
                ?.horaFin ??
              entrenamientoBase
                ?.hora_fin ??
              null,

            instalacionId:
              excepcion.instalacion_id ??
              ocurrenciaActual
                ?.instalacionId ??
              entrenamientoBase
                ?.instalacion_id ??
              null,

            descripcion:
              excepcion.motivo?.trim() ||
              ocurrenciaActual
                ?.descripcion ||
              entrenamientoBase
                ?.observaciones ||
              null,

            estado,
          },
        );

        return;
      }

      const clave =
        `excepcion:${excepcion.id}:${excepcion.fecha}`;

      ocurrenciasPorClave.set(
        clave,
        {
          id: clave,
          entrenamientoId: null,
          fecha: excepcion.fecha,

          horaInicio:
            excepcion.hora_inicio,

          horaFin:
            excepcion.hora_fin,

          instalacionId:
            excepcion.instalacion_id,

          descripcion:
            excepcion.motivo,

          estado,
        },
      );
    },
  );

  return Array.from(
    ocurrenciasPorClave.values(),
  ).sort((primero, segundo) => {
    const fecha =
      primero.fecha.localeCompare(
        segundo.fecha,
      );

    if (fecha !== 0) {
      return fecha;
    }

    return (
      primero.horaInicio ?? ""
    ).localeCompare(
      segundo.horaInicio ?? "",
    );
  });
}

function convertirEntrenamientoEvento(
  entrenamiento:
    OcurrenciaEntrenamiento,
  instalaciones: Map<
    string,
    FilaInstalacion
  >,
): EventoCalendarioEquipoPublico {
  const instalacion =
    entrenamiento.instalacionId
      ? instalaciones.get(
          entrenamiento.instalacionId,
        ) ?? null
      : null;

  const ubicacion =
    instalacion?.nombre_corto?.trim() ||
    instalacion?.nombre?.trim() ||
    null;

  if (
    entrenamiento.estado ===
    "cancelado"
  ) {
    return {
      id:
        `entreno-cancelado-${entrenamiento.id}`,

      titulo:
        "Entrenamiento cancelado",

      fecha:
        entrenamiento.fecha,

      tipo:
        "entreno-cancelado",

      horaInicio:
        entrenamiento.horaInicio,

      horaFin:
        entrenamiento.horaFin,

      ubicacion,

      descripcion:
        entrenamiento.descripcion,

      url: null,
    };
  }

  if (
    entrenamiento.estado ===
    "modificado"
  ) {
    return {
      id:
        `entreno-modificado-${entrenamiento.id}`,

      titulo:
        entrenamiento.entrenamientoId
          ? "Entrenamiento modificado"
          : "Entrenamiento adicional",

      fecha:
        entrenamiento.fecha,

      tipo:
        "entreno-modificado",

      horaInicio:
        entrenamiento.horaInicio,

      horaFin:
        entrenamiento.horaFin,

      ubicacion,

      descripcion:
        entrenamiento.descripcion,

      url: null,
    };
  }

  return {
    id:
      `entreno-${entrenamiento.id}`,

    titulo: "Entrenamiento",

    fecha:
      entrenamiento.fecha,

    tipo: "entreno",

    horaInicio:
      entrenamiento.horaInicio,

    horaFin:
      entrenamiento.horaFin,

    ubicacion,

    descripcion:
      entrenamiento.descripcion,

    url: null,
  };
}

function convertirPartidoEvento(
  partido: PartidoEquipoFbib,
): EventoCalendarioEquipoPublico | null {
  if (!partido.fecha) {
    return null;
  }

  const descripcionResultado =
    partido.resultado
      ? `Resultado: ${partido.resultado.local} - ${partido.resultado.visitante}`
      : null;

  const descripcionCompeticion = [
    partido.competicion,
    partido.grupo,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `partido-${partido.id}`,

    titulo:
      `${partido.local.nombre} - ${partido.visitante.nombre}`,

    fecha: partido.fecha,

    tipo:
      partido.posicionEquipo ===
      "local"
        ? "partido-casa"
        : "partido-fuera",

    horaInicio: partido.hora,

    ubicacion: partido.campo,

    descripcion: [
      descripcionResultado,
      descripcionCompeticion,
    ]
      .filter(Boolean)
      .join(" · ") || null,

    url: partido.enlaceFbib,
  };
}

export async function obtenerCalendarioEquipoPublico(
  equipoId: string,
  anio: number,
  mes: number,
): Promise<ResultadoCalendarioEquipoPublico> {
  const id = equipoId.trim();

  if (!validarUuid(id)) {
    throw new Error(
      "El identificador del equipo no es válido.",
    );
  }

  if (
    !Number.isInteger(anio) ||
    anio < 2020 ||
    anio > 2100
  ) {
    throw new Error(
      "El año solicitado no es válido.",
    );
  }

  if (
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    throw new Error(
      "El mes solicitado no es válido.",
    );
  }

  const {
    data: equipoEncontrado,
    error: errorEquipo,
  } = await supabaseServidor
    .from("equipos")
    .select(
      "id, temporada_id, id_equipo_fbib",
    )
    .eq("id", id)
    .eq("activo", true)
    .maybeSingle();

  if (errorEquipo) {
    throw new Error(
      `No se ha podido obtener el equipo: ${errorEquipo.message}`,
    );
  }

  if (!equipoEncontrado) {
    throw new Error(
      "El equipo no existe o no está disponible.",
    );
  }

  const equipo =
    equipoEncontrado as FilaEquipo;

  const rango =
    obtenerRangoMes(anio, mes);

  const [
    resultadoEntrenamientos,
    resultadoExcepciones,
  ] = await Promise.all([
    supabaseServidor
      .from("entrenamientos")
      .select(`
        id,
        instalacion_id,
        dia_semana,
        hora_inicio,
        hora_fin,
        fecha_inicio,
        fecha_fin,
        observaciones,
        activo
      `)
      .eq("equipo_id", id)
      .eq(
        "temporada_id",
        equipo.temporada_id,
      )
      .eq("activo", true),

    supabaseServidor
      .from(
        "excepciones_entrenamientos",
      )
      .select(`
        id,
        entrenamiento_id,
        instalacion_id,
        tipo,
        fecha,
        hora_inicio,
        hora_fin,
        motivo
      `)
      .eq("equipo_id", id)
      .gte("fecha", rango.inicio)
      .lte("fecha", rango.fin)
      .order("fecha", {
        ascending: true,
      }),
  ]);

  if (resultadoEntrenamientos.error) {
    throw new Error(
      `No se han podido obtener los entrenamientos: ${resultadoEntrenamientos.error.message}`,
    );
  }

  if (resultadoExcepciones.error) {
    throw new Error(
      `No se han podido obtener las excepciones: ${resultadoExcepciones.error.message}`,
    );
  }

  const entrenamientos =
    (resultadoEntrenamientos.data ??
      []) as FilaEntrenamiento[];

  const excepciones =
    (resultadoExcepciones.data ??
      []) as FilaExcepcion[];

  const ocurrencias =
    aplicarExcepciones(
      generarEntrenamientosHabituales(
        entrenamientos,
        rango.inicio,
        rango.fin,
      ),
      entrenamientos,
      excepciones,
    );

  const idsInstalaciones =
    Array.from(
      new Set(
        ocurrencias
          .map(
            (ocurrencia) =>
              ocurrencia.instalacionId,
          )
          .filter(
            (instalacionId):
              instalacionId is string =>
                Boolean(
                  instalacionId,
                ),
          ),
      ),
    );

  let instalaciones:
    FilaInstalacion[] = [];

  if (
    idsInstalaciones.length > 0
  ) {
    const {
      data,
      error,
    } = await supabaseServidor
      .from("instalaciones")
      .select(
        "id, nombre, nombre_corto",
      )
      .in(
        "id",
        idsInstalaciones,
      );

    if (error) {
      throw new Error(
        `No se han podido obtener las instalaciones: ${error.message}`,
      );
    }

    instalaciones =
      (data ??
        []) as FilaInstalacion[];
  }

  let partidos:
    PartidoEquipoFbib[] = [];

  if (equipo.id_equipo_fbib) {
    try {
      partidos =
        await obtenerPartidosMesEquipoFbib(
          equipo.id_equipo_fbib,
          mes,
        );

      partidos = partidos.filter(
        (partido) =>
          partido.fecha !== null &&
          partido.fecha >=
            rango.inicio &&
          partido.fecha <= rango.fin,
      );
    } catch (error) {
      console.error(
        `Error cargando los partidos FBIB del equipo ${id}:`,
        error,
      );
    }
  }

  const instalacionesPorId =
    new Map(
      instalaciones.map(
        (instalacion) => [
          instalacion.id,
          instalacion,
        ],
      ),
    );

  const eventosEntrenamientos =
    ocurrencias.map(
      (entrenamiento) =>
        convertirEntrenamientoEvento(
          entrenamiento,
          instalacionesPorId,
        ),
    );

  const eventosPartidos =
    partidos.flatMap<
      EventoCalendarioEquipoPublico
    >((partido) => {
      const evento =
        convertirPartidoEvento(
          partido,
        );

      return evento ? [evento] : [];
    });

  const eventos = [
    ...eventosEntrenamientos,
    ...eventosPartidos,
  ].sort((primero, segundo) => {
    const fecha =
      primero.fecha.localeCompare(
        segundo.fecha,
      );

    if (fecha !== 0) {
      return fecha;
    }

    return (
      primero.horaInicio ?? ""
    ).localeCompare(
      segundo.horaInicio ?? "",
    );
  });

  return {
    anio,
    mes,
    eventos,
    partidos,
  };
}