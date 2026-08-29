import {
  useState,
} from "react";

import FilaPartidoPublicacion from "./FilaPartidoPublicacion";
import FormularioPartidoManual from "./FormularioPartidoManual";

import {
  solicitarEquipos,
  type EquipoClubPublicacion,
} from "./SelectorEquipoClubPublicacion";

import type {
  PartidoPeriodoFbibPublicacion,
  PartidoPublicacion,
  RespuestaPartidosPeriodoFbib,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  fechaInicio: string;
  fechaFin: string;

  partidos:
    PartidoPublicacion[];

  partidosPorImagen: number;

  alCambiar: (
    partidos:
      PartidoPublicacion[],
  ) => void;

  deshabilitado?: boolean;
}

function normalizarOrden(
  partidos:
    PartidoPublicacion[],
): PartidoPublicacion[] {
  return partidos.map(
    (partido, indice) => ({
      ...partido,
      orden: indice + 1,
    }),
  );
}

function coincideEquipo(
  partido:
    PartidoPeriodoFbibPublicacion,
  equipo:
    EquipoClubPublicacion,
): boolean {
  if (
    partido.equipoId ===
    equipo.id
  ) {
    return true;
  }

  if (
    equipo.idEquipoFbib &&
    partido.equipoFbibId ===
      equipo.idEquipoFbib
  ) {
    return true;
  }

  return false;
}

function completarPartidoExistente(
  partidoExistente:
    PartidoPublicacion,
  partidoFbib:
    PartidoPeriodoFbibPublicacion,
  equipo:
    EquipoClubPublicacion | null,
): PartidoPublicacion {
  return {
    ...partidoExistente,

    partidoFbibId:
      partidoExistente
        .partidoFbibId ??
      partidoFbib.partidoFbibId,

    equipoId:
      partidoExistente.equipoId ??
      equipo?.id ??
      partidoFbib.equipoId,

    equipoFbibId:
      partidoExistente
        .equipoFbibId ??
      equipo?.idEquipoFbib ??
      partidoFbib.equipoFbibId,

    imagenEquipo:
      partidoExistente
        .imagenEquipo ??
      equipo?.imagen ??
      partidoFbib.imagenEquipo ??
      null,

    nombreEquipo:
      partidoExistente
        .nombreEquipo
        .trim() ||
      equipo?.nombre ||
      partidoFbib.nombreEquipo,

    municipio:
      partidoExistente.municipio ??
      partidoFbib.municipio ??
      null,

    pabellon:
      partidoExistente.pabellon ??
      partidoFbib.pabellon ??
      null,
  };
}

function convertirPartidoFbib(
  partido:
    PartidoPeriodoFbibPublicacion,
  equipo:
    EquipoClubPublicacion | null,
  orden: number,
): PartidoPublicacion {
  return {
    id:
      `fbib-${partido.partidoFbibId}`,

    partidoFbibId:
      partido.partidoFbibId,

    origen: "fbib",

    orden,
    visible: true,

    equipoId:
      equipo?.id ??
      partido.equipoId,

    equipoFbibId:
      equipo?.idEquipoFbib ??
      partido.equipoFbibId,

    imagenEquipo:
      equipo?.imagen ??
      partido.imagenEquipo ??
      null,

    fecha:
      partido.fecha,

    hora:
      partido.hora,

    nombreEquipo:
      equipo?.nombre ??
      partido.nombreEquipo,

    rivalFbibId:
      partido.rivalFbibId,

    nombreRival:
      partido.nombreRival,

    logoRival:
      partido.logoRival,

    campo:
      partido.campo,

    municipio:
      partido.municipio ??
      null,

    pabellon:
      partido.pabellon ??
      null,

    local:
      partido.local,

    estado: "partido",
  };
}

function crearFilaDescanso(
  equipo:
    EquipoClubPublicacion,
  fechaInicio: string,
  fechaFin: string,
  orden: number,
): PartidoPublicacion {
  return {
    id:
      `descansa-${equipo.id}-${fechaInicio}-${fechaFin}`,

    partidoFbibId: null,

    origen: "manual",

    estado: "descansa",

    orden,
    visible: true,

    equipoId:
      equipo.id,

    equipoFbibId:
      equipo.idEquipoFbib,

    imagenEquipo:
      equipo.imagen,

    nombreEquipo:
      equipo.nombre,

    fecha: null,
    hora: null,

    rivalFbibId: null,
    nombreRival: "",
    logoRival: null,

    campo: "",
    municipio: null,
    pabellon: null,

    local: null,
  };
}

function completarFilaDescanso(
  partido:
    PartidoPublicacion,
  equipo:
    EquipoClubPublicacion,
): PartidoPublicacion {
  return {
    ...partido,

    partidoFbibId: null,

    equipoId:
      equipo.id,

    equipoFbibId:
      equipo.idEquipoFbib,

    imagenEquipo:
      equipo.imagen,

    nombreEquipo:
      partido.nombreEquipo
        .trim() ||
      equipo.nombre,

    estado: "descansa",

    fecha: null,
    hora: null,

    rivalFbibId: null,
    nombreRival: "",
    logoRival: null,

    campo: "",
    municipio: null,
    pabellon: null,

    local: null,
  };
}

function generarListadoCompleto(
  equipos:
    EquipoClubPublicacion[],

  partidosFbib:
    PartidoPeriodoFbibPublicacion[],

  partidosExistentes:
    PartidoPublicacion[],

  fechaInicio: string,
  fechaFin: string,
): PartidoPublicacion[] {
  const resultado:
    PartidoPublicacion[] = [];

  const idsUtilizados =
    new Set<string>();

  const partidosFbibUtilizados =
    new Set<string>();

  const idsEquipos =
    new Set(
      equipos.map(
        (equipo) =>
          equipo.id,
      ),
    );

  const existentesPorFbib =
    new Map<
      string,
      PartidoPublicacion
    >();

  partidosExistentes.forEach(
    (partido) => {
      if (
        partido.partidoFbibId
      ) {
        existentesPorFbib.set(
          partido.partidoFbibId,
          partido,
        );
      }
    },
  );

  equipos.forEach(
    (equipo) => {
      const partidosEquipo =
        partidosFbib.filter(
          (partido) =>
            coincideEquipo(
              partido,
              equipo,
            ),
        );

      const partidosManuales =
        partidosExistentes.filter(
          (partido) =>
            partido.equipoId ===
              equipo.id &&
            !partido.partidoFbibId &&
            partido.estado !==
              "descansa",
        );

      partidosEquipo.forEach(
        (partidoFbib) => {
          const existente =
            existentesPorFbib.get(
              partidoFbib
                .partidoFbibId,
            );

          if (existente) {
            resultado.push(
              completarPartidoExistente(
                existente,
                partidoFbib,
                equipo,
              ),
            );

            idsUtilizados.add(
              existente.id,
            );
          } else {
            resultado.push(
              convertirPartidoFbib(
                partidoFbib,
                equipo,
                resultado.length + 1,
              ),
            );
          }

          partidosFbibUtilizados.add(
            partidoFbib
              .partidoFbibId,
          );
        },
      );

      partidosManuales.forEach(
        (partidoManual) => {
          if (
            idsUtilizados.has(
              partidoManual.id,
            )
          ) {
            return;
          }

          resultado.push({
            ...partidoManual,

            equipoId:
              equipo.id,

            equipoFbibId:
              partidoManual
                .equipoFbibId ??
              equipo.idEquipoFbib,

            imagenEquipo:
              partidoManual
                .imagenEquipo ??
              equipo.imagen,

            nombreEquipo:
              partidoManual
                .nombreEquipo
                .trim() ||
              equipo.nombre,
          });

          idsUtilizados.add(
            partidoManual.id,
          );
        },
      );

      const tienePartido =
        partidosEquipo.length >
          0 ||
        partidosManuales.length >
          0;

      if (tienePartido) {
        return;
      }

      const descansoExistente =
        partidosExistentes.find(
          (partido) =>
            partido.equipoId ===
              equipo.id &&
            !partido.partidoFbibId &&
            partido.estado ===
              "descansa",
        );

      if (descansoExistente) {
        resultado.push(
          completarFilaDescanso(
            descansoExistente,
            equipo,
          ),
        );

        idsUtilizados.add(
          descansoExistente.id,
        );

        return;
      }

      resultado.push(
        crearFilaDescanso(
          equipo,
          fechaInicio,
          fechaFin,
          resultado.length + 1,
        ),
      );
    },
  );

  partidosFbib.forEach(
    (partidoFbib) => {
      if (
        partidosFbibUtilizados.has(
          partidoFbib
            .partidoFbibId,
        )
      ) {
        return;
      }

      const existente =
        existentesPorFbib.get(
          partidoFbib
            .partidoFbibId,
        );

      if (existente) {
        resultado.push(
          completarPartidoExistente(
            existente,
            partidoFbib,
            null,
          ),
        );

        idsUtilizados.add(
          existente.id,
        );
      } else {
        resultado.push(
          convertirPartidoFbib(
            partidoFbib,
            null,
            resultado.length + 1,
          ),
        );
      }
    },
  );

  partidosExistentes.forEach(
    (partido) => {
      if (
        idsUtilizados.has(
          partido.id,
        )
      ) {
        return;
      }

      const perteneceAEquipoActual =
        Boolean(
          partido.equipoId &&
          idsEquipos.has(
            partido.equipoId,
          ),
        );

      if (
        perteneceAEquipoActual
      ) {
        return;
      }

      if (
        partido.origen !==
        "manual"
      ) {
        return;
      }

      resultado.push(
        partido,
      );

      idsUtilizados.add(
        partido.id,
      );
    },
  );

  return normalizarOrden(
    resultado,
  );
}

export default function EditorPartidosPublicacion({
  fechaInicio,
  fechaFin,
  partidos,
  partidosPorImagen,
  alCambiar,
  deshabilitado = false,
}: Propiedades) {
  const [
    cargandoFbib,
    setCargandoFbib,
  ] = useState(false);

  const [
    formularioManualAbierto,
    setFormularioManualAbierto,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    mensaje,
    setMensaje,
  ] = useState<
    string | null
  >(null);

  const partidosOrdenados =
    [...partidos].sort(
      (
        partidoA,
        partidoB,
      ) =>
        partidoA.orden -
        partidoB.orden,
    );

  const partidosVisibles =
    partidosOrdenados.filter(
      (partido) =>
        partido.visible,
    );

  const totalPaginas =
    partidosVisibles.length === 0
      ? 0
      : Math.ceil(
          partidosVisibles.length /
            partidosPorImagen,
        );

  const cargarDesdeFbib =
    async () => {
      if (
        !fechaInicio ||
        !fechaFin ||
        cargandoFbib ||
        deshabilitado
      ) {
        return;
      }

      try {
        setCargandoFbib(true);
        setError(null);
        setMensaje(null);

        const parametros =
          new URLSearchParams({
            fechaInicio,
            fechaFin,
          });

        const [
          respuesta,
          equiposClub,
        ] =
          await Promise.all([
            fetch(
              `/api/panel/publicaciones/partidos/cargar-fbib?${parametros.toString()}`,
              {
                method: "GET",
                credentials:
                  "same-origin",
                headers: {
                  Accept:
                    "application/json",
                },
              },
            ),

            solicitarEquipos(),
          ]);

        const contenido =
          (await respuesta.json()) as
            RespuestaPartidosPeriodoFbib;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data
        ) {
          throw new Error(
            contenido.error ??
              "No se han podido cargar los partidos.",
          );
        }

        if (
          equiposClub.length ===
          0
        ) {
          throw new Error(
            "No hay equipos registrados en la temporada activa.",
          );
        }

        const siguientesPartidos =
          generarListadoCompleto(
            equiposClub,
            contenido.data
              .partidos,
            partidosOrdenados,
            fechaInicio,
            fechaFin,
          );

        alCambiar(
          siguientesPartidos,
        );

        const totalDescansos =
          siguientesPartidos.filter(
            (partido) =>
              partido.estado ===
              "descansa",
          ).length;

        const totalConPartido =
          equiposClub.length -
          totalDescansos;

        setMensaje(
          `Se han cargado ${equiposClub.length} equipos: ${totalConPartido} con partido y ${totalDescansos} que descansan.`,
        );
      } catch (error) {
        console.error(
          "Error cargando los equipos y partidos para la publicación:",
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : "No se han podido cargar los equipos y partidos.",
        );
      } finally {
        setCargandoFbib(false);
      }
    };

  const actualizarPartido = (
    partidoActualizado:
      PartidoPublicacion,
  ) => {
    const siguientesPartidos =
      partidosOrdenados.map(
        (partido) =>
          partido.id ===
          partidoActualizado.id
            ? partidoActualizado
            : partido,
      );

    alCambiar(
      normalizarOrden(
        siguientesPartidos,
      ),
    );

    setMensaje(null);
    setError(null);
  };

  const moverPartido = (
    indice: number,
    direccion: -1 | 1,
  ) => {
    const nuevoIndice =
      indice + direccion;

    if (
      nuevoIndice < 0 ||
      nuevoIndice >=
        partidosOrdenados.length
    ) {
      return;
    }

    const siguientesPartidos = [
      ...partidosOrdenados,
    ];

    const [
      partidoMovido,
    ] =
      siguientesPartidos.splice(
        indice,
        1,
      );

    siguientesPartidos.splice(
      nuevoIndice,
      0,
      partidoMovido,
    );

    alCambiar(
      normalizarOrden(
        siguientesPartidos,
      ),
    );

    setMensaje(null);
  };

  const eliminarPartido = (
    partidoId: string,
  ) => {
    const partido =
      partidosOrdenados.find(
        (elemento) =>
          elemento.id ===
          partidoId,
      );

    if (!partido) {
      return;
    }

    const nombre =
      partido.nombreEquipo ||
      "esta fila";

    const confirmado =
      window.confirm(
        `¿Quieres eliminar ${nombre} de la publicación?`,
      );

    if (!confirmado) {
      return;
    }

    alCambiar(
      normalizarOrden(
        partidosOrdenados.filter(
          (elemento) =>
            elemento.id !==
            partidoId,
        ),
      ),
    );

    setMensaje(null);
    setError(null);
  };

  const anadirPartidoManual = (
    partido:
      PartidoPublicacion,
  ) => {
    const siguientesPartidos =
      partidosOrdenados.filter(
        (existente) =>
          !(
            existente.equipoId &&
            existente.equipoId ===
              partido.equipoId &&
            existente.estado ===
              "descansa" &&
            !existente.partidoFbibId
          ),
      );

    alCambiar(
      normalizarOrden([
        ...siguientesPartidos,
        partido,
      ]),
    );

    setFormularioManualAbierto(
      false,
    );

    setError(null);

    setMensaje(
      "El partido se ha añadido a la publicación.",
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="flex flex-col gap-4 border-b border-outline-variant/60 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <h2 className="text-xl font-bold text-on-surface">
            Equipos y partidos
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            Carga todos los equipos del
            club. Los que no tengan partido
            durante el periodo aparecerán
            como descanso.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              setFormularioManualAbierto(
                true,
              )
            }
            disabled={
              deshabilitado ||
              cargandoFbib ||
              formularioManualAbierto
            }
            className="min-h-11 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Añadir manualmente
          </button>

          <button
            type="button"
            onClick={
              cargarDesdeFbib
            }
            disabled={
              deshabilitado ||
              cargandoFbib ||
              !fechaInicio ||
              !fechaFin
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargandoFbib && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary"
                aria-hidden="true"
              />
            )}

            {cargandoFbib
              ? "Cargando equipos..."
              : partidos.length > 0
                ? "Actualizar equipos y partidos"
                : "Cargar equipos y partidos"}
          </button>
        </div>
      </div>

      <div className="border-b border-outline-variant/60 bg-surface-container-low px-5 py-3 sm:px-6">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-on-surface-variant">
          <span>
            {partidos.length}{" "}
            {partidos.length === 1
              ? "fila"
              : "filas"}
          </span>

          <span>
            {partidosVisibles.length}{" "}
            visibles
          </span>

          <span>
            {
              partidosOrdenados.filter(
                (partido) =>
                  partido.estado ===
                  "descansa",
              ).length
            }{" "}
            descansan
          </span>

          <span>
            {totalPaginas}{" "}
            {totalPaginas === 1
              ? "imagen"
              : "imágenes"}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {error && (
          <div
            className="mb-5 rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container"
            role="alert"
          >
            <p className="font-bold">
              No se han podido cargar los
              equipos y partidos
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>
        )}

        {mensaje && (
          <div
            className="mb-5 rounded-xl border border-success/30 bg-success-container px-4 py-3 text-sm text-on-success-container"
            role="status"
          >
            {mensaje}
          </div>
        )}

        {formularioManualAbierto && (
          <div className="mb-5">
            <FormularioPartidoManual
              orden={
                partidosOrdenados.length +
                1
              }
              alAnadir={
                anadirPartidoManual
              }
              alCancelar={() =>
                setFormularioManualAbierto(
                  false,
                )
              }
              deshabilitado={
                deshabilitado ||
                cargandoFbib
              }
            />
          </div>
        )}

        {partidosOrdenados.length >
        0 ? (
          <div className="grid gap-3">
            {partidosOrdenados.map(
              (
                partido,
                indice,
              ) => (
                <FilaPartidoPublicacion
                  key={
                    partido.id
                  }
                  partido={
                    partido
                  }
                  esPrimero={
                    indice === 0
                  }
                  esUltimo={
                    indice ===
                    partidosOrdenados.length -
                      1
                  }
                  alActualizar={
                    actualizarPartido
                  }
                  alSubir={() =>
                    moverPartido(
                      indice,
                      -1,
                    )
                  }
                  alBajar={() =>
                    moverPartido(
                      indice,
                      1,
                    )
                  }
                  alEliminar={() =>
                    eliminarPartido(
                      partido.id,
                    )
                  }
                  deshabilitado={
                    deshabilitado ||
                    cargandoFbib
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-5 py-10 text-center">
            <p className="text-sm font-bold text-on-surface">
              Todavía no se han cargado los
              equipos
            </p>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-on-surface-variant">
              Selecciona un periodo y pulsa
              “Cargar equipos y partidos”.
              Los equipos sin partido
              aparecerán automáticamente
              como descanso.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}