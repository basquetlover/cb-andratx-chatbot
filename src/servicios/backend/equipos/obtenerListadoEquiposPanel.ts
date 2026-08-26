import { obtenerAccesoEquiposUsuario } from "../permisos/obtenerAccesoEquiposUsuario";
import { supabaseServidor } from "../../supabase/servidor";

import type {
  EquipoListadoPanel,
  PatrocinadorAsignadoEquipo,
  PatrocinadorResumenEquipo,
  ResultadoEquiposPanel,
} from "../../../types/EquipoPanel";

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

interface FilaEquipo {
  id: string;
  created_at: string;
  updated_at: string | null;
  temporada_id: string | null;
  nombre: string | null;
  nombre_corto: string | null;
  slug: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  descripcion: string | null;
  imagen: string | null;
  activo: boolean | null;
  chatbot: boolean | null;
  patrocinadores: unknown;
  mostrar_sponsor: boolean | null;
  id_equipo_fbib: string | null;
}

interface FilaPatrocinador {
  id: string;
  nombre: string | null;
  nombre_corto: string | null;
  logo: string | null;
  activo: boolean | null;
}

interface FilaEntrenamiento {
  equipo_id: string | null;
}

function crearResumenVacio() {
  return {
    total: 0,
    activos: 0,
    disponiblesChatbot: 0,
    sinConfigurarChatbot: 0,
    conEntrenamientos: 0,
    sinEntrenamientos: 0,
  };
}

function convertirTexto(
  valor: unknown,
): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto.length > 0 ? texto : null;
}

function convertirPatrocinadores(
  valor: unknown,
): PatrocinadorAsignadoEquipo[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.flatMap((elemento) => {
    if (
      typeof elemento !== "object" ||
      elemento === null
    ) {
      return [];
    }

    const datos =
      elemento as Record<string, unknown>;

    const id = convertirTexto(datos.id);

    if (!id) {
      return [];
    }

    return [
      {
        id,
        fechaAsignacion:
          convertirTexto(
            datos.fecha_asignacion,
          ) ??
          convertirTexto(
            datos.fechaAsignacion,
          ),
        asignadoPor:
          convertirTexto(datos.asignado_por) ??
          convertirTexto(datos.asignadoPor),
      },
    ];
  });
}

export async function obtenerListadoEquiposPanel(
  usuarioId: string,
): Promise<ResultadoEquiposPanel> {
  const usuarioIdLimpio = usuarioId.trim();

  if (!usuarioIdLimpio) {
    throw new Error(
      "No se ha proporcionado el identificador del usuario.",
    );
  }

  /*
   * El alcance comprueba:
   *
   * - usuarios_permisos.acceso_total
   * - usuarios_permisos.acceso_todos_equipos
   * - equipos asignados en usuarios_equipos
   * - fecha de caducidad de la asignación
   */
  const alcance =
    await obtenerAccesoEquiposUsuario(
      usuarioIdLimpio,
    );

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
      resumen: crearResumenVacio(),
      equipos: [],
    };
  }

  const temporada =
    temporadaEncontrada as FilaTemporada;

  /*
   * Si no tiene acceso global y tampoco tiene equipos
   * asignados, evitamos consultar la tabla equipos.
   */
  if (
    !alcance.accesoTodosEquipos &&
    alcance.equiposIds.length === 0
  ) {
    return {
      temporada: {
        id: temporada.id,
        nombre: temporada.nombre,
      },
      resumen: crearResumenVacio(),
      equipos: [],
    };
  }

  let consultaEquipos = supabaseServidor
    .from("equipos")
    .select(`
      id,
      created_at,
      updated_at,
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
      id_equipo_fbib
    `)
    .eq("temporada_id", temporada.id);

  /*
   * La restricción se aplica en la consulta de Supabase,
   * antes de descargar los equipos.
   */
  if (!alcance.accesoTodosEquipos) {
    consultaEquipos = consultaEquipos.in(
      "id",
      alcance.equiposIds,
    );
  }

  const {
    data: equiposEncontrados,
    error: errorEquipos,
  } = await consultaEquipos
    .order("categoria", {
      ascending: true,
    })
    .order("nombre", {
      ascending: true,
    });

  if (errorEquipos) {
    throw new Error(
      `No se han podido obtener los equipos: ${errorEquipos.message}`,
    );
  }

  const filasEquipos =
    (equiposEncontrados ?? []) as FilaEquipo[];

  if (filasEquipos.length === 0) {
    return {
      temporada: {
        id: temporada.id,
        nombre: temporada.nombre,
      },
      resumen: crearResumenVacio(),
      equipos: [],
    };
  }

  const idsEquipos = filasEquipos.map(
    (equipo) => equipo.id,
  );

  const asignacionesPorEquipo = new Map<
    string,
    PatrocinadorAsignadoEquipo[]
  >();

  const idsPatrocinadores = new Set<string>();

  filasEquipos.forEach((equipo) => {
    const asignaciones =
      convertirPatrocinadores(
        equipo.patrocinadores,
      );

    asignacionesPorEquipo.set(
      equipo.id,
      asignaciones,
    );

    asignaciones.forEach((asignacion) => {
      idsPatrocinadores.add(asignacion.id);
    });
  });

  let patrocinadores: FilaPatrocinador[] =
    [];

  if (idsPatrocinadores.size > 0) {
    const { data, error } =
      await supabaseServidor
        .from("patrocinadores")
        .select(
          "id, nombre, nombre_corto, logo, activo",
        )
        .in(
          "id",
          Array.from(idsPatrocinadores),
        );

    if (error) {
      throw new Error(
        `No se han podido obtener los patrocinadores: ${error.message}`,
      );
    }

    patrocinadores =
      (data ?? []) as FilaPatrocinador[];
  }

  const patrocinadoresPorId = new Map(
    patrocinadores.map((patrocinador) => [
      patrocinador.id,
      patrocinador,
    ]),
  );

  const {
    data: entrenamientosEncontrados,
    error: errorEntrenamientos,
  } = await supabaseServidor
    .from("entrenamientos")
    .select("equipo_id")
    .eq("temporada_id", temporada.id)
    .eq("activo", true)
    .in("equipo_id", idsEquipos);

  if (errorEntrenamientos) {
    throw new Error(
      `No se han podido obtener los entrenamientos: ${errorEntrenamientos.message}`,
    );
  }

  const entrenamientosPorEquipo =
    new Map<string, number>();

  (
    (entrenamientosEncontrados ??
      []) as FilaEntrenamiento[]
  ).forEach((entrenamiento) => {
    if (!entrenamiento.equipo_id) {
      return;
    }

    entrenamientosPorEquipo.set(
      entrenamiento.equipo_id,
      (entrenamientosPorEquipo.get(
        entrenamiento.equipo_id,
      ) ?? 0) + 1,
    );
  });

  const equipos: EquipoListadoPanel[] =
    filasEquipos.map((equipo) => {
      const asignaciones =
        asignacionesPorEquipo.get(equipo.id) ??
        [];

      const patrocinadoresEquipo =
        asignaciones.flatMap<PatrocinadorResumenEquipo>(
          (asignacion) => {
            const patrocinador =
              patrocinadoresPorId.get(
                asignacion.id,
              );

            if (!patrocinador) {
              return [];
            }

            return [
              {
                id: patrocinador.id,
                nombre:
                  patrocinador.nombre?.trim() ||
                  patrocinador.nombre_corto?.trim() ||
                  "Patrocinador",
                nombreCorto:
                  patrocinador.nombre_corto,
                logo: patrocinador.logo,
                activo:
                  patrocinador.activo ?? false,
              },
            ];
          },
        );

      const entrenamientosSemana =
        entrenamientosPorEquipo.get(
          equipo.id,
        ) ?? 0;

      return {
        id: equipo.id,
        temporadaId: equipo.temporada_id,
        nombre:
          equipo.nombre?.trim() ||
          equipo.nombre_corto?.trim() ||
          "Equipo sin nombre",
        nombreCorto: equipo.nombre_corto,
        slug: equipo.slug,
        categoria: equipo.categoria,
        genero: equipo.genero,
        nivel: equipo.nivel,
        descripcion: equipo.descripcion,
        imagen: equipo.imagen,
        activo: equipo.activo ?? false,
        chatbot: equipo.chatbot ?? false,
        idEquipoFbib:
          equipo.id_equipo_fbib,
        mostrarSponsor:
          equipo.mostrar_sponsor ?? true,
        patrocinadores:
          patrocinadoresEquipo,
        totalPatrocinadores:
          patrocinadoresEquipo.length,
        entrenamientosSemana,
        tieneEntrenamientos:
          entrenamientosSemana > 0,
        createdAt: equipo.created_at,
        updatedAt: equipo.updated_at,
      };
    });

  const activos = equipos.filter(
    (equipo) => equipo.activo,
  ).length;

  const disponiblesChatbot = equipos.filter(
    (equipo) => equipo.chatbot,
  ).length;

  const conEntrenamientos = equipos.filter(
    (equipo) =>
      equipo.tieneEntrenamientos,
  ).length;

  return {
    temporada: {
      id: temporada.id,
      nombre: temporada.nombre,
    },
    resumen: {
      total: equipos.length,
      activos,
      disponiblesChatbot,
      sinConfigurarChatbot:
        equipos.filter(
          (equipo) => !equipo.chatbot,
        ).length,
      conEntrenamientos,
      sinEntrenamientos:
        equipos.length - conEntrenamientos,
    },
    equipos,
  };
}