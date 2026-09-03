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
  ResultadoEscaneoCarnet,
} from "@tipos/SocioPanel";

interface FilaSocioEscaneo {
  id: string;
  numero_socio: number;
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

  email_bienvenida_enviado_at:
    | string
    | null;

  ultimo_acceso_at:
    | string
    | null;

  version_acceso: number;

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

type MotivoEscaneoCarnet =
  ResultadoEscaneoCarnet["motivo"];

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
  valor: T | T[] | null,
): T | null {
  if (Array.isArray(valor)) {
    return valor[0] ?? null;
  }

  return valor;
}

function obtenerFechaMadrid(): string {
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
    )?.value ?? "";

  const mes =
    partes.find(
      (parte) =>
        parte.type === "month",
    )?.value ?? "";

  const dia =
    partes.find(
      (parte) =>
        parte.type === "day",
    )?.value ?? "";

  return `${anio}-${mes}-${dia}`;
}

function crearResultadoNoValido(
  motivo: MotivoEscaneoCarnet,
  mensaje: string,
): ResultadoEscaneoCarnet {
  return {
    encontrado: false,
    valido: false,
    motivo,
    mensaje,
    socio: null,
    carnet: null,
  };
}

function evaluarCarnet(
  socio: FilaSocioEscaneo,
  carnet: CarnetTemporadaSocio,
): {
  valido: boolean;
  motivo: MotivoEscaneoCarnet;
  mensaje: string;
} {
  if (!socio.activo) {
    return {
      valido: false,
      motivo:
        "socio-desactivado",
      mensaje:
        "El socio está desactivado y no puede utilizar el carnet.",
    };
  }

  if (
    carnet.estado ===
    "pendiente"
  ) {
    return {
      valido: false,
      motivo:
        "carnet-pendiente",
      mensaje:
        "El carnet todavía está pendiente de activación.",
    };
  }

  if (
    carnet.estado ===
    "bloqueado"
  ) {
    return {
      valido: false,
      motivo:
        "carnet-bloqueado",
      mensaje:
        carnet.motivoBloqueo
          ?.trim() ||
        "El carnet se encuentra bloqueado.",
    };
  }

  if (
    carnet.estado ===
    "caducado"
  ) {
    return {
      valido: false,
      motivo:
        "carnet-caducado",
      mensaje:
        "El carnet se encuentra caducado.",
    };
  }

  const hoy =
    obtenerFechaMadrid();

  if (
    carnet.fechaAlta &&
    hoy < carnet.fechaAlta
  ) {
    return {
      valido: false,
      motivo:
        "carnet-pendiente",
      mensaje:
        "El periodo de validez de este carnet todavía no ha comenzado.",
    };
  }

  if (
    carnet.fechaCaducidad &&
    hoy >
      carnet.fechaCaducidad
  ) {
    return {
      valido: false,
      motivo:
        "carnet-caducado",
      mensaje:
        "El periodo de validez de este carnet ha finalizado.",
    };
  }

  if (
    carnet.estado !==
    "activo"
  ) {
    return {
      valido: false,
      motivo:
        "carnet-pendiente",
      mensaje:
        "El carnet no se encuentra disponible.",
    };
  }

  return {
    valido: true,
    motivo: "valido",
    mensaje:
      "Carnet válido. El socio puede acceder.",
  };
}

export async function consultarCarnetSocioPanel(
  numeroCarnetRecibido: string,
): Promise<ResultadoEscaneoCarnet> {
  const numeroCarnet =
    normalizarNumeroCarnetSocio(
      numeroCarnetRecibido,
    );

  if (
    !esNumeroCarnetSocioValido(
      numeroCarnet,
    )
  ) {
    return crearResultadoNoValido(
      "formato-invalido",
      "El código leído no corresponde a un carnet de socio válido.",
    );
  }

  const {
    data:
      carnetEncontrado,
    error,
  } = await supabaseServidor
    .from(
      "socios_temporadas",
    )
    .select(`
      id,
      socio_id,
      temporada_id,
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
      email_bienvenida_enviado_at,
      ultimo_acceso_at,
      version_acceso,
      created_at,
      updated_at,
      socio:socios!inner(
        id,
        numero_socio,
        nombre,
        apellidos,
        email,
        telefono,
        activo
      ),
      temporada:temporadas!inner(
        id,
        nombre,
        fecha_inicio,
        fecha_fin,
        activa
      )
    `)
    .eq(
      "numero_carnet",
      numeroCarnet,
    )
    .maybeSingle();

  if (error) {
    throw new ErrorConsultarCarnetSocioPanel(
      `No se ha podido consultar el carnet: ${error.message}`,
      500,
    );
  }

  if (!carnetEncontrado) {
    return crearResultadoNoValido(
      "no-encontrado",
      "No se ha encontrado ningún socio con este número de carnet.",
    );
  }

  const fila =
    carnetEncontrado as unknown as
      FilaCarnetEscaneo;

  const socio =
    obtenerRelacionUnica(
      fila.socio,
    );

  const temporada =
    obtenerRelacionUnica(
      fila.temporada,
    );

  if (!socio) {
    throw new ErrorConsultarCarnetSocioPanel(
      "El carnet no tiene asociado correctamente un socio.",
      500,
    );
  }

  if (!temporada) {
    throw new ErrorConsultarCarnetSocioPanel(
      "El carnet no tiene asociada correctamente una temporada.",
      500,
    );
  }

  const carnet =
    convertirFilaCarnetSocio({
      ...fila,
      temporada,
    });

  if (!carnet) {
    throw new ErrorConsultarCarnetSocioPanel(
      "No se han podido interpretar los datos del carnet.",
      500,
    );
  }

  const evaluacion =
    evaluarCarnet(
      socio,
      carnet,
    );

  const nombre =
    socio.nombre?.trim() ||
    "Socio";

  const apellidos =
    socio.apellidos?.trim() ||
    "";

  const nombreCompleto =
    [nombre, apellidos]
      .filter(Boolean)
      .join(" ");

  return {
    encontrado: true,
    valido:
      evaluacion.valido,
    motivo:
      evaluacion.motivo,
    mensaje:
      evaluacion.mensaje,

    socio: {
      id:
        socio.id,

      numeroSocio:
        socio.numero_socio,

      nombre,

      apellidos,

      nombreCompleto,

      email:
        socio.email
          ?.trim() ||
        "",

      telefono:
        socio.telefono
          ?.trim() ||
        null,

      activo:
        Boolean(
          socio.activo,
        ),
    },

    carnet,
  };
}