import { supabaseServidor } from "../../supabase/servidor";

export interface EquipoPanel {
  id: string;
  nombre: string | null;
  nombreCorto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
}

interface FilaEquipoSupabase {
  id: string | null;
  nombre: string | null;
  nombre_corto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
}

export async function obtenerEquiposPanel(): Promise<EquipoPanel[]> {
  const { data: temporada, error: errorTemporada } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (errorTemporada) {
    throw new Error(`Error al obtener la temporada activa: ${errorTemporada.message}`);
  }

  if (!temporada?.id) {
    return [];
  }

  const { data: equipos, error: errorEquipos } = await supabaseServidor
    .from("equipos")
    .select("id, nombre, nombre_corto, categoria, genero, nivel")
    .eq("temporada_id", String(temporada.id))
    .eq("activo", true)
    .order("categoria", {
      ascending: true,
    })
    .order("nombre", {
      ascending: true,
    });

  if (errorEquipos) {
    throw new Error(`Error al obtener los equipos del panel: ${errorEquipos.message}`);
  }

  const filas = (equipos ?? []) as FilaEquipoSupabase[];

  return filas
    .filter((equipo) => typeof equipo.id === "string")
    .map((equipo) => ({
      id: equipo.id!,
      nombre: equipo.nombre,
      nombreCorto: equipo.nombre_corto,
      categoria: equipo.categoria,
      genero: equipo.genero,
      nivel: equipo.nivel,
    }));
}