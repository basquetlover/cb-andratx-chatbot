import { supabaseServidor } from "../../supabase/servidor";

import type { ConfiguracionClub, RedSocialClub } from "@tipos/ConfiguracionClub";

interface FilaConfiguracionClub {
  id: string;
  nombre_club: string | null;
  nombre_corto: string | null;
  slug: string | null;
  id_club_fbib: number | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  url_fbib: string | null;
  redes: unknown;
}

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esUrlSegura(valor: string): boolean {
  try {
    const url = new URL(valor);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function convertirRedSocial(valor: unknown): RedSocialClub | null {
  if (!esRegistro(valor)) {
    return null;
  }

  const id = typeof valor.id === "string" ? valor.id.trim() : "";
  const url = typeof valor.url === "string" ? valor.url.trim() : "";
  const icono = typeof valor.icono === "string" ? valor.icono.trim() : "";
  const nombre = typeof valor.nombre === "string" ? valor.nombre.trim() : "";
  const usuario = typeof valor.usuario === "string" && valor.usuario.trim().length > 0 ? valor.usuario.trim() : null;
  const orden = typeof valor.orden === "number" && Number.isFinite(valor.orden) ? valor.orden : 999;
  const activo = valor.activo === true;

  if (!id || !url || !icono || !nombre || !esUrlSegura(url)) {
    return null;
  }

  return {
    id,
    url,
    icono,
    orden,
    activo,
    nombre,
    usuario,
  };
}

function convertirRedes(valor: unknown): RedSocialClub[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor
    .map(convertirRedSocial)
    .filter((red): red is RedSocialClub => red !== null && red.activo)
    .sort((redA, redB) => redA.orden - redB.orden);
}

export async function obtenerConfiguracionClub(): Promise<ConfiguracionClub | null> {
  const { data, error } = await supabaseServidor
    .from("configuracion_club")
    .select("id, nombre_club, nombre_corto, slug, id_club_fbib, telefono, email, web, url_fbib, redes")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener la configuración del club: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const configuracion = data as FilaConfiguracionClub;

  return {
    id: configuracion.id,
    nombreClub: configuracion.nombre_club,
    nombreCorto: configuracion.nombre_corto,
    slug: configuracion.slug,
    idClubFbib: configuracion.id_club_fbib,
    telefono: configuracion.telefono,
    email: configuracion.email,
    web: configuracion.web,
    urlFbib: configuracion.url_fbib,
    redes: convertirRedes(configuracion.redes),
  };
}