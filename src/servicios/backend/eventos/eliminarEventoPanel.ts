import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  obtenerEventoPanel,
  ErrorObtenerEventoPanel,
} from "./obtenerEventoPanel";

export class ErrorEliminarEventoPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorEliminarEventoPanel";

    this.status =
      status;
  }
}

function esUuid(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function obtenerRutaImagenBucket(
  valor: string | null,
): string | null {
  if (!valor) {
    return null;
  }

  const valorLimpio =
    valor.trim();

  if (!valorLimpio) {
    return null;
  }

  /*
   * Si se ha guardado únicamente
   * la ruta interna:
   *
   * carteles/archivo.webp
   * notificaciones/archivo.webp
   */
  if (
    valorLimpio.startsWith(
      "carteles/",
    ) ||
    valorLimpio.startsWith(
      "notificaciones/",
    )
  ) {
    return valorLimpio;
  }

  /*
   * También permitimos:
   *
   * eventos/carteles/archivo.webp
   */
  if (
    valorLimpio.startsWith(
      "eventos/",
    )
  ) {
    const ruta =
      valorLimpio.slice(
        "eventos/".length,
      );

    if (
      ruta.startsWith(
        "carteles/",
      ) ||
      ruta.startsWith(
        "notificaciones/",
      )
    ) {
      return ruta;
    }

    return null;
  }

  /*
   * URL pública de Supabase:
   *
   * /storage/v1/object/public/eventos/...
   */
  try {
    const url =
      new URL(
        valorLimpio,
      );

    const marcador =
      "/storage/v1/object/public/eventos/";

    const indice =
      url.pathname.indexOf(
        marcador,
      );

    if (indice === -1) {
      return null;
    }

    const rutaCodificada =
      url.pathname.slice(
        indice +
          marcador.length,
      );

    const ruta =
      decodeURIComponent(
        rutaCodificada,
      );

    if (
      ruta.startsWith(
        "carteles/",
      ) ||
      ruta.startsWith(
        "notificaciones/",
      )
    ) {
      return ruta;
    }

    return null;
  } catch {
    return null;
  }
}

async function eliminarImagenesEvento(
  imagen: string | null,
  bannerNotificacion:
    string | null,
): Promise<void> {
  const rutas =
    [
      obtenerRutaImagenBucket(
        imagen,
      ),

      obtenerRutaImagenBucket(
        bannerNotificacion,
      ),
    ].filter(
      (
        ruta,
      ): ruta is string =>
        Boolean(ruta),
    );

  const rutasUnicas =
    Array.from(
      new Set(rutas),
    );

  if (
    rutasUnicas.length === 0
  ) {
    return;
  }

  const {
    error,
  } =
    await supabaseServidor
      .storage
      .from("eventos")
      .remove(
        rutasUnicas,
      );

  if (error) {
    /*
     * El evento ya se ha eliminado.
     * No lanzamos otro error porque
     * eso haría creer al cliente que
     * el borrado de la base de datos
     * ha fallado.
     */
    console.error(
      "El evento se ha eliminado, pero no se han podido borrar todas sus imágenes:",
      error,
    );
  }
}

export async function eliminarEventoPanel(
  eventoId: string,
): Promise<string> {
  const eventoIdLimpio =
    eventoId.trim();

  if (
    !esUuid(
      eventoIdLimpio,
    )
  ) {
    throw new ErrorEliminarEventoPanel(
      "El identificador del evento no es válido.",
      400,
    );
  }

  let evento;

  try {
    evento =
      await obtenerEventoPanel(
        eventoIdLimpio,
      );
  } catch (error) {
    if (
      error instanceof
      ErrorObtenerEventoPanel
    ) {
      throw new ErrorEliminarEventoPanel(
        error.message,
        error.status,
      );
    }

    throw error;
  }

  const {
    data,
    error,
  } =
    await supabaseServidor
      .from("eventos")
      .delete()
      .eq(
        "id",
        eventoIdLimpio,
      )
      .select("id")
      .maybeSingle();

  if (error) {
    throw new ErrorEliminarEventoPanel(
      `No se ha podido eliminar el evento: ${error.message}`,
      500,
    );
  }

  if (!data) {
    throw new ErrorEliminarEventoPanel(
      "El evento solicitado no existe.",
      404,
    );
  }

  /*
   * Las relaciones de
   * eventos_equipos se eliminan
   * automáticamente mediante
   * ON DELETE CASCADE.
   *
   * Las imágenes se eliminan
   * después de confirmar que la
   * fila principal ya se borró.
   */
  await eliminarImagenesEvento(
    evento.imagen,
    evento.bannerNotificacion,
  );

  return eventoIdLimpio;
}