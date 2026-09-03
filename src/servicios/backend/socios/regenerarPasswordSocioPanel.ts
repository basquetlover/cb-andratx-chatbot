import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  obtenerPasswordInicialCarnet,
} from "./numeroCarnetSocio";

import {
  crearHashPasswordSocio,
} from "./passwordSocio";

import type {
  ResultadoRegenerarPasswordSocio,
} from "@tipos/SocioPanel";

interface FilaSocio {
  id: string;
  email: string;
}

interface FilaCarnet {
  id: string;
  socio_id: string;
  numero_carnet: string;
  version_acceso: number;
  socios:
    | FilaSocio
    | FilaSocio[]
    | null;
}

export class ErrorRegenerarPasswordSocioPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorRegenerarPasswordSocioPanel";

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

function obtenerSocioRelacionado(
  valor:
    FilaSocio |
    FilaSocio[] |
    null,
): FilaSocio | null {
  if (
    Array.isArray(valor)
  ) {
    return valor[0] ?? null;
  }

  return valor;
}

async function obtenerCarnet(
  carnetId: string,
): Promise<FilaCarnet> {
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
        numero_carnet,
        version_acceso,
        socios (
          id,
          email
        )
      `)
      .eq(
        "id",
        carnetId,
      )
      .maybeSingle();

  if (error) {
    throw new ErrorRegenerarPasswordSocioPanel(
      `No se ha podido obtener el carnet: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorRegenerarPasswordSocioPanel(
      "El carnet solicitado no existe.",
      404,
    );
  }

  return data as unknown as
    FilaCarnet;
}

export async function regenerarPasswordSocioPanel(
  carnetId: string,
  usuarioId: string,
): Promise<ResultadoRegenerarPasswordSocio> {
  const idCarnet =
    carnetId.trim();

  const idUsuario =
    usuarioId.trim();

  if (
    !idCarnet ||
    !esUuidValido(
      idCarnet,
    )
  ) {
    throw new ErrorRegenerarPasswordSocioPanel(
      "El identificador del carnet no es válido.",
      400,
    );
  }

  if (
    !idUsuario ||
    !esUuidValido(
      idUsuario,
    )
  ) {
    throw new ErrorRegenerarPasswordSocioPanel(
      "No se ha podido identificar al usuario que regenera la contraseña.",
      400,
    );
  }

  const carnet =
    await obtenerCarnet(
      idCarnet,
    );

  const socio =
    obtenerSocioRelacionado(
      carnet.socios,
    );

  if (
    !socio?.id ||
    !socio.email?.trim()
  ) {
    throw new ErrorRegenerarPasswordSocioPanel(
      "El carnet no tiene un socio válido asociado.",
      500,
    );
  }

  const password =
    obtenerPasswordInicialCarnet(
      carnet.numero_carnet,
    );

  const passwordHash =
    await crearHashPasswordSocio(
      password,
    );

  const ahora =
    new Date().toISOString();

  const nuevaVersionAcceso =
    Math.max(
      1,
      carnet.version_acceso,
    ) + 1;

  const {
    data: carnetActualizado,
    error,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .update({
        password_hash:
          passwordHash,

        password_updated_at:
          ahora,

        version_acceso:
          nuevaVersionAcceso,

        intentos_fallidos:
          0,

        bloqueado_hasta:
          null,

        actualizado_por:
          idUsuario,

        updated_at:
          ahora,
      })
      .eq(
        "id",
        idCarnet,
      )
      .select("id")
      .maybeSingle();

  if (error) {
    throw new ErrorRegenerarPasswordSocioPanel(
      `No se ha podido regenerar la contraseña: ${error.message}`,
      500,
    );
  }

  if (!carnetActualizado) {
    throw new ErrorRegenerarPasswordSocioPanel(
      "El carnet solicitado no existe.",
      404,
    );
  }

  return {
    socioId:
      socio.id,

    carnetId:
      carnet.id,

    numeroCarnet:
      carnet.numero_carnet,

    credenciales: {
      email:
        socio.email
          .trim()
          .toLowerCase(),

      password,
    },

    emailEnviado:
      false,
  };
}