import { supabaseServidor } from "../../supabase/servidor";

import { obtenerSocioPanel } from "./obtenerSocioPanel";

import {
  enviarBienvenidaSocioSiCorresponde,
} from "./enviarBienvenidaSocioSiCorresponde";

import {
  validarActualizacionCarnetSocio,
} from "./validarDatosSocio";

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

  estado: EstadoCarnetSocio;

  fecha_alta: string;
  fecha_caducidad: string;

  activado_at: string | null;
  activado_por: string | null;

  bloqueado_at: string | null;
  bloqueado_por: string | null;

  motivo_bloqueo: string | null;

  version_acceso: number;

  email_bienvenida_enviado_at: string | null;
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

export class ErrorActualizarCarnetSocioPanel extends Error {
  status: number;
  errores: ErrorCampoSocio[];

  constructor(
    mensaje: string,
    status: number,
    errores: ErrorCampoSocio[] = [],
  ) {
    super(mensaje);

    this.name = "ErrorActualizarCarnetSocioPanel";
    this.status = status;
    this.errores = errores;
  }
}

function convertirTextoNullable(
  valor: string | null | undefined,
): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  return valor.trim() || null;
}

function esFechaValida(valor: unknown): valor is string {
  if (
    typeof valor !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  return (
    Number.isFinite(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

function obtenerVersionAcceso(valor: number): number {
  return Number.isSafeInteger(valor) && valor >= 1
    ? valor
    : 1;
}

export async function actualizarCarnetSocioPanel(
  socioId: string,
  carnetId: string,
  datos: ActualizarCarnetTemporadaSocio,
  usuarioId: string,
): Promise<SocioPanel> {
  const socioIdLimpio =
    typeof socioId === "string" ? socioId.trim() : "";

  const carnetIdLimpio =
    typeof carnetId === "string" ? carnetId.trim() : "";

  const usuarioIdLimpio =
    typeof usuarioId === "string" ? usuarioId.trim() : "";

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

  if (
    typeof datos !== "object" ||
    datos === null ||
    Array.isArray(datos)
  ) {
    throw new ErrorActualizarCarnetSocioPanel(
      "Los datos del carnet no son válidos.",
      400,
    );
  }

  const {
    data: carnetEncontrado,
    error: errorCarnet,
  } = await supabaseServidor
    .from("socios_temporadas")
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
    .eq("id", carnetIdLimpio)
    .eq("socio_id", socioIdLimpio)
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

  const carnet = carnetEncontrado as FilaCarnetExistente;

  if (!esFechaValida(carnet.fecha_alta)) {
    throw new ErrorActualizarCarnetSocioPanel(
      "La fecha de alta guardada en el carnet no es válida. Debe revisarse antes de modificarlo.",
      409,
    );
  }

  /*
   * Se utiliza siempre la fecha de alta original.
   * El valor recibido desde el formulario se ignora.
   */
  const datosValidados: ActualizarCarnetTemporadaSocio = {
    ...datos,
    fechaAlta: carnet.fecha_alta,
  };

  const errores =
    validarActualizacionCarnetSocio(datosValidados);

  if (errores.length > 0) {
    throw new ErrorActualizarCarnetSocioPanel(
      "Revisa los datos del carnet.",
      400,
      errores,
    );
  }

  const tipoSocio = datosValidados.tipoSocio.trim();

  const fechaCaducidad =
    datosValidados.fechaCaducidad.trim();

  const motivoBloqueo =
    datosValidados.estado === "bloqueado"
      ? convertirTextoNullable(datosValidados.motivoBloqueo)
      : null;

  const {
    data: temporadaEncontrada,
    error: errorTemporada,
  } = await supabaseServidor
    .from("temporadas")
    .select("id, fecha_inicio, fecha_fin")
    .eq("id", carnet.temporada_id)
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
    temporadaEncontrada as FilaTemporada;

  if (
    !esFechaValida(temporada.fecha_inicio) ||
    !esFechaValida(temporada.fecha_fin) ||
    temporada.fecha_fin < temporada.fecha_inicio
  ) {
    throw new ErrorActualizarCarnetSocioPanel(
      "La temporada no tiene configuradas correctamente sus fechas.",
      500,
    );
  }

  if (fechaCaducidad > temporada.fecha_fin) {
    throw new ErrorActualizarCarnetSocioPanel(
      "La fecha de caducidad no puede superar el final de la temporada.",
      400,
      [
        {
          campo: "fechaCaducidad",
          mensaje:
            "La fecha de caducidad no puede superar el final de la temporada.",
        },
      ],
    );
  }

  if (fechaCaducidad < temporada.fecha_inicio) {
    throw new ErrorActualizarCarnetSocioPanel(
      "La fecha de caducidad no puede ser anterior al inicio de la temporada.",
      400,
      [
        {
          campo: "fechaCaducidad",
          mensaje:
            "La fecha de caducidad no puede ser anterior al inicio de la temporada.",
        },
      ],
    );
  }

  const {
    data: socioEncontrado,
    error: errorSocio,
  } = await supabaseServidor
    .from("socios")
    .select("id, activo")
    .eq("id", socioIdLimpio)
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

  const socio = socioEncontrado as FilaSocio;
  const ahora = new Date().toISOString();

  const cambiaEstado =
    datosValidados.estado !== carnet.estado;

  const seActiva =
    datosValidados.estado === "activo" &&
    carnet.estado !== "activo";

  const seBloquea =
    datosValidados.estado === "bloqueado";

  const versionActual =
    obtenerVersionAcceso(carnet.version_acceso);

  const versionAcceso = cambiaEstado
    ? versionActual + 1
    : versionActual;

  const activadoAt = seActiva
    ? ahora
    : carnet.activado_at;

  const activadoPor = seActiva
    ? usuarioIdLimpio
    : carnet.activado_por;

  const bloqueadoAt = seBloquea
    ? carnet.estado === "bloqueado"
      ? carnet.bloqueado_at ?? ahora
      : ahora
    : null;

  const bloqueadoPor = seBloquea
    ? carnet.estado === "bloqueado"
      ? carnet.bloqueado_por ?? usuarioIdLimpio
      : usuarioIdLimpio
    : null;

  /*
   * fecha_alta y created_at no se actualizan.
   * Tampoco se modifican la numeración ni la contraseña.
   */
  const {
    data: carnetActualizado,
    error: errorActualizando,
  } = await supabaseServidor
    .from("socios_temporadas")
    .update({
      tipo_socio: tipoSocio,
      estado: datosValidados.estado,
      fecha_caducidad: fechaCaducidad,
      motivo_bloqueo: motivoBloqueo,

      activado_at: activadoAt,
      activado_por: activadoPor,

      bloqueado_at: bloqueadoAt,
      bloqueado_por: bloqueadoPor,

      version_acceso: versionAcceso,

      actualizado_por: usuarioIdLimpio,
      updated_at: ahora,
    })
    .eq("id", carnet.id)
    .eq("socio_id", socioIdLimpio)
    .select("id")
    .maybeSingle();

  if (errorActualizando) {
    throw new ErrorActualizarCarnetSocioPanel(
      `No se ha podido actualizar el carnet: ${errorActualizando.message}`,
      500,
    );
  }

  if (!carnetActualizado) {
    throw new ErrorActualizarCarnetSocioPanel(
      "El carnet ya no está disponible. Actualiza la ficha del socio.",
      404,
    );
  }

  if (
    socio.activo &&
    datosValidados.estado === "activo" &&
    !carnet.email_bienvenida_enviado_at
  ) {
    try {
      await enviarBienvenidaSocioSiCorresponde(
        socioIdLimpio,
        carnet.id,
      );
    } catch (error) {
      /*
       * El cambio del carnet se mantiene aunque falle
       * el envío del correo. Si no se registra el envío,
       * podrá intentarse de nuevo posteriormente.
       */
      console.error(
        `El carnet ${carnet.id} se ha actualizado, pero no se ha podido enviar su correo de acceso:`,
        error,
      );
    }
  }

  return obtenerSocioPanel(socioIdLimpio);
}