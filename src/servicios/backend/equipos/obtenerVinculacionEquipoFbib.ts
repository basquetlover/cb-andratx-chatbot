import { supabaseServidor } from "../../supabase/servidor";

export interface VinculacionEquipoFbib {
  equipoId: string;
  nombre: string | null;
  idEquipoFbib: string;
}

interface FilaEquipoFbib {
  id: string;
  nombre: string | null;
  id_equipo_fbib: string | number | null;
}

export async function obtenerVinculacionEquipoFbib(equipoId: string): Promise<VinculacionEquipoFbib> {
  const idNormalizado = equipoId.trim();

  if (!idNormalizado) {
    throw new Error("El identificador del equipo no es válido");
  }

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
    throw new Error("No hay ninguna temporada activa");
  }

  const { data, error } = await supabaseServidor
    .from("equipos")
    .select("id, nombre, id_equipo_fbib")
    .eq("id", idNormalizado)
    .eq("temporada_id", String(temporada.id))
    .eq("activo", true)
    .eq("chatbot", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener la vinculación FBIB del equipo: ${error.message}`);
  }

  if (!data) {
    throw new Error("El equipo no existe o no está disponible");
  }

  const equipo = data as FilaEquipoFbib;
  const idEquipoFbib = equipo.id_equipo_fbib === null ? "" : String(equipo.id_equipo_fbib).trim();

  if (!idEquipoFbib) {
    throw new Error("Este equipo todavía no está vinculado con la FBIB");
  }

  return {
    equipoId: equipo.id,
    nombre: equipo.nombre,
    idEquipoFbib,
  };
}