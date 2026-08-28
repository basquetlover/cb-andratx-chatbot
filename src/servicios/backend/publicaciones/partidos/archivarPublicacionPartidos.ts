import { supabaseServidor } from "@servicios/supabase/servidor";

import {
  convertirFilaPublicacionPartidos,
  type FilaPublicacionPartidos,
} from "./convertirFilaPublicacionPartidos";

import type {
  PublicacionPartidosPanel,
} from "@tipos/PublicacionPartidosPanel";

export class ErrorArchivarPublicacionPartidos
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorArchivarPublicacionPartidos";

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

export async function archivarPublicacionPartidos(
  publicacionId: string,
  usuarioId: string,
): Promise<PublicacionPartidosPanel> {
  const publicacionIdLimpio =
    publicacionId.trim();

  const usuarioIdLimpio =
    usuarioId.trim();

  if (
    !publicacionIdLimpio ||
    !esUuidValido(publicacionIdLimpio)
  ) {
    throw new ErrorArchivarPublicacionPartidos(
      "El identificador de la publicación no es válido.",
      400,
    );
  }

  if (!usuarioIdLimpio) {
    throw new ErrorArchivarPublicacionPartidos(
      "No se ha podido identificar al usuario.",
      401,
    );
  }

  const {
    data: publicacionArchivada,
    error,
  } = await supabaseServidor
    .from("publicaciones_partidos")
    .update({
      estado: "archivada",
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
      `Error archivando la publicación ${publicacionIdLimpio}:`,
      error,
    );

    throw new ErrorArchivarPublicacionPartidos(
      "No se ha podido archivar la publicación.",
      500,
    );
  }

  if (!publicacionArchivada) {
    throw new ErrorArchivarPublicacionPartidos(
      "La publicación solicitada no existe.",
      404,
    );
  }

  return convertirFilaPublicacionPartidos(
    publicacionArchivada as FilaPublicacionPartidos,
  );
}