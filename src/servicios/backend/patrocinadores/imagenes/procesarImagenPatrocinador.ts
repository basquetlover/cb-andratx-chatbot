import sharp from "sharp";

import { supabaseServidor } from "../../../supabase/servidor";

export type TipoImagenPatrocinador = "logo" | "banner";

interface ConfiguracionImagen {
  anchoMaximo: number;
  altoMaximo: number;
  calidad: number;
}

export interface ImagenPatrocinadorProcesada {
  ruta: string;
  url: string;
  ancho: number;
  alto: number;
  tamaño: number;
}

export class ErrorImagenPatrocinador extends Error {
  status: number;
  campo: TipoImagenPatrocinador;

  constructor(mensaje: string, campo: TipoImagenPatrocinador, status = 400) {
    super(mensaje);
    this.name = "ErrorImagenPatrocinador";
    this.status = status;
    this.campo = campo;
  }
}

const BUCKET_PATROCINADORES = "patrocinadores";
const TAMAÑO_MAXIMO_ARCHIVO = 8 * 1024 * 1024;
const PIXELES_MAXIMOS = 40_000_000;

const configuraciones: Record<TipoImagenPatrocinador, ConfiguracionImagen> = {
  logo: {
    anchoMaximo: 1200,
    altoMaximo: 1200,
    calidad: 88,
  },
  banner: {
    anchoMaximo: 1920,
    altoMaximo: 800,
    calidad: 84,
  },
};

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function comprobarTipoArchivo(archivo: File, tipo: TipoImagenPatrocinador): void {
  const tiposPermitidos = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!tiposPermitidos.includes(archivo.type.toLowerCase())) {
    throw new ErrorImagenPatrocinador("La imagen debe estar en formato JPG, PNG o WebP.", tipo);
  }

  if (archivo.size <= 0) {
    throw new ErrorImagenPatrocinador("El archivo de imagen está vacío.", tipo);
  }

  if (archivo.size > TAMAÑO_MAXIMO_ARCHIVO) {
    throw new ErrorImagenPatrocinador("La imagen no puede superar los 8 MB.", tipo, 413);
  }
}

function crearNombreArchivo(tipo: TipoImagenPatrocinador): string {
  return `${tipo}-${Date.now()}-${crypto.randomUUID()}.webp`;
}

async function obtenerMetadataImagen(contenido: Uint8Array, tipo: TipoImagenPatrocinador) {
  try {
    return await sharp(contenido, {
      failOn: "error",
      limitInputPixels: PIXELES_MAXIMOS,
    }).metadata();
  } catch {
    throw new ErrorImagenPatrocinador("El archivo seleccionado no contiene una imagen válida.", tipo);
  }
}

async function convertirImagenWebp(contenido: Uint8Array, tipo: TipoImagenPatrocinador): Promise<Uint8Array> {
  const configuracion = configuraciones[tipo];

  try {
    const resultado = await sharp(contenido, {
      failOn: "error",
      limitInputPixels: PIXELES_MAXIMOS,
    })
      .rotate()
      .resize({
        width: configuracion.anchoMaximo,
        height: configuracion.altoMaximo,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: configuracion.calidad,
        alphaQuality: 100,
        effort: 5,
        smartSubsample: true,
      })
      .toBuffer();

    return new Uint8Array(resultado);
  } catch {
    throw new ErrorImagenPatrocinador("No se ha podido convertir la imagen a WebP.", tipo, 500);
  }
}

export async function procesarImagenPatrocinador(archivo: File, patrocinadorId: string, tipo: TipoImagenPatrocinador): Promise<ImagenPatrocinadorProcesada> {
  const idNormalizado = patrocinadorId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorImagenPatrocinador("El identificador del patrocinador no es válido.", tipo);
  }

  comprobarTipoArchivo(archivo, tipo);

  const contenidoOriginal = new Uint8Array(await archivo.arrayBuffer());
  const metadataOriginal = await obtenerMetadataImagen(contenidoOriginal, tipo);

  if (!metadataOriginal.width || !metadataOriginal.height) {
    throw new ErrorImagenPatrocinador("No se han podido obtener las dimensiones de la imagen.", tipo);
  }

  if (metadataOriginal.pages && metadataOriginal.pages > 1) {
    throw new ErrorImagenPatrocinador("No se admiten imágenes animadas.", tipo);
  }

  if (!["jpeg", "png", "webp"].includes(metadataOriginal.format ?? "")) {
    throw new ErrorImagenPatrocinador("El formato real de la imagen no está permitido.", tipo);
  }

  const contenidoWebp = await convertirImagenWebp(contenidoOriginal, tipo);
  const metadataFinal = await obtenerMetadataImagen(contenidoWebp, tipo);

  if (!metadataFinal.width || !metadataFinal.height) {
    throw new ErrorImagenPatrocinador("La imagen convertida no tiene dimensiones válidas.", tipo, 500);
  }

  const nombreArchivo = crearNombreArchivo(tipo);
  const ruta = `${idNormalizado}/${nombreArchivo}`;

  const { error: errorSubida } = await supabaseServidor.storage
    .from(BUCKET_PATROCINADORES)
    .upload(ruta, contenidoWebp, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: false,
    });

  if (errorSubida) {
    console.error(`Error subiendo ${tipo} del patrocinador:`, errorSubida);

    throw new ErrorImagenPatrocinador(`No se ha podido subir ${tipo === "logo" ? "el logotipo" : "el banner"}.`, tipo, 500);
  }

  const { data: datosUrl } = supabaseServidor.storage
    .from(BUCKET_PATROCINADORES)
    .getPublicUrl(ruta);

  if (!datosUrl.publicUrl) {
    await supabaseServidor.storage
      .from(BUCKET_PATROCINADORES)
      .remove([ruta]);

    throw new ErrorImagenPatrocinador("No se ha podido obtener la URL de la imagen.", tipo, 500);
  }

  return {
    ruta,
    url: datosUrl.publicUrl,
    ancho: metadataFinal.width,
    alto: metadataFinal.height,
    tamaño: contenidoWebp.byteLength,
  };
}

export async function eliminarImagenPatrocinador(ruta: string): Promise<void> {
  const rutaNormalizada = ruta.trim();

  if (!rutaNormalizada || rutaNormalizada.startsWith("/") || rutaNormalizada.includes("..")) {
    throw new Error("La ruta de la imagen no es válida");
  }

  const { error } = await supabaseServidor.storage
    .from(BUCKET_PATROCINADORES)
    .remove([rutaNormalizada]);

  if (error) {
    throw new Error(`No se ha podido eliminar la imagen: ${error.message}`);
  }
}