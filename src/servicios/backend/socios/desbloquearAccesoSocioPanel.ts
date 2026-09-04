import {
  supabaseServidor,
} from "../../supabase/servidor";

import type {
  ResultadoDesbloquearAccesoSocio,
} from "@tipos/SocioPanel";

interface FilaTemporadaActiva {
  id: string;
}

interface FilaCarnetAcceso {
  id: string;
  socio_id: string;
  temporada_id: string;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
}

export class ErrorDesbloquearAccesoSocioPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorDesbloquearAccesoSocioPanel";

    this.status = status;
  }
}

async function obtenerTemporadaActivaId():
  Promise<string> {
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
      .order(
        "fecha_inicio",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorDesbloquearAccesoSocioPanel(
      `No se ha podido consultar la temporada activa: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorDesbloquearAccesoSocioPanel(
      "No hay ninguna temporada activa.",
      409,
    );
  }

  return (
    data as
      FilaTemporadaActiva
  ).id;
}

async function obtenerCarnetActual(
  socioId: string,
  temporadaId: string,
): Promise<FilaCarnetAcceso> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .select(`
        id,
        socio_id,
        temporada_id,
        intentos_fallidos,
        bloqueado_hasta
      `)
      .eq(
        "socio_id",
        socioId,
      )
      .eq(
        "temporada_id",
        temporadaId,
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorDesbloquearAccesoSocioPanel(
      `No se ha podido consultar el carnet del socio: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorDesbloquearAccesoSocioPanel(
      "El socio no tiene ningún carnet para la temporada activa.",
      404,
    );
  }

  return data as
    FilaCarnetAcceso;
}

export async function desbloquearAccesoSocioPanel(
  socioId: string,
  usuarioId: string,
): Promise<ResultadoDesbloquearAccesoSocio> {
  const socioIdLimpio =
    socioId.trim();

  const usuarioIdLimpio =
    usuarioId.trim();

  if (!socioIdLimpio) {
    throw new ErrorDesbloquearAccesoSocioPanel(
      "El identificador del socio es obligatorio.",
      400,
    );
  }

  if (!usuarioIdLimpio) {
    throw new ErrorDesbloquearAccesoSocioPanel(
      "No se ha podido identificar al administrador.",
      401,
    );
  }

  const {
    data:
      socioEncontrado,
    error:
      errorSocio,
  } =
    await supabaseServidor
      .from("socios")
      .select("id")
      .eq(
        "id",
        socioIdLimpio,
      )
      .limit(1)
      .maybeSingle();

  if (errorSocio) {
    throw new ErrorDesbloquearAccesoSocioPanel(
      `No se ha podido comprobar el socio: ${errorSocio.message}`,
      500,
    );
  }

  if (!socioEncontrado) {
    throw new ErrorDesbloquearAccesoSocioPanel(
      "El socio no existe.",
      404,
    );
  }

  const temporadaId =
    await obtenerTemporadaActivaId();

  const carnet =
    await obtenerCarnetActual(
      socioIdLimpio,
      temporadaId,
    );

  const ahora =
    new Date().toISOString();

  const {
    data:
      carnetActualizado,
    error:
      errorActualizando,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .update({
        intentos_fallidos:
          0,

        bloqueado_hasta:
          null,

        actualizado_por:
          usuarioIdLimpio,

        updated_at:
          ahora,
      })
      .eq(
        "id",
        carnet.id,
      )
      .select(`
        id,
        socio_id,
        intentos_fallidos,
        bloqueado_hasta
      `)
      .single();

  if (errorActualizando) {
    throw new ErrorDesbloquearAccesoSocioPanel(
      `No se ha podido desbloquear el acceso: ${errorActualizando.message}`,
      500,
    );
  }

  if (!carnetActualizado) {
    throw new ErrorDesbloquearAccesoSocioPanel(
      "No se ha podido recuperar el carnet después de desbloquearlo.",
      500,
    );
  }

  const fila =
    carnetActualizado as
      FilaCarnetAcceso;

  return {
    socioId:
      fila.socio_id,

    carnetId:
      fila.id,

    intentosFallidos:
      Math.max(
        0,
        fila.intentos_fallidos,
      ),

    bloqueadoHasta:
      fila.bloqueado_hasta,

    accesoBloqueado:
      false,
  };
}