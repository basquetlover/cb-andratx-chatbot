import {
  ALCANCES_EVENTO,
  ESTADOS_EVENTO,
  TIPOS_EVENTO,
} from "@tipos/EventoPanel";

import type {
  AlcanceEvento,
  CrearEventoPanel,
  ErrorCampoEvento,
  EstadoEvento,
  TipoEvento,
} from "@tipos/EventoPanel";

export interface ResultadoValidacionEvento {
  valido: boolean;
  datos: CrearEventoPanel | null;
  errores: ErrorCampoEvento[];
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

function convertirTexto(
  valor: unknown,
): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
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

function esUuid(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function esFechaIsoValida(
  valor: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      valor,
    )
  ) {
    return false;
  }

  const [
    anioTexto,
    mesTexto,
    diaTexto,
  ] = valor.split("-");

  const anio =
    Number(anioTexto);

  const mes =
    Number(mesTexto);

  const dia =
    Number(diaTexto);

  const fecha =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia,
      ),
    );

  return (
    fecha.getUTCFullYear() ===
      anio &&
    fecha.getUTCMonth() ===
      mes - 1 &&
    fecha.getUTCDate() ===
      dia
  );
}

function normalizarHora(
  valor: unknown,
): string {
  const hora =
    convertirTexto(valor);

  if (!hora) {
    return "";
  }

  const coincidencia =
    hora.match(
      /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/,
    );

  if (!coincidencia) {
    return hora;
  }

  return (
    `${coincidencia[1]}:` +
    coincidencia[2]
  );
}

function esHoraValida(
  valor: string,
): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
    valor,
  );
}

function esUrlValida(
  valor: string,
): boolean {
  if (!valor) {
    return true;
  }

  try {
    const url =
      new URL(valor);

    return (
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
    );
  } catch {
    return false;
  }
}

function esRecursoValido(
  valor: string,
): boolean {
  if (!valor) {
    return true;
  }

  if (
    valor.startsWith("/")
  ) {
    return true;
  }

  return esUrlValida(valor);
}

function esTipoEvento(
  valor: string,
): valor is TipoEvento {
  return (
    TIPOS_EVENTO as
      readonly string[]
  ).includes(valor);
}

function esAlcanceEvento(
  valor: string,
): valor is AlcanceEvento {
  return (
    ALCANCES_EVENTO as
      readonly string[]
  ).includes(valor);
}

function esEstadoEvento(
  valor: string,
): valor is EstadoEvento {
  return (
    ESTADOS_EVENTO as
      readonly string[]
  ).includes(valor);
}

function convertirEquiposIds(
  valor: unknown,
): string[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  const identificadores =
    valor
      .map(convertirTexto)
      .filter(Boolean);

  return Array.from(
    new Set(identificadores),
  );
}

function anadirError(
  errores: ErrorCampoEvento[],
  campo: string,
  mensaje: string,
): void {
  errores.push({
    campo,
    mensaje,
  });
}

export function validarEventoPanel(
  contenido: unknown,
): ResultadoValidacionEvento {
  if (!esObjeto(contenido)) {
    return {
      valido: false,
      datos: null,
      errores: [
        {
          campo: "general",
          mensaje:
            "Los datos del evento no son válidos.",
        },
      ],
    };
  }

  const errores:
    ErrorCampoEvento[] = [];

  const temporadaId =
    convertirTextoNullable(
      contenido.temporadaId,
    );

  const titulo =
    convertirTexto(
      contenido.titulo,
    );

  const descripcionCorta =
    convertirTexto(
      contenido.descripcionCorta,
    );

  const descripcion =
    convertirTexto(
      contenido.descripcion,
    );

  const tipoRecibido =
    convertirTexto(
      contenido.tipo,
    );

  const alcanceRecibido =
    convertirTexto(
      contenido.alcance,
    );

  const estadoRecibido =
    convertirTexto(
      contenido.estado,
    );

  const fechaInicio =
    convertirTexto(
      contenido.fechaInicio,
    );

  const fechaFin =
    convertirTexto(
      contenido.fechaFin,
    );

  const todoElDia =
    convertirBooleano(
      contenido.todoElDia,
    );

  let horaInicio =
    normalizarHora(
      contenido.horaInicio,
    );

  let horaFin =
    normalizarHora(
      contenido.horaFin,
    );

  const instalacionId =
    convertirTextoNullable(
      contenido.instalacionId,
    );

  const ubicacion =
    convertirTexto(
      contenido.ubicacion,
    );

  const direccion =
    convertirTexto(
      contenido.direccion,
    );

  const imagen =
    convertirTextoNullable(
      contenido.imagen,
    );

  const bannerNotificacion =
    convertirTextoNullable(
      contenido.bannerNotificacion,
    );

  const urlInformacion =
    convertirTexto(
      contenido.urlInformacion,
    );

  const urlInscripcion =
    convertirTexto(
      contenido.urlInscripcion,
    );

  const requiereInscripcion =
    convertirBooleano(
      contenido.requiereInscripcion,
    );

  const destacado =
    convertirBooleano(
      contenido.destacado,
    );

  const mostrarCalendario =
    convertirBooleano(
      contenido.mostrarCalendario,
      true,
    );

  let equiposIds =
    convertirEquiposIds(
      contenido.equiposIds,
    );

  if (
    temporadaId &&
    !esUuid(temporadaId)
  ) {
    anadirError(
      errores,
      "temporadaId",
      "La temporada seleccionada no es válida.",
    );
  }

  if (!titulo) {
    anadirError(
      errores,
      "titulo",
      "El título del evento es obligatorio.",
    );
  } else if (
    titulo.length > 150
  ) {
    anadirError(
      errores,
      "titulo",
      "El título no puede superar los 150 caracteres.",
    );
  }

  if (
    descripcionCorta.length >
    300
  ) {
    anadirError(
      errores,
      "descripcionCorta",
      "La descripción corta no puede superar los 300 caracteres.",
    );
  }

  if (
    descripcion.length >
    10000
  ) {
    anadirError(
      errores,
      "descripcion",
      "La descripción no puede superar los 10.000 caracteres.",
    );
  }

  if (
    !esTipoEvento(
      tipoRecibido,
    )
  ) {
    anadirError(
      errores,
      "tipo",
      "El tipo de evento seleccionado no es válido.",
    );
  }

  if (
    !esAlcanceEvento(
      alcanceRecibido,
    )
  ) {
    anadirError(
      errores,
      "alcance",
      "El alcance del evento no es válido.",
    );
  }

  if (
    !esEstadoEvento(
      estadoRecibido,
    )
  ) {
    anadirError(
      errores,
      "estado",
      "El estado del evento no es válido.",
    );
  }

  if (
    !esFechaIsoValida(
      fechaInicio,
    )
  ) {
    anadirError(
      errores,
      "fechaInicio",
      "La fecha de inicio no es válida.",
    );
  }

  if (
    !esFechaIsoValida(
      fechaFin,
    )
  ) {
    anadirError(
      errores,
      "fechaFin",
      "La fecha de finalización no es válida.",
    );
  }

  if (
    esFechaIsoValida(
      fechaInicio,
    ) &&
    esFechaIsoValida(
      fechaFin,
    ) &&
    fechaFin < fechaInicio
  ) {
    anadirError(
      errores,
      "fechaFin",
      "La fecha de finalización no puede ser anterior a la fecha de inicio.",
    );
  }

  if (todoElDia) {
    horaInicio = "";
    horaFin = "";
  } else {
    if (!horaInicio) {
      anadirError(
        errores,
        "horaInicio",
        "Debes indicar la hora de inicio o marcar el evento como todo el día.",
      );
    } else if (
      !esHoraValida(
        horaInicio,
      )
    ) {
      anadirError(
        errores,
        "horaInicio",
        "La hora de inicio no es válida.",
      );
    }

    if (
      horaFin &&
      !esHoraValida(
        horaFin,
      )
    ) {
      anadirError(
        errores,
        "horaFin",
        "La hora de finalización no es válida.",
      );
    }

    if (
      fechaInicio === fechaFin &&
      esHoraValida(horaInicio) &&
      esHoraValida(horaFin) &&
      horaFin <= horaInicio
    ) {
      anadirError(
        errores,
        "horaFin",
        "La hora de finalización debe ser posterior a la hora de inicio.",
      );
    }
  }

  if (
    instalacionId &&
    instalacionId.length > 150
  ) {
    anadirError(
      errores,
      "instalacionId",
      "La instalación seleccionada no es válida.",
    );
  }

  if (
    ubicacion.length > 200
  ) {
    anadirError(
      errores,
      "ubicacion",
      "La ubicación no puede superar los 200 caracteres.",
    );
  }

  if (
    direccion.length > 300
  ) {
    anadirError(
      errores,
      "direccion",
      "La dirección no puede superar los 300 caracteres.",
    );
  }

  if (
    imagen &&
    !esRecursoValido(imagen)
  ) {
    anadirError(
      errores,
      "imagen",
      "La imagen del evento no es válida.",
    );
  }

  if (
    imagen &&
    imagen.length > 2000
  ) {
    anadirError(
      errores,
      "imagen",
      "La dirección de la imagen es demasiado larga.",
    );
  }

  if (
    bannerNotificacion &&
    !esRecursoValido(
      bannerNotificacion,
    )
  ) {
    anadirError(
      errores,
      "bannerNotificacion",
      "El banner para notificaciones no es válido.",
    );
  }

  if (
    bannerNotificacion &&
    bannerNotificacion.length >
      2000
  ) {
    anadirError(
      errores,
      "bannerNotificacion",
      "La dirección del banner es demasiado larga.",
    );
  }

  if (
    urlInformacion &&
    !esUrlValida(
      urlInformacion,
    )
  ) {
    anadirError(
      errores,
      "urlInformacion",
      "El enlace de información no es válido.",
    );
  }

  if (
    urlInformacion.length >
    2000
  ) {
    anadirError(
      errores,
      "urlInformacion",
      "El enlace de información es demasiado largo.",
    );
  }

  if (
    urlInscripcion &&
    !esUrlValida(
      urlInscripcion,
    )
  ) {
    anadirError(
      errores,
      "urlInscripcion",
      "El enlace de inscripción no es válido.",
    );
  }

  if (
    urlInscripcion.length >
    2000
  ) {
    anadirError(
      errores,
      "urlInscripcion",
      "El enlace de inscripción es demasiado largo.",
    );
  }

  if (
    requiereInscripcion &&
    !urlInscripcion
  ) {
    anadirError(
      errores,
      "urlInscripcion",
      "Debes indicar el enlace de inscripción.",
    );
  }

  equiposIds.forEach(
    (equipoId, indice) => {
      if (!esUuid(equipoId)) {
        anadirError(
          errores,
          `equiposIds.${indice}`,
          "Uno de los equipos seleccionados no es válido.",
        );
      }
    },
  );

  if (
    alcanceRecibido ===
      "equipos" &&
    equiposIds.length === 0
  ) {
    anadirError(
      errores,
      "equiposIds",
      "Debes seleccionar al menos un equipo.",
    );
  }

  if (
    alcanceRecibido ===
    "todo-club"
  ) {
    equiposIds = [];
  }

  if (
    errores.length > 0
  ) {
    return {
      valido: false,
      datos: null,
      errores,
    };
  }

  return {
    valido: true,

    datos: {
      temporadaId,

      titulo,
      descripcionCorta,
      descripcion,

      tipo:
        tipoRecibido as
          TipoEvento,

      alcance:
        alcanceRecibido as
          AlcanceEvento,

      fechaInicio,
      fechaFin,

      horaInicio,
      horaFin,
      todoElDia,

      instalacionId,
      ubicacion,
      direccion,

      imagen,
      bannerNotificacion,

      urlInformacion,
      urlInscripcion,
      requiereInscripcion,

      destacado,
      mostrarCalendario,

      estado:
        estadoRecibido as
          EstadoEvento,

      equiposIds,
    },

    errores: [],
  };
}