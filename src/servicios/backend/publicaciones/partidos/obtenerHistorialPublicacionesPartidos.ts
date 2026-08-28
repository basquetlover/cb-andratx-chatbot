import { supabaseServidor } from "@servicios/supabase/servidor";

import {
  convertirResumenPublicacionPartidos,
  type FilaPublicacionPartidos,
} from "./convertirFilaPublicacionPartidos";

import type {
  EstadoPublicacionPartidos,
  ResumenPublicacionPartidos,
} from "@tipos/PublicacionPartidosPanel";

interface OpcionesHistorial {
  estado?: EstadoPublicacionPartidos | null;
  incluirArchivadas?: boolean;
  limite?: number;
}

export class ErrorObtenerHistorialPublicaciones
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerHistorialPublicaciones";

    this.status = status;
  }
}

const ESTADOS_PERMITIDOS =
  new Set<EstadoPublicacionPartidos>([
    "borrador",
    "finalizada",
    "archivada",
  ]);

function normalizarLimite(
  limite: number | undefined,
): number {
  if (
    typeof limite !== "number" ||
    !Number.isInteger(limite)
  ) {
    return 100;
  }

  return Math.min(
    200,
    Math.max(1, limite),
  );
}

export async function obtenerHistorialPublicacionesPartidos(
  opciones: OpcionesHistorial = {},
): Promise<ResumenPublicacionPartidos[]> {
  const {
    estado = null,
    incluirArchivadas = false,
    limite,
  } = opciones;

  if (
    estado &&
    !ESTADOS_PERMITIDOS.has(estado)
  ) {
    throw new ErrorObtenerHistorialPublicaciones(
      "El estado utilizado para filtrar las publicaciones no es válido.",
      400,
    );
  }

  let consulta = supabaseServidor
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
    .order("updated_at", {
      ascending: false,
    })
    .limit(
      normalizarLimite(limite),
    );

  if (estado) {
    consulta = consulta.eq(
      "estado",
      estado,
    );
  } else if (!incluirArchivadas) {
    consulta = consulta.neq(
      "estado",
      "archivada",
    );
  }

  const {
    data: publicacionesEncontradas,
    error,
  } = await consulta;

  if (error) {
    console.error(
      "Error obteniendo el historial de publicaciones de partidos:",
      error,
    );

    throw new ErrorObtenerHistorialPublicaciones(
      "No se ha podido obtener el historial de publicaciones.",
      500,
    );
  }

  return (
    (
      publicacionesEncontradas ??
      []
    ) as FilaPublicacionPartidos[]
  ).map(
    convertirResumenPublicacionPartidos,
  );
}