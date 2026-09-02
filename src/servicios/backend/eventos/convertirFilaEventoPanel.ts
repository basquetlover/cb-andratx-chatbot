import {
  ALCANCES_EVENTO,
  ESTADOS_EVENTO,
  TIPOS_EVENTO,
} from "@tipos/EventoPanel";

import type {
  AlcanceEvento,
  EquipoEventoPanel,
  EstadoEvento,
  EventoPanel,
  ResumenEventoPanel,
  TipoEvento,
} from "@tipos/EventoPanel";

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function convertirTexto(
  valor: unknown,
): string {
  if (
    typeof valor === "string" ||
    typeof valor === "number"
  ) {
    return String(valor).trim();
  }

  return "";
}

function convertirTextoNullable(
  valor: unknown,
): string | null {
  const texto =
    convertirTexto(valor);

  return texto || null;
}

function convertirBooleano(
  valor: unknown,
  valorPredeterminado = false,
): boolean {
  return typeof valor === "boolean"
    ? valor
    : valorPredeterminado;
}

function convertirHora(
  valor: unknown,
): string {
  const hora =
    convertirTexto(valor);

  if (!hora) {
    return "";
  }

  const coincidencia =
    hora.match(
      /^([01]\d|2[0-3]):([0-5]\d)/,
    );

  if (!coincidencia) {
    return hora;
  }

  return (
    `${coincidencia[1]}:` +
    coincidencia[2]
  );
}

function convertirTipoEvento(
  valor: unknown,
): TipoEvento {
  const tipo =
    convertirTexto(valor);

  if (
    (
      TIPOS_EVENTO as
        readonly string[]
    ).includes(tipo)
  ) {
    return tipo as TipoEvento;
  }

  return "evento";
}

function convertirAlcanceEvento(
  valor: unknown,
): AlcanceEvento {
  const alcance =
    convertirTexto(valor);

  if (
    (
      ALCANCES_EVENTO as
        readonly string[]
    ).includes(alcance)
  ) {
    return alcance as AlcanceEvento;
  }

  return "todo-club";
}

function convertirEstadoEvento(
  valor: unknown,
): EstadoEvento {
  const estado =
    convertirTexto(valor);

  if (
    (
      ESTADOS_EVENTO as
        readonly string[]
    ).includes(estado)
  ) {
    return estado as EstadoEvento;
  }

  return "borrador";
}

function obtenerEquipoRelacion(
  valor: unknown,
): Record<string, unknown> | null {
  if (!esObjeto(valor)) {
    return null;
  }

  if (
    esObjeto(valor.equipo)
  ) {
    return valor.equipo;
  }

  if (
    esObjeto(valor.equipos)
  ) {
    return valor.equipos;
  }

  if (
    convertirTexto(valor.id)
  ) {
    return valor;
  }

  return null;
}

function convertirEquipo(
  valor: unknown,
): EquipoEventoPanel | null {
  const fila =
    obtenerEquipoRelacion(
      valor,
    );

  if (!fila) {
    return null;
  }

  const id =
    convertirTexto(
      fila.id,
    );

  if (!id) {
    return null;
  }

  const nombre =
    convertirTexto(
      fila.nombre,
    );

  const nombreCorto =
    convertirTextoNullable(
      fila.nombre_corto ??
        fila.nombreCorto,
    );

  return {
    id,

    nombre:
      nombre ||
      nombreCorto ||
      "Equipo sin nombre",

    nombreCorto,

    imagen:
      convertirTextoNullable(
        fila.imagen,
      ),

    categoria:
      convertirTextoNullable(
        fila.categoria,
      ),

    genero:
      convertirTextoNullable(
        fila.genero,
      ),
  };
}

function extraerEquipos(
  valor: unknown,
): EquipoEventoPanel[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  const equipos =
    valor.flatMap(
      (elemento) => {
        const equipo =
          convertirEquipo(
            elemento,
          );

        return equipo
          ? [equipo]
          : [];
      },
    );

  const equiposPorId =
    new Map<
      string,
      EquipoEventoPanel
    >();

  equipos.forEach(
    (equipo) => {
      if (
        !equiposPorId.has(
          equipo.id,
        )
      ) {
        equiposPorId.set(
          equipo.id,
          equipo,
        );
      }
    },
  );

  return Array.from(
    equiposPorId.values(),
  ).sort(
    (equipoA, equipoB) => {
      const categoriaA =
        equipoA.categoria ?? "";

      const categoriaB =
        equipoB.categoria ?? "";

      const generoA =
        equipoA.genero ?? "";

      const generoB =
        equipoB.genero ?? "";

      return (
        categoriaA.localeCompare(
          categoriaB,
          "es",
          {
            sensitivity:
              "base",
          },
        ) ||
        generoA.localeCompare(
          generoB,
          "es",
          {
            sensitivity:
              "base",
          },
        ) ||
        equipoA.nombre.localeCompare(
          equipoB.nombre,
          "es",
          {
            sensitivity:
              "base",
          },
        )
      );
    },
  );
}

function obtenerRelacionesEquipos(
  fila: Record<string, unknown>,
): unknown {
  return (
    fila.eventos_equipos ??
    fila.equipos_eventos ??
    fila.equipos ??
    []
  );
}

export function convertirFilaEventoPanel(
  valor: unknown,
): EventoPanel {
  if (!esObjeto(valor)) {
    throw new Error(
      "La fila del evento no es válida.",
    );
  }

  const id =
    convertirTexto(
      valor.id,
    );

  if (!id) {
    throw new Error(
      "El evento no tiene un identificador válido.",
    );
  }

  const fechaInicio =
    convertirTexto(
      valor.fecha_inicio ??
        valor.fechaInicio,
    );

  const fechaFin =
    convertirTexto(
      valor.fecha_fin ??
        valor.fechaFin,
    );

  const equipos =
    extraerEquipos(
      obtenerRelacionesEquipos(
        valor,
      ),
    );

  return {
    id,

    temporadaId:
      convertirTextoNullable(
        valor.temporada_id ??
          valor.temporadaId,
      ),

    titulo:
      convertirTexto(
        valor.titulo,
      ) ||
      "Evento sin título",

    descripcionCorta:
      convertirTexto(
        valor.descripcion_corta ??
          valor.descripcionCorta,
      ),

    descripcion:
      convertirTexto(
        valor.descripcion,
      ),

    tipo:
      convertirTipoEvento(
        valor.tipo,
      ),

    alcance:
      convertirAlcanceEvento(
        valor.alcance,
      ),

    fechaInicio,

    fechaFin:
      fechaFin ||
      fechaInicio,

    horaInicio:
      convertirHora(
        valor.hora_inicio ??
          valor.horaInicio,
      ),

    horaFin:
      convertirHora(
        valor.hora_fin ??
          valor.horaFin,
      ),

    todoElDia:
      convertirBooleano(
        valor.todo_el_dia ??
          valor.todoElDia,
      ),

    instalacionId:
      convertirTextoNullable(
        valor.instalacion_id ??
          valor.instalacionId,
      ),

    ubicacion:
      convertirTexto(
        valor.ubicacion,
      ),

    direccion:
      convertirTexto(
        valor.direccion,
      ),

    imagen:
      convertirTextoNullable(
        valor.imagen,
      ),

    bannerNotificacion:
      convertirTextoNullable(
        valor.banner_notificacion ??
          valor.bannerNotificacion,
      ),

    urlInformacion:
      convertirTexto(
        valor.url_informacion ??
          valor.urlInformacion,
      ),

    urlInscripcion:
      convertirTexto(
        valor.url_inscripcion ??
          valor.urlInscripcion,
      ),

    requiereInscripcion:
      convertirBooleano(
        valor.requiere_inscripcion ??
          valor.requiereInscripcion,
      ),

    destacado:
      convertirBooleano(
        valor.destacado,
      ),

    mostrarCalendario:
      convertirBooleano(
        valor.mostrar_calendario ??
          valor.mostrarCalendario,
        true,
      ),

    estado:
      convertirEstadoEvento(
        valor.estado,
      ),

    equipos,

    creadoPor:
      convertirTextoNullable(
        valor.creado_por ??
          valor.creadoPor,
      ),

    actualizadoPor:
      convertirTextoNullable(
        valor.actualizado_por ??
          valor.actualizadoPor,
      ),

    publicadoAt:
      convertirTextoNullable(
        valor.publicado_at ??
          valor.publicadoAt,
      ),

    createdAt:
      convertirTexto(
        valor.created_at ??
          valor.createdAt,
      ),

    updatedAt:
      convertirTexto(
        valor.updated_at ??
          valor.updatedAt,
      ),
  };
}

export function convertirFilaResumenEventoPanel(
  valor: unknown,
): ResumenEventoPanel {
  const evento =
    convertirFilaEventoPanel(
      valor,
    );

  return {
    id:
      evento.id,

    titulo:
      evento.titulo,

    descripcionCorta:
      evento.descripcionCorta,

    tipo:
      evento.tipo,

    alcance:
      evento.alcance,

    estado:
      evento.estado,

    fechaInicio:
      evento.fechaInicio,

    fechaFin:
      evento.fechaFin,

    horaInicio:
      evento.horaInicio,

    horaFin:
      evento.horaFin,

    todoElDia:
      evento.todoElDia,

    ubicacion:
      evento.ubicacion,

    imagen:
      evento.imagen,

    bannerNotificacion:
      evento.bannerNotificacion,

    destacado:
      evento.destacado,

    mostrarCalendario:
      evento.mostrarCalendario,

    totalEquipos:
      evento.equipos.length,

    equipos:
      evento.equipos,

    createdAt:
      evento.createdAt,

    updatedAt:
      evento.updatedAt,
  };
}

export function convertirFilasEventosPanel(
  valores: unknown,
): EventoPanel[] {
  if (!Array.isArray(valores)) {
    return [];
  }

  return valores.map(
    convertirFilaEventoPanel,
  );
}

export function convertirFilasResumenEventosPanel(
  valores: unknown,
): ResumenEventoPanel[] {
  if (!Array.isArray(valores)) {
    return [];
  }

  return valores.map(
    convertirFilaResumenEventoPanel,
  );
}