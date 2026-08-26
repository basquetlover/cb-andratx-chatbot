import { supabaseServidor } from "../../../supabase/servidor";

import { ErrorImagenEquipo } from "./actualizarImagenEquipo";

interface FilaEquipo {
  id: string;
  imagen: string | null;
}

export interface ResultadoEliminarImagenEquipo {
  eliminada: boolean;
  rutaEliminada: string | null;
}

const BUCKET_EQUIPOS = "equipos";

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function obtenerRutaDesdeUrl(
  url: string | null,
): string | null {
  if (!url) {
    return null;
  }

  try {
    const urlImagen = new URL(url);

    const marcador =
      `/storage/v1/object/public/${BUCKET_EQUIPOS}/`;

    const posicion =
      urlImagen.pathname.indexOf(marcador);

    if (posicion === -1) {
      return null;
    }

    const rutaCodificada =
      urlImagen.pathname.slice(
        posicion + marcador.length,
      );

    const ruta = decodeURIComponent(
      rutaCodificada,
    );

    if (
      !ruta ||
      ruta.startsWith("/") ||
      ruta.includes("..")
    ) {
      return null;
    }

    return ruta;
  } catch {
    return null;
  }
}

async function eliminarArchivo(
  ruta: string,
): Promise<void> {
  const { error } =
    await supabaseServidor.storage
      .from(BUCKET_EQUIPOS)
      .remove([ruta]);

  if (error) {
    /*
     * La referencia ya se habrá eliminado de la tabla.
     * Registramos el fallo para poder limpiar posteriormente
     * el archivo huérfano sin devolver la imagen al equipo.
     */
    console.error(
      "No se ha podido eliminar el archivo de imagen del equipo:",
      error,
    );
  }
}

export async function eliminarImagenEquipo(
  equipoId: string,
): Promise<ResultadoEliminarImagenEquipo> {
  const idNormalizado = equipoId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorImagenEquipo(
      "El identificador del equipo no es válido.",
    );
  }

  const {
    data: equipoEncontrado,
    error: errorEquipo,
  } = await supabaseServidor
    .from("equipos")
    .select("id, imagen")
    .eq("id", idNormalizado)
    .maybeSingle();

  if (errorEquipo) {
    throw new ErrorImagenEquipo(
      `No se ha podido comprobar el equipo: ${errorEquipo.message}`,
      500,
    );
  }

  if (!equipoEncontrado?.id) {
    throw new ErrorImagenEquipo(
      "El equipo no existe.",
      404,
    );
  }

  const equipo = equipoEncontrado as FilaEquipo;

  if (!equipo.imagen) {
    return {
      eliminada: false,
      rutaEliminada: null,
    };
  }

  const rutaAnterior = obtenerRutaDesdeUrl(
    equipo.imagen,
  );

  const {
    data: equipoActualizado,
    error: errorActualizacion,
  } = await supabaseServidor
    .from("equipos")
    .update({
      imagen: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", idNormalizado)
    .eq("imagen", equipo.imagen)
    .select("id")
    .maybeSingle();

  if (errorActualizacion) {
    throw new ErrorImagenEquipo(
      `No se ha podido eliminar la imagen del equipo: ${errorActualizacion.message}`,
      500,
    );
  }

  if (!equipoActualizado?.id) {
    throw new ErrorImagenEquipo(
      "La imagen del equipo ha cambiado mientras se intentaba eliminar. Actualiza la página y vuelve a intentarlo.",
      409,
    );
  }

  /*
   * Primero quitamos la referencia de la tabla y después
   * eliminamos el archivo. De esta manera nunca dejamos al
   * equipo apuntando a una imagen que ya no existe.
   */
  if (rutaAnterior) {
    await eliminarArchivo(rutaAnterior);
  }

  return {
    eliminada: true,
    rutaEliminada: rutaAnterior,
  };
}