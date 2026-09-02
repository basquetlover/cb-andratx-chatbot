import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  convertirFilaEventoPanel,
} from "./convertirFilaEventoPanel";

import {
  validarEventoPanel,
} from "./validarEventoPanel";

import type {
  ErrorCampoEvento,
  EventoPanel,
} from "@tipos/EventoPanel";

interface FilaCreada {
  id: string;
}

interface FilaEquipoEncontrado {
  id: string;
}

interface FilaTemporada {
  id: string;
}

export class ErrorCrearEventoPanel
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
      "ErrorCrearEventoPanel";

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
  temporadaId:
    string | null,
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
      throw new ErrorCrearEventoPanel(
        `No se ha podido comprobar la temporada: ${error.message}`,
        500,
      );
    }

    const temporada =
      data as
        | FilaTemporada
        | null;

    if (!temporada?.id) {
      throw new ErrorCrearEventoPanel(
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
    throw new ErrorCrearEventoPanel(
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
    throw new ErrorCrearEventoPanel(
      `No se han podido comprobar los equipos seleccionados: ${error.message}`,
      500,
    );
  }

  const equiposEncontrados =
    (
      data ?? []
    ) as FilaEquipoEncontrado[];

  const idsEncontrados =
    new Set(
      equiposEncontrados.map(
        (equipo) =>
          equipo.id,
      ),
    );

  const idsNoEncontrados =
    equiposIds.filter(
      (equipoId) =>
        !idsEncontrados.has(
          equipoId,
        ),
    );

  if (
    idsNoEncontrados.length >
    0
  ) {
    throw new ErrorCrearEventoPanel(
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

async function eliminarEventoIncompleto(
  eventoId: string,
): Promise<void> {
  const {
    error,
  } =
    await supabaseServidor
      .from("eventos")
      .delete()
      .eq(
        "id",
        eventoId,
      );

  if (error) {
    console.error(
      `No se ha podido eliminar el evento incompleto ${eventoId}:`,
      error,
    );
  }
}

async function obtenerEventoCreado(
  eventoId: string,
): Promise<EventoPanel> {
  const {
    data,
    error,
  } =
    await supabaseServidor
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
      `)
      .eq(
        "id",
        eventoId,
      )
      .maybeSingle();

  if (error) {
    throw new ErrorCrearEventoPanel(
      `El evento se ha creado, pero no se ha podido recuperar: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorCrearEventoPanel(
      "El evento se ha creado, pero no se ha podido recuperar.",
      500,
    );
  }

  return convertirFilaEventoPanel(
    data,
  );
}

export async function crearEventoPanel(
  contenido: unknown,
  usuarioId: string,
): Promise<EventoPanel> {
  const usuarioIdLimpio =
    usuarioId.trim();

  if (
    !esUuid(
      usuarioIdLimpio,
    )
  ) {
    throw new ErrorCrearEventoPanel(
      "El usuario que está creando el evento no es válido.",
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
    throw new ErrorCrearEventoPanel(
      "Hay campos del evento que deben corregirse.",
      400,
      validacion.errores,
    );
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

  const {
    data:
      eventoCreado,

    error:
      errorEvento,
  } =
    await supabaseServidor
      .from("eventos")
      .insert({
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

        creado_por:
          usuarioIdLimpio,

        actualizado_por:
          usuarioIdLimpio,

        publicado_at:
          datos.estado ===
          "publicado"
            ? ahora
            : null,

        updated_at:
          ahora,
      })
      .select("id")
      .single();

  if (errorEvento) {
    throw new ErrorCrearEventoPanel(
      `No se ha podido crear el evento: ${errorEvento.message}`,
      500,
    );
  }

  const filaCreada =
    eventoCreado as
      | FilaCreada
      | null;

  if (!filaCreada?.id) {
    throw new ErrorCrearEventoPanel(
      "No se ha podido obtener el identificador del evento creado.",
      500,
    );
  }

  const eventoId =
    filaCreada.id;

  if (
    datos.alcance ===
      "equipos" &&
    datos.equiposIds.length >
      0
  ) {
    const relaciones =
      datos.equiposIds.map(
        (equipoId) => ({
          evento_id:
            eventoId,

          equipo_id:
            equipoId,
        }),
      );

    const {
      error:
        errorRelaciones,
    } =
      await supabaseServidor
        .from(
          "eventos_equipos",
        )
        .insert(
          relaciones,
        );

    if (errorRelaciones) {
      await eliminarEventoIncompleto(
        eventoId,
      );

      throw new ErrorCrearEventoPanel(
        `No se han podido asignar los equipos al evento: ${errorRelaciones.message}`,
        500,
      );
    }
  }

  try {
    return await obtenerEventoCreado(
      eventoId,
    );
  } catch (error) {
    console.error(
      `Error recuperando el evento creado ${eventoId}:`,
      error,
    );

    throw error;
  }
}