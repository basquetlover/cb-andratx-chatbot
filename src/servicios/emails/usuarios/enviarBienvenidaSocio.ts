import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  enviarEmailApi,
} from "../cliente/enviarEmailApi";

import {
  generarEmailSocio,
} from "../plantillas/generarEmailSocio";

import {
  generarPasswordCarnetSocio,
} from "../../backend/socios/numeroCarnetSocio";

interface FilaTemporada {
  id: string;
  nombre: string | null;
  activa: boolean | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

interface FilaSocio {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  activo: boolean | null;
}

interface FilaCarnetEmail {
  id: string;
  socio_id: string;
  temporada_id: string;

  numero_socio: number;
  numero_carnet: string;

  estado:
    | "pendiente"
    | "activo"
    | "bloqueado"
    | "caducado";

  fecha_alta: string;
  fecha_caducidad: string;

  email_bienvenida_enviado_at:
    | string
    | null;

  socio:
    | FilaSocio
    | FilaSocio[]
    | null;

  temporada:
    | FilaTemporada
    | FilaTemporada[]
    | null;
}

export type MotivoEnvioBienvenidaSocio =
  | "enviado"
  | "ya-enviado"
  | "socio-inactivo"
  | "carnet-inactivo"
  | "sin-carnet-activo";

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

function obtenerRelacionUnica<T>(
  valor:
    | T
    | T[]
    | null,
): T | null {
  if (Array.isArray(valor)) {
    return valor[0] ?? null;
  }

  return valor;
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

function obtenerFechaMadrid():
  string {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const anio =
    partes.find(
      (parte) =>
        parte.type === "year",
    )?.value;

  const mes =
    partes.find(
      (parte) =>
        parte.type === "month",
    )?.value;

  const dia =
    partes.find(
      (parte) =>
        parte.type === "day",
    )?.value;

  if (
    !anio ||
    !mes ||
    !dia
  ) {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  return `${anio}-${mes}-${dia}`;
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
    throw new ErrorEnviarBienvenidaSocio(
      `No se ha podido consultar la temporada activa: ${error.message}`,
    );
  }

  return data?.id ?? null;
}

async function obtenerCarnetParaEnviar(
  socioId: string,
  carnetId?:
    string | null,
): Promise<FilaCarnetEmail | null> {
  let consulta =
    supabaseServidor
      .from(
        "socios_temporadas",
      )
      .select(`
        id,
        socio_id,
        temporada_id,

        numero_socio,
        numero_carnet,

        estado,

        fecha_alta,
        fecha_caducidad,

        email_bienvenida_enviado_at,

        socio:socios (
          id,
          nombre,
          apellidos,
          email,
          activo
        ),

        temporada:temporadas (
          id,
          nombre,
          activa,
          fecha_inicio,
          fecha_fin
        )
      `)
      .eq(
        "socio_id",
        socioId,
      );

  if (
    carnetId?.trim()
  ) {
    consulta =
      consulta.eq(
        "id",
        carnetId.trim(),
      );
  } else {
    const temporadaActivaId =
      await obtenerTemporadaActivaId();

    if (!temporadaActivaId) {
      return null;
    }

    consulta =
      consulta.eq(
        "temporada_id",
        temporadaActivaId,
      );
  }

  const {
    data,
    error,
  } =
    await consulta
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorEnviarBienvenidaSocio(
      `No se ha podido consultar el carnet para enviar el correo: ${error.message}`,
    );
  }

  return data
    ? data as
        FilaCarnetEmail
    : null;
}

export async function enviarBienvenidaSocioSiCorresponde(
  socioId: string,
  carnetId?:
    string | null,
): Promise<ResultadoEnvioBienvenidaSocio> {
  const socioIdLimpio =
    socioId.trim();

  if (!socioIdLimpio) {
    throw new ErrorEnviarBienvenidaSocio(
      "El identificador del socio es obligatorio.",
    );
  }

  const carnet =
    await obtenerCarnetParaEnviar(
      socioIdLimpio,
      carnetId,
    );

  if (!carnet) {
    return {
      enviado: false,
      motivo:
        "sin-carnet-activo",
      carnetId: null,
    };
  }

  const socio =
    obtenerRelacionUnica(
      carnet.socio,
    );

  const temporada =
    obtenerRelacionUnica(
      carnet.temporada,
    );

  if (
    !socio ||
    !temporada
  ) {
    throw new ErrorEnviarBienvenidaSocio(
      "El carnet no contiene correctamente la información del socio o de la temporada.",
    );
  }

  if (
    socio.activo !== true
  ) {
    return {
      enviado: false,
      motivo:
        "socio-inactivo",
      carnetId:
        carnet.id,
    };
  }

  const hoy =
    obtenerFechaMadrid();

  if (
    carnet.estado !==
      "activo" ||
    carnet.fecha_alta >
      hoy ||
    carnet.fecha_caducidad <
      hoy
  ) {
    return {
      enviado: false,
      motivo:
        "carnet-inactivo",
      carnetId:
        carnet.id,
    };
  }

  if (
    carnet.email_bienvenida_enviado_at
  ) {
    return {
      enviado: false,
      motivo:
        "ya-enviado",
      carnetId:
        carnet.id,
    };
  }

  const email =
    convertirTexto(
      socio.email,
    ).toLowerCase();

  if (!email) {
    throw new ErrorEnviarBienvenidaSocio(
      "El socio no tiene un correo electrónico válido.",
    );
  }

  const nombre =
    [
      convertirTexto(
        socio.nombre,
      ),
      convertirTexto(
        socio.apellidos,
      ),
    ]
      .filter(Boolean)
      .join(" ") ||
    "socio/a";

  /*
   * La contraseña de este carnet puede
   * reconstruirse porque corresponde
   * exactamente a numero_carnet.
   *
   * El hash almacenado en la base de datos
   * no se lee ni se envía.
   */
  const passwordCarnet =
    generarPasswordCarnetSocio(
      carnet.numero_carnet,
    );

  const enlace =
    "https://cbandratx.es/socios";

  const contenido =
    generarEmailSocio({
      nombre,
      email,
      contrasena:
        passwordCarnet,
      enlace,
      urlEscudo:
        "https://cbandratx.es/favicon.png",
    });

  await enviarEmailApi({
    to: email,
    subject:
      contenido.asunto,
    html:
      contenido.html,

    /*
     * Este origen debe corresponder en
     * enviarEmailApi al remitente:
     * socios@cbandratx.es
     */
    origen: "socios",
  });

  const enviadoAt =
    new Date().toISOString();

  const {
    error:
      errorActualizando,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .update({
        email_bienvenida_enviado_at:
          enviadoAt,

        updated_at:
          enviadoAt,
      })
      .eq(
        "id",
        carnet.id,
      )
      .is(
        "email_bienvenida_enviado_at",
        null,
      );

  if (errorActualizando) {
    console.error(
      "El correo del carnet se ha enviado, pero no se ha podido guardar la fecha del envío:",
      {
        socioId:
          socio.id,
        carnetId:
          carnet.id,
        error:
          errorActualizando,
      },
    );

    throw new ErrorEnviarBienvenidaSocio(
      `El correo se ha enviado, pero no se ha podido registrar el envío: ${errorActualizando.message}`,
    );
  }

  return {
    enviado: true,
    motivo: "enviado",
    carnetId:
      carnet.id,
  };
}