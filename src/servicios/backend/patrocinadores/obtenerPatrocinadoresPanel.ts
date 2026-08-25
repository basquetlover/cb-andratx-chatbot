import { supabaseServidor } from "../../supabase/servidor";

import type {
  AsignacionPatrocinadorEquipo,
  EquipoPatrocinadoPanel,
  PatrocinadorListadoPanel,
  RedSocialPatrocinador,
  ResultadoPatrocinadoresPanel,
} from "../../../types/PatrocinadorPanel";

interface FilaPatrocinador {
  id: string;
  created_at: string;
  updated_at?: string | null;
  nombre: string | null;
  nombre_corto: string | null;
  slug: string | null;
  descripcion: string | null;
  logo: string | null;
  web: string | null;
  redes: unknown;
  activo: boolean | null;
  banner: string | null;
}

interface FilaTemporada {
  id: string;
}

interface FilaEquipo {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  mostrar_sponsor: boolean | null;
  patrocinadores: unknown;
}

interface AsignacionJson {
  id?: unknown;
  fecha_asignacion?: unknown;
  asignado_por?: unknown;
}

interface RedSocialJson {
  id?: unknown;
  nombre?: unknown;
  usuario?: unknown;
  url?: unknown;
  icono?: unknown;
  activo?: unknown;
  orden?: unknown;
}

function convertirTexto(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto.length > 0 ? texto : null;
}

function convertirNumero(valor: unknown, valorPredeterminado = 0): number {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return valor;
  }

  if (typeof valor === "string" && valor.trim()) {
    const numero = Number(valor);

    if (Number.isFinite(numero)) {
      return numero;
    }
  }

  return valorPredeterminado;
}

function convertirAsignaciones(valor: unknown): AsignacionPatrocinadorEquipo[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor
    .map((elemento): AsignacionPatrocinadorEquipo | null => {
      if (typeof elemento !== "object" || elemento === null) {
        return null;
      }

      const asignacion = elemento as AsignacionJson;
      const id = convertirTexto(asignacion.id);
      const fechaAsignacion = convertirTexto(asignacion.fecha_asignacion);
      const asignadoPor = convertirTexto(asignacion.asignado_por);

      if (!id || !fechaAsignacion || !asignadoPor) {
        return null;
      }

      return {
        id,
        fechaAsignacion,
        asignadoPor,
      };
    })
    .filter((asignacion): asignacion is AsignacionPatrocinadorEquipo => asignacion !== null);
}

function convertirRedesSociales(valor: unknown): RedSocialPatrocinador[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor
    .map((elemento): RedSocialPatrocinador | null => {
      if (typeof elemento !== "object" || elemento === null) {
        return null;
      }

      const red = elemento as RedSocialJson;
      const id = convertirTexto(red.id);
      const nombre = convertirTexto(red.nombre);
      const url = convertirTexto(red.url);

      if (!id || !nombre || !url) {
        return null;
      }

      return {
        id,
        nombre,
        usuario: convertirTexto(red.usuario),
        url,
        icono: convertirTexto(red.icono),
        activo: red.activo !== false,
        orden: convertirNumero(red.orden),
      };
    })
    .filter((red): red is RedSocialPatrocinador => red !== null)
    .sort((primeraRed, segundaRed) => primeraRed.orden - segundaRed.orden);
}

export async function obtenerPatrocinadoresPanel(): Promise<ResultadoPatrocinadoresPanel> {
  const { data: patrocinadoresEncontrados, error: errorPatrocinadores } = await supabaseServidor
    .from("patrocinadores")
    .select("id, created_at, updated_at, nombre, nombre_corto, slug, descripcion, logo, web, redes, activo, banner")
    .order("nombre", {
      ascending: true,
    });

  if (errorPatrocinadores) {
    throw new Error(`No se han podido obtener los patrocinadores: ${errorPatrocinadores.message}`);
  }

  const filasPatrocinadores = (patrocinadoresEncontrados ?? []) as FilaPatrocinador[];

  const patrocinadores: PatrocinadorListadoPanel[] = filasPatrocinadores.map((patrocinador) => ({
    id: patrocinador.id,
    nombre: patrocinador.nombre?.trim() || patrocinador.nombre_corto?.trim() || "Patrocinador",
    nombreCorto: patrocinador.nombre_corto?.trim() || null,
    slug: patrocinador.slug?.trim() || null,
    descripcion: patrocinador.descripcion?.trim() || null,
    logo: patrocinador.logo?.trim() || null,
    banner: patrocinador.banner?.trim() || null,
    web: patrocinador.web?.trim() || null,
    redes: convertirRedesSociales(patrocinador.redes),
    activo: patrocinador.activo ?? false,
    createdAt: patrocinador.created_at,
    updatedAt: patrocinador.updated_at ?? null,
    equipos: [],
  }));

  if (patrocinadores.length === 0) {
    return {
      patrocinadores: [],
      totalPatrocinadores: 0,
      patrocinadoresActivos: 0,
      patrocinadoresInactivos: 0,
      equiposPatrocinados: 0,
      totalEquipos: 0,
    };
  }

  const { data: temporadaEncontrada, error: errorTemporada } = await supabaseServidor
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .limit(1)
    .maybeSingle();

  if (errorTemporada) {
    throw new Error(`No se ha podido obtener la temporada activa: ${errorTemporada.message}`);
  }

  const temporada = temporadaEncontrada as FilaTemporada | null;
  let equipos: FilaEquipo[] = [];

  if (temporada?.id) {
    const { data: equiposEncontrados, error: errorEquipos } = await supabaseServidor
      .from("equipos")
      .select("id, nombre, nombre_corto, categoria, genero, nivel, mostrar_sponsor, patrocinadores")
      .eq("temporada_id", String(temporada.id))
      .eq("activo", true)
      .order("categoria", {
        ascending: true,
      })
      .order("nombre", {
        ascending: true,
      });

    if (errorEquipos) {
      throw new Error(`No se han podido obtener los equipos patrocinados: ${errorEquipos.message}`);
    }

    equipos = (equiposEncontrados ?? []) as FilaEquipo[];
  }

  const patrocinadoresPorId = new Map(patrocinadores.map((patrocinador) => [patrocinador.id, patrocinador]));
  const equiposConPatrocinador = new Set<string>();

  equipos.forEach((equipo) => {
    const asignaciones = convertirAsignaciones(equipo.patrocinadores);

    asignaciones.forEach((asignacion) => {
      const patrocinador = patrocinadoresPorId.get(asignacion.id);

      if (!patrocinador) {
        return;
      }

      const equipoPatrocinado: EquipoPatrocinadoPanel = {
        id: equipo.id,
        nombre: equipo.nombre?.trim() || equipo.nombre_corto?.trim() || "Equipo",
        nombreCorto: equipo.nombre_corto?.trim() || null,
        categoria: equipo.categoria?.trim() || null,
        genero: equipo.genero?.trim() || null,
        nivel: equipo.nivel?.trim() || null,
        mostrarSponsor: equipo.mostrar_sponsor ?? true,
        fechaAsignacion: asignacion.fechaAsignacion,
        asignadoPor: asignacion.asignadoPor,
      };

      patrocinador.equipos.push(equipoPatrocinado);
      equiposConPatrocinador.add(equipo.id);
    });
  });

  patrocinadores.forEach((patrocinador) => {
    patrocinador.equipos.sort((primerEquipo, segundoEquipo) => primerEquipo.nombre.localeCompare(segundoEquipo.nombre, "es"));
  });

  const patrocinadoresActivos = patrocinadores.filter((patrocinador) => patrocinador.activo).length;

  return {
    patrocinadores,
    totalPatrocinadores: patrocinadores.length,
    patrocinadoresActivos,
    patrocinadoresInactivos: patrocinadores.length - patrocinadoresActivos,
    equiposPatrocinados: equiposConPatrocinador.size,
    totalEquipos: equipos.length,
  };
}