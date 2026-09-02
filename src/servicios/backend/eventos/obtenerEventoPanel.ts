import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  convertirFilaEventoPanel,
} from "./convertirFilaEventoPanel";

import type {
  EventoPanel,
} from "@tipos/EventoPanel";

export class ErrorObtenerEventoPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerEventoPanel";

    this.status =
      status;
  }
}

function esUuid(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

export async function obtenerEventoPanel(
  eventoId: string,
): Promise<EventoPanel> {
  const eventoIdLimpio =
    eventoId.trim();

  if (
    !eventoIdLimpio ||
    !esUuid(
      eventoIdLimpio,
    )
  ) {
    throw new ErrorObtenerEventoPanel(
      "El identificador del evento no es válido.",
      400,
    );
  }

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
        eventoIdLimpio,
      )
      .maybeSingle();

  if (error) {
    throw new ErrorObtenerEventoPanel(
      `No se ha podido obtener el evento: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorObtenerEventoPanel(
      "El evento solicitado no existe.",
      404,
    );
  }

  try {
    return convertirFilaEventoPanel(
      data,
    );
  } catch (error) {
    console.error(
      `Error convirtiendo los datos del evento ${eventoIdLimpio}:`,
      error,
    );

    throw new ErrorObtenerEventoPanel(
      "Los datos guardados del evento no son válidos.",
      500,
    );
  }
}