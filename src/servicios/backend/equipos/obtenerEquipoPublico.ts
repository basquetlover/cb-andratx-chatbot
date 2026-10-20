
import { supabaseServidor } from "../../supabase/servidor";

import {
  obtenerEntrenamientosEquipo,
} from "@servicios/backend/entrenamientos/obtenerEntrenamientosEquipo";

import {
  obtenerClasificacionesEquipoFbib,
} from "@servicios/fbib/equipos/obtenerClasificacionesEquipoFbib";

import {
  obtenerFichaEquipoFbib,
} from "@servicios/fbib/equipos/obtenerFichaEquipoFbib";

import {
  obtenerPartidosCombinados,
} from "@servicios/backend/partidos/obtenerPartidosCombinados";

import {
  obtenerPatrocinadoresPublicos,
} from "@servicios/backend/patrocinadores/obtenerPatrocinadoresPublicos";

import type {
  PartidoCombinado,
} from "@servicios/backend/partidos/obtenerPartidosCombinados";

import type {
  DatosEquipoPublico,
  DatosFbibEquipoPublico,
  EntrenamientoHabitualEquipoPublico,
  PatrocinadorEquipoPublico,
  TemporadaEquipoPublico,
} from "@tipos/EquipoPublico";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const ZONA_HORARIA = "Europe/Madrid";

const CANTIDAD_PROXIMOS_PARTIDOS = 4;

// ======================================================
// ERRORES
// ======================================================

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

// ======================================================
// TIPOS DE BASE DE DATOS
// ======================================================

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

// ======================================================
// TIPOS DE FECHAS
// ======================================================

interface FechaActualMadrid {
  anio: number;
  mes: number;
  dia: number;

  hora: number;
  minuto: number;

  fecha: string;
  horaTexto: string;
}

interface RangoTemporadaPartidos {
  inicio: string;
  fin: string;

  mesActual: number;
  anioActual: number;
}

// ======================================================
// VALIDACIONES
// ======================================================

function validarSlug(
  valor: string,
): boolean {
  return (
    valor.length <= 120 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valor)
  );
}

// ======================================================
// UTILIDADES DE TEXTO
// ======================================================

function convertirTexto(
  valor: unknown,
): string | null {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return null;
  }

  const texto = String(valor).trim();

  return texto.length > 0
    ? texto
    : null;
}

function rellenarDosDigitos(
  valor: number,
): string {
  return String(valor).padStart(
    2,
    "0",
  );
}

// ======================================================
// FECHA ACTUAL EN MALLORCA
// ======================================================

function obtenerFechaActualMadrid(): FechaActualMadrid {
  const ahora = new Date();

  const partes =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: ZONA_HORARIA,

        year: "numeric",
        month: "2-digit",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit",

        hourCycle: "h23",
      },
    ).formatToParts(ahora);

  function obtenerParte(
    tipo: Intl.DateTimeFormatPartTypes,
  ): number {
    const valor =
      partes.find(
        (parte) =>
          parte.type === tipo,
      )?.value;

    return Number(valor ?? 0);
  }

  const anio =
    obtenerParte("year");

  const mes =
    obtenerParte("month");

  const dia =
    obtenerParte("day");

  const hora =
    obtenerParte("hour");

  const minuto =
    obtenerParte("minute");

  return {
    anio,
    mes,
    dia,

    hora,
    minuto,

    fecha:
      `${anio}-` +
      `${rellenarDosDigitos(mes)}-` +
      rellenarDosDigitos(dia),

    horaTexto:
      `${rellenarDosDigitos(hora)}:` +
      rellenarDosDigitos(minuto),
  };
}

// ======================================================
// RANGO DE CONSULTA DE PARTIDOS
// ======================================================

function obtenerRangoTemporadaPartidos(
  fechaActual: FechaActualMadrid,
): RangoTemporadaPartidos {
  /**
   * Se consulta desde el primer día
   * del mes actual hasta el final
   * de la temporada deportiva.
   *
   * Agosto - julio.
   *
   * Con una única consulta podemos
   * obtener:
   *
   * - Partidos del mes actual.
   * - Próximos partidos.
   *
   * Los cambios de mes o fecha
   * se resuelven en el servicio central.
   */

  const anioFinTemporada =
    fechaActual.mes >= 8
      ? fechaActual.anio + 1
      : fechaActual.anio;

  return {
    inicio:
      `${fechaActual.anio}-` +
      `${rellenarDosDigitos(fechaActual.mes)}-01`,

    fin:
      `${anioFinTemporada}-07-31`,

    mesActual:
      fechaActual.mes,

    anioActual:
      fechaActual.anio,
  };
}

// ======================================================
// FILTROS DE PARTIDOS
// ======================================================

function obtenerPartidosMesActual(
  partidos: PartidoCombinado[],
  fechaActual: FechaActualMadrid,
): PartidoCombinado[] {
  const prefijoMes =
    `${fechaActual.anio}-` +
    rellenarDosDigitos(
      fechaActual.mes,
    );

  return partidos.filter(
    (partido) =>
      partido.fecha !== null &&
      partido.fecha.startsWith(
        `${prefijoMes}-`,
      ),
  );
}

function esPartidoFuturo(
  partido: PartidoCombinado,
  fechaActual: FechaActualMadrid,
): boolean {
  if (!partido.fecha) {
    return false;
  }

  /**
   * No se consideran próximos
   * los partidos ya finalizados
   * ni los aplazados sin una
   * nueva fecha confirmada.
   */

  if (
    partido.estadoPortada ===
      "finalizado" ||
    partido.estadoPortada ===
      "aplazado"
  ) {
    return false;
  }

  if (
    partido.fecha >
    fechaActual.fecha
  ) {
    return true;
  }

  if (
    partido.fecha <
    fechaActual.fecha
  ) {
    return false;
  }

  /**
   * Partido del día actual.
   *
   * Si no se conoce la hora,
   * permanece en próximos
   * porque no podemos asegurar
   * que ya haya empezado.
   */

  if (!partido.hora) {
    return true;
  }

  return (
    partido.hora >=
    fechaActual.horaTexto
  );
}

function obtenerProximosPartidosCombinados(
  partidos: PartidoCombinado[],
  fechaActual: FechaActualMadrid,
): PartidoCombinado[] {
  return partidos
    .filter(
      (partido) =>
        esPartidoFuturo(
          partido,
          fechaActual,
        ),
    )
    .sort(
      (partidoA, partidoB) => {
        const fechaA =
          `${partidoA.fecha ?? ""}T` +
          `${partidoA.hora ?? "23:59"}`;

        const fechaB =
          `${partidoB.fecha ?? ""}T` +
          `${partidoB.hora ?? "23:59"}`;

        return fechaA.localeCompare(
          fechaB,
        );
      },
    )
    .slice(
      0,
      CANTIDAD_PROXIMOS_PARTIDOS,
    );
}

// ======================================================
// PATROCINADORES: OBTENER IDENTIFICADORES
// ======================================================

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

  return Array.from(
    new Set(ids),
  );
}

// ======================================================
// TEMPORADA DEL EQUIPO
// ======================================================

async function obtenerTemporada(
  temporadaId: string | null,
): Promise<
  TemporadaEquipoPublico | null
> {
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
    id:
      temporada.id,

    nombre:
      temporada.nombre?.trim() ||
      "Temporada",
  };
}

// ======================================================
// PATROCINADORES DEL EQUIPO
// ======================================================

async function obtenerPatrocinadoresEquipo(
  patrocinadoresGuardados: unknown,
  mostrarSponsor: boolean,
): Promise<
  PatrocinadorEquipoPublico[]
> {
  if (!mostrarSponsor) {
    return [];
  }

  const ids =
    obtenerIdsPatrocinadores(
      patrocinadoresGuardados,
    );

  /**
   * No llamar al servicio
   * con un array vacío:
   *
   * podría devolver todos los
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
          id:
            patrocinador.id,

          nombre:
            convertirTexto(
              patrocinador.nombre,
            ) ?? "Patrocinador",

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

// ======================================================
// ENTRENAMIENTOS HABITUALES
// ======================================================

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
          id:
            entrenamiento.id,

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
    /**
     * Si fallan los entrenamientos,
     * el resto de la página continúa
     * funcionando.
     */

    console.error(
      `Error cargando los entrenamientos habituales del equipo ${equipoId}:`,
      error,
    );

    return [];
  }
}

// ======================================================
// INFORMACIÓN FBIB + PARTIDOS UNIFICADOS
// ======================================================

async function obtenerDatosFbibEquipo(
  equipoId: string,
  idEquipoFbib: string | null,
): Promise<
  DatosFbibEquipoPublico | null
> {
  const id =
    convertirTexto(
      idEquipoFbib,
    );

  /**
   * Se mantiene el contrato existente.
   *
   * En equipos sin ID FBIB, fbib
   * permanece null.
   *
   * Sus partidos manuales ya pueden
   * consultarse desde el calendario
   * público mediante el archivo 2.
   */

  if (!id) {
    return null;
  }

  const fechaActual =
    obtenerFechaActualMadrid();

  const rango =
    obtenerRangoTemporadaPartidos(
      fechaActual,
    );

  const enlaceFbib =
    `https://www.fbib.es/equipo/${encodeURIComponent(id)}`;

  /**
   * La ficha FBIB se obtiene por
   * separado de los partidos.
   *
   * Los partidos proceden únicamente
   * de obtenerPartidosCombinados.
   *
   * No se ejecutan servicios paralelos
   * que puedan devolver listas distintas.
   */

  const [
    resultadoFicha,
    resultadoPartidos,
  ] = await Promise.allSettled([
    obtenerFichaEquipoFbib(
      id,
    ),

    obtenerPartidosCombinados({
      equipoId,

      inicio:
        rango.inicio,

      fin:
        rango.fin,
    }),
  ]);

  // --------------------------------------------------
  // FICHA
  // --------------------------------------------------

  let ficha:
    DatosFbibEquipoPublico["ficha"] =
      null;

  if (
    resultadoFicha.status ===
    "fulfilled"
  ) {
    ficha =
      resultadoFicha.value;
  } else {
    console.error(
      `Error cargando la ficha FBIB del equipo ${id}:`,
      resultadoFicha.reason,
    );
  }

  // --------------------------------------------------
  // PARTIDOS
  // --------------------------------------------------

  let partidosCombinados:
    PartidoCombinado[] = [];

  if (
    resultadoPartidos.status ===
    "fulfilled"
  ) {
    partidosCombinados =
      resultadoPartidos.value.partidos;
  } else {
    console.error(
      `Error cargando los partidos del equipo ${equipoId}:`,
      resultadoPartidos.reason,
    );
  }

  // --------------------------------------------------
  // PARTIDOS DEL MES
  // --------------------------------------------------

  const partidosMes:
    DatosFbibEquipoPublico["partidosMes"] =
      obtenerPartidosMesActual(
        partidosCombinados,
        fechaActual,
      );

  // --------------------------------------------------
  // PRÓXIMOS PARTIDOS
  // --------------------------------------------------

  const proximosPartidos:
    DatosFbibEquipoPublico["proximosPartidos"] =
      obtenerProximosPartidosCombinados(
        partidosCombinados,
        fechaActual,
      );

  // --------------------------------------------------
  // CLASIFICACIONES
  // --------------------------------------------------

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

  // --------------------------------------------------
  // RESPUESTA
  // --------------------------------------------------

  return {
    idEquipoFbib: id,

    enlaceFbib,

    mesConsultado:
      fechaActual.mes,

    ficha,

    partidosMes,

    proximosPartidos,

    clasificaciones,
  };
}

// ======================================================
// OBTENER EQUIPO PÚBLICO POR SLUG
// ======================================================

export async function obtenerEquipoPublico(
  equipoSlug: string,
): Promise<DatosEquipoPublico> {
  const slug = equipoSlug.trim();

  // --------------------------------------------------
  // 1. VALIDAR SLUG
  // --------------------------------------------------

  if (!validarSlug(slug)) {
    throw new ErrorObtenerEquipoPublico(
      "El identificador del equipo no es válido.",
      404,
    );
  }

  // --------------------------------------------------
  // 2. CONSULTAR EQUIPO
  // --------------------------------------------------

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
    .eq(
      "slug",
      slug,
    )
    .eq(
      "activo",
      true,
    )
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

  // --------------------------------------------------
  // 3. CARGAR DATOS INDEPENDIENTES
  // --------------------------------------------------

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
      equipo.id,
      convertirTexto(
        equipo.id_equipo_fbib,
      ),
    ),
  ]);

  // --------------------------------------------------
  // 4. RESPUESTA PÚBLICA
  // --------------------------------------------------

  return {
    id:
      equipo.id,

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
