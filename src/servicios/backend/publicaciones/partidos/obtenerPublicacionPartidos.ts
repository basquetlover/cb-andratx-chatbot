import { supabaseServidor } from "@servicios/supabase/servidor";

import {
  convertirFilaPublicacionPartidos,
  type FilaPublicacionPartidos,
} from "./convertirFilaPublicacionPartidos";

import type {
  PublicacionPartidosPanel,
} from "@tipos/PublicacionPartidosPanel";

export class ErrorObtenerPublicacionPartidos
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerPublicacionPartidos";

    this.status = status;
  }
}

function esUuidValido(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

export async function obtenerPublicacionPartidos(
  publicacionId: string,
): Promise<PublicacionPartidosPanel> {
  const publicacionIdLimpio =
    publicacionId.trim();

  if (
    !publicacionIdLimpio ||
    !esUuidValido(publicacionIdLimpio)
  ) {
    throw new ErrorObtenerPublicacionPartidos(
      "El identificador de la publicación no es válido.",
      400,
    );
  }

  const {
    data: publicacionEncontrada,
    error,
  } = await supabaseServidor
    .from("publicaciones_partidos")
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
    .eq("id", publicacionIdLimpio)
    .maybeSingle();

  if (error) {
    console.error(
      `Error obteniendo la publicación ${publicacionIdLimpio}:`,
      error,
    );

    throw new ErrorObtenerPublicacionPartidos(
      "No se ha podido obtener la publicación.",
      500,
    );
  }

  if (!publicacionEncontrada) {
    throw new ErrorObtenerPublicacionPartidos(
      "La publicación solicitada no existe.",
      404,
    );
  }

  return convertirFilaPublicacionPartidos(
    publicacionEncontrada as FilaPublicacionPartidos,
  );
}