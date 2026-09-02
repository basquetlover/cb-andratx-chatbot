import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  obtenerEventoPanel,
  ErrorObtenerEventoPanel,
} from "./obtenerEventoPanel";

import {
  validarEventoPanel,
} from "./validarEventoPanel";

import type {
  CrearEventoPanel,
  ErrorCampoEvento,
  EventoPanel,
} from "@tipos/EventoPanel";

interface FilaTemporada {
  id: string;
}

interface FilaEquipo {
  id: string;
}

interface FilaActualizada {
  id: string;
}

export class ErrorActualizarEventoPanel
  extends Error {
  status: number;
  errores: ErrorCampoEvento[];

  constructor(
    mensaje: string,
    status: number,
    errores: ErrorCampoEvento[] = [],
  ) {
    super(mensaje);

    this.name =
      "ErrorActualizarEventoPanel";

    this.status =
      status;

    this.errores =
      errores;
  }
}

function esUuid(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

async function obtenerTemporadaId(
  temporadaId: string | null,
): Promise<string | null> {
  if (temporadaId) {
    const {
      data,
      error,
    } =
      await supabaseServidor
        .from("temporadas")
        .select("id")
        .eq(
          "id",
          temporadaId,
        )
        .maybeSingle();

    if (error) {
      throw new ErrorActualizarEventoPanel(
        `No se ha podido comprobar la temporada: ${error.message}`,
        500,
      );
    }

    const temporada =
      data as
        | FilaTemporada
        | null;

    if (!temporada?.id) {
      throw new ErrorActualizarEventoPanel(
        "La temporada seleccionada no existe.",
        400,
        [
          {
            campo:
              "temporadaId",

            mensaje:
              "La temporada seleccionada no existe.",
          },
        ],
      );
    }

    return temporada.id;
  }

  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("temporadas")
      .select("id")
      .eq(
        "activa",
        true,
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorActualizarEventoPanel(
      `No se ha podido obtener la temporada activa: ${error.message}`,
      500,
    );
  }

  const temporada =
    data as
      | FilaTemporada
      | null;

  return temporada?.id ?? null;
}

async function comprobarEquipos(
  equiposIds: string[],
  temporadaId: string | null,
): Promise<void> {
  if (
    equiposIds.length === 0
  ) {
    return;
  }

  let consulta =
    supabaseServidor
      .from("equipos")
      .select("id")
      .in(
        "id",
        equiposIds,
      );

  if (temporadaId) {
    consulta =
      consulta.eq(
        "temporada_id",
        temporadaId,
      );
  }

  const {
    data,
    error,
  } =
    await consulta;

  if (error) {
    throw new ErrorActualizarEventoPanel(
      `No se han podido comprobar los equipos seleccionados: ${error.message}`,
      500,
    );
  }

  const filas =
    (
      data ?? []
    ) as FilaEquipo[];

  const idsEncontrados =
    new Set(
      filas.map(
        (equipo) =>
          equipo.id,
      ),
    );

  const faltaAlgunEquipo =
    equiposIds.some(
      (equipoId) =>
        !idsEncontrados.has(
          equipoId,
        ),
    );

  if (faltaAlgunEquipo) {
    throw new ErrorActualizarEventoPanel(
      "Uno o varios equipos seleccionados no existen o no pertenecen a la temporada.",
      400,
      [
        {
          campo:
            "equiposIds",

          mensaje:
            "Uno o varios equipos seleccionados no existen o no pertenecen a la temporada.",
        },
      ],
    );
  }
}

function crearFilaActualizacion(
  datos: CrearEventoPanel,
  temporadaId: string | null,
  usuarioId: string,
  publicadoAtAnterior: string | null,
  ahora: string,
) {
  return {
    temporada_id:
      temporadaId,

    titulo:
      datos.titulo,

    descripcion_corta:
      datos.descripcionCorta ||
      null,

    descripcion:
      datos.descripcion ||
      null,

    tipo:
      datos.tipo,

    alcance:
      datos.alcance,

    fecha_inicio:
      datos.fechaInicio,

    fecha_fin:
      datos.fechaFin,

    hora_inicio:
      datos.todoElDia
        ? null
        : datos.horaInicio ||
          null,

    hora_fin:
      datos.todoElDia
        ? null
        : datos.horaFin ||
          null,

    todo_el_dia:
      datos.todoElDia,

    instalacion_id:
      datos.instalacionId,

    ubicacion:
      datos.ubicacion ||
      null,

    direccion:
      datos.direccion ||
      null,

    imagen:
      datos.imagen,

    banner_notificacion:
      datos.bannerNotificacion,

    url_informacion:
      datos.urlInformacion ||
      null,

    url_inscripcion:
      datos.urlInscripcion ||
      null,

    requiere_inscripcion:
      datos.requiereInscripcion,

    destacado:
      datos.destacado,

    mostrar_calendario:
      datos.mostrarCalendario,

    estado:
      datos.estado,

    actualizado_por:
      usuarioId,

    publicado_at:
      datos.estado ===
      "publicado"
        ? publicadoAtAnterior ??
          ahora
        : publicadoAtAnterior,

    updated_at:
      ahora,
  };
}

function crearFilaRestauracion(
  evento: EventoPanel,
) {
  return {
    temporada_id:
      evento.temporadaId,

    titulo:
      evento.titulo,

    descripcion_corta:
      evento.descripcionCorta ||
      null,

    descripcion:
      evento.descripcion ||
      null,

    tipo:
      evento.tipo,

    alcance:
      evento.alcance,

    fecha_inicio:
      evento.fechaInicio,

    fecha_fin:
      evento.fechaFin,

    hora_inicio:
      evento.todoElDia
        ? null
        : evento.horaInicio ||
          null,

    hora_fin:
      evento.todoElDia
        ? null
        : evento.horaFin ||
          null,

    todo_el_dia:
      evento.todoElDia,

    instalacion_id:
      evento.instalacionId,

    ubicacion:
      evento.ubicacion ||
      null,

    direccion:
      evento.direccion ||
      null,

    imagen:
      evento.imagen,

    banner_notificacion:
      evento.bannerNotificacion,

    url_informacion:
      evento.urlInformacion ||
      null,

    url_inscripcion:
      evento.urlInscripcion ||
      null,

    requiere_inscripcion:
      evento.requiereInscripcion,

    destacado:
      evento.destacado,

    mostrar_calendario:
      evento.mostrarCalendario,

    estado:
      evento.estado,

    actualizado_por:
      evento.actualizadoPor,

    publicado_at:
      evento.publicadoAt,

    updated_at:
      evento.updatedAt,
  };
}

async function reemplazarRelacionesEquipos(
  eventoId: string,
  equiposIds: string[],
): Promise<void> {
  const {
    error:
      errorEliminando,
  } =
    await supabaseServidor
      .from(
        "eventos_equipos",
      )
      .delete()
      .eq(
        "evento_id",
        eventoId,
      );

  if (errorEliminando) {
    throw new Error(
      `No se han podido eliminar las asignaciones anteriores: ${errorEliminando.message}`,
    );
  }

  if (
    equiposIds.length === 0
  ) {
    return;
  }

  const relaciones =
    equiposIds.map(
      (equipoId) => ({
        evento_id:
          eventoId,

        equipo_id:
          equipoId,
      }),
    );

  const {
    error:
      errorInsertando,
  } =
    await supabaseServidor
      .from(
        "eventos_equipos",
      )
      .insert(
        relaciones,
      );

  if (errorInsertando) {
    throw new Error(
      `No se han podido guardar los equipos seleccionados: ${errorInsertando.message}`,
    );
  }
}

async function restaurarEventoAnterior(
  eventoAnterior: EventoPanel,
): Promise<void> {
  const {
    error:
      errorEvento,
  } =
    await supabaseServidor
      .from("eventos")
      .update(
        crearFilaRestauracion(
          eventoAnterior,
        ),
      )
      .eq(
        "id",
        eventoAnterior.id,
      );

  if (errorEvento) {
    console.error(
      `No se han podido restaurar los datos anteriores del evento ${eventoAnterior.id}:`,
      errorEvento,
    );
  }

  try {
    await reemplazarRelacionesEquipos(
      eventoAnterior.id,
      eventoAnterior.equipos.map(
        (equipo) =>
          equipo.id,
      ),
    );
  } catch (error) {
    console.error(
      `No se han podido restaurar los equipos anteriores del evento ${eventoAnterior.id}:`,
      error,
    );
  }
}

export async function actualizarEventoPanel(
  eventoId: string,
  contenido: unknown,
  usuarioId: string,
): Promise<EventoPanel> {
  const eventoIdLimpio =
    eventoId.trim();

  const usuarioIdLimpio =
    usuarioId.trim();

  if (
    !esUuid(
      eventoIdLimpio,
    )
  ) {
    throw new ErrorActualizarEventoPanel(
      "El identificador del evento no es válido.",
      400,
    );
  }

  if (
    !esUuid(
      usuarioIdLimpio,
    )
  ) {
    throw new ErrorActualizarEventoPanel(
      "El usuario que está actualizando el evento no es válido.",
      401,
    );
  }

  const validacion =
    validarEventoPanel(
      contenido,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorActualizarEventoPanel(
      "Hay campos del evento que deben corregirse.",
      400,
      validacion.errores,
    );
  }

  let eventoAnterior:
    EventoPanel;

  try {
    eventoAnterior =
      await obtenerEventoPanel(
        eventoIdLimpio,
      );
  } catch (error) {
    if (
      error instanceof
      ErrorObtenerEventoPanel
    ) {
      throw new ErrorActualizarEventoPanel(
        error.message,
        error.status,
      );
    }

    throw error;
  }

  const datos =
    validacion.datos;

  const temporadaId =
    await obtenerTemporadaId(
      datos.temporadaId,
    );

  await comprobarEquipos(
    datos.equiposIds,
    temporadaId,
  );

  const ahora =
    new Date().toISOString();

  const filaActualizacion =
    crearFilaActualizacion(
      datos,
      temporadaId,
      usuarioIdLimpio,
      eventoAnterior.publicadoAt,
      ahora,
    );

  const {
    data:
      filaActualizada,

    error:
      errorActualizacion,
  } =
    await supabaseServidor
      .from("eventos")
      .update(
        filaActualizacion,
      )
      .eq(
        "id",
        eventoIdLimpio,
      )
      .select("id")
      .maybeSingle();

  if (errorActualizacion) {
    throw new ErrorActualizarEventoPanel(
      `No se ha podido actualizar el evento: ${errorActualizacion.message}`,
      500,
    );
  }

  const eventoActualizado =
    filaActualizada as
      | FilaActualizada
      | null;

  if (!eventoActualizado?.id) {
    throw new ErrorActualizarEventoPanel(
      "El evento solicitado no existe.",
      404,
    );
  }

  const nuevosEquiposIds =
    datos.alcance ===
    "equipos"
      ? datos.equiposIds
      : [];

  try {
    await reemplazarRelacionesEquipos(
      eventoIdLimpio,
      nuevosEquiposIds,
    );
  } catch (error) {
    console.error(
      `Error actualizando los equipos del evento ${eventoIdLimpio}:`,
      error,
    );

    await restaurarEventoAnterior(
      eventoAnterior,
    );

    throw new ErrorActualizarEventoPanel(
      error instanceof Error
        ? error.message
        : "No se han podido actualizar los equipos del evento.",
      500,
    );
  }

  try {
    return await obtenerEventoPanel(
      eventoIdLimpio,
    );
  } catch (error) {
    console.error(
      `El evento ${eventoIdLimpio} se actualizó, pero no se ha podido recuperar:`,
      error,
    );

    throw new ErrorActualizarEventoPanel(
      "El evento se ha actualizado, pero no se han podido recuperar sus datos.",
      500,
    );
  }
}