import { supabaseServidor } from "../../supabase/servidor";

export interface EquipoTemporada {
  id: string;
  temporadaId: string;
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
  chatbot: boolean;
}

export interface ResultadoEquiposTemporada {
  temporadaId: string;
  equipos: EquipoTemporada[];
}

interface FilaEquipoSupabase {
  id: string;
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
  chatbot: boolean | null;
}

interface OpcionesConsulta {
  soloChatbot?: boolean;
}

export async function obtenerEquiposTemporadaActiva({ soloChatbot = false }: OpcionesConsulta = {}): Promise<ResultadoEquiposTemporada | null> {
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
    return null;
  }

  const temporadaId = String(temporada.id);

  let consulta = supabaseServidor
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
      mostrar_sponsor,
      chatbot
    `)
    .eq("temporada_id", temporadaId)
    .eq("activo", true);

  if (soloChatbot) {
    consulta = consulta.eq("chatbot", true);
  }

  const { data: equipos, error: errorEquipos } = await consulta
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true });

  if (errorEquipos) {
    throw new Error(`Error al obtener los equipos: ${errorEquipos.message}`);
  }

  const filas = (equipos ?? []) as FilaEquipoSupabase[];

  return {
    temporadaId,
    equipos: filas.map((equipo) => ({
      id: equipo.id,
      temporadaId,
      nombre: equipo.nombre,
      nombreCorto: equipo.nombre_corto,
      slug: equipo.slug,
      categoria: equipo.categoria,
      genero: equipo.genero,
      nivel: equipo.nivel,
      descripcion: equipo.descripcion,
      imagen: equipo.imagen,
      sponsorId: equipo.sponsor_id,
      mostrarSponsor: equipo.mostrar_sponsor ?? true,
      chatbot: equipo.chatbot === true,
    })),
  };
}

export async function obtenerEquiposChatbotTemporadaActiva(): Promise<EquipoTemporada[]> {
  const resultado = await obtenerEquiposTemporadaActiva({
    soloChatbot: true,
  });

  return resultado?.equipos ?? [];
}