import sharp from "sharp";

import { supabaseServidor } from "../../../supabase/servidor";

export interface ImagenEquipoActualizada {
  ruta: string;
  url: string;
  ancho: number;
  alto: number;
  tamaño: number;
}

interface FilaEquipo {
  id: string;
  imagen: string | null;
}

export class ErrorImagenEquipo extends Error {
  status: number;
  campo: "imagen";

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);
    this.name = "ErrorImagenEquipo";
    this.status = status;
    this.campo = "imagen";
  }
}

const BUCKET_EQUIPOS = "equipos";
const TAMAÑO_MAXIMO_ARCHIVO = 8 * 1024 * 1024;
const PIXELES_MAXIMOS = 40_000_000;
const ANCHO_MAXIMO = 1600;
const ALTO_MAXIMO = 1600;
const CALIDAD_WEBP = 86;

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function validarArchivo(archivo: File): void {
  const tiposPermitidos = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!tiposPermitidos.includes(archivo.type.toLowerCase())) {
    throw new ErrorImagenEquipo(
      "La imagen debe estar en formato JPG, PNG o WebP.",
    );
  }

  if (archivo.size <= 0) {
    throw new ErrorImagenEquipo(
      "El archivo de imagen está vacío.",
    );
  }

  if (archivo.size > TAMAÑO_MAXIMO_ARCHIVO) {
    throw new ErrorImagenEquipo(
      "La imagen no puede superar los 8 MB.",
      413,
    );
  }
}

function crearNombreArchivo(): string {
  return `equipo-${Date.now()}-${crypto.randomUUID()}.webp`;
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

    const posicion = urlImagen.pathname.indexOf(marcador);

    if (posicion === -1) {
      return null;
    }

    const rutaCodificada = urlImagen.pathname.slice(
      posicion + marcador.length,
    );

    const ruta = decodeURIComponent(rutaCodificada);

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

async function convertirAWebp(
  contenidoOriginal: Uint8Array,
): Promise<{
  contenido: Uint8Array;
  ancho: number;
  alto: number;
}> {
  let metadataOriginal;

  try {
    metadataOriginal = await sharp(contenidoOriginal, {
      failOn: "error",
      limitInputPixels: PIXELES_MAXIMOS,
    }).metadata();
  } catch {
    throw new ErrorImagenEquipo(
      "El archivo seleccionado no contiene una imagen válida.",
    );
  }

  if (
    !metadataOriginal.width ||
    !metadataOriginal.height
  ) {
    throw new ErrorImagenEquipo(
      "No se han podido comprobar las dimensiones de la imagen.",
    );
  }

  if (
    metadataOriginal.pages &&
    metadataOriginal.pages > 1
  ) {
    throw new ErrorImagenEquipo(
      "No se admiten imágenes animadas.",
    );
  }

  if (
    !["jpeg", "png", "webp"].includes(
      metadataOriginal.format ?? "",
    )
  ) {
    throw new ErrorImagenEquipo(
      "El formato real de la imagen no está permitido.",
    );
  }

  let contenidoWebp: Uint8Array;

  try {
    const resultado = await sharp(contenidoOriginal, {
      failOn: "error",
      limitInputPixels: PIXELES_MAXIMOS,
    })
      .rotate()
      .resize({
        width: ANCHO_MAXIMO,
        height: ALTO_MAXIMO,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: CALIDAD_WEBP,
        alphaQuality: 100,
        effort: 5,
        smartSubsample: true,
      })
      .toBuffer();

    contenidoWebp = new Uint8Array(resultado);
  } catch {
    throw new ErrorImagenEquipo(
      "No se ha podido convertir la imagen a WebP.",
      500,
    );
  }

  let metadataFinal;

  try {
    metadataFinal = await sharp(
      contenidoWebp,
    ).metadata();
  } catch {
    throw new ErrorImagenEquipo(
      "No se ha podido comprobar la imagen convertida.",
      500,
    );
  }

  if (!metadataFinal.width || !metadataFinal.height) {
    throw new ErrorImagenEquipo(
      "La imagen convertida no tiene dimensiones válidas.",
      500,
    );
  }

  return {
    contenido: contenidoWebp,
    ancho: metadataFinal.width,
    alto: metadataFinal.height,
  };
}

async function eliminarArchivoSilenciosamente(
  ruta: string,
): Promise<void> {
  const { error } = await supabaseServidor.storage
    .from(BUCKET_EQUIPOS)
    .remove([ruta]);

  if (error) {
    console.error(
      "No se ha podido eliminar una imagen anterior del equipo:",
      error,
    );
  }
}

export async function actualizarImagenEquipo(
  equipoId: string,
  archivo: File,
): Promise<ImagenEquipoActualizada> {
  const idNormalizado = equipoId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorImagenEquipo(
      "El identificador del equipo no es válido.",
    );
  }

  validarArchivo(archivo);

  const { data: equipoEncontrado, error: errorEquipo } =
    await supabaseServidor
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

  const contenidoOriginal = new Uint8Array(
    await archivo.arrayBuffer(),
  );

  const imagenConvertida = await convertirAWebp(
    contenidoOriginal,
  );

  const rutaNueva = `${idNormalizado}/${crearNombreArchivo()}`;

  const { error: errorSubida } =
    await supabaseServidor.storage
      .from(BUCKET_EQUIPOS)
      .upload(rutaNueva, imagenConvertida.contenido, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: false,
      });

  if (errorSubida) {
    console.error(
      "Error subiendo la imagen del equipo:",
      errorSubida,
    );

    throw new ErrorImagenEquipo(
      "No se ha podido subir la imagen del equipo.",
      500,
    );
  }

  const { data: datosUrl } =
    supabaseServidor.storage
      .from(BUCKET_EQUIPOS)
      .getPublicUrl(rutaNueva);

  const urlNueva = datosUrl.publicUrl;

  if (!urlNueva) {
    await eliminarArchivoSilenciosamente(rutaNueva);

    throw new ErrorImagenEquipo(
      "No se ha podido obtener la URL de la imagen.",
      500,
    );
  }

  const { error: errorActualizacion } =
    await supabaseServidor
      .from("equipos")
      .update({
        imagen: urlNueva,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idNormalizado);

  if (errorActualizacion) {
    await eliminarArchivoSilenciosamente(rutaNueva);

    throw new ErrorImagenEquipo(
      `No se ha podido guardar la imagen del equipo: ${errorActualizacion.message}`,
      500,
    );
  }

  const rutaAnterior = obtenerRutaDesdeUrl(
    equipo.imagen,
  );

  if (
    rutaAnterior &&
    rutaAnterior !== rutaNueva
  ) {
    await eliminarArchivoSilenciosamente(
      rutaAnterior,
    );
  }

  return {
    ruta: rutaNueva,
    url: urlNueva,
    ancho: imagenConvertida.ancho,
    alto: imagenConvertida.alto,
    tamaño: imagenConvertida.contenido.byteLength,
  };
}