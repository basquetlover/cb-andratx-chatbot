import { supabaseServidor } from "../../supabase/servidor";

interface RedSocialFila {
  id?: unknown;
  nombre?: unknown;
  url?: unknown;
  activo?: unknown;
  orden?: unknown;
}

interface FilaPatrocinador {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  logo: string | null;
  banner: string | null;
  web: string | null;
  redes: unknown;
}

export interface PatrocinadorPublico {
  id: string;
  nombre: string;
  nombreCorto: string | null;
  logo: string | null;
  banner: string | null;
  enlace: string | null;
}

function convertirTexto(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto.length > 0 ? texto : null;
}

function convertirNumero(valor: unknown): number {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor;
  }

  if (typeof valor === "string" && valor.trim()) {
    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : 0;
  }

  return 0;
}

function validarUrl(valor: string | null): string | null {
  if (!valor) {
    return null;
  }

  try {
    const url = new URL(valor);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function obtenerPrimeraRedSocial(redes: unknown): string | null {
  if (!Array.isArray(redes)) {
    return null;
  }

  const redesValidas = redes
    .filter((red): red is RedSocialFila => typeof red === "object" && red !== null)
    .filter((red) => red.activo !== false)
    .map((red) => ({
      url: validarUrl(convertirTexto(red.url)),
      orden: convertirNumero(red.orden),
    }))
    .filter((red): red is { url: string; orden: number } => red.url !== null)
    .sort((primeraRed, segundaRed) => primeraRed.orden - segundaRed.orden);

  return redesValidas[0]?.url ?? null;
}

export async function obtenerPatrocinadoresPublicos(ids?: string[]): Promise<PatrocinadorPublico[]> {
  const idsNormalizados = Array.from(
    new Set(
      (ids ?? [])
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );

  let consulta = supabaseServidor
    .from("patrocinadores")
    .select("id, nombre, nombre_corto, logo, banner, web, redes")
    .eq("activo", true)
    .order("nombre", {
      ascending: true,
    });

  if (ids !== undefined && idsNormalizados.length === 0) {
    return [];
  }

  if (idsNormalizados.length > 0) {
    consulta = consulta.in("id", idsNormalizados);
  }

  const { data, error } = await consulta;

  if (error) {
    throw new Error(`No se han podido obtener los patrocinadores públicos: ${error.message}`);
  }

  const patrocinadores = (data ?? []) as FilaPatrocinador[];

  return patrocinadores.map((patrocinador) => {
    const web = validarUrl(convertirTexto(patrocinador.web));
    const primeraRed = obtenerPrimeraRedSocial(patrocinador.redes);

    return {
      id: patrocinador.id,
      nombre: patrocinador.nombre?.trim() || patrocinador.nombre_corto?.trim() || "Patrocinador",
      nombreCorto: patrocinador.nombre_corto?.trim() || null,
      logo: patrocinador.logo?.trim() || null,
      banner: patrocinador.banner?.trim() || null,
      enlace: web ?? primeraRed,
    };
  });
}