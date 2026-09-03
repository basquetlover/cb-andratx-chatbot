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
  validarCreacionSocio,
} from "./validarDatosSocio";

import type {
  ErrorCampoSocio,
  ResultadoCreacionSocio,
} from "@tipos/SocioPanel";

interface FilaTemporada {
  id: string;
  nombre: string | null;
  activa: boolean | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

interface FilaSocioCreado {
  id: string;
  numero_socio: number;
}

export class ErrorCrearSocioPanel
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
      "ErrorCrearSocioPanel";

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

  if (
    !Number.isInteger(anio)
  ) {
    return null;
  }

  return anio;
}

async function eliminarSocioIncompleto(
  socioId: string,
): Promise<void> {
  const {
    error,
  } =
    await supabaseServidor
      .from("socios")
      .delete()
      .eq("id", socioId);

  if (error) {
    console.error(
      "No se ha podido eliminar el socio después de fallar la creación del carnet:",
      {
        socioId,
        error:
          error.message,
      },
    );
  }
}

async function comprobarEmailDisponible(
  email: string,
): Promise<void> {
  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("socios")
      .select("id")
      .ilike(
        "email",
        email,
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorCrearSocioPanel(
      `No se ha podido comprobar el correo electrónico: ${error.message}`,
      500,
    );
  }

  if (data) {
    throw new ErrorCrearSocioPanel(
      "Ya existe un socio con ese correo electrónico.",
      409,
      [
        {
          campo: "email",
          mensaje:
            "Este correo electrónico ya está siendo utilizado por otro socio.",
        },
      ],
    );
  }
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
        activa,
        fecha_inicio,
        fecha_fin
      `)
      .eq(
        "id",
        temporadaId,
      )
      .maybeSingle();

  if (error) {
    throw new ErrorCrearSocioPanel(
      `No se ha podido comprobar la temporada: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorCrearSocioPanel(
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

function obtenerAniosCarnet(
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
    throw new ErrorCrearSocioPanel(
      "No se han podido determinar los años de la temporada.",
      400,
      [
        {
          campo:
            "temporadaId",

          mensaje:
            "La temporada debe tener un año de inicio y un año de finalización consecutivos.",
        },
      ],
    );
  }

  return {
    anioInicio,
    anioFin,
  };
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
        "La fecha de alta no puede ser anterior al comienzo de la temporada.",
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
    throw new ErrorCrearSocioPanel(
      "Las fechas del carnet no son válidas para la temporada seleccionada.",
      400,
      errores,
    );
  }
}

export async function crearSocioPanel(
  contenido: unknown,
  usuarioId: string,
): Promise<ResultadoCreacionSocio> {
  const idUsuario =
    usuarioId.trim();

  if (
    !idUsuario ||
    !esUuidValido(
      idUsuario,
    )
  ) {
    throw new ErrorCrearSocioPanel(
      "No se ha podido identificar al usuario que crea el socio.",
      400,
    );
  }

  const validacion =
    validarCreacionSocio(
      contenido,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorCrearSocioPanel(
      "Revisa los datos del formulario.",
      400,
      validacion.errores,
    );
  }

  const datos =
    validacion.datos;

  await comprobarEmailDisponible(
    datos.email,
  );

  const temporada =
    await obtenerTemporada(
      datos.temporadaId,
    );

  comprobarFechasTemporada(
    temporada,
    datos.fechaAlta,
    datos.fechaCaducidad,
  );

  const ahora =
    new Date().toISOString();

  const {
    data: socioCreado,
    error: errorSocio,
  } =
    await supabaseServidor
      .from("socios")
      .insert({
        nombre:
          datos.nombre,

        apellidos:
          datos.apellidos,

        email:
          datos.email,

        telefono:
          datos.telefono ??
          null,

        activo:
          true,

        observaciones:
          datos.observaciones ??
          null,

        creado_por:
          idUsuario,

        actualizado_por:
          idUsuario,

        created_at:
          ahora,

        updated_at:
          ahora,
      })
      .select(`
        id,
        numero_socio
      `)
      .single();

  if (
    errorSocio ||
    !socioCreado
  ) {
    if (
      errorSocio?.code ===
      "23505"
    ) {
      throw new ErrorCrearSocioPanel(
        "Ya existe un socio con ese correo electrónico o número de socio.",
        409,
      );
    }

    throw new ErrorCrearSocioPanel(
      `No se ha podido crear el socio: ${
        errorSocio?.message ??
        "Respuesta vacía de Supabase."
      }`,
      500,
    );
  }

  const filaSocio =
    socioCreado as
      FilaSocioCreado;

  const anios =
    obtenerAniosCarnet(
      temporada,
      datos.fechaAlta,
      datos.fechaCaducidad,
    );

  let numeroCarnet: string;
  let password: string;
  let passwordHash: string;

  try {
    numeroCarnet =
      generarNumeroCarnetSocio(
        filaSocio.numero_socio,
        anios.anioInicio,
        anios.anioFin,
      );

    password =
      obtenerPasswordInicialCarnet(
        numeroCarnet,
      );

    passwordHash =
      await crearHashPasswordSocio(
        password,
      );
  } catch (error) {
    await eliminarSocioIncompleto(
      filaSocio.id,
    );

    console.error(
      "Error generando las credenciales del nuevo socio:",
      error,
    );

    throw new ErrorCrearSocioPanel(
      "No se han podido generar las credenciales del carnet.",
      500,
    );
  }

  const estado =
    datos.activar
      ? "activo"
      : "pendiente";

  const {
    error: errorCarnet,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .insert({
        socio_id:
          filaSocio.id,

        temporada_id:
          temporada.id,

        numero_carnet:
          numeroCarnet,

        password_hash:
          passwordHash,

        tipo_socio:
          datos.tipoSocio ??
          null,

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

  if (errorCarnet) {
    await eliminarSocioIncompleto(
      filaSocio.id,
    );

    throw new ErrorCrearSocioPanel(
      `No se ha podido crear el carnet del socio: ${errorCarnet.message}`,
      errorCarnet.code ===
        "23505"
        ? 409
        : 500,
    );
  }

  const socio =
    await obtenerSocioPanel(
      filaSocio.id,
    );

  return {
    socio,

    credenciales: {
      email:
        datos.email,

      password,
    },

    emailEnviado:
      false,
  };
}