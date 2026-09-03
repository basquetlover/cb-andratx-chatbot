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

function esUuidValido(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

async function obtenerTemporadaActivaId(): Promise<
  string | null
> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("temporadas")
      .select("id")
      .eq("activa", true)
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorObtenerSocioPanel(
      `No se ha podido obtener la temporada activa: ${error.message}`,
      500,
    );
  }

  const temporada =
    data as
      | FilaTemporadaActiva
      | null;

  return (
    temporada?.id ??
    null
  );
}

export async function obtenerSocioPanel(
  socioId: string,
): Promise<SocioPanel> {
  const id =
    socioId.trim();

  if (
    !id ||
    !esUuidValido(id)
  ) {
    throw new ErrorObtenerSocioPanel(
      "El identificador del socio no es válido.",
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
        numero_socio,
        nombre,
        apellidos,
        email,
        telefono,
        activo,
        observaciones,
        created_at,
        updated_at,
        socios_temporadas (
          id,
          socio_id,
          temporada_id,
          numero_carnet,
          tipo_socio,
          estado,
          fecha_alta,
          fecha_caducidad,
          activado_at,
          bloqueado_at,
          motivo_bloqueo,
          bloqueado_hasta,
          email_bienvenida_enviado_at,
          ultimo_acceso_at,
          intentos_fallidos,
          version_acceso,
          created_at,
          updated_at,
          temporadas (
            id,
            nombre,
            activa,
            fecha_inicio,
            fecha_fin
          )
        )
      `)
      .eq("id", id)
      .maybeSingle();

  if (error) {
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
      "No se ha podido convertir el socio obtenido de Supabase:",
      {
        socioId: id,
      },
    );

    throw new ErrorObtenerSocioPanel(
      "Los datos almacenados del socio no son válidos.",
      500,
    );
  }

  return socio;
}