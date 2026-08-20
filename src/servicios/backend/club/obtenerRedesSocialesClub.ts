import { supabaseServidor } from "../../supabase/servidor";

export interface RedSocialClub {
  id: string;
  url: string;
  icono: string;
  orden: number;
  activo: boolean;
  nombre: string;
  usuario: string | null;
}

interface FilaConfiguracionClub {
  redes: unknown;
}

function esRedSocial(valor: unknown): valor is RedSocialClub {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }

  const red = valor as Record<string, unknown>;

  return (
    typeof red.id === "string" &&
    typeof red.url === "string" &&
    typeof red.icono === "string" &&
    typeof red.nombre === "string" &&
    typeof red.orden === "number" &&
    typeof red.activo === "boolean" &&
    (typeof red.usuario === "string" || red.usuario === null)
  );
}

export async function obtenerRedesSocialesClub(): Promise<RedSocialClub[]> {
  const { data, error } = await supabaseServidor
    .from("configuracion_club")
    .select("redes")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener las redes sociales: ${error.message}`);
  }

  const configuracion = data as FilaConfiguracionClub | null;

  if (!Array.isArray(configuracion?.redes)) {
    return [];
  }

  return configuracion.redes.filter(esRedSocial).filter((red) => red.activo && red.url.trim().length > 0).sort((primeraRed, segundaRed) => primeraRed.orden - segundaRed.orden);
}