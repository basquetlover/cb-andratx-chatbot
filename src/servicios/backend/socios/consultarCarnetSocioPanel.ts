import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  esNumeroCarnetSocioValido,
  normalizarNumeroCarnetSocio,
} from "./numeroCarnetSocio";

import {
  convertirFilaCarnetSocio,
} from "./convertirFilaSocioPanel";

import type {
  CarnetTemporadaSocio,
  MotivoResultadoEscaneoCarnet,
  ResultadoEscaneoCarnet,
  SocioResultadoEscaneo,
} from "@tipos/SocioPanel";

interface FilaSocioEscaneo {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean | null;
}

interface FilaTemporadaEscaneo {
  id: string;
  nombre: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean | null;
}

interface FilaCarnetEscaneo {
  id: string;
  socio_id: string;
  temporada_id: string;

  numero_socio: number;
  numero_carnet: string;

  tipo_socio: string | null;

  estado:
    | "pendiente"
    | "activo"
    | "bloqueado"
    | "caducado";

  fecha_alta: string;
  fecha_caducidad: string;

  motivo_bloqueo: string | null;

  activado_at: string | null;
  activado_por: string | null;

  bloqueado_at: string | null;
  bloqueado_por: string | null;

  version_acceso: number;

  password_updated_at: string;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  ultimo_acceso_at: string | null;

  email_bienvenida_enviado_at:
    | string
    | null;

  created_at: string;
  updated_at: string;

  socio:
    | FilaSocioEscaneo
    | FilaSocioEscaneo[]
    | null;

  temporada:
    | FilaTemporadaEscaneo
    | FilaTemporadaEscaneo[]
    | null;
}

export class ErrorConsultarCarnetSocioPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorConsultarCarnetSocioPanel";

    this.status = status;
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

function crearResultadoVacio(
  motivo:
    MotivoResultadoEscaneoCarnet,
  mensaje: string,
  numeroCarnet:
    string | null,
): ResultadoEscaneoCarnet {
  return {
    encontrado: false,
    valido: false,
    motivo,
    mensaje,
    numeroCarnet,
    socio: null,
    carnet: null,
  };
}

function convertirSocio(
  fila:
    FilaSocioEscaneo,
): SocioResultadoEscaneo {
  const nombre =
    convertirTexto(
      fila.nombre,
    ) || "Socio";

  const apellidos =
    convertirTexto(
      fila.apellidos,
    );

  return {
    id:
      fila.id,

    nombre,
    apellidos,

    nombreCompleto:
      [nombre, apellidos]
        .filter(Boolean)
        .join(" "),

    email:
      convertirTexto(
        fila.email,
      ),

    telefono:
      convertirTexto(
        fila.telefono,
      ) || null,

    activo:
      fila.activo === true,
  };
}

function crearResultadoEncontrado({
  valido,
  motivo,
  mensaje,
  numeroCarnet,
  socio,
  carnet,
}: {
  valido: boolean;

  motivo:
    MotivoResultadoEscaneoCarnet;

  mensaje: string;
  numeroCarnet: string;

  socio:
    SocioResultadoEscaneo;

  carnet:
    CarnetTemporadaSocio;
}): ResultadoEscaneoCarnet {
  return {
    encontrado: true,
    valido,
    motivo,
    mensaje,
    numeroCarnet,
    socio,
    carnet,
  };
}

export async function consultarCarnetSocioPanel(
  numeroCarnet: string,
): Promise<ResultadoEscaneoCarnet> {
  const numeroNormalizado =
    normalizarNumeroCarnetSocio(
      numeroCarnet,
    );

  if (
    !esNumeroCarnetSocioValido(
      numeroNormalizado,
    )
  ) {
    return crearResultadoVacio(
      "formato-invalido",
      "El código leído no tiene el formato de un carnet del C.B. Andratx.",
      numeroNormalizado ||
        null,
    );
  }

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

        created_at,
        updated_at,

        socio:socios (
          id,
          nombre,
          apellidos,
          email,
          telefono,
          activo
        ),

        temporada:temporadas (
          id,
          nombre,
          fecha_inicio,
          fecha_fin,
          activa
        )
      `)
      .eq(
        "numero_carnet",
        numeroNormalizado,
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    console.error(
      "Error consultando el carnet escaneado:",
      {
        numeroCarnet:
          numeroNormalizado,
        error,
      },
    );

    throw new ErrorConsultarCarnetSocioPanel(
      `No se ha podido consultar el carnet: ${error.message}`,
      500,
    );
  }

  if (!data) {
    return crearResultadoVacio(
      "no-encontrado",
      "No existe ningún carnet con este número.",
      numeroNormalizado,
    );
  }

  const fila =
    data as
      FilaCarnetEscaneo;

  const filaSocio =
    obtenerRelacionUnica(
      fila.socio,
    );

  const filaTemporada =
    obtenerRelacionUnica(
      fila.temporada,
    );

  if (
    !filaSocio ||
    !filaTemporada
  ) {
    throw new ErrorConsultarCarnetSocioPanel(
      "El carnet no contiene correctamente la información del socio o de la temporada.",
      500,
    );
  }

  /*
   * El conversor espera las relaciones
   * completas dentro de la propia fila.
   */
  const carnet =
    convertirFilaCarnetSocio({
      ...fila,
      socio:
        filaSocio,
      temporada:
        filaTemporada,
    });

  if (!carnet) {
    console.error(
      "No se ha podido convertir la fila del carnet escaneado:",
      {
        numeroCarnet:
          numeroNormalizado,
      },
    );

    throw new ErrorConsultarCarnetSocioPanel(
      "No se ha podido interpretar la información del carnet.",
      500,
    );
  }

  const socio =
    convertirSocio(
      filaSocio,
    );

  if (!socio.activo) {
    return crearResultadoEncontrado({
      valido: false,
      motivo:
        "socio-desactivado",
      mensaje:
        "El socio está desactivado y su carnet no puede utilizarse.",
      numeroCarnet:
        numeroNormalizado,
      socio,
      carnet,
    });
  }

  if (
    carnet.estado ===
    "pendiente"
  ) {
    return crearResultadoEncontrado({
      valido: false,
      motivo:
        "carnet-pendiente",
      mensaje:
        "El carnet todavía está pendiente de activación.",
      numeroCarnet:
        numeroNormalizado,
      socio,
      carnet,
    });
  }

  if (
    carnet.estado ===
    "bloqueado"
  ) {
    return crearResultadoEncontrado({
      valido: false,
      motivo:
        "carnet-bloqueado",
      mensaje:
        carnet.motivoBloqueo ||
        "El carnet está bloqueado.",
      numeroCarnet:
        numeroNormalizado,
      socio,
      carnet,
    });
  }

  const hoy =
    obtenerFechaMadrid();

  if (
    carnet.estado ===
      "caducado" ||
    carnet.fechaCaducidad <
      hoy
  ) {
    return crearResultadoEncontrado({
      valido: false,
      motivo:
        "carnet-caducado",
      mensaje:
        "El carnet ha caducado.",
      numeroCarnet:
        numeroNormalizado,
      socio,
      carnet,
    });
  }

  if (
    carnet.fechaAlta >
    hoy
  ) {
    return crearResultadoEncontrado({
      valido: false,
      motivo:
        "carnet-pendiente",
      mensaje:
        "El periodo de validez de este carnet todavía no ha comenzado.",
      numeroCarnet:
        numeroNormalizado,
      socio,
      carnet,
    });
  }

  if (
    filaTemporada.activa !==
    true
  ) {
    return crearResultadoEncontrado({
      valido: false,
      motivo:
        "carnet-caducado",
      mensaje:
        "Este carnet no pertenece a la temporada activa.",
      numeroCarnet:
        numeroNormalizado,
      socio,
      carnet,
    });
  }

  const mensaje =
    carnet.accesoBloqueado
      ? "El carnet es válido, aunque su acceso web está bloqueado temporalmente por varios intentos fallidos."
      : "El carnet es válido.";

  return crearResultadoEncontrado({
    valido: true,
    motivo: "valido",
    mensaje,
    numeroCarnet:
      numeroNormalizado,
    socio,
    carnet,
  });
}