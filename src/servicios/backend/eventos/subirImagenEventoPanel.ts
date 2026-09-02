import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import type {
  ImagenEventoSubida,
  TipoImagenEvento,
} from "@tipos/EventoPanel";

const TAMANO_MAXIMO =
  5 * 1024 * 1024;

const TIPOS_PERMITIDOS =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

const EXTENSIONES_POR_TIPO:
  Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

export class ErrorSubirImagenEventoPanel
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorSubirImagenEventoPanel";

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

function esTipoImagenValido(
  valor: string,
): valor is TipoImagenEvento {
  return (
    valor === "imagen" ||
    valor ===
      "banner-notificacion"
  );
}

function obtenerCarpeta(
  tipo: TipoImagenEvento,
): string {
  return tipo ===
    "banner-notificacion"
    ? "notificaciones"
    : "carteles";
}

function comprobarArchivo(
  archivo: File,
): void {
  if (
    !archivo ||
    typeof archivo.arrayBuffer !==
      "function"
  ) {
    throw new ErrorSubirImagenEventoPanel(
      "No se ha recibido ninguna imagen.",
      400,
    );
  }

  if (
    !TIPOS_PERMITIDOS.has(
      archivo.type,
    )
  ) {
    throw new ErrorSubirImagenEventoPanel(
      "El archivo debe ser una imagen JPG, PNG o WebP.",
      400,
    );
  }

  if (
    archivo.size <= 0
  ) {
    throw new ErrorSubirImagenEventoPanel(
      "El archivo recibido está vacío.",
      400,
    );
  }

  if (
    archivo.size >
    TAMANO_MAXIMO
  ) {
    throw new ErrorSubirImagenEventoPanel(
      "La imagen no puede superar los 5 MB.",
      400,
    );
  }
}

function crearRutaImagen(
  tipo: TipoImagenEvento,
  eventoId: string | null,
): string {
  const carpeta =
    obtenerCarpeta(
      tipo,
    );

  const agrupacion =
    eventoId ??
    "pendientes";

  const identificador =
    crypto.randomUUID();

  return (
    `${carpeta}/` +
    `${agrupacion}/` +
    identificador
  );
}

export async function subirImagenEventoPanel(
  archivo: File,
  tipoRecibido: string,
  eventoIdRecibido:
    string | null = null,
): Promise<ImagenEventoSubida> {
  const tipoLimpio =
    tipoRecibido.trim();

  if (
    !esTipoImagenValido(
      tipoLimpio,
    )
  ) {
    throw new ErrorSubirImagenEventoPanel(
      "El tipo de imagen solicitado no es válido.",
      400,
    );
  }

  const eventoId =
    eventoIdRecibido?.trim() ||
    null;

  if (
    eventoId &&
    !esUuid(eventoId)
  ) {
    throw new ErrorSubirImagenEventoPanel(
      "El identificador del evento no es válido.",
      400,
    );
  }

  comprobarArchivo(
    archivo,
  );

  const extension =
    EXTENSIONES_POR_TIPO[
      archivo.type
    ];

  if (!extension) {
    throw new ErrorSubirImagenEventoPanel(
      "No se ha podido determinar el formato de la imagen.",
      400,
    );
  }

  const rutaSinExtension =
    crearRutaImagen(
      tipoLimpio,
      eventoId,
    );

  const ruta =
    `${rutaSinExtension}.${extension}`;

  let contenido:
    ArrayBuffer;

  try {
    contenido =
      await archivo.arrayBuffer();
  } catch (error) {
    console.error(
      "Error leyendo la imagen del evento:",
      error,
    );

    throw new ErrorSubirImagenEventoPanel(
      "No se ha podido leer la imagen.",
      400,
    );
  }

  const {
    error:
      errorSubida,
  } =
    await supabaseServidor
      .storage
      .from("eventos")
      .upload(
        ruta,
        contenido,
        {
          contentType:
            archivo.type,

          cacheControl:
            "31536000",

          upsert:
            false,
        },
      );

  if (errorSubida) {
    throw new ErrorSubirImagenEventoPanel(
      `No se ha podido subir la imagen: ${errorSubida.message}`,
      500,
    );
  }

  const {
    data:
      datosUrl,
  } =
    supabaseServidor
      .storage
      .from("eventos")
      .getPublicUrl(
        ruta,
      );

  const url =
    datosUrl.publicUrl?.trim() ??
    "";

  if (!url) {
    /*
     * Si por cualquier motivo no
     * podemos obtener la URL,
     * eliminamos el archivo recién
     * subido para evitar dejarlo
     * huérfano.
     */
    const {
      error:
        errorLimpieza,
    } =
      await supabaseServidor
        .storage
        .from("eventos")
        .remove([
          ruta,
        ]);

    if (errorLimpieza) {
      console.error(
        `No se ha podido eliminar la imagen huérfana ${ruta}:`,
        errorLimpieza,
      );
    }

    throw new ErrorSubirImagenEventoPanel(
      "La imagen se ha subido, pero no se ha podido obtener su dirección pública.",
      500,
    );
  }

  return {
    tipo:
      tipoLimpio,

    url,

    ruta,

    mimeType:
      archivo.type,

    tamano:
      archivo.size,
  };
}