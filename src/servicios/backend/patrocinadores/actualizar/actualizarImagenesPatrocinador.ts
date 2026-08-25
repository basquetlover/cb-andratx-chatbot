import { eliminarImagenPatrocinador, ErrorImagenPatrocinador, procesarImagenPatrocinador } from "../imagenes/procesarImagenPatrocinador";
import { supabaseServidor } from "../../../supabase/servidor";

export interface ImagenesPatrocinadorActualizadas {
  logo: string | null;
  banner: string | null;
}

export class ErrorActualizarImagenesPatrocinador extends Error {
  status: number;
  campo?: string;

  constructor(mensaje: string, status = 400, campo?: string) {
    super(mensaje);
    this.name = "ErrorActualizarImagenesPatrocinador";
    this.status = status;
    this.campo = campo;
  }
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function obtenerRutaStorage(urlImagen: string | null): string | null {
  if (!urlImagen) {
    return null;
  }

  try {
    const url = new URL(urlImagen);
    const marcador = "/storage/v1/object/public/patrocinadores/";
    const posicion = url.pathname.indexOf(marcador);

    if (posicion === -1) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(posicion + marcador.length));
  } catch {
    return null;
  }
}

async function limpiarRutas(rutas: string[]): Promise<void> {
  for (const ruta of rutas) {
    try {
      await eliminarImagenPatrocinador(ruta);
    } catch (error) {
      console.error(`No se ha podido retirar la imagen ${ruta}:`, error);
    }
  }
}

export async function actualizarImagenesPatrocinador(
  patrocinadorId: string,
  logoNuevo: File | null,
  bannerNuevo: File | null,
  eliminarLogo: boolean,
  eliminarBanner: boolean,
): Promise<ImagenesPatrocinadorActualizadas> {
  const idNormalizado = patrocinadorId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorActualizarImagenesPatrocinador("El identificador del patrocinador no es válido.");
  }

  if (logoNuevo && eliminarLogo) {
    throw new ErrorActualizarImagenesPatrocinador("No puedes sustituir y eliminar el logotipo al mismo tiempo.", 400, "logo");
  }

  if (bannerNuevo && eliminarBanner) {
    throw new ErrorActualizarImagenesPatrocinador("No puedes sustituir y eliminar el banner al mismo tiempo.", 400, "banner");
  }

  const { data: patrocinador, error: errorPatrocinador } = await supabaseServidor
    .from("patrocinadores")
    .select("id, logo, banner")
    .eq("id", idNormalizado)
    .maybeSingle();

  if (errorPatrocinador) {
    throw new Error(`No se ha podido obtener el patrocinador: ${errorPatrocinador.message}`);
  }

  if (!patrocinador?.id) {
    throw new ErrorActualizarImagenesPatrocinador("El patrocinador no existe.", 404);
  }

  const rutasNuevas: string[] = [];

  try {
    const logoProcesado = logoNuevo ? await procesarImagenPatrocinador(logoNuevo, idNormalizado, "logo") : null;

    if (logoProcesado) {
      rutasNuevas.push(logoProcesado.ruta);
    }

    const bannerProcesado = bannerNuevo ? await procesarImagenPatrocinador(bannerNuevo, idNormalizado, "banner") : null;

    if (bannerProcesado) {
      rutasNuevas.push(bannerProcesado.ruta);
    }

    const nuevoLogo = logoProcesado?.url ?? (eliminarLogo ? null : patrocinador.logo);
    const nuevoBanner = bannerProcesado?.url ?? (eliminarBanner ? null : patrocinador.banner);

    const { data: actualizado, error: errorActualizacion } = await supabaseServidor
      .from("patrocinadores")
      .update({
        logo: nuevoLogo,
        banner: nuevoBanner,
      })
      .eq("id", idNormalizado)
      .select("logo, banner")
      .maybeSingle();

    if (errorActualizacion || !actualizado) {
      await limpiarRutas(rutasNuevas);

      throw new Error(`No se han podido actualizar las imágenes: ${errorActualizacion?.message ?? "Respuesta no válida"}`);
    }

    const rutasAnteriores: string[] = [];

    if ((logoProcesado || eliminarLogo) && patrocinador.logo) {
      const rutaLogoAnterior = obtenerRutaStorage(patrocinador.logo);

      if (rutaLogoAnterior) {
        rutasAnteriores.push(rutaLogoAnterior);
      }
    }

    if ((bannerProcesado || eliminarBanner) && patrocinador.banner) {
      const rutaBannerAnterior = obtenerRutaStorage(patrocinador.banner);

      if (rutaBannerAnterior) {
        rutasAnteriores.push(rutaBannerAnterior);
      }
    }

    await limpiarRutas(rutasAnteriores);

    return {
      logo: actualizado.logo?.trim() || null,
      banner: actualizado.banner?.trim() || null,
    };
  } catch (error) {
    await limpiarRutas(rutasNuevas);

    if (error instanceof ErrorImagenPatrocinador || error instanceof ErrorActualizarImagenesPatrocinador) {
      throw error;
    }

    throw error;
  }
}