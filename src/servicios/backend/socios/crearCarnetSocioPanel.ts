import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  generarNumeroCarnetSocio,
} from "./numeroCarnetSocio";

import {
  validarCreacionCarnetSocio,
} from "./validarDatosSocio";

import {
  obtenerSocioPanel,
} from "./obtenerSocioPanel";

import type {
  CrearCarnetTemporadaSocio,
  ErrorCampoSocio,
  ResultadoCrearCarnetSocio,
} from "@tipos/SocioPanel";

interface FilaSocio {
  id: string;
  numero_socio: number;
  activo: boolean | null;
}

interface FilaTemporada {
  id: string;
  nombre: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean | null;
}

interface FilaCarnetCreado {
  id: string;
}

interface ErrorSupabase {
  code?: string;
  message?: string;
}

export class ErrorCrearCarnetSocioPanel
  extends Error {
  status: number;
  errores: ErrorCampoSocio[];

  constructor(
    mensaje: string,
    status: number,
    errores:
      ErrorCampoSocio[] = [],
  ) {
    super(mensaje);

    this.name =
      "ErrorCrearCarnetSocioPanel";

    this.status = status;
    this.errores = errores;
  }
}

function esUuid(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function obtenerAnioFecha(
  fecha: string | null,
): number | null {
  if (!fecha) {
    return null;
  }

  const coincidencia =
    /^(\d{4})-\d{2}-\d{2}$/.exec(
      fecha,
    );

  if (!coincidencia) {
    return null;
  }

  const anio =
    Number(
      coincidencia[1],
    );

  return Number.isInteger(
    anio,
  )
    ? anio
    : null;
}

function esErrorDuplicado(
  error: unknown,
): boolean {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return false;
  }

  const errorSupabase =
    error as ErrorSupabase;

  return (
    errorSupabase.code ===
      "23505" ||
    errorSupabase.message
      ?.toLowerCase()
      .includes("duplicate") ===
      true
  );
}

export async function crearCarnetSocioPanel(
  socioIdRecibido: string,
  datos:
    CrearCarnetTemporadaSocio,
  usuarioId: string,
): Promise<ResultadoCrearCarnetSocio> {
  const socioId =
    socioIdRecibido.trim();

  if (
    !socioId ||
    !esUuid(socioId)
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "El identificador del socio no es válido.",
      400,
    );
  }

  const errores =
    validarCreacionCarnetSocio(
      datos,
    );

  if (
    errores.length > 0
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "Revisa los datos del carnet.",
      400,
      errores,
    );
  }

  const temporadaId =
    datos.temporadaId.trim();

  const tipoSocio =
    datos.tipoSocio.trim();

  const fechaAlta =
    datos.fechaAlta.trim();

  const fechaCaducidad =
    datos.fechaCaducidad
      .trim();

  const ahora =
    new Date().toISOString();

  const {
    data: socioEncontrado,
    error: errorSocio,
  } = await supabaseServidor
    .from("socios")
    .select(`
      id,
      numero_socio,
      activo
    `)
    .eq("id", socioId)
    .maybeSingle();

  if (errorSocio) {
    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido consultar el socio: ${errorSocio.message}`,
      500,
    );
  }

  if (!socioEncontrado) {
    throw new ErrorCrearCarnetSocioPanel(
      "El socio solicitado no existe.",
      404,
    );
  }

  const socio =
    socioEncontrado as
      FilaSocio;

  const {
    data:
      temporadaEncontrada,
    error:
      errorTemporada,
  } = await supabaseServidor
    .from("temporadas")
    .select(`
      id,
      nombre,
      fecha_inicio,
      fecha_fin,
      activa
    `)
    .eq("id", temporadaId)
    .maybeSingle();

  if (errorTemporada) {
    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido consultar la temporada: ${errorTemporada.message}`,
      500,
    );
  }

  if (!temporadaEncontrada) {
    throw new ErrorCrearCarnetSocioPanel(
      "La temporada seleccionada no existe.",
      404,
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

  const temporada =
    temporadaEncontrada as
      FilaTemporada;

  const anioInicio =
    obtenerAnioFecha(
      temporada.fecha_inicio,
    );

  const anioFin =
    obtenerAnioFecha(
      temporada.fecha_fin,
    );

  if (
    anioInicio === null ||
    anioFin === null
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "La temporada no tiene configuradas correctamente sus fechas.",
      500,
    );
  }

  if (
    temporada.fecha_inicio &&
    fechaAlta <
      temporada.fecha_inicio
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "La fecha de alta no puede ser anterior al inicio de la temporada.",
      400,
      [
        {
          campo:
            "fechaAlta",
          mensaje:
            "La fecha de alta no puede ser anterior al inicio de la temporada.",
        },
      ],
    );
  }

  if (
    temporada.fecha_fin &&
    fechaCaducidad >
      temporada.fecha_fin
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "La fecha de caducidad no puede superar el final de la temporada.",
      400,
      [
        {
          campo:
            "fechaCaducidad",
          mensaje:
            "La fecha de caducidad no puede superar el final de la temporada.",
        },
      ],
    );
  }

  const {
    data:
      carnetTemporadaExistente,
    error:
      errorComprobandoCarnet,
  } = await supabaseServidor
    .from(
      "socios_temporadas",
    )
    .select("id")
    .eq("socio_id", socio.id)
    .eq(
      "temporada_id",
      temporada.id,
    )
    .limit(1)
    .maybeSingle();

  if (errorComprobandoCarnet) {
    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido comprobar si el socio ya tiene carnet: ${errorComprobandoCarnet.message}`,
      500,
    );
  }

  if (
    carnetTemporadaExistente
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "El socio ya tiene un carnet para esta temporada.",
      409,
      [
        {
          campo:
            "temporadaId",
          mensaje:
            "Ya existe un carnet del socio para esta temporada.",
        },
      ],
    );
  }

  const numeroCarnet =
    generarNumeroCarnetSocio(
      socio.numero_socio,
      anioInicio,
      anioFin,
    );

  const carnetActivo =
    datos.estado ===
    "activo";

  const {
    data: carnetCreado,
    error:
      errorCreandoCarnet,
  } = await supabaseServidor
    .from(
      "socios_temporadas",
    )
    .insert({
      socio_id:
        socio.id,

      temporada_id:
        temporada.id,

      numero_carnet:
        numeroCarnet,

      tipo_socio:
        tipoSocio,

      estado:
        datos.estado,

      fecha_alta:
        fechaAlta,

      fecha_caducidad:
        fechaCaducidad,

      motivo_bloqueo:
        null,

      activado_at:
        carnetActivo
          ? ahora
          : null,

      activado_por:
        carnetActivo
          ? usuarioId
          : null,

      bloqueado_at:
        null,

      bloqueado_por:
        null,

      version_acceso:
        1,

      creado_por:
        usuarioId,

      actualizado_por:
        usuarioId,

      created_at:
        ahora,

      updated_at:
        ahora,
    })
    .select("id")
    .single();

  if (errorCreandoCarnet) {
    if (
      esErrorDuplicado(
        errorCreandoCarnet,
      )
    ) {
      throw new ErrorCrearCarnetSocioPanel(
        "El socio ya tiene un carnet para esta temporada.",
        409,
      );
    }

    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido crear el carnet: ${errorCreandoCarnet.message}`,
      500,
    );
  }

  const nuevaFilaCarnet =
    carnetCreado as
      FilaCarnetCreado;

  const socioActualizado =
    await obtenerSocioPanel(
      socio.id,
    );

  const carnet =
    socioActualizado.carnets.find(
      (elemento) =>
        elemento.id ===
        nuevaFilaCarnet.id,
    );

  if (!carnet) {
    throw new ErrorCrearCarnetSocioPanel(
      "El carnet se ha creado, pero no se ha podido recuperar su información.",
      500,
    );
  }

  return {
    socio:
      socioActualizado,

    carnet,
  };
}