import { supabaseServidor } from "../../supabase/servidor";

import type {
  EquipoDetallePanel,
  PatrocinadorEquipoDetalle,
} from "@tipos/EquipoDetallePanel";

export class ErrorObtenerEquipoDetalle extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name = "ErrorObtenerEquipoDetalle";
    this.status = status;
  }
}

interface FilaEquipo {
  id: string;
  temporada_id: string;
  nombre: string;
  nombre_corto: string | null;
  slug: string;
  categoria: string;
  genero: string;
  nivel: string | null;
  descripcion: string | null;
  imagen: string | null;
  activo: boolean;
  chatbot: boolean;
  patrocinadores: unknown;
  mostrar_sponsor: boolean;
  id_equipo_fbib: string | null;
  created_at: string;
  updated_at: string | null;
}

interface FilaTemporada {
  id: string;
  nombre: string;
}

interface FilaPatrocinador {
  id: string;
  nombre: string;
  nombre_corto: string | null;
  logo: string | null;
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function obtenerIdsPatrocinadores(
  valor: unknown,
): string[] {
  let contenido = valor;

  if (typeof contenido === "string") {
    try {
      contenido = JSON.parse(contenido);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(contenido)) {
    return [];
  }

  const ids = contenido
    .map((elemento) => {
      if (typeof elemento === "string") {
        return elemento.trim();
      }

      if (
        typeof elemento === "object" &&
        elemento !== null &&
        "id" in elemento &&
        typeof elemento.id === "string"
      ) {
        return elemento.id.trim();
      }

      return "";
    })
    .filter(Boolean);

  return Array.from(new Set(ids));
}

async function obtenerTemporada(
  temporadaId: string,
): Promise<FilaTemporada> {
  const {
    data: temporadaEncontrada,
    error,
  } = await supabaseServidor
    .from("temporadas")
    .select("id, nombre")
    .eq("id", temporadaId)
    .maybeSingle();

  if (error) {
    throw new ErrorObtenerEquipoDetalle(
      `No se ha podido obtener la temporada del equipo: ${error.message}`,
    );
  }

  if (!temporadaEncontrada?.id) {
    throw new ErrorObtenerEquipoDetalle(
      "La temporada asociada al equipo no existe.",
    );
  }

  return temporadaEncontrada as FilaTemporada;
}

async function obtenerPatrocinadores(
  ids: string[],
): Promise<PatrocinadorEquipoDetalle[]> {
  if (ids.length === 0) {
    return [];
  }

  const {
    data: patrocinadoresEncontrados,
    error,
  } = await supabaseServidor
    .from("patrocinadores")
    .select("id, nombre, nombre_corto, logo")
    .in("id", ids);

  if (error) {
    throw new ErrorObtenerEquipoDetalle(
      `No se han podido obtener los patrocinadores del equipo: ${error.message}`,
    );
  }

  const patrocinadores =
    (patrocinadoresEncontrados ??
      []) as FilaPatrocinador[];

  const patrocinadoresPorId = new Map(
    patrocinadores.map((patrocinador) => [
      patrocinador.id,
      patrocinador,
    ]),
  );

  return ids
    .map((id) => patrocinadoresPorId.get(id))
    .filter(
      (
        patrocinador,
      ): patrocinador is FilaPatrocinador =>
        Boolean(patrocinador),
    )
    .map((patrocinador) => ({
      id: patrocinador.id,
      nombre: patrocinador.nombre,
      nombreCorto:
        patrocinador.nombre_corto ?? "",
      logo: patrocinador.logo,
    }));
}

export async function obtenerEquipoDetallePanel(
  equipoId: string,
): Promise<EquipoDetallePanel> {
  const idNormalizado = equipoId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorObtenerEquipoDetalle(
      "El identificador del equipo no es válido.",
      400,
    );
  }

  const {
    data: equipoEncontrado,
    error: errorEquipo,
  } = await supabaseServidor
    .from("equipos")
    .select(
      `
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
        activo,
        chatbot,
        patrocinadores,
        mostrar_sponsor,
        id_equipo_fbib,
        created_at,
        updated_at
      `,
    )
    .eq("id", idNormalizado)
    .maybeSingle();

  if (errorEquipo) {
    throw new ErrorObtenerEquipoDetalle(
      `No se ha podido obtener el equipo: ${errorEquipo.message}`,
    );
  }

  if (!equipoEncontrado?.id) {
    throw new ErrorObtenerEquipoDetalle(
      "El equipo no existe.",
      404,
    );
  }

  const equipo = equipoEncontrado as FilaEquipo;

  const idsPatrocinadores =
    obtenerIdsPatrocinadores(
      equipo.patrocinadores,
    );

  const [temporada, patrocinadores] =
    await Promise.all([
      obtenerTemporada(equipo.temporada_id),
      obtenerPatrocinadores(
        idsPatrocinadores,
      ),
    ]);

  return {
    id: equipo.id,

    datosGenerales: {
      temporada: {
        id: temporada.id,
        nombre: temporada.nombre,
      },
      nombre: equipo.nombre,
      nombreCorto: equipo.nombre_corto ?? "",
      slug: equipo.slug,
      categoria: equipo.categoria,
      genero: equipo.genero,
      nivel: equipo.nivel ?? "",
      descripcion: equipo.descripcion ?? "",
      imagen: equipo.imagen,
      activo: equipo.activo,
    },

    integraciones: {
      chatbot: equipo.chatbot,
      idEquipoFbib:
        equipo.id_equipo_fbib ?? "",
    },

    patrocinadores: {
      mostrarSponsor:
        equipo.mostrar_sponsor,
      seleccionados: patrocinadores,
    },

    administracion: {
      createdAt: equipo.created_at,
      updatedAt:
        equipo.updated_at ?? equipo.created_at,
    },
  };
}