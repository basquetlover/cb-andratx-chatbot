import { supabaseServidor } from "../../../supabase/servidor";

import type {
  DatosInformacionPatrocinador,
  InformacionPatrocinadorActualizada,
} from "../../../../types/PatrocinadorPanel";

interface DatosEntrada {
  nombre?: unknown;
  nombreCorto?: unknown;
  slug?: unknown;
  descripcion?: unknown;
  web?: unknown;
  activo?: unknown;
}

export class ErrorActualizarInformacionPatrocinador extends Error {
  status: number;
  campo?: string;

  constructor(mensaje: string, status = 400, campo?: string) {
    super(mensaje);
    this.name = "ErrorActualizarInformacionPatrocinador";
    this.status = status;
    this.campo = campo;
  }
}

function convertirTexto(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto.length > 0 ? texto : null;
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function validarUrl(valor: string): boolean {
  try {
    const url = new URL(valor);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validarDatos(contenido: unknown): DatosInformacionPatrocinador {
  if (typeof contenido !== "object" || contenido === null || Array.isArray(contenido)) {
    throw new ErrorActualizarInformacionPatrocinador("Los datos del patrocinador no son válidos.");
  }

  const datos = contenido as DatosEntrada;
  const nombre = convertirTexto(datos.nombre);
  const nombreCorto = convertirTexto(datos.nombreCorto);
  const slug = convertirTexto(datos.slug)?.toLowerCase() ?? null;
  const descripcion = convertirTexto(datos.descripcion);
  const web = convertirTexto(datos.web);

  if (!nombre) {
    throw new ErrorActualizarInformacionPatrocinador("El nombre es obligatorio.", 400, "nombre");
  }

  if (nombre.length > 150) {
    throw new ErrorActualizarInformacionPatrocinador("El nombre no puede superar los 150 caracteres.", 400, "nombre");
  }

  if (nombreCorto && nombreCorto.length > 80) {
    throw new ErrorActualizarInformacionPatrocinador("El nombre corto no puede superar los 80 caracteres.", 400, "nombreCorto");
  }

  if (!slug) {
    throw new ErrorActualizarInformacionPatrocinador("El slug es obligatorio.", 400, "slug");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new ErrorActualizarInformacionPatrocinador("El slug solo puede contener letras minúsculas, números y guiones.", 400, "slug");
  }

  if (descripcion && descripcion.length > 2_000) {
    throw new ErrorActualizarInformacionPatrocinador("La descripción no puede superar los 2.000 caracteres.", 400, "descripcion");
  }

  if (web && !validarUrl(web)) {
    throw new ErrorActualizarInformacionPatrocinador("La página web no es válida.", 400, "web");
  }

  if (typeof datos.activo !== "boolean") {
    throw new ErrorActualizarInformacionPatrocinador("El estado del patrocinador no es válido.", 400, "activo");
  }

  return {
    nombre,
    nombreCorto,
    slug,
    descripcion,
    web,
    activo: datos.activo,
  };
}

export async function actualizarInformacionPatrocinador(patrocinadorId: string, contenido: unknown): Promise<InformacionPatrocinadorActualizada> {
  const idNormalizado = patrocinadorId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorActualizarInformacionPatrocinador("El identificador del patrocinador no es válido.");
  }

  const datos = validarDatos(contenido);

  const { data: patrocinadorActual, error: errorPatrocinador } = await supabaseServidor
    .from("patrocinadores")
    .select("id")
    .eq("id", idNormalizado)
    .maybeSingle();

  if (errorPatrocinador) {
    throw new Error(`No se ha podido comprobar el patrocinador: ${errorPatrocinador.message}`);
  }

  if (!patrocinadorActual?.id) {
    throw new ErrorActualizarInformacionPatrocinador("El patrocinador no existe.", 404);
  }

  const { data: slugExistente, error: errorSlug } = await supabaseServidor
    .from("patrocinadores")
    .select("id")
    .eq("slug", datos.slug)
    .neq("id", idNormalizado)
    .limit(1)
    .maybeSingle();

  if (errorSlug) {
    throw new Error(`No se ha podido comprobar el slug: ${errorSlug.message}`);
  }

  if (slugExistente?.id) {
    throw new ErrorActualizarInformacionPatrocinador("Ya existe otro patrocinador con este slug.", 409, "slug");
  }

  const { data: patrocinadorActualizado, error: errorActualizacion } = await supabaseServidor
    .from("patrocinadores")
    .update({
      nombre: datos.nombre,
      nombre_corto: datos.nombreCorto,
      slug: datos.slug,
      descripcion: datos.descripcion,
      web: datos.web,
      activo: datos.activo,
    })
    .eq("id", idNormalizado)
    .select("id, nombre, nombre_corto, slug, descripcion, web, activo")
    .maybeSingle();

  if (errorActualizacion) {
    throw new Error(`No se ha podido actualizar el patrocinador: ${errorActualizacion.message}`);
  }

  if (!patrocinadorActualizado?.id) {
    throw new ErrorActualizarInformacionPatrocinador("El patrocinador no existe.", 404);
  }

  return {
    id: patrocinadorActualizado.id,
    nombre: patrocinadorActualizado.nombre?.trim() || datos.nombre,
    nombreCorto: patrocinadorActualizado.nombre_corto?.trim() || null,
    slug: patrocinadorActualizado.slug?.trim() || datos.slug,
    descripcion: patrocinadorActualizado.descripcion?.trim() || null,
    web: patrocinadorActualizado.web?.trim() || null,
    activo: patrocinadorActualizado.activo ?? false,
  };
}