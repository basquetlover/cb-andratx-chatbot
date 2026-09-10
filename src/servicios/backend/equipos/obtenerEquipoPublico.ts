import { supabaseServidor } from "../../supabase/servidor";

import { obtenerEntrenamientosEquipo } from "@servicios/backend/entrenamientos/obtenerEntrenamientosEquipo";

import { obtenerClasificacionesEquipoFbib } from "@servicios/fbib/equipos/obtenerClasificacionesEquipoFbib";

import { obtenerFichaEquipoFbib } from "@servicios/fbib/equipos/obtenerFichaEquipoFbib";

import {
  obtenerPartidosMesEquipoFbib,
  obtenerProximosPartidosEquipoFbib,
} from "@servicios/fbib/equipos/obtenerPartidosEquipoFbib";

import { obtenerPatrocinadoresPublicos } from "@servicios/backend/patrocinadores/obtenerPatrocinadoresPublicos";

import type {
  DatosEquipoPublico,
  DatosFbibEquipoPublico,
  EntrenamientoHabitualEquipoPublico,
  PatrocinadorEquipoPublico,
  TemporadaEquipoPublico,
} from "@tipos/EquipoPublico";

export class ErrorObtenerEquipoPublico extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 500,
  ) {
    super(mensaje);

    this.name =
      "ErrorObtenerEquipoPublico";

    this.status = status;
  }
}

interface FilaEquipo {
  id: string;
  temporada_id: string | null;
  nombre: string | null;
  nombre_corto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
  descripcion: string | null;
  imagen: string | null;
  id_equipo_fbib: string | null;
  patrocinadores: unknown;
  mostrar_sponsor: boolean | null;
  activo: boolean | null;
}

interface FilaTemporada {
  id: string;
  nombre: string | null;
}

function validarSlug(valor: string): boolean {
  return valor.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valor);
}

function convertirTexto(
  valor: unknown,
): string | null {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return null;
  }

  const texto =
    String(valor).trim();

  return texto.length > 0
    ? texto
    : null;
}

function obtenerIdsPatrocinadores(
  valor: unknown,
): string[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  const ids = valor.flatMap(
    (elemento): string[] => {
      if (
        typeof elemento === "string"
      ) {
        const id =
          convertirTexto(elemento);

        return id ? [id] : [];
      }

      if (
        typeof elemento !== "object" ||
        elemento === null
      ) {
        return [];
      }

      const datos =
        elemento as Record<
          string,
          unknown
        >;

      const id =
        convertirTexto(datos.id);

      return id ? [id] : [];
    },
  );

  return Array.from(new Set(ids));
}

function obtenerMesActualMadrid(): number {
  const mes = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Europe/Madrid",
      month: "numeric",
    },
  ).format(new Date());

  const numeroMes = Number(mes);

  return Number.isInteger(numeroMes) &&
    numeroMes >= 1 &&
    numeroMes <= 12
    ? numeroMes
    : new Date().getMonth() + 1;
}

async function obtenerTemporada(
  temporadaId: string | null,
): Promise<TemporadaEquipoPublico | null> {
  if (!temporadaId) {
    return null;
  }

  const {
    data: temporadaEncontrada,
    error,
  } = await supabaseServidor
    .from("temporadas")
    .select("id, nombre")
    .eq("id", temporadaId)
    .maybeSingle();

  if (error) {
    throw new ErrorObtenerEquipoPublico(
      `No se ha podido obtener la temporada del equipo: ${error.message}`,
      500,
    );
  }

  if (!temporadaEncontrada) {
    return null;
  }

  const temporada =
    temporadaEncontrada as FilaTemporada;

  return {
    id: temporada.id,

    nombre:
      temporada.nombre?.trim() ||
      "Temporada",
  };
}

async function obtenerPatrocinadoresEquipo(
  patrocinadoresGuardados: unknown,
  mostrarSponsor: boolean,
): Promise<PatrocinadorEquipoPublico[]> {
  if (!mostrarSponsor) {
    return [];
  }

  const ids =
    obtenerIdsPatrocinadores(
      patrocinadoresGuardados,
    );

  /*
   * No debe llamarse al servicio con un array
   * vacío porque podría devolver todos los
   * patrocinadores públicos.
   */
  if (ids.length === 0) {
    return [];
  }

  try {
    const patrocinadoresEncontrados =
      await obtenerPatrocinadoresPublicos(
        ids,
      );

    return patrocinadoresEncontrados.flatMap<
      PatrocinadorEquipoPublico
    >((patrocinador) => {
      const banner =
        convertirTexto(
          patrocinador.banner,
        );

      if (!banner) {
        return [];
      }

      return [
        {
          id: patrocinador.id,

          nombre:
            convertirTexto(
              patrocinador.nombre,
            ) ??
            "Patrocinador",

          banner,

          enlace:
            convertirTexto(
              patrocinador.enlace,
            ),
        },
      ];
    });
  } catch (error) {
    console.error(
      "Error cargando los patrocinadores del equipo:",
      error,
    );

    return [];
  }
}

async function obtenerEntrenamientosHabituales(
  equipoId: string,
): Promise<
  EntrenamientoHabitualEquipoPublico[]
> {
  try {
    const resultado =
      await obtenerEntrenamientosEquipo(
        equipoId,
      );

    return resultado.habituales
      .filter(
        (entrenamiento) =>
          entrenamiento.activo,
      )
      .map(
        (
          entrenamiento,
        ): EntrenamientoHabitualEquipoPublico => ({
          id: entrenamiento.id,

          diaSemana:
            entrenamiento.diaSemana,

          horaInicio:
            entrenamiento.horaInicio,

          horaFin:
            entrenamiento.horaFin,

          fechaInicio:
            entrenamiento.fechaInicio,

          fechaFin:
            entrenamiento.fechaFin,

          observaciones:
            convertirTexto(
              entrenamiento.observaciones,
            ),

          instalacion:
            entrenamiento.instalacion
              ? {
                  id:
                    entrenamiento
                      .instalacion.id,

                  nombre:
                    entrenamiento
                      .instalacion.nombre,

                  nombreCorto:
                    convertirTexto(
                      entrenamiento
                        .instalacion
                        .nombreCorto,
                    ),

                  direccion:
                    convertirTexto(
                      entrenamiento
                        .instalacion
                        .direccion,
                    ),

                  localidad:
                    convertirTexto(
                      entrenamiento
                        .instalacion
                        .localidad,
                    ),
                }
              : null,
        }),
      );
  } catch (error) {
    /*
     * La ausencia de entrenamientos no debe
     * impedir que se muestre el equipo.
     */
    console.error(
      `Error cargando los entrenamientos habituales del equipo ${equipoId}:`,
      error,
    );

    return [];
  }
}

async function obtenerDatosFbibEquipo(
  idEquipoFbib: string | null,
): Promise<DatosFbibEquipoPublico | null> {
  if (!idEquipoFbib) {
    return null;
  }

  const id =
    idEquipoFbib.trim();

  if (!id) {
    return null;
  }

  const mesActual =
    obtenerMesActualMadrid();

  const enlaceFbib =
    `https://www.fbib.es/equipo/${encodeURIComponent(id)}`;

  /*
   * La ficha, los partidos del mes y los
   * próximos partidos son independientes.
   * Si falla una consulta, el resto de la
   * página sigue funcionando.
   */
  const [
    resultadoFicha,
    resultadoPartidosMes,
    resultadoProximos,
  ] = await Promise.allSettled([
    obtenerFichaEquipoFbib(id),

    obtenerPartidosMesEquipoFbib(
      id,
      mesActual,
    ),

    obtenerProximosPartidosEquipoFbib(
      id,
      4,
    ),
  ]);

  let ficha:
    DatosFbibEquipoPublico["ficha"] =
      null;

  let partidosMes:
    DatosFbibEquipoPublico["partidosMes"] =
      [];

  let proximosPartidos:
    DatosFbibEquipoPublico["proximosPartidos"] =
      [];

  if (
    resultadoFicha.status ===
    "fulfilled"
  ) {
    ficha = resultadoFicha.value;
  } else {
    console.error(
      `Error cargando la ficha FBIB del equipo ${id}:`,
      resultadoFicha.reason,
    );
  }

  if (
    resultadoPartidosMes.status ===
    "fulfilled"
  ) {
    partidosMes =
      resultadoPartidosMes.value;
  } else {
    console.error(
      `Error cargando los partidos del mes del equipo ${id}:`,
      resultadoPartidosMes.reason,
    );
  }

  if (
    resultadoProximos.status ===
    "fulfilled"
  ) {
    proximosPartidos =
      resultadoProximos.value;
  } else {
    console.error(
      `Error cargando los próximos partidos del equipo ${id}:`,
      resultadoProximos.reason,
    );
  }

  let clasificaciones:
    DatosFbibEquipoPublico["clasificaciones"] =
      [];

  if (ficha?.grupos.length) {
    try {
      clasificaciones =
        await obtenerClasificacionesEquipoFbib(
          id,
          ficha.grupos,
        );
    } catch (error) {
      console.error(
        `Error cargando las clasificaciones FBIB del equipo ${id}:`,
        error,
      );
    }
  }

  return {
    idEquipoFbib: id,
    enlaceFbib,
    mesConsultado: mesActual,
    ficha,
    partidosMes,
    proximosPartidos,
    clasificaciones,
  };
}

export async function obtenerEquipoPublico(
  equipoSlug: string,
): Promise<DatosEquipoPublico> {
  const slug = equipoSlug.trim();

  if (!validarSlug(slug)) {
    throw new ErrorObtenerEquipoPublico(
      "El identificador del equipo no es válido.",
      404,
    );
  }

  const {
    data: equipoEncontrado,
    error: errorEquipo,
  } = await supabaseServidor
    .from("equipos")
    .select(`
      id,
      temporada_id,
      nombre,
      nombre_corto,
      categoria,
      genero,
      nivel,
      descripcion,
      imagen,
      id_equipo_fbib,
      patrocinadores,
      mostrar_sponsor,
      activo
    `)
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (errorEquipo) {
    throw new ErrorObtenerEquipoPublico(
      `No se ha podido obtener el equipo: ${errorEquipo.message}`,
      500,
    );
  }

  if (!equipoEncontrado) {
    throw new ErrorObtenerEquipoPublico(
      "El equipo no existe o no está disponible públicamente.",
      404,
    );
  }

  const equipo =
    equipoEncontrado as FilaEquipo;

  const mostrarSponsor =
    equipo.mostrar_sponsor ?? true;

  const [
    temporada,
    patrocinadores,
    entrenamientosHabituales,
    fbib,
  ] = await Promise.all([
    obtenerTemporada(
      equipo.temporada_id,
    ),

    obtenerPatrocinadoresEquipo(
      equipo.patrocinadores,
      mostrarSponsor,
    ),

    obtenerEntrenamientosHabituales(
      equipo.id,
    ),

    obtenerDatosFbibEquipo(
      convertirTexto(
        equipo.id_equipo_fbib,
      ),
    ),
  ]);

  return {
    id: equipo.id,

    nombre:
      convertirTexto(
        equipo.nombre,
      ) ??
      convertirTexto(
        equipo.nombre_corto,
      ) ??
      "Equipo",

    nombreCorto:
      convertirTexto(
        equipo.nombre_corto,
      ),

    categoria:
      convertirTexto(
        equipo.categoria,
      ),

    genero:
      convertirTexto(
        equipo.genero,
      ),

    nivel:
      convertirTexto(
        equipo.nivel,
      ),

    descripcion:
      convertirTexto(
        equipo.descripcion,
      ),

    imagen:
      convertirTexto(
        equipo.imagen,
      ),

    temporada,

    entrenamientosHabituales,

    mostrarSponsor,
    patrocinadores,

    fbib,
  };
}