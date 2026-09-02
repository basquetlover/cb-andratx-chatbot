import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  convertirFilasResumenEventosPanel,
} from "./convertirFilaEventoPanel";

import type {
  FiltrosListadoEventos,
  ResultadoListadoEventosPanel,
  ResumenEventoPanel,
  ResumenListadoEventosPanel,
  TemporadaEventoPanel,
} from "@tipos/EventoPanel";

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

export class ErrorObtenerListadoEventosPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerListadoEventosPanel";

    this.status =
      status;
  }
}

function obtenerFechaMadrid():
  string {
  const partes =
    new Intl.DateTimeFormat(
      "es-ES",
      {
        timeZone:
          "Europe/Madrid",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const obtenerParte = (
    tipo:
      Intl.DateTimeFormatPartTypes,
  ): string => {
    return (
      partes.find(
        (parte) =>
          parte.type ===
          tipo,
      )?.value ??
      ""
    );
  };

  return (
    `${obtenerParte("year")}-` +
    `${obtenerParte("month")}-` +
    obtenerParte("day")
  );
}

function normalizarTexto(
  valor: string,
): string {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

function coincideConsulta(
  evento:
    ResumenEventoPanel,

  consulta:
    string,
): boolean {
  if (!consulta) {
    return true;
  }

  const consultaNormalizada =
    normalizarTexto(
      consulta,
    );

  const contenido =
    normalizarTexto(
      [
        evento.titulo,
        evento.descripcionCorta,
        evento.tipo,
        evento.alcance,
        evento.estado,
        evento.ubicacion,
        ...evento.equipos.map(
          (equipo) =>
            [
              equipo.nombre,
              equipo.nombreCorto,
              equipo.categoria,
              equipo.genero,
            ]
              .filter(Boolean)
              .join(" "),
        ),
      ]
        .filter(Boolean)
        .join(" "),
    );

  return contenido.includes(
    consultaNormalizada,
  );
}

function aplicarFiltros(
  eventos:
    ResumenEventoPanel[],

  filtros:
    FiltrosListadoEventos,
): ResumenEventoPanel[] {
  const consulta =
    filtros.consulta?.trim() ??
    "";

  const fechaInicio =
    filtros.fechaInicio?.trim() ??
    "";

  const fechaFin =
    filtros.fechaFin?.trim() ??
    "";

  return eventos.filter(
    (evento) => {
      if (
        filtros.estado &&
        filtros.estado !==
          "todos" &&
        evento.estado !==
          filtros.estado
      ) {
        return false;
      }

      if (
        filtros.tipo &&
        filtros.tipo !==
          "todos" &&
        evento.tipo !==
          filtros.tipo
      ) {
        return false;
      }

      if (
        filtros.alcance &&
        filtros.alcance !==
          "todos" &&
        evento.alcance !==
          filtros.alcance
      ) {
        return false;
      }

      /*
       * Un evento coincide con el
       * periodo cuando existe algún
       * solapamiento entre ambos.
       */
      if (
        fechaInicio &&
        evento.fechaFin <
          fechaInicio
      ) {
        return false;
      }

      if (
        fechaFin &&
        evento.fechaInicio >
          fechaFin
      ) {
        return false;
      }

      return coincideConsulta(
        evento,
        consulta,
      );
    },
  );
}

function ordenarEventos(
  eventos:
    ResumenEventoPanel[],

  hoy:
    string,
): ResumenEventoPanel[] {
  return [...eventos].sort(
    (
      eventoA,
      eventoB,
    ) => {
      const obtenerGrupo = (
        evento:
          ResumenEventoPanel,
      ): number => {
        if (
          evento.fechaInicio <=
            hoy &&
          evento.fechaFin >=
            hoy
        ) {
          return 0;
        }

        if (
          evento.fechaInicio >
          hoy
        ) {
          return 1;
        }

        return 2;
      };

      const grupoA =
        obtenerGrupo(
          eventoA,
        );

      const grupoB =
        obtenerGrupo(
          eventoB,
        );

      if (
        grupoA !== grupoB
      ) {
        return (
          grupoA -
          grupoB
        );
      }

      /*
       * Los eventos pasados se
       * muestran del más reciente
       * al más antiguo.
       */
      if (
        grupoA === 2
      ) {
        return (
          eventoB.fechaInicio.localeCompare(
            eventoA.fechaInicio,
          ) ||
          eventoA.titulo.localeCompare(
            eventoB.titulo,
            "es",
          )
        );
      }

      /*
       * Eventos actuales y próximos:
       * del más cercano al más lejano.
       */
      return (
        eventoA.fechaInicio.localeCompare(
          eventoB.fechaInicio,
        ) ||
        (
          eventoA.horaInicio ||
          "23:59"
        ).localeCompare(
          eventoB.horaInicio ||
          "23:59",
        ) ||
        eventoA.titulo.localeCompare(
          eventoB.titulo,
          "es",
        )
      );
    },
  );
}

function crearResumen(
  eventos:
    ResumenEventoPanel[],

  hoy:
    string,
): ResumenListadoEventosPanel {
  return {
    total:
      eventos.length,

    borradores:
      eventos.filter(
        (evento) =>
          evento.estado ===
          "borrador",
      ).length,

    publicados:
      eventos.filter(
        (evento) =>
          evento.estado ===
          "publicado",
      ).length,

    cancelados:
      eventos.filter(
        (evento) =>
          evento.estado ===
          "cancelado",
      ).length,

    archivados:
      eventos.filter(
        (evento) =>
          evento.estado ===
          "archivado",
      ).length,

    proximos:
      eventos.filter(
        (evento) =>
          evento.fechaInicio >
          hoy,
      ).length,

    enCurso:
      eventos.filter(
        (evento) =>
          evento.fechaInicio <=
            hoy &&
          evento.fechaFin >=
            hoy,
      ).length,

    finalizados:
      eventos.filter(
        (evento) =>
          evento.fechaFin <
          hoy,
      ).length,
  };
}

async function obtenerTemporadaActiva():
  Promise<TemporadaEventoPanel | null> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("temporadas")
      .select(
        "id, nombre",
      )
      .eq(
        "activa",
        true,
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorObtenerListadoEventosPanel(
      `No se ha podido obtener la temporada activa: ${error.message}`,
      500,
    );
  }

  const temporada =
    data as
      | FilaTemporada
      | null;

  if (!temporada?.id) {
    return null;
  }

  return {
    id:
      temporada.id,

    nombre:
      temporada.nombre,
  };
}

export async function obtenerListadoEventosPanel(
  filtros:
    FiltrosListadoEventos = {},
): Promise<ResultadoListadoEventosPanel> {
  const temporada =
    await obtenerTemporadaActiva();

  let consulta =
    supabaseServidor
      .from("eventos")
      .select(`
        id,
        temporada_id,
        titulo,
        descripcion_corta,
        descripcion,
        tipo,
        alcance,
        fecha_inicio,
        fecha_fin,
        hora_inicio,
        hora_fin,
        todo_el_dia,
        instalacion_id,
        ubicacion,
        direccion,
        imagen,
        banner_notificacion,
        url_informacion,
        url_inscripcion,
        requiere_inscripcion,
        destacado,
        mostrar_calendario,
        estado,
        creado_por,
        actualizado_por,
        publicado_at,
        created_at,
        updated_at,
        eventos_equipos (
          equipo:equipos (
            id,
            nombre,
            nombre_corto,
            imagen,
            categoria,
            genero
          )
        )
      `);

  /*
   * Se incluyen:
   *
   * - eventos de la temporada activa;
   * - eventos sin temporada asignada.
   */
  if (temporada?.id) {
    consulta =
      consulta.or(
        `temporada_id.eq.${temporada.id},temporada_id.is.null`,
      );
  } else {
    consulta =
      consulta.is(
        "temporada_id",
        null,
      );
  }

  const {
    data,
    error,
  } =
    await consulta.order(
      "fecha_inicio",
      {
        ascending: true,
      },
    );

  if (error) {
    throw new ErrorObtenerListadoEventosPanel(
      `No se ha podido obtener el listado de eventos: ${error.message}`,
      500,
    );
  }

  let eventos:
    ResumenEventoPanel[];

  try {
    eventos =
      convertirFilasResumenEventosPanel(
        data ?? [],
      );
  } catch (error) {
    console.error(
      "Error convirtiendo el listado de eventos:",
      error,
    );

    throw new ErrorObtenerListadoEventosPanel(
      "Los datos guardados de uno o varios eventos no son válidos.",
      500,
    );
  }

  const hoy =
    obtenerFechaMadrid();

  const eventosFiltrados =
    aplicarFiltros(
      eventos,
      filtros,
    );

  const eventosOrdenados =
    ordenarEventos(
      eventosFiltrados,
      hoy,
    );

  return {
    temporada,

    resumen:
      crearResumen(
        eventosOrdenados,
        hoy,
      ),

    eventos:
      eventosOrdenados,
  };
}