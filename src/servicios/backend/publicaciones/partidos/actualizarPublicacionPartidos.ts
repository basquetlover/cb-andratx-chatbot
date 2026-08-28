import { supabaseServidor } from "@servicios/supabase/servidor";

import {
  convertirFilaPublicacionPartidos,
  type FilaPublicacionPartidos,
} from "./convertirFilaPublicacionPartidos";

import { validarPublicacionPartidos } from "./validarPublicacionPartidos";

import type {
  ErrorCampoPublicacion,
  PublicacionPartidosPanel,
} from "@tipos/PublicacionPartidosPanel";

export class ErrorActualizarPublicacionPartidos
  extends Error {
  status: number;
  errores: ErrorCampoPublicacion[];

  constructor(
    mensaje: string,
    status: number,
    errores: ErrorCampoPublicacion[] = [],
  ) {
    super(mensaje);

    this.name =
      "ErrorActualizarPublicacionPartidos";

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

export async function actualizarPublicacionPartidos(
  publicacionId: string,
  usuarioId: string,
  datosEntrada: unknown,
): Promise<PublicacionPartidosPanel> {
  const publicacionIdLimpio =
    publicacionId.trim();

  const usuarioIdLimpio =
    usuarioId.trim();

  if (
    !publicacionIdLimpio ||
    !esUuidValido(publicacionIdLimpio)
  ) {
    throw new ErrorActualizarPublicacionPartidos(
      "El identificador de la publicación no es válido.",
      400,
    );
  }

  if (!usuarioIdLimpio) {
    throw new ErrorActualizarPublicacionPartidos(
      "No se ha podido identificar al usuario.",
      401,
    );
  }

  const validacion =
    validarPublicacionPartidos(
      datosEntrada,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorActualizarPublicacionPartidos(
      "La configuración de la publicación contiene errores.",
      400,
      validacion.errores,
    );
  }

  const datos = validacion.datos;

  const {
    data: publicacionActualizada,
    error,
  } = await supabaseServidor
    .from("publicaciones_partidos")
    .update({
      nombre:
        datos.nombre,

      titulo:
        datos.titulo,

      idioma:
        datos.idioma,

      fecha_inicio:
        datos.fechaInicio,

      fecha_fin:
        datos.fechaFin,

      plantilla:
        datos.plantilla,

      fondo:
        datos.fondo,

      partidos:
        datos.partidos,

      partidos_por_imagen:
        datos.partidosPorImagen,

      estado:
        datos.estado,

      actualizado_por:
        usuarioIdLimpio,
    })
    .eq("id", publicacionIdLimpio)
    .select(`
      id,
      temporada_id,
      nombre,
      titulo,
      idioma,
      fecha_inicio,
      fecha_fin,
      plantilla,
      fondo,
      partidos,
      partidos_por_imagen,
      estado,
      creado_por,
      actualizado_por,
      created_at,
      updated_at
    `)
    .maybeSingle();

  if (error) {
    console.error(
      `Error actualizando la publicación ${publicacionIdLimpio}:`,
      error,
    );

    throw new ErrorActualizarPublicacionPartidos(
      "No se ha podido actualizar la publicación.",
      500,
    );
  }

  if (!publicacionActualizada) {
    throw new ErrorActualizarPublicacionPartidos(
      "La publicación solicitada no existe.",
      404,
    );
  }

  return convertirFilaPublicacionPartidos(
    publicacionActualizada as FilaPublicacionPartidos,
  );
}