import { supabaseServidor } from "../../supabase/servidor";

export interface EquipoChatbot {
  id: string | null;
  temporadaId: string | null;
  nombre: string | null;
  nombreCorto: string | null;
  slug: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  descripcion: string | null;
  imagen: string | null;
  sponsorId: string | null;
  mostrarSponsor: boolean;
}

interface FilaEquipoSupabase {
  id: string | null;
  temporada_id: string | null;
  nombre: string | null;
  nombre_corto: string | null;
  slug: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  descripcion: string | null;
  imagen: string | null;
  sponsor_id: string | null;
  mostrar_sponsor: boolean | null;
}

export async function obtenerEquiposChatbotTemporadaActiva(): Promise<
  EquipoChatbot[]
> {
  const {
    data: temporada,
    error: errorTemporada,
  } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (errorTemporada) {
    throw new Error(
      `Error al obtener la temporada activa: ${errorTemporada.message}`
    );
  }

  if (!temporada?.id) {
    return [];
  }

  const {
    data: equipos,
    error: errorEquipos,
  } = await supabaseServidor
    .from("equipos")
    .select(`
      id,
      temporada_id,
      nombre,
      nombre_corto,
      slug,
      categoria,
      genero,
      nivel,
      descripcion,
      imagen,
      sponsor_id,
      mostrar_sponsor
    `)
    .eq("temporada_id", String(temporada.id))
    .eq("chatbot", true)
    .order("categoria", {
      ascending: true,
    })
    .order("nombre", {
      ascending: true,
    });

  if (errorEquipos) {
    throw new Error(
      `Error al obtener los equipos: ${errorEquipos.message}`
    );
  }

  const filas =
    (equipos ?? []) as FilaEquipoSupabase[];

  return filas.map((equipo) => ({
    id: equipo.id,
    temporadaId: equipo.temporada_id,
    nombre: equipo.nombre,
    nombreCorto: equipo.nombre_corto,
    slug: equipo.slug,
    categoria: equipo.categoria,
    genero: equipo.genero,
    nivel: equipo.nivel,
    descripcion: equipo.descripcion,
    imagen: equipo.imagen,
    sponsorId: equipo.sponsor_id,
    mostrarSponsor:
      equipo.mostrar_sponsor ?? true,
  }));
}