import { supabaseServidor } from "../../supabase/servidor";

import type {
  DatosFormularioEquipoPanel,
  InstalacionFormularioEquipo,
  PatrocinadorFormularioEquipo,
} from "../../../types/FormularioEquipoPanel";

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

interface FilaEquipo {
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
}

interface FilaPatrocinador {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  logo: string | null;
}

interface FilaInstalacion {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  direccion: string | null;
  localidad: string | null;
}

const ordenCategorias = [
  "escoleta",
  "iniciacion",
  "premini",
  "mini",
  "infantil",
  "cadete",
  "junior",
  "senior",
  "+40",
  "veteranos",
];

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obtenerPosicionCategoria(categoria: string): number {
  const categoriaNormalizada = normalizarTexto(categoria);

  const posicion = ordenCategorias.findIndex(
    (nombreCategoria) =>
      categoriaNormalizada.includes(nombreCategoria),
  );

  return posicion === -1
    ? ordenCategorias.length
    : posicion;
}

function obtenerValoresUnicos(
  valores: Array<string | null>,
): string[] {
  return Array.from(
    new Set(
      valores
        .map((valor) => valor?.trim() ?? "")
        .filter(Boolean),
    ),
  );
}

export async function obtenerDatosFormularioEquipo(): Promise<DatosFormularioEquipoPanel> {
  const {
    data: temporadaEncontrada,
    error: errorTemporada,
  } = await supabaseServidor
    .from("temporadas")
    .select("id, nombre")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (errorTemporada) {
    throw new Error(
      `No se ha podido obtener la temporada activa: ${errorTemporada.message}`,
    );
  }

  if (!temporadaEncontrada?.id) {
    return {
      temporada: null,
      categorias: [],
      generos: [],
      niveles: [],
      patrocinadores: [],
      instalaciones: [],
    };
  }

  const temporada = temporadaEncontrada as FilaTemporada;

  const [
    resultadoEquipos,
    resultadoPatrocinadores,
    resultadoInstalaciones,
  ] = await Promise.all([
    supabaseServidor
      .from("equipos")
      .select("categoria, genero, nivel")
      .eq("temporada_id", String(temporada.id)),

    supabaseServidor
      .from("patrocinadores")
      .select("id, nombre, nombre_corto, logo")
      .eq("activo", true)
      .order("nombre", {
        ascending: true,
      }),

    supabaseServidor
      .from("instalaciones")
      .select(`
        id,
        nombre,
        nombre_corto,
        direccion,
        localidad
      `)
      .eq("activa", true)
      .order("nombre", {
        ascending: true,
      }),
  ]);

  if (resultadoEquipos.error) {
    throw new Error(
      `No se han podido obtener los datos de los equipos: ${resultadoEquipos.error.message}`,
    );
  }

  if (resultadoPatrocinadores.error) {
    throw new Error(
      `No se han podido obtener los patrocinadores: ${resultadoPatrocinadores.error.message}`,
    );
  }

  if (resultadoInstalaciones.error) {
    throw new Error(
      `No se han podido obtener las instalaciones: ${resultadoInstalaciones.error.message}`,
    );
  }

  const filasEquipos =
    (resultadoEquipos.data ?? []) as FilaEquipo[];

  const filasPatrocinadores =
    (resultadoPatrocinadores.data ??
      []) as FilaPatrocinador[];

  const filasInstalaciones =
    (resultadoInstalaciones.data ??
      []) as FilaInstalacion[];

  const categorias = obtenerValoresUnicos(
    filasEquipos.map((equipo) => equipo.categoria),
  ).sort((primeraCategoria, segundaCategoria) => {
    const primeraPosicion =
      obtenerPosicionCategoria(primeraCategoria);

    const segundaPosicion =
      obtenerPosicionCategoria(segundaCategoria);

    if (primeraPosicion !== segundaPosicion) {
      return primeraPosicion - segundaPosicion;
    }

    return primeraCategoria.localeCompare(
      segundaCategoria,
      "es",
    );
  });

  const generos = obtenerValoresUnicos(
    filasEquipos.map((equipo) => equipo.genero),
  ).sort((primerGenero, segundoGenero) =>
    primerGenero.localeCompare(segundoGenero, "es"),
  );

  const niveles = obtenerValoresUnicos(
    filasEquipos.map((equipo) => equipo.nivel),
  ).sort((primerNivel, segundoNivel) =>
    primerNivel.localeCompare(segundoNivel, "es"),
  );

  const patrocinadores: PatrocinadorFormularioEquipo[] =
    filasPatrocinadores.map((patrocinador) => ({
      id: patrocinador.id,
      nombre:
        patrocinador.nombre?.trim() ||
        patrocinador.nombre_corto?.trim() ||
        "Patrocinador",
      nombreCorto: patrocinador.nombre_corto,
      logo: patrocinador.logo,
    }));

  const instalaciones: InstalacionFormularioEquipo[] =
    filasInstalaciones.map((instalacion) => ({
      id: instalacion.id,
      nombre:
        instalacion.nombre?.trim() ||
        instalacion.nombre_corto?.trim() ||
        "Instalación",
      nombreCorto: instalacion.nombre_corto,
      direccion: instalacion.direccion,
      localidad: instalacion.localidad,
    }));

  return {
    temporada: {
      id: String(temporada.id),
      nombre:
        temporada.nombre?.trim() ||
        "Temporada activa",
    },
    categorias,
    generos,
    niveles,
    patrocinadores,
    instalaciones,
  };
}