import {
  supabaseServidor,
} from "../../supabase/servidor";

import {
  obtenerSocioPanel,
} from "./obtenerSocioPanel";

import {
  validarActualizacionCarnetSocio,
} from "./validarDatosSocio";

import type {
  ErrorCampoSocio,
  EstadoCarnetSocio,
  SocioPanel,
} from "@tipos/SocioPanel";

interface FilaTemporada {
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

interface FilaCarnet {
  id: string;
  socio_id: string;
  temporada_id: string;
  estado: EstadoCarnetSocio;
  version_acceso: number;
  temporadas:
    | FilaTemporada
    | FilaTemporada[]
    | null;
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

function esUuidValido(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function obtenerTemporadaRelacionada(
  valor:
    FilaTemporada |
    FilaTemporada[] |
    null,
): FilaTemporada | null {
  if (
    Array.isArray(valor)
  ) {
    return valor[0] ?? null;
  }

  return valor;
}

async function obtenerCarnet(
  carnetId: string,
): Promise<FilaCarnet> {
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
        estado,
        version_acceso,
        temporadas (
          fecha_inicio,
          fecha_fin
        )
      `)
      .eq(
        "id",
        carnetId,
      )
      .maybeSingle();

  if (error) {
    throw new ErrorActualizarCarnetSocioPanel(
      `No se ha podido obtener el carnet: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorActualizarCarnetSocioPanel(
      "El carnet solicitado no existe.",
      404,
    );
  }

  return data as unknown as
    FilaCarnet;
}

function comprobarFechasTemporada(
  temporada:
    FilaTemporada | null,
  fechaAlta: string,
  fechaCaducidad: string,
): void {
  if (!temporada) {
    return;
  }

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
    throw new ErrorActualizarCarnetSocioPanel(
      "Las fechas del carnet no son válidas para su temporada.",
      400,
      errores,
    );
  }
}

export async function actualizarCarnetSocioPanel(
  carnetId: string,
  contenido: unknown,
  usuarioId: string,
): Promise<SocioPanel> {
  const idCarnet =
    carnetId.trim();

  const idUsuario =
    usuarioId.trim();

  if (
    !idCarnet ||
    !esUuidValido(
      idCarnet,
    )
  ) {
    throw new ErrorActualizarCarnetSocioPanel(
      "El identificador del carnet no es válido.",
      400,
    );
  }

  if (
    !idUsuario ||
    !esUuidValido(
      idUsuario,
    )
  ) {
    throw new ErrorActualizarCarnetSocioPanel(
      "No se ha podido identificar al usuario que modifica el carnet.",
      400,
    );
  }

  const validacion =
    validarActualizacionCarnetSocio(
      contenido,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorActualizarCarnetSocioPanel(
      "Revisa los datos del carnet.",
      400,
      validacion.errores,
    );
  }

  const datos =
    validacion.datos;

  const carnet =
    await obtenerCarnet(
      idCarnet,
    );

  const temporada =
    obtenerTemporadaRelacionada(
      carnet.temporadas,
    );

  comprobarFechasTemporada(
    temporada,
    datos.fechaAlta,
    datos.fechaCaducidad,
  );

  const ahora =
    new Date().toISOString();

  const cambiaEstado =
    carnet.estado !==
    datos.estado;

  const nuevaVersionAcceso =
    cambiaEstado
      ? Math.max(
          1,
          carnet.version_acceso,
        ) + 1
      : Math.max(
          1,
          carnet.version_acceso,
        );

  const seActiva =
    datos.estado ===
      "activo" &&
    carnet.estado !==
      "activo";

  const seBloquea =
    datos.estado ===
    "bloqueado";

  const {
    data: carnetActualizado,
    error,
  } =
    await supabaseServidor
      .from(
        "socios_temporadas",
      )
      .update({
        tipo_socio:
          datos.tipoSocio,

        estado:
          datos.estado,

        fecha_alta:
          datos.fechaAlta,

        fecha_caducidad:
          datos.fechaCaducidad,

        activado_at:
          seActiva
            ? ahora
            : undefined,

        activado_por:
          seActiva
            ? idUsuario
            : undefined,

        bloqueado_at:
          seBloquea
            ? (
                carnet.estado ===
                "bloqueado"
                  ? undefined
                  : ahora
              )
            : null,

        bloqueado_por:
          seBloquea
            ? (
                carnet.estado ===
                "bloqueado"
                  ? undefined
                  : idUsuario
              )
            : null,

        motivo_bloqueo:
          seBloquea
            ? datos.motivoBloqueo
            : null,

        bloqueado_hasta:
          null,

        version_acceso:
          nuevaVersionAcceso,

        actualizado_por:
          idUsuario,

        updated_at:
          ahora,
      })
      .eq(
        "id",
        idCarnet,
      )
      .select("id")
      .maybeSingle();

  if (error) {
    throw new ErrorActualizarCarnetSocioPanel(
      `No se ha podido actualizar el carnet: ${error.message}`,
      500,
    );
  }

  if (!carnetActualizado) {
    throw new ErrorActualizarCarnetSocioPanel(
      "El carnet solicitado no existe.",
      404,
    );
  }

  return obtenerSocioPanel(
    carnet.socio_id,
  );
}