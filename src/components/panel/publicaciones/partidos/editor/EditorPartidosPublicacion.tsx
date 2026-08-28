import {
  useState,
} from "react";

import FilaPartidoPublicacion from "./FilaPartidoPublicacion";
import FormularioPartidoManual from "./FormularioPartidoManual";

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

function convertirPartidoFbib(
  partido:
    PartidoPeriodoFbibPublicacion,
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
      partido.equipoId,

    equipoFbibId:
      partido.equipoFbibId,

    fecha:
      partido.fecha,

    hora:
      partido.hora,

    nombreEquipo:
      partido.nombreEquipo,

    rivalFbibId:
      partido.rivalFbibId,

    nombreRival:
      partido.nombreRival,

    logoRival:
      partido.logoRival,

    campo:
      partido.campo,

    local:
      partido.local,

    estado: "partido",
  };
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
      (partidoA, partidoB) =>
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

        const respuesta =
          await fetch(
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
          );

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

        const partidosFbib =
          contenido.data.partidos;

        const partidosExistentesPorFbib =
          new Map<
            string,
            PartidoPublicacion
          >();

        partidosOrdenados.forEach(
          (partido) => {
            if (
              partido.partidoFbibId
            ) {
              partidosExistentesPorFbib.set(
                partido.partidoFbibId,
                partido,
              );
            }
          },
        );

        let nuevosAnadidos = 0;

        const nuevosPartidos =
          partidosFbib.flatMap(
            (partidoFbib) => {
              const existente =
                partidosExistentesPorFbib.get(
                  partidoFbib.partidoFbibId,
                );

              if (existente) {
                return [];
              }

              nuevosAnadidos += 1;

              return [
                convertirPartidoFbib(
                  partidoFbib,
                  partidosOrdenados.length +
                    nuevosAnadidos,
                ),
              ];
            },
          );

        const siguientesPartidos =
          normalizarOrden([
            ...partidosOrdenados,
            ...nuevosPartidos,
          ]);

        alCambiar(
          siguientesPartidos,
        );

        if (
          partidosFbib.length === 0
        ) {
          setMensaje(
            "La FBIB no ha devuelto partidos para el periodo seleccionado.",
          );

          return;
        }

        if (
          nuevosAnadidos === 0
        ) {
          setMensaje(
            "Todos los partidos encontrados ya estaban incluidos. Se han conservado tus modificaciones.",
          );

          return;
        }

        setMensaje(
          nuevosAnadidos === 1
            ? "Se ha añadido un partido desde la FBIB."
            : `Se han añadido ${nuevosAnadidos} partidos desde la FBIB.`,
        );
      } catch (error) {
        console.error(
          "Error cargando los partidos para la publicación:",
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : "No se han podido cargar los partidos.",
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
      "este partido";

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
    alCambiar(
      normalizarOrden([
        ...partidosOrdenados,
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
            Partidos
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            Carga los partidos de la FBIB y
            modifica la información antes de
            generar las imágenes.
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
              ? "Consultando FBIB..."
              : partidos.length > 0
                ? "Actualizar desde FBIB"
                : "Cargar desde FBIB"}
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
              partidos
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
              Todavía no hay partidos
            </p>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-on-surface-variant">
              Selecciona un periodo y carga
              los partidos desde la FBIB o
              añade una fila manualmente.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}