import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  crearHashPasswordSocio,
} from "./passwordSocio";

import {
  generarNumeroCarnetSocio,
  generarPasswordCarnetSocio,
  obtenerCodigoTemporadaSocio,
  obtenerSiguienteNumeroSocioTemporada,
} from "./numeroCarnetSocio";

import {
  obtenerSocioPanel,
} from "./obtenerSocioPanel";

import {
  enviarBienvenidaSocioSiCorresponde,
} from "./enviarBienvenidaSocioSiCorresponde";

import type {
  CarnetTemporadaSocio,
  CrearCarnetTemporadaSocio,
  ErrorCampoSocio,
  ResultadoCrearCarnetSocio,
} from "@tipos/SocioPanel";

interface FilaSocio {
  id: string;
  email: string;
  activo: boolean;
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
  details?: string;
  constraint?: string;
}

interface CarnetInsertado {
  id: string;
  numeroSocio: number;
  numeroCarnet: string;
  passwordCarnet: string;
}

const MAXIMOS_INTENTOS_NUMERACION =
  5;

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

function esFechaValida(
  fecha: string,
): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    fecha,
  );
}

function validarDatos(
  datos:
    CrearCarnetTemporadaSocio,
): ErrorCampoSocio[] {
  const errores:
    ErrorCampoSocio[] = [];

  if (
    !datos.temporadaId?.trim()
  ) {
    errores.push({
      campo: "temporadaId",
      mensaje:
        "Debes seleccionar una temporada.",
    });
  }

  if (
    !datos.tipoSocio?.trim()
  ) {
    errores.push({
      campo: "tipoSocio",
      mensaje:
        "Debes seleccionar un tipo de socio.",
    });
  }

  if (
    datos.estado !==
      "pendiente" &&
    datos.estado !==
      "activo"
  ) {
    errores.push({
      campo: "estado",
      mensaje:
        "El estado inicial del carnet no es válido.",
    });
  }

  if (
    !esFechaValida(
      datos.fechaAlta,
    )
  ) {
    errores.push({
      campo: "fechaAlta",
      mensaje:
        "La fecha de alta no es válida.",
    });
  }

  if (
    !esFechaValida(
      datos.fechaCaducidad,
    )
  ) {
    errores.push({
      campo: "fechaCaducidad",
      mensaje:
        "La fecha de caducidad no es válida.",
    });
  }

  if (
    esFechaValida(
      datos.fechaAlta,
    ) &&
    esFechaValida(
      datos.fechaCaducidad,
    ) &&
    datos.fechaCaducidad <
      datos.fechaAlta
  ) {
    errores.push({
      campo: "fechaCaducidad",
      mensaje:
        "La fecha de caducidad no puede ser anterior a la fecha de alta.",
    });
  }

  return errores;
}

async function existeCarnetSocioTemporada(
  socioId: string,
  temporadaId: string,
): Promise<boolean> {
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
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido comprobar si el socio ya tiene carnet en esta temporada: ${error.message}`,
      500,
    );
  }

  return Boolean(data);
}

async function insertarCarnet({
  socioId,
  temporada,
  tipoSocio,
  estado,
  fechaAlta,
  fechaCaducidad,
  usuarioId,
  ahora,
}: {
  socioId: string;
  temporada: FilaTemporada;
  tipoSocio: string;
  estado:
    | "pendiente"
    | "activo";
  fechaAlta: string;
  fechaCaducidad: string;
  usuarioId: string;
  ahora: string;
}): Promise<CarnetInsertado> {
  if (
    !temporada.fecha_inicio ||
    !temporada.fecha_fin
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "La temporada no tiene configuradas correctamente sus fechas.",
      500,
    );
  }

  const codigoTemporada =
    obtenerCodigoTemporadaSocio(
      temporada.fecha_inicio,
      temporada.fecha_fin,
    );

  const carnetActivo =
    estado === "activo";

  for (
    let intento = 1;
    intento <=
    MAXIMOS_INTENTOS_NUMERACION;
    intento += 1
  ) {
    const numeroSocio =
      await obtenerSiguienteNumeroSocioTemporada(
        temporada.id,
      );

    const numeroCarnet =
      generarNumeroCarnetSocio(
        codigoTemporada,
        numeroSocio,
      );

    const passwordCarnet =
      generarPasswordCarnetSocio(
        numeroCarnet,
      );

    const passwordHash =
      await crearHashPasswordSocio(
        passwordCarnet,
      );

    const {
      data,
      error,
    } =
      await supabaseServidor
        .from(
          "socios_temporadas",
        )
        .insert({
          socio_id:
            socioId,

          temporada_id:
            temporada.id,

          numero_socio:
            numeroSocio,

          numero_carnet:
            numeroCarnet,

          password_hash:
            passwordHash,

          password_updated_at:
            ahora,

          intentos_fallidos:
            0,

          bloqueado_hasta:
            null,

          ultimo_acceso_at:
            null,

          email_bienvenida_enviado_at:
            null,

          tipo_socio:
            tipoSocio,

          estado,

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

    if (!error && data) {
      const fila =
        data as FilaCarnetCreado;

      return {
        id: fila.id,
        numeroSocio,
        numeroCarnet,
        passwordCarnet,
      };
    }

    if (
      error &&
      esErrorDuplicado(error)
    ) {
      /*
       * Antes de reintentar comprobamos si
       * el conflicto es porque otro proceso
       * ya creó el carnet del mismo socio.
       */
      const yaExiste =
        await existeCarnetSocioTemporada(
          socioId,
          temporada.id,
        );

      if (yaExiste) {
        throw new ErrorCrearCarnetSocioPanel(
          "El socio ya tiene un carnet para esta temporada.",
          409,
          [
            {
              campo:
                "temporadaId",
              mensaje:
                "Ya existe un carnet de este socio en la temporada seleccionada.",
            },
          ],
        );
      }

      /*
       * Si el conflicto era únicamente por
       * el número, volvemos a calcular el
       * máximo de la temporada y reintentamos.
       */
      if (
        intento <
        MAXIMOS_INTENTOS_NUMERACION
      ) {
        continue;
      }

      throw new ErrorCrearCarnetSocioPanel(
        "No se ha podido asignar un número de socio después de varios intentos.",
        409,
      );
    }

    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido crear el carnet: ${
        error?.message ??
        "Error desconocido"
      }`,
      500,
    );
  }

  throw new ErrorCrearCarnetSocioPanel(
    "No se ha podido asignar el número de socio.",
    409,
  );
}

export async function crearCarnetSocioPanel(
  socioId: string,
  datos:
    CrearCarnetTemporadaSocio,
  usuarioId: string,
): Promise<ResultadoCrearCarnetSocio> {
  const socioIdLimpio =
    socioId.trim();

  if (!socioIdLimpio) {
    throw new ErrorCrearCarnetSocioPanel(
      "El identificador del socio es obligatorio.",
      400,
    );
  }

  const errores =
    validarDatos(
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
    datos.fechaCaducidad.trim();

  const ahora =
    new Date().toISOString();

  const {
    data:
      socioEncontrado,
    error:
      errorSocio,
  } = await supabaseServidor
    .from("socios")
    .select(`
      id,
      email,
      activo
    `)
    .eq(
      "id",
      socioIdLimpio,
    )
    .maybeSingle();

  if (errorSocio) {
    throw new ErrorCrearCarnetSocioPanel(
      `No se ha podido consultar el socio: ${errorSocio.message}`,
      500,
    );
  }

  if (!socioEncontrado) {
    throw new ErrorCrearCarnetSocioPanel(
      "El socio no existe.",
      404,
    );
  }

  const socio =
    socioEncontrado as
      FilaSocio;

  if (
    await existeCarnetSocioTemporada(
      socio.id,
      temporadaId,
    )
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "El socio ya tiene un carnet para esta temporada.",
      409,
      [
        {
          campo:
            "temporadaId",
          mensaje:
            "Ya existe un carnet de este socio en la temporada seleccionada.",
        },
      ],
    );
  }

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
    .eq(
      "id",
      temporadaId,
    )
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

  if (
    !temporada.fecha_inicio ||
    !temporada.fecha_fin
  ) {
    throw new ErrorCrearCarnetSocioPanel(
      "La temporada no tiene configuradas correctamente sus fechas.",
      500,
    );
  }

  if (
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

  const carnetInsertado =
    await insertarCarnet({
      socioId:
        socio.id,

      temporada,

      tipoSocio,

      estado:
        datos.estado,

      fechaAlta,
      fechaCaducidad,

      usuarioId,
      ahora,
    });

  let emailEnviado = false;

  /*
   * El segundo argumento identifica el
   * carnet exacto cuyas credenciales deben
   * enviarse. Corregiremos esa función en
   * su archivo correspondiente.
   */
  if (
    socio.activo &&
    datos.estado ===
      "activo"
  ) {
    try {
      const resultadoEnvio =
        await enviarBienvenidaSocioSiCorresponde(
          socio.id,
          carnetInsertado.id,
        );

      emailEnviado =
        resultadoEnvio.enviado ||
        resultadoEnvio.motivo ===
          "ya-enviado";
    } catch (error) {
      console.error(
        `El carnet ${carnetInsertado.id} se ha creado, pero no se ha podido enviar su correo de acceso:`,
        error,
      );
    }
  }

  const socioActualizado =
    await obtenerSocioPanel(
      socio.id,
    );

  const carnet =
    socioActualizado.carnets.find(
      (elemento) =>
        elemento.id ===
        carnetInsertado.id,
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

    carnet:
      carnet as
        CarnetTemporadaSocio,

    credenciales: {
      email:
        socio.email,

      numeroSocio:
        carnetInsertado.numeroSocio,

      numeroCarnet:
        carnetInsertado.numeroCarnet,

      passwordCarnet:
        carnetInsertado.passwordCarnet,
    },

    emailEnviado,
  };
}