import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  enviarEmailApi,
} from "../../emails/cliente/enviarEmailApi";

import {
  generarEmailSocio,
} from "../../emails/plantillas/generarEmailSocio";

interface FilaSocio {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  activo: boolean;
}

interface FilaCarnetSocio {
  id: string;
  socio_id: string;
  temporada_id: string;

  numero_socio: number;
  numero_carnet: string;

  estado: string;

  email_bienvenida_enviado_at:
    | string
    | null;
}

interface FilaTemporada {
  id: string;
}

export type MotivoEnvioBienvenidaSocio =
  | "enviado"
  | "ya-enviado"
  | "socio-inactivo"
  | "carnet-no-encontrado"
  | "carnet-no-activo"
  | "sin-temporada-activa";

export interface ResultadoEnvioBienvenidaSocio {
  enviado: boolean;

  motivo:
    MotivoEnvioBienvenidaSocio;

  carnetId: string | null;
}

export class ErrorEnviarBienvenidaSocio
  extends Error {
  constructor(
    mensaje: string,
  ) {
    super(mensaje);

    this.name =
      "ErrorEnviarBienvenidaSocio";
  }
}

function obtenerNombreCompleto(
  socio: FilaSocio,
): string {
  return [
    socio.nombre,
    socio.apellidos,
  ]
    .map(
      (parte) =>
        parte?.trim(),
    )
    .filter(Boolean)
    .join(" ");
}

function obtenerUrlInicioSesion(): string {
  const origenConfigurado =
    import.meta.env
      .PUBLIC_SITE_URL?.trim() ||
    import.meta.env
      .SITE_URL?.trim() ||
    "https://cbandratx.es";

  return `${origenConfigurado.replace(
    /\/+$/,
    "",
  )}/socios/iniciar-sesion`;
}

async function obtenerSocio(
  socioId: string,
): Promise<FilaSocio> {
  const {
    data,
    error,
  } = await supabaseServidor
    .from("socios")
    .select(
      [
        "id",
        "nombre",
        "apellidos",
        "email",
        "activo",
      ].join(","),
    )
    .eq(
      "id",
      socioId,
    )
    .maybeSingle<FilaSocio>();

  if (error) {
    throw new ErrorEnviarBienvenidaSocio(
      `No se ha podido consultar el socio: ${error.message}`,
    );
  }

  if (!data) {
    throw new ErrorEnviarBienvenidaSocio(
      "El socio indicado no existe.",
    );
  }

  return data;
}

async function obtenerTemporadaActivaId():
  Promise<string | null> {
  const {
    data,
    error,
  } = await supabaseServidor
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
    .maybeSingle<FilaTemporada>();

  if (error) {
    throw new ErrorEnviarBienvenidaSocio(
      `No se ha podido consultar la temporada activa: ${error.message}`,
    );
  }

  return data?.id ?? null;
}

async function obtenerCarnetPorId(
  socioId: string,
  carnetId: string,
): Promise<FilaCarnetSocio | null> {
  const {
    data,
    error,
  } = await supabaseServidor
    .from("socios_temporadas")
    .select(
      [
        "id",
        "socio_id",
        "temporada_id",
        "numero_socio",
        "numero_carnet",
        "estado",
        "email_bienvenida_enviado_at",
      ].join(","),
    )
    .eq(
      "id",
      carnetId,
    )
    .eq(
      "socio_id",
      socioId,
    )
    .maybeSingle<FilaCarnetSocio>();

  if (error) {
    throw new ErrorEnviarBienvenidaSocio(
      `No se ha podido consultar el carnet: ${error.message}`,
    );
  }

  return data ?? null;
}

async function obtenerCarnetTemporadaActiva(
  socioId: string,
): Promise<{
  carnet: FilaCarnetSocio | null;
  existeTemporadaActiva: boolean;
}> {
  const temporadaId =
    await obtenerTemporadaActivaId();

  if (!temporadaId) {
    return {
      carnet: null,
      existeTemporadaActiva:
        false,
    };
  }

  const {
    data,
    error,
  } = await supabaseServidor
    .from("socios_temporadas")
    .select(
      [
        "id",
        "socio_id",
        "temporada_id",
        "numero_socio",
        "numero_carnet",
        "estado",
        "email_bienvenida_enviado_at",
      ].join(","),
    )
    .eq(
      "socio_id",
      socioId,
    )
    .eq(
      "temporada_id",
      temporadaId,
    )
    .maybeSingle<FilaCarnetSocio>();

  if (error) {
    throw new ErrorEnviarBienvenidaSocio(
      `No se ha podido consultar el carnet de la temporada activa: ${error.message}`,
    );
  }

  return {
    carnet:
      data ?? null,

    existeTemporadaActiva:
      true,
  };
}

async function marcarBienvenidaEnviada(
  carnetId: string,
  enviadoAt: string,
): Promise<void> {
  const {
    error,
  } = await supabaseServidor
    .from("socios_temporadas")
    .update({
      email_bienvenida_enviado_at:
        enviadoAt,

      updated_at:
        enviadoAt,
    })
    .eq(
      "id",
      carnetId,
    );

  if (error) {
    throw new ErrorEnviarBienvenidaSocio(
      `El correo se ha enviado, pero no se ha podido registrar el envío: ${error.message}`,
    );
  }
}

export async function enviarBienvenidaSocioSiCorresponde(
  socioId: string,
  carnetId?: string | null,
): Promise<ResultadoEnvioBienvenidaSocio> {
  const socio =
    await obtenerSocio(
      socioId,
    );

  if (!socio.activo) {
    return {
      enviado: false,
      motivo:
        "socio-inactivo",
      carnetId:
        carnetId ?? null,
    };
  }

  let carnet:
    FilaCarnetSocio | null;

  if (carnetId) {
    carnet =
      await obtenerCarnetPorId(
        socioId,
        carnetId,
      );
  } else {
    const resultado =
      await obtenerCarnetTemporadaActiva(
        socioId,
      );

    if (
      !resultado
        .existeTemporadaActiva
    ) {
      return {
        enviado: false,
        motivo:
          "sin-temporada-activa",
        carnetId: null,
      };
    }

    carnet =
      resultado.carnet;
  }

  if (!carnet) {
    return {
      enviado: false,
      motivo:
        "carnet-no-encontrado",
      carnetId:
        carnetId ?? null,
    };
  }

  if (
    carnet.estado !== "activo"
  ) {
    return {
      enviado: false,
      motivo:
        "carnet-no-activo",
      carnetId:
        carnet.id,
    };
  }

  if (
    carnet
      .email_bienvenida_enviado_at
  ) {
    return {
      enviado: false,
      motivo:
        "ya-enviado",
      carnetId:
        carnet.id,
    };
  }

  /*
   * La contraseña pertenece al carnet y
   * coincide exactamente con su número:
   *
   * CBA-2627001
   *
   * No se recupera desde ningún hash.
   */
  const passwordCarnet =
    carnet.numero_carnet;

  const contenido =
    generarEmailSocio({
      nombre:
        obtenerNombreCompleto(
          socio,
        ),

      email:
        socio.email,

      contrasena:
        passwordCarnet,

      enlace:
        obtenerUrlInicioSesion(),
    });

  await enviarEmailApi({
    to:
      socio.email,

    subject:
      contenido.asunto,

    html:
      contenido.html,

    origen:
      "socios",
  });

  const enviadoAt =
    new Date().toISOString();

  await marcarBienvenidaEnviada(
    carnet.id,
    enviadoAt,
  );

  return {
    enviado: true,
    motivo:
      "enviado",
    carnetId:
      carnet.id,
  };
}