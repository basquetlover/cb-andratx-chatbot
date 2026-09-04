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
  validarCreacionSocio,
} from "./validarDatosSocio";

import {
  obtenerSocioPanel,
} from "./obtenerSocioPanel";

import {
  enviarBienvenidaSocioSiCorresponde,
} from "./enviarBienvenidaSocioSiCorresponde";

import type {
  CarnetTemporadaSocio,
  CrearSocioPanel,
  ErrorCampoSocio,
  ResultadoCrearSocio,
} from "@tipos/SocioPanel";

interface FilaTemporada {
  id: string;
  nombre: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean | null;
}

interface FilaSocioCreado {
  id: string;
  email: string;
}

interface FilaCarnetCreado {
  id: string;
}

interface ErrorSupabase {
  code?: string;
  message?: string;
  details?: string;
}

interface CarnetCreado {
  id: string;
  numeroSocio: number;
  numeroCarnet: string;
  passwordCarnet: string;
}

const MAXIMOS_INTENTOS_NUMERACION =
  5;

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

function convertirTextoNullable(
  valor:
    | string
    | null
    | undefined,
): string | null {
  if (
    typeof valor !== "string"
  ) {
    return null;
  }

  const texto =
    valor.trim();

  return texto || null;
}

function normalizarEmail(
  valor: string,
): string {
  return valor
    .trim()
    .toLowerCase();
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

async function eliminarSocioIncompleto(
  socioId: string,
): Promise<void> {
  const {
    error,
  } = await supabaseServidor
    .from("socios")
    .delete()
    .eq(
      "id",
      socioId,
    );

  if (error) {
    console.error(
      "No se ha podido eliminar el socio después de un alta incompleta:",
      {
        socioId,
        error,
      },
    );
  }
}

async function insertarPrimerCarnet({
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
}): Promise<CarnetCreado> {
  if (
    !temporada.fecha_inicio ||
    !temporada.fecha_fin
  ) {
    throw new ErrorCrearSocioPanel(
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
       * Otro proceso ha podido insertar
       * el mismo máximo + 1 entre nuestra
       * consulta y el INSERT.
       *
       * Volvemos a consultar el máximo y
       * probamos con el siguiente.
       */
      if (
        intento <
        MAXIMOS_INTENTOS_NUMERACION
      ) {
        continue;
      }

      throw new ErrorCrearSocioPanel(
        "No se ha podido asignar un número de socio después de varios intentos.",
        409,
      );
    }

    throw new ErrorCrearSocioPanel(
      `No se ha podido crear el carnet inicial: ${
        error?.message ??
        "Error desconocido"
      }`,
      500,
    );
  }

  throw new ErrorCrearSocioPanel(
    "No se ha podido asignar el número de socio.",
    409,
  );
}

export async function crearSocioPanel(
  datos:
    CrearSocioPanel,
  usuarioId: string,
): Promise<ResultadoCrearSocio> {
  const errores =
    validarCreacionSocio(
      datos,
    );

  if (
    errores.length > 0
  ) {
    throw new ErrorCrearSocioPanel(
      "Revisa los datos del socio.",
      400,
      errores,
    );
  }

  const nombre =
    datos.nombre.trim();

  const apellidos =
    datos.apellidos.trim();

  const email =
    normalizarEmail(
      datos.email,
    );

  const telefono =
    convertirTextoNullable(
      datos.telefono,
    );

  const observaciones =
    convertirTextoNullable(
      datos.observaciones,
    );

  const temporadaId =
    datos.carnet.temporadaId
      .trim();

  const tipoSocio =
    datos.carnet.tipoSocio
      .trim();

  const fechaAlta =
    datos.carnet.fechaAlta
      .trim();

  const fechaCaducidad =
    datos.carnet
      .fechaCaducidad
      .trim();

  const ahora =
    new Date().toISOString();

  const {
    data:
      socioConMismoEmail,
    error:
      errorComprobandoEmail,
  } = await supabaseServidor
    .from("socios")
    .select("id")
    .ilike(
      "email",
      email,
    )
    .limit(1)
    .maybeSingle();

  if (errorComprobandoEmail) {
    throw new ErrorCrearSocioPanel(
      `No se ha podido comprobar el correo electrónico: ${errorComprobandoEmail.message}`,
      500,
    );
  }

  if (socioConMismoEmail) {
    throw new ErrorCrearSocioPanel(
      "Ya existe un socio con este correo electrónico.",
      409,
      [
        {
          campo: "email",
          mensaje:
            "Este correo electrónico ya está registrado.",
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
    throw new ErrorCrearSocioPanel(
      `No se ha podido consultar la temporada: ${errorTemporada.message}`,
      500,
    );
  }

  if (!temporadaEncontrada) {
    throw new ErrorCrearSocioPanel(
      "La temporada seleccionada no existe.",
      404,
      [
        {
          campo:
            "carnet.temporadaId",
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
    throw new ErrorCrearSocioPanel(
      "La temporada no tiene configuradas correctamente sus fechas.",
      500,
    );
  }

  if (
    fechaAlta <
    temporada.fecha_inicio
  ) {
    throw new ErrorCrearSocioPanel(
      "La fecha de alta no puede ser anterior al inicio de la temporada.",
      400,
      [
        {
          campo:
            "carnet.fechaAlta",
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
    throw new ErrorCrearSocioPanel(
      "La fecha de caducidad no puede superar el final de la temporada.",
      400,
      [
        {
          campo:
            "carnet.fechaCaducidad",
          mensaje:
            "La fecha de caducidad no puede superar el final de la temporada.",
        },
      ],
    );
  }

  const {
    data:
      socioCreado,
    error:
      errorCreandoSocio,
  } = await supabaseServidor
    .from("socios")
    .insert({
      nombre,
      apellidos,
      email,
      telefono,
      observaciones,

      activo:
        datos.activo,

      creado_por:
        usuarioId,

      actualizado_por:
        usuarioId,

      created_at:
        ahora,

      updated_at:
        ahora,
    })
    .select(`
      id,
      email
    `)
    .single();

  if (errorCreandoSocio) {
    if (
      esErrorDuplicado(
        errorCreandoSocio,
      )
    ) {
      throw new ErrorCrearSocioPanel(
        "Ya existe un socio con estos datos.",
        409,
      );
    }

    throw new ErrorCrearSocioPanel(
      `No se ha podido crear el socio: ${errorCreandoSocio.message}`,
      500,
    );
  }

  const nuevaFilaSocio =
    socioCreado as
      FilaSocioCreado;

  let carnetCreado:
    CarnetCreado;

  try {
    carnetCreado =
      await insertarPrimerCarnet({
        socioId:
          nuevaFilaSocio.id,

        temporada,

        tipoSocio,

        estado:
          datos.carnet.estado,

        fechaAlta,
        fechaCaducidad,

        usuarioId,
        ahora,
      });
  } catch (error) {
    await eliminarSocioIncompleto(
      nuevaFilaSocio.id,
    );

    if (
      error instanceof
      ErrorCrearSocioPanel
    ) {
      throw error;
    }

    throw new ErrorCrearSocioPanel(
      error instanceof Error
        ? error.message
        : "No se ha podido crear el carnet inicial.",
      500,
    );
  }

  const carnetActivo =
    datos.carnet.estado ===
    "activo";

  let emailEnviado = false;

  /*
   * La función de correo se corregirá para
   * seleccionar el carnet activo y marcar
   * email_bienvenida_enviado_at en
   * socios_temporadas.
   */
  if (
    datos.activo &&
    carnetActivo
  ) {
    try {
      const resultadoEnvio =
        await enviarBienvenidaSocioSiCorresponde(
          nuevaFilaSocio.id,
        );

      emailEnviado =
        resultadoEnvio.enviado ||
        resultadoEnvio.motivo ===
          "ya-enviado";
    } catch (error) {
      console.error(
        `El socio ${nuevaFilaSocio.id} se ha creado, pero no se ha podido enviar el correo de acceso al carnet:`,
        error,
      );
    }
  }

  const socio =
    await obtenerSocioPanel(
      nuevaFilaSocio.id,
    );

  const carnet =
    socio.carnets.find(
      (elemento) =>
        elemento.id ===
        carnetCreado.id,
    );

  if (!carnet) {
    throw new ErrorCrearSocioPanel(
      "El socio y su carnet se han creado, pero no se ha podido recuperar el carnet generado.",
      500,
    );
  }

  return {
    socio,

    carnet:
      carnet as
        CarnetTemporadaSocio,

    credenciales: {
      email:
        nuevaFilaSocio.email,

      numeroSocio:
        carnetCreado.numeroSocio,

      numeroCarnet:
        carnetCreado.numeroCarnet,

      passwordCarnet:
        carnetCreado.passwordCarnet,
    },

    emailEnviado,
  };
}