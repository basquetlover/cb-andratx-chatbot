import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  convertirFilaSocioPanel,
} from "./convertirFilaSocioPanel";

import type {
  SocioPanel,
} from "@tipos/SocioPanel";

interface FilaTemporadaActiva {
  id: string;
}

export class ErrorObtenerSocioPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerSocioPanel";

    this.status = status;
  }
}

async function obtenerTemporadaActivaId():
  Promise<string | null> {
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
    console.error(
      "Error obteniendo la temporada activa para consultar el socio:",
      error,
    );

    throw new ErrorObtenerSocioPanel(
      `No se ha podido consultar la temporada activa: ${error.message}`,
      500,
    );
  }

  if (!data) {
    return null;
  }

  return (
    data as
      FilaTemporadaActiva
  ).id;
}

export async function obtenerSocioPanel(
  socioId: string,
): Promise<SocioPanel> {
  const socioIdLimpio =
    socioId.trim();

  if (!socioIdLimpio) {
    throw new ErrorObtenerSocioPanel(
      "El identificador del socio es obligatorio.",
      400,
    );
  }

  const temporadaActivaId =
    await obtenerTemporadaActivaId();

  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("socios")
      .select(`
        id,
        nombre,
        apellidos,
        email,
        telefono,
        activo,
        observaciones,
        creado_por,
        actualizado_por,
        created_at,
        updated_at,

        carnets:socios_temporadas (
          id,
          socio_id,
          temporada_id,

          numero_socio,
          numero_carnet,

          tipo_socio,
          estado,

          fecha_alta,
          fecha_caducidad,

          motivo_bloqueo,

          activado_at,
          activado_por,

          bloqueado_at,
          bloqueado_por,

          version_acceso,

          password_updated_at,
          intentos_fallidos,
          bloqueado_hasta,
          ultimo_acceso_at,
          email_bienvenida_enviado_at,

          creado_por,
          actualizado_por,
          created_at,
          updated_at,

          temporada:temporadas (
            id,
            nombre,
            fecha_inicio,
            fecha_fin,
            activa
          )
        )
      `)
      .eq(
        "id",
        socioIdLimpio,
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Error obteniendo la ficha del socio:",
      {
        socioId:
          socioIdLimpio,
        error,
      },
    );

    throw new ErrorObtenerSocioPanel(
      `No se ha podido obtener el socio: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorObtenerSocioPanel(
      "El socio solicitado no existe.",
      404,
    );
  }

  const socio =
    convertirFilaSocioPanel(
      data,
      temporadaActivaId,
    );

  if (!socio) {
    console.error(
      "La fila del socio no tiene el formato esperado:",
      {
        socioId:
          socioIdLimpio,
      },
    );

    throw new ErrorObtenerSocioPanel(
      "No se ha podido interpretar la información del socio.",
      500,
    );
  }

  return socio;
}