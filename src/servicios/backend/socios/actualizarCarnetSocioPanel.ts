import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  obtenerSocioPanel,
} from "./obtenerSocioPanel";

import {
  enviarBienvenidaSocioSiCorresponde,
} from "./enviarBienvenidaSocioSiCorresponde";

import type {
  ActualizarCarnetTemporadaSocio,
  ErrorCampoSocio,
  EstadoCarnetSocio,
  SocioPanel,
} from "@tipos/SocioPanel";

interface FilaCarnetExistente {
  id: string;
  socio_id: string;
  temporada_id: string;

  estado:
    EstadoCarnetSocio;

  fecha_alta: string;
  fecha_caducidad: string;

  activado_at: string | null;
  activado_por: string | null;

  bloqueado_at: string | null;
  bloqueado_por: string | null;

  motivo_bloqueo: string | null;

  version_acceso: number;

  email_bienvenida_enviado_at:
    | string
    | null;
}

interface FilaTemporada {
  id: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

interface FilaSocio {
  id: string;
  activo: boolean;
}

export class ErrorActualizarCarnetSocioPanel
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
      "ErrorActualizarCarnetSocioPanel";

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

function esFechaValida(
  fecha: string,
): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    fecha,
  );
}

function esEstadoCarnet(
  estado: unknown,
): estado is EstadoCarnetSocio {
  return (
    estado === "pendiente" ||
    estado === "activo" ||
    estado === "bloqueado" ||
    estado === "caducado"
  );
}

function validarDatos(
  datos:
    ActualizarCarnetTemporadaSocio,
): ErrorCampoSocio[] {
  const errores:
    ErrorCampoSocio[] = [];

  if (
    !datos.tipoSocio?.trim()
  ) {
    errores.push({
      campo: "tipoSocio",
      mensaje:
        "Debes indicar el tipo de socio.",
    });
  }

  if (
    !esEstadoCarnet(
      datos.estado,
    )
  ) {
    errores.push({
      campo: "estado",
      mensaje:
        "El estado del carnet no es válido.",
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

  if (
    datos.estado ===
      "bloqueado" &&
    !datos.motivoBloqueo
      ?.trim()
  ) {
    errores.push({
      campo:
        "motivoBloqueo",
      mensaje:
        "Debes indicar el motivo del bloqueo.",
    });
  }

  return errores;
}

export async function actualizarCarnetSocioPanel(
  socioId: string,
  carnetId: string,
  datos:
    ActualizarCarnetTemporadaSocio,
  usuarioId: string,
): Promise<SocioPanel> {
  const socioIdLimpio =
    socioId.trim();

  const carnetIdLimpio =
    carnetId.trim();

  const usuarioIdLimpio =
    usuarioId.trim();

  if (!socioIdLimpio) {
    throw new ErrorActualizarCarnetSocioPanel(
      "El identificador del socio es obligatorio.",
      400,
    );
  }

  if (!carnetIdLimpio) {
    throw new ErrorActualizarCarnetSocioPanel(
      "El identificador del carnet es obligatorio.",
      400,
    );
  }

  if (!usuarioIdLimpio) {
    throw new ErrorActualizarCarnetSocioPanel(
      "No se ha podido identificar al administrador.",
      401,
    );
  }

  const errores =
    validarDatos(
      datos,
    );

  if (
    errores.length > 0
  ) {
    throw new ErrorActualizarCarnetSocioPanel(
      "Revisa los datos del carnet.",
      400,
      errores,
    );
  }

  const tipoSocio =
    datos.tipoSocio.trim();

  const fechaAlta =
    datos.fechaAlta.trim();

  const fechaCaducidad =
    datos.fechaCaducidad.trim();

  const motivoBloqueo =
    datos.estado ===
      "bloqueado"
      ? convertirTextoNullable(
          datos.motivoBloqueo,
        )
      : null;

  const {
    data:
      carnetEncontrado,
    error:
      errorCarnet,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .select(`
        id,
        socio_id,
        temporada_id,

        estado,

        fecha_alta,
        fecha_caducidad,

        activado_at,
        activado_por,

        bloqueado_at,
        bloqueado_por,

        motivo_bloqueo,

        version_acceso,
        email_bienvenida_enviado_at
      `)
      .eq(
        "id",
        carnetIdLimpio,
      )
      .eq(
        "socio_id",
        socioIdLimpio,
      )
      .limit(1)
      .maybeSingle();

  if (errorCarnet) {
    throw new ErrorActualizarCarnetSocioPanel(
      `No se ha podido consultar el carnet: ${errorCarnet.message}`,
      500,
    );
  }

  if (!carnetEncontrado) {
    throw new ErrorActualizarCarnetSocioPanel(
      "El carnet no existe o no pertenece al socio.",
      404,
    );
  }

  const carnet =
    carnetEncontrado as
      FilaCarnetExistente;

  const {
    data:
      temporadaEncontrada,
    error:
      errorTemporada,
  } =
    await supabaseServidor
      .from("temporadas")
      .select(`
        id,
        fecha_inicio,
        fecha_fin
      `)
      .eq(
        "id",
        carnet.temporada_id,
      )
      .limit(1)
      .maybeSingle();

  if (errorTemporada) {
    throw new ErrorActualizarCarnetSocioPanel(
      `No se ha podido consultar la temporada: ${errorTemporada.message}`,
      500,
    );
  }

  if (!temporadaEncontrada) {
    throw new ErrorActualizarCarnetSocioPanel(
      "La temporada asociada al carnet no existe.",
      500,
    );
  }

  const temporada =
    temporadaEncontrada as
      FilaTemporada;

  if (
    temporada.fecha_inicio &&
    fechaAlta <
      temporada.fecha_inicio
  ) {
    throw new ErrorActualizarCarnetSocioPanel(
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
    throw new ErrorActualizarCarnetSocioPanel(
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
      socioEncontrado,
    error:
      errorSocio,
  } =
    await supabaseServidor
      .from("socios")
      .select(`
        id,
        activo
      `)
      .eq(
        "id",
        socioIdLimpio,
      )
      .limit(1)
      .maybeSingle();

  if (errorSocio) {
    throw new ErrorActualizarCarnetSocioPanel(
      `No se ha podido consultar el socio: ${errorSocio.message}`,
      500,
    );
  }

  if (!socioEncontrado) {
    throw new ErrorActualizarCarnetSocioPanel(
      "El socio no existe.",
      404,
    );
  }

  const socio =
    socioEncontrado as
      FilaSocio;

  const ahora =
    new Date().toISOString();

  const cambiaEstado =
    datos.estado !==
    carnet.estado;

  const seActiva =
    datos.estado ===
      "activo" &&
    carnet.estado !==
      "activo";

  const seBloquea =
    datos.estado ===
      "bloqueado";

  const versionAcceso =
    cambiaEstado
      ? Math.max(
          1,
          carnet.version_acceso,
        ) + 1
      : Math.max(
          1,
          carnet.version_acceso,
        );

  const activadoAt =
    seActiva
      ? ahora
      : carnet.activado_at;

  const activadoPor =
    seActiva
      ? usuarioIdLimpio
      : carnet.activado_por;

  const bloqueadoAt =
    seBloquea
      ? carnet.estado ===
          "bloqueado"
        ? carnet.bloqueado_at ??
          ahora
        : ahora
      : null;

  const bloqueadoPor =
    seBloquea
      ? carnet.estado ===
          "bloqueado"
        ? carnet.bloqueado_por ??
          usuarioIdLimpio
        : usuarioIdLimpio
      : null;

  const {
    error:
      errorActualizando,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .update({
        tipo_socio:
          tipoSocio,

        estado:
          datos.estado,

        fecha_alta:
          fechaAlta,

        fecha_caducidad:
          fechaCaducidad,

        motivo_bloqueo:
          motivoBloqueo,

        activado_at:
          activadoAt,

        activado_por:
          activadoPor,

        bloqueado_at:
          bloqueadoAt,

        bloqueado_por:
          bloqueadoPor,

        version_acceso:
          versionAcceso,

        actualizado_por:
          usuarioIdLimpio,

        updated_at:
          ahora,
      })
      .eq(
        "id",
        carnet.id,
      )
      .eq(
        "socio_id",
        socioIdLimpio,
      );

  if (errorActualizando) {
    throw new ErrorActualizarCarnetSocioPanel(
      `No se ha podido actualizar el carnet: ${errorActualizando.message}`,
      500,
    );
  }

  /*
   * No se modifica password_hash.
   *
   * El carnet conserva siempre la
   * contraseña que se generó al crearlo.
   */

  if (
    socio.activo &&
    datos.estado ===
      "activo" &&
    !carnet
      .email_bienvenida_enviado_at
  ) {
    try {
      await enviarBienvenidaSocioSiCorresponde(
        socioIdLimpio,
        carnet.id,
      );
    } catch (error) {
      /*
       * La activación continúa siendo
       * válida aunque falle el proveedor de
       * correo. Al mantenerse el campo de
       * envío en null podrá reintentarse.
       */
      console.error(
        `El carnet ${carnet.id} se ha activado, pero no se ha podido enviar su correo de acceso:`,
        error,
      );
    }
  }

  return obtenerSocioPanel(
    socioIdLimpio,
  );
}