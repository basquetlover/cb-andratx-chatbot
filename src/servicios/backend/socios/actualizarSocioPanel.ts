import {
  enviarBienvenidaSocioSiCorresponde,
  ErrorEnviarBienvenidaSocio,
} from "./enviarBienvenidaSocioSiCorresponde";

import {
  obtenerSocioPanel,
} from "./obtenerSocioPanel";

import {
  supabaseServidor,
} from "../../supabase/servidor";

import type {
  SocioPanel,
} from "../../../types/SocioPanel";

interface FilaSocioActual {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean | null;
  observaciones: string | null;

  email_bienvenida_enviado_at:
    string | null;
}

interface FilaVersionCarnet {
  id: string;
  version_acceso: number | null;
}

interface DatosSocioValidados {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  observaciones: string | null;
}

export class ErrorActualizarSocioPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name =
      "ErrorActualizarSocioPanel";

    this.status = status;
  }
}

function esObjeto(
  valor: unknown,
): valor is Record<
  string,
  unknown
> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
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

function convertirTextoNullable(
  valor: unknown,
): string | null {
  const texto =
    convertirTexto(valor);

  return texto || null;
}

function convertirBooleano(
  valor: unknown,
  valorPredeterminado: boolean,
): boolean {
  if (
    typeof valor === "boolean"
  ) {
    return valor;
  }

  return valorPredeterminado;
}

function validarEmail(
  email: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

function validarDatosSocio(
  entrada: unknown,
  socioActual: FilaSocioActual,
): DatosSocioValidados {
  if (!esObjeto(entrada)) {
    throw new ErrorActualizarSocioPanel(
      "Los datos enviados no son válidos.",
      400,
    );
  }

  const nombre =
    Object.hasOwn(
      entrada,
      "nombre",
    )
      ? convertirTexto(
          entrada.nombre,
        )
      : convertirTexto(
          socioActual.nombre,
        );

  const apellidos =
    Object.hasOwn(
      entrada,
      "apellidos",
    )
      ? convertirTexto(
          entrada.apellidos,
        )
      : convertirTexto(
          socioActual.apellidos,
        );

  const email =
    (
      Object.hasOwn(
        entrada,
        "email",
      )
        ? convertirTexto(
            entrada.email,
          )
        : convertirTexto(
            socioActual.email,
          )
    ).toLowerCase();

  const telefono =
    Object.hasOwn(
      entrada,
      "telefono",
    )
      ? convertirTextoNullable(
          entrada.telefono,
        )
      : socioActual.telefono;

  const activo =
    Object.hasOwn(
      entrada,
      "activo",
    )
      ? convertirBooleano(
          entrada.activo,
          socioActual.activo ??
            false,
        )
      : socioActual.activo ??
        false;

  const observaciones =
    Object.hasOwn(
      entrada,
      "observaciones",
    )
      ? convertirTextoNullable(
          entrada.observaciones,
        )
      : socioActual.observaciones;

  if (!nombre) {
    throw new ErrorActualizarSocioPanel(
      "El nombre del socio es obligatorio.",
      400,
    );
  }

  if (nombre.length > 100) {
    throw new ErrorActualizarSocioPanel(
      "El nombre no puede superar los 100 caracteres.",
      400,
    );
  }

  if (!apellidos) {
    throw new ErrorActualizarSocioPanel(
      "Los apellidos del socio son obligatorios.",
      400,
    );
  }

  if (
    apellidos.length > 150
  ) {
    throw new ErrorActualizarSocioPanel(
      "Los apellidos no pueden superar los 150 caracteres.",
      400,
    );
  }

  if (!email) {
    throw new ErrorActualizarSocioPanel(
      "El correo electrónico es obligatorio.",
      400,
    );
  }

  if (!validarEmail(email)) {
    throw new ErrorActualizarSocioPanel(
      "El correo electrónico no tiene un formato válido.",
      400,
    );
  }

  if (email.length > 254) {
    throw new ErrorActualizarSocioPanel(
      "El correo electrónico es demasiado largo.",
      400,
    );
  }

  if (
    telefono &&
    telefono.length > 30
  ) {
    throw new ErrorActualizarSocioPanel(
      "El teléfono no puede superar los 30 caracteres.",
      400,
    );
  }

  if (
    observaciones &&
    observaciones.length > 2000
  ) {
    throw new ErrorActualizarSocioPanel(
      "Las observaciones no pueden superar los 2000 caracteres.",
      400,
    );
  }

  return {
    nombre,
    apellidos,
    email,
    telefono,
    activo,
    observaciones,
  };
}

async function incrementarVersionesCarnets(
  socioId: string,
  actualizadoPor: string | null,
): Promise<void> {
  const {
    data: carnetsEncontrados,
    error: errorCarnets,
  } = await supabaseServidor
    .from("socios_temporadas")
    .select(`
      id,
      version_acceso
    `)
    .eq("socio_id", socioId);

  if (errorCarnets) {
    throw new ErrorActualizarSocioPanel(
      `No se han podido consultar los carnets del socio: ${errorCarnets.message}`,
    );
  }

  const carnets =
    (
      carnetsEncontrados ?? []
    ) as FilaVersionCarnet[];

  if (carnets.length === 0) {
    return;
  }

  const fechaActualizacion =
    new Date().toISOString();

  const resultados =
    await Promise.all(
      carnets.map(
        async (carnet) => {
          const versionActual =
            typeof carnet.version_acceso ===
              "number" &&
            Number.isInteger(
              carnet.version_acceso,
            ) &&
            carnet.version_acceso >
              0
              ? carnet.version_acceso
              : 1;

          const actualizacion:
            Record<string, unknown> =
            {
              version_acceso:
                versionActual + 1,

              updated_at:
                fechaActualizacion,
            };

          if (actualizadoPor) {
            actualizacion.actualizado_por =
              actualizadoPor;
          }

          const {
            error,
          } = await supabaseServidor
            .from(
              "socios_temporadas",
            )
            .update(
              actualizacion,
            )
            .eq(
              "id",
              carnet.id,
            )
            .eq(
              "socio_id",
              socioId,
            );

          if (error) {
            throw error;
          }
        },
      ),
    );

  void resultados;
}

export async function actualizarSocioPanel(
  socioId: string,
  entrada: unknown,
  actualizadoPor?: string | null,
): Promise<SocioPanel> {
  const idLimpio =
    socioId.trim();

  const usuarioActualizador =
    actualizadoPor?.trim() ||
    null;

  if (!idLimpio) {
    throw new ErrorActualizarSocioPanel(
      "No se ha indicado el socio que debe actualizarse.",
      400,
    );
  }

  const {
    data: socioEncontrado,
    error: errorSocio,
  } = await supabaseServidor
    .from("socios")
    .select(`
      id,
      nombre,
      apellidos,
      email,
      telefono,
      activo,
      observaciones,
      email_bienvenida_enviado_at
    `)
    .eq("id", idLimpio)
    .maybeSingle();

  if (errorSocio) {
    throw new ErrorActualizarSocioPanel(
      `No se ha podido obtener el socio: ${errorSocio.message}`,
    );
  }

  if (!socioEncontrado) {
    throw new ErrorActualizarSocioPanel(
      "El socio no existe.",
      404,
    );
  }

  const socioActual =
    socioEncontrado as
      FilaSocioActual;

  const datos =
    validarDatosSocio(
      entrada,
      socioActual,
    );

  const emailAnterior =
    socioActual.email
      ?.trim()
      .toLowerCase() ?? "";

  if (
    datos.email !==
    emailAnterior
  ) {
    const {
      data: socioMismoEmail,
      error:
        errorComprobarEmail,
    } = await supabaseServidor
      .from("socios")
      .select("id")
      .eq("email", datos.email)
      .neq("id", idLimpio)
      .limit(1)
      .maybeSingle();

    if (errorComprobarEmail) {
      throw new ErrorActualizarSocioPanel(
        `No se ha podido comprobar el correo electrónico: ${errorComprobarEmail.message}`,
      );
    }

    if (socioMismoEmail) {
      throw new ErrorActualizarSocioPanel(
        "Ya existe otro socio con ese correo electrónico.",
        409,
      );
    }
  }

  const estadoAnterior =
    socioActual.activo ??
    false;

  const cambiaEstado =
    estadoAnterior !==
    datos.activo;

  const fechaActualizacion =
    new Date().toISOString();

  const actualizacion:
    Record<string, unknown> =
    {
      nombre: datos.nombre,
      apellidos:
        datos.apellidos,
      email: datos.email,
      telefono:
        datos.telefono,
      activo: datos.activo,
      observaciones:
        datos.observaciones,
      updated_at:
        fechaActualizacion,
    };

  if (usuarioActualizador) {
    actualizacion.actualizado_por =
      usuarioActualizador;
  }

  /*
   * Cuando se reactiva el socio se eliminan
   * los bloqueos producidos por intentos
   * fallidos de inicio de sesión.
   *
   * La contraseña no se modifica.
   */
  if (
    datos.activo &&
    !estadoAnterior
  ) {
    actualizacion.intentos_fallidos =
      0;

    actualizacion.bloqueado_hasta =
      null;
  }

  const {
    error: errorActualizar,
  } = await supabaseServidor
    .from("socios")
    .update(actualizacion)
    .eq("id", idLimpio);

  if (errorActualizar) {
    if (
      errorActualizar.code ===
      "23505"
    ) {
      throw new ErrorActualizarSocioPanel(
        "Ya existe otro socio con ese correo electrónico.",
        409,
      );
    }

    throw new ErrorActualizarSocioPanel(
      `No se ha podido actualizar el socio: ${errorActualizar.message}`,
    );
  }

  /*
   * Si el socio se activa o desactiva,
   * invalidamos todas las sesiones de sus
   * carnets incrementando version_acceso.
   */
  if (cambiaEstado) {
    await incrementarVersionesCarnets(
      idLimpio,
      usuarioActualizador,
    );
  }

  /*
   * Se intenta enviar la bienvenida cuando
   * el socio está activo y el envío todavía
   * no está registrado.
   *
   * Esto permite reintentar el correo si
   * Brevo falló durante una activación
   * anterior.
   */
  if (datos.activo) {
    try {
      await enviarBienvenidaSocioSiCorresponde(
        idLimpio,
      );
    } catch (error) {
      if (
        error instanceof
        ErrorEnviarBienvenidaSocio
      ) {
        throw new ErrorActualizarSocioPanel(
          error.message,
          error.status,
        );
      }

      console.error(
        `Error enviando la bienvenida al socio ${idLimpio}:`,
        error,
      );

      throw new ErrorActualizarSocioPanel(
        "El socio se ha actualizado, pero no se ha podido enviar el correo de bienvenida.",
        502,
      );
    }
  }

  const socioActualizado =
    await obtenerSocioPanel(
      idLimpio,
    );

  if (!socioActualizado) {
    throw new ErrorActualizarSocioPanel(
      "El socio se ha actualizado, pero no se ha podido recuperar su información.",
      500,
    );
  }

  return socioActualizado;
}