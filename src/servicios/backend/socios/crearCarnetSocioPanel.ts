import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  generarNumeroCarnetSocio,
  obtenerPasswordInicialCarnet,
} from "./numeroCarnetSocio";

import {
  crearHashPasswordSocio,
} from "./passwordSocio";

import {
  obtenerSocioPanel,
} from "./obtenerSocioPanel";

import {
  validarCreacionCarnetSocio,
} from "./validarDatosSocio";

import type {
  ErrorCampoSocio,
  ResultadoCreacionSocio,
} from "@tipos/SocioPanel";

interface FilaSocio {
  id: string;
  numero_socio: number;
  email: string;
}

interface FilaTemporada {
  id: string;
  nombre: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
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

function esUuidValido(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function obtenerAnioFecha(
  fecha: string | null,
): number | null {
  if (
    !fecha ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      fecha,
    )
  ) {
    return null;
  }

  const anio =
    Number(
      fecha.slice(
        0,
        4,
      ),
    );

  return Number.isInteger(anio)
    ? anio
    : null;
}

async function obtenerSocio(
  socioId: string,
): Promise<FilaSocio> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("socios")
      .select(`
        id,
        numero_socio,
        email
      `)
      .eq(
        "id",
        socioId,
      )
      .maybeSingle();

  if (error) {
    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido comprobar el socio: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorCrearCarnetSocioPanel(
      "El socio solicitado no existe.",
      404,
    );
  }

  return data as
    FilaSocio;
}

async function obtenerTemporada(
  temporadaId: string,
): Promise<FilaTemporada> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("temporadas")
      .select(`
        id,
        nombre,
        fecha_inicio,
        fecha_fin
      `)
      .eq(
        "id",
        temporadaId,
      )
      .maybeSingle();

  if (error) {
    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido comprobar la temporada: ${error.message}`,
      500,
    );
  }

  if (!data) {
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

  return data as
    FilaTemporada;
}

async function comprobarCarnetNoExiste(
  socioId: string,
  temporadaId: string,
): Promise<void> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .select("id")
      .eq(
        "socio_id",
        socioId,
      )
      .eq(
        "temporada_id",
        temporadaId,
      )
      .maybeSingle();

  if (error) {
    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido comprobar el historial del socio: ${error.message}`,
      500,
    );
  }

  if (data) {
    throw new ErrorCrearCarnetSocioPanel(
      "El socio ya tiene un carnet para esta temporada.",
      409,
      [
        {
          campo:
            "temporadaId",

          mensaje:
            "Ya existe un carnet de este socio para la temporada seleccionada.",
        },
      ],
    );
  }
}

function comprobarFechasTemporada(
  temporada: FilaTemporada,
  fechaAlta: string,
  fechaCaducidad: string,
): void {
  const errores:
    ErrorCampoSocio[] = [];

  if (
    temporada.fecha_inicio &&
    fechaAlta <
      temporada.fecha_inicio
  ) {
    errores.push({
      campo:
        "fechaAlta",

      mensaje:
        "La fecha de alta no puede ser anterior al inicio de la temporada.",
    });
  }

  if (
    temporada.fecha_fin &&
    fechaCaducidad >
      temporada.fecha_fin
  ) {
    errores.push({
      campo:
        "fechaCaducidad",

      mensaje:
        "La fecha de caducidad no puede superar el final de la temporada.",
    });
  }

  if (
    errores.length > 0
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "Las fechas del carnet no son válidas para esta temporada.",
      400,
      errores,
    );
  }
}

function obtenerAniosTemporada(
  temporada: FilaTemporada,
  fechaAlta: string,
  fechaCaducidad: string,
): {
  anioInicio: number;
  anioFin: number;
} {
  const anioInicio =
    obtenerAnioFecha(
      temporada.fecha_inicio,
    ) ??
    obtenerAnioFecha(
      fechaAlta,
    );

  const anioFin =
    obtenerAnioFecha(
      temporada.fecha_fin,
    ) ??
    obtenerAnioFecha(
      fechaCaducidad,
    );

  if (
    anioInicio === null ||
    anioFin === null ||
    anioFin !==
      anioInicio + 1
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "No se han podido determinar los años de la temporada.",
      400,
      [
        {
          campo:
            "temporadaId",

          mensaje:
            "La temporada debe abarcar dos años consecutivos.",
        },
      ],
    );
  }

  return {
    anioInicio,
    anioFin,
  };
}

export async function crearCarnetSocioPanel(
  socioId: string,
  contenido: unknown,
  usuarioId: string,
): Promise<ResultadoCreacionSocio> {
  const idSocio =
    socioId.trim();

  const idUsuario =
    usuarioId.trim();

  if (
    !idSocio ||
    !esUuidValido(
      idSocio,
    )
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "El identificador del socio no es válido.",
      400,
    );
  }

  if (
    !idUsuario ||
    !esUuidValido(
      idUsuario,
    )
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "No se ha podido identificar al usuario que crea el carnet.",
      400,
    );
  }

  const validacion =
    validarCreacionCarnetSocio(
      contenido,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "Revisa los datos del carnet.",
      400,
      validacion.errores,
    );
  }

  const datos =
    validacion.datos;

  const [
    socio,
    temporada,
  ] = await Promise.all([
    obtenerSocio(
      idSocio,
    ),

    obtenerTemporada(
      datos.temporadaId,
    ),
  ]);

  await comprobarCarnetNoExiste(
    idSocio,
    datos.temporadaId,
  );

  comprobarFechasTemporada(
    temporada,
    datos.fechaAlta,
    datos.fechaCaducidad,
  );

  const anios =
    obtenerAniosTemporada(
      temporada,
      datos.fechaAlta,
      datos.fechaCaducidad,
    );

  const numeroCarnet =
    generarNumeroCarnetSocio(
      socio.numero_socio,
      anios.anioInicio,
      anios.anioFin,
    );

  const password =
    obtenerPasswordInicialCarnet(
      numeroCarnet,
    );

  const passwordHash =
    await crearHashPasswordSocio(
      password,
    );

  const ahora =
    new Date().toISOString();

  const estado =
    datos.activar
      ? "activo"
      : "pendiente";

  const {
    error,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .insert({
        socio_id:
          idSocio,

        temporada_id:
          temporada.id,

        numero_carnet:
          numeroCarnet,

        password_hash:
          passwordHash,

        tipo_socio:
          datos.tipoSocio,

        estado,

        fecha_alta:
          datos.fechaAlta,

        fecha_caducidad:
          datos.fechaCaducidad,

        activado_at:
          datos.activar
            ? ahora
            : null,

        activado_por:
          datos.activar
            ? idUsuario
            : null,

        bloqueado_at:
          null,

        bloqueado_por:
          null,

        motivo_bloqueo:
          null,

        email_bienvenida_enviado_at:
          null,

        ultimo_acceso_at:
          null,

        intentos_fallidos:
          0,

        bloqueado_hasta:
          null,

        password_updated_at:
          ahora,

        version_acceso:
          1,

        creado_por:
          idUsuario,

        actualizado_por:
          idUsuario,

        created_at:
          ahora,

        updated_at:
          ahora,
      });

  if (error) {
    if (
      error.code ===
      "23505"
    ) {
      throw new ErrorCrearCarnetSocioPanel(
        "El socio ya tiene un carnet para esta temporada.",
        409,
        [
          {
            campo:
              "temporadaId",

            mensaje:
              "Ya existe un carnet para esta temporada.",
          },
        ],
      );
    }

    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido crear el carnet: ${error.message}`,
      500,
    );
  }

  const socioActualizado =
    await obtenerSocioPanel(
      idSocio,
    );

  return {
    socio:
      socioActualizado,

    credenciales: {
      email:
        socio.email.trim().toLowerCase(),

      password,
    },

    emailEnviado:
      false,
  };
}