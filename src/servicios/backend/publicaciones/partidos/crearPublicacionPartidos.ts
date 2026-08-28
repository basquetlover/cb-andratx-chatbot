import { supabaseServidor } from "@servicios/supabase/servidor";

import {
  convertirFilaPublicacionPartidos,
  type FilaPublicacionPartidos,
} from "./convertirFilaPublicacionPartidos";

import { validarPublicacionPartidos } from "./validarPublicacionPartidos";

import type {
  ErrorCampoPublicacion,
  IdiomaPublicacionPartidos,
  PublicacionPartidosPanel,
} from "@tipos/PublicacionPartidosPanel";

interface FilaTemporada {
  id: string;
}

export class ErrorCrearPublicacionPartidos
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
      "ErrorCrearPublicacionPartidos";

    this.status = status;
    this.errores = errores;
  }
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function obtenerIdioma(
  valor: Record<string, unknown>,
): IdiomaPublicacionPartidos {
  return valor.idioma === "ca"
    ? "ca"
    : "es";
}

function prepararDatosCreacion(
  valor: unknown,
): Record<string, unknown> {
  if (!esObjeto(valor)) {
    return {};
  }

  const idioma = obtenerIdioma(valor);

  return {
    ...valor,

    titulo:
      typeof valor.titulo === "string" &&
      valor.titulo.trim()
        ? valor.titulo
        : idioma === "ca"
          ? "PARTITS DE LA SETMANA"
          : "PARTIDOS DE LA SEMANA",

    plantilla:
      valor.plantilla ??
      "partidos-semana",

    fondo:
      valor.fondo ?? null,

    partidos:
      valor.partidos ?? [],

    partidosPorImagen:
      valor.partidosPorImagen ?? 9,

    estado:
      valor.estado ?? "borrador",
  };
}

async function obtenerTemporadaActivaId():
  Promise<string | null> {
  const {
    data,
    error,
  } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ErrorCrearPublicacionPartidos(
      `No se ha podido obtener la temporada activa: ${error.message}`,
      500,
    );
  }

  const temporada =
    data as FilaTemporada | null;

  return temporada?.id ?? null;
}

export async function crearPublicacionPartidos(
  usuarioId: string,
  datosEntrada: unknown,
): Promise<PublicacionPartidosPanel> {
  const usuarioIdLimpio =
    usuarioId.trim();

  if (!usuarioIdLimpio) {
    throw new ErrorCrearPublicacionPartidos(
      "No se ha podido identificar al usuario.",
      401,
    );
  }

  const datosPreparados =
    prepararDatosCreacion(
      datosEntrada,
    );

  const validacion =
    validarPublicacionPartidos(
      datosPreparados,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorCrearPublicacionPartidos(
      "La configuración de la publicación contiene errores.",
      400,
      validacion.errores,
    );
  }

  const temporadaId =
    await obtenerTemporadaActivaId();

  const datos = validacion.datos;

  const {
    data: publicacionCreada,
    error,
  } = await supabaseServidor
    .from("publicaciones_partidos")
    .insert({
      temporada_id:
        temporadaId,

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

      creado_por:
        usuarioIdLimpio,

      actualizado_por:
        usuarioIdLimpio,
    })
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
    .single();

  if (error) {
    console.error(
      "Error creando la publicación de partidos:",
      error,
    );

    throw new ErrorCrearPublicacionPartidos(
      "No se ha podido crear la publicación.",
      500,
    );
  }

  if (!publicacionCreada) {
    throw new ErrorCrearPublicacionPartidos(
      "La publicación se ha creado, pero no se han podido recuperar sus datos.",
      500,
    );
  }

  return convertirFilaPublicacionPartidos(
    publicacionCreada as FilaPublicacionPartidos,
  );
}