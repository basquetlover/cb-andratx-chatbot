import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  RespuestaHistorialPublicaciones,
  RespuestaPublicacionPartidos,
  ResumenPublicacionPartidos,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  publicacionesIniciales?:
    ResumenPublicacionPartidos[];
}

type FiltroIdioma =
  | "todos"
  | "es"
  | "ca";

function convertirFecha(
  fecha: string,
): Date | null {
  const fechaConvertida =
    fecha.length === 10
      ? new Date(
          `${fecha}T12:00:00`,
        )
      : new Date(fecha);

  return Number.isNaN(
    fechaConvertida.getTime(),
  )
    ? null
    : fechaConvertida;
}

function formatearFecha(
  fecha: string,
): string {
  const fechaConvertida =
    convertirFecha(fecha);

  if (!fechaConvertida) {
    return "Fecha pendiente";
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone:
        "Europe/Madrid",
    },
  ).format(fechaConvertida);
}

function formatearActualizacion(
  fecha: string,
): string {
  const fechaConvertida =
    convertirFecha(fecha);

  if (!fechaConvertida) {
    return "Sin modificaciones";
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Europe/Madrid",
    },
  ).format(fechaConvertida);
}

function normalizarTexto(
  valor: unknown,
): string {
  if (
    typeof valor !== "string"
  ) {
    return "";
  }

  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

export default function HistorialPublicacionesPartidos({
  publicacionesIniciales = [],
}: Propiedades) {
  const [
    publicaciones,
    setPublicaciones,
  ] = useState<
    ResumenPublicacionPartidos[]
  >(publicacionesIniciales);

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtroIdioma,
    setFiltroIdioma,
  ] =
    useState<FiltroIdioma>(
      "todos",
    );

  const [
    cargando,
    setCargando,
  ] = useState(
    publicacionesIniciales.length ===
      0,
  );

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    intento,
    setIntento,
  ] = useState(0);

  const [
    publicacionAArchivar,
    setPublicacionAArchivar,
  ] = useState<
    ResumenPublicacionPartidos | null
  >(null);

  const [
    publicacionArchivando,
    setPublicacionArchivando,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    const controlador =
      new AbortController();

    const cargarPublicaciones =
      async () => {
        try {
          setCargando(true);
          setError(null);

          const respuesta =
            await fetch(
              "/api/panel/publicaciones/partidos",
              {
                method: "GET",
                credentials:
                  "same-origin",
                headers: {
                  Accept:
                    "application/json",
                },
                signal:
                  controlador.signal,
              },
            );

          const contenido =
            (await respuesta.json()) as
              RespuestaHistorialPublicaciones;

          if (
            !respuesta.ok ||
            !contenido.ok ||
            !contenido.data
          ) {
            throw new Error(
              contenido.error ??
                "No se ha podido obtener el historial.",
            );
          }

          setPublicaciones(
            contenido.data.publicaciones,
          );
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Error cargando el historial de publicaciones:",
            error,
          );

          setError(
            error instanceof Error
              ? error.message
              : "No se ha podido obtener el historial.",
          );
        } finally {
          if (
            !controlador.signal.aborted
          ) {
            setCargando(false);
          }
        }
      };

    cargarPublicaciones();

    return () => {
      controlador.abort();
    };
  }, [intento]);

  const publicacionesFiltradas =
    useMemo(() => {
      const consulta =
        normalizarTexto(
          busqueda,
        );

      return publicaciones.filter(
        (publicacion) => {
          if (
            filtroIdioma !==
              "todos" &&
            publicacion.idioma !==
              filtroIdioma
          ) {
            return false;
          }

          if (!consulta) {
            return true;
          }

          const textoPublicacion = [
            publicacion.nombre,
            publicacion.titulo,
            publicacion.fechaInicio,
            publicacion.fechaFin,
            publicacion.idioma === "ca"
              ? "catalan català"
              : "castellano español",
          ]
            .map(normalizarTexto)
            .join(" ");

          return textoPublicacion.includes(
            consulta,
          );
        },
      );
    }, [
      publicaciones,
      busqueda,
      filtroIdioma,
    ]);

  const archivarPublicacion =
    async () => {
      if (
        !publicacionAArchivar ||
        publicacionArchivando
      ) {
        return;
      }

      const publicacion =
        publicacionAArchivar;

      try {
        setPublicacionArchivando(
          publicacion.id,
        );

        setError(null);

        const respuesta =
          await fetch(
            `/api/panel/publicaciones/partidos/${encodeURIComponent(
              publicacion.id,
            )}`,
            {
              method: "DELETE",
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
            RespuestaPublicacionPartidos;

        if (
          !respuesta.ok ||
          !contenido.ok
        ) {
          throw new Error(
            contenido.error ??
              "No se ha podido archivar la publicación.",
          );
        }

        setPublicaciones(
          (
            publicacionesActuales,
          ) =>
            publicacionesActuales.filter(
              (elemento) =>
                elemento.id !==
                publicacion.id,
            ),
        );

        setPublicacionAArchivar(
          null,
        );
      } catch (error) {
        console.error(
          "Error archivando la publicación:",
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : "No se ha podido archivar la publicación.",
        );
      } finally {
        setPublicacionArchivando(
          null,
        );
      }
    };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-on-surface">
              Publicaciones guardadas
            </h2>

            <p className="mt-1 text-sm text-on-surface-variant">
              Recupera una configuración
              anterior, modifícala y vuelve a
              generar sus imágenes.
            </p>
          </div>

          <a
            href="/panel/publicaciones/partidos/nueva"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-current"
              aria-hidden="true"
            >
              <path d="M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5Z" />
            </svg>

            Nueva publicación
          </a>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative block">
            <span className="sr-only">
              Buscar publicaciones
            </span>

            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-outline">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-current"
                aria-hidden="true"
              >
                <path d="M10.5 4a6.5 6.5 0 1 0 3.98 11.64l4.44 4.44a1 1 0 0 0 1.42-1.42l-4.44-4.44A6.5 6.5 0 0 0 10.5 4Zm-4.5 6.5a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Z" />
              </svg>
            </span>

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value,
                )
              }
              placeholder="Buscar por nombre, título o periodo..."
              className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <div
            className="flex rounded-xl border border-outline-variant bg-surface-container-low p-1"
            role="group"
            aria-label="Filtrar por idioma"
          >
            {(
              [
                [
                  "todos",
                  "Todos",
                ],
                [
                  "es",
                  "Castellano",
                ],
                [
                  "ca",
                  "Català",
                ],
              ] as const
            ).map(
              ([
                valor,
                etiqueta,
              ]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() =>
                    setFiltroIdioma(
                      valor,
                    )
                  }
                  className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors sm:px-4 ${
                    filtroIdioma ===
                    valor
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                  aria-pressed={
                    filtroIdioma ===
                    valor
                  }
                >
                  {etiqueta}
                </button>
              ),
            )}
          </div>
        </div>
      </section>

      {error && (
        <section
          className="rounded-2xl border border-error/40 bg-error-container p-4 text-on-error-container"
          role="alert"
        >
          <p className="font-bold">
            No se ha podido completar la
            operación
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setIntento(
                (valor) =>
                  valor + 1,
              )
            }
            className="mt-4 min-h-10 rounded-xl border border-error px-4 py-2 text-sm font-bold transition-colors hover:bg-error hover:text-on-error"
          >
            Volver a intentarlo
          </button>
        </section>
      )}

      {cargando ? (
        <section
          className="flex min-h-64 items-center justify-center rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-8 shadow-sm"
          role="status"
        >
          <div className="text-center">
            <span
              className="mx-auto block h-8 w-8 animate-spin rounded-full border-4 border-outline-variant border-t-primary"
              aria-hidden="true"
            />

            <p className="mt-4 text-sm font-semibold text-on-surface-variant">
              Cargando publicaciones...
            </p>
          </div>
        </section>
      ) : publicaciones.length ===
        0 ? (
        <section className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center sm:p-12">
          <h2 className="text-xl font-bold text-on-surface">
            Todavía no hay publicaciones
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">
            Crea la primera configuración
            para preparar las imágenes de
            los partidos.
          </p>

          <a
            href="/panel/publicaciones/partidos/nueva"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary"
          >
            Crear primera publicación
          </a>
        </section>
      ) : publicacionesFiltradas.length ===
        0 ? (
        <section className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
          <h2 className="font-bold text-on-surface">
            No hay coincidencias
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            Prueba con otro texto o cambia
            el filtro de idioma.
          </p>

          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setFiltroIdioma(
                "todos",
              );
            }}
            className="mt-4 text-sm font-bold text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        </section>
      ) : (
        <>
          <p className="text-sm text-on-surface-variant">
            {
              publicacionesFiltradas.length
            }{" "}
            {publicacionesFiltradas.length ===
            1
              ? "publicación"
              : "publicaciones"}
          </p>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publicacionesFiltradas.map(
              (publicacion) => (
                <article
                  key={publicacion.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="h-2 bg-primary" />

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-lg font-bold text-on-surface">
                          {publicacion.nombre ||
                            "Publicación sin nombre"}
                        </h3>

                        <p className="mt-1 line-clamp-1 text-sm text-on-surface-variant">
                          {publicacion.titulo}
                        </p>

                        <p className="mt-2 text-xs text-on-surface-variant">
                          Actualizada{" "}
                          {formatearActualizacion(
                            publicacion.updatedAt,
                          )}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-secondary-container px-2.5 py-1 text-xs font-bold uppercase text-on-secondary-container">
                        {publicacion.idioma ===
                        "ca"
                          ? "CA"
                          : "ES"}
                      </span>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-surface-container-low p-3">
                        <dt className="text-xs font-semibold text-on-surface-variant">
                          Periodo
                        </dt>

                        <dd className="mt-1 text-sm font-bold text-on-surface">
                          {formatearFecha(
                            publicacion.fechaInicio,
                          )}
                        </dd>

                        <dd className="text-xs text-on-surface-variant">
                          hasta{" "}
                          {formatearFecha(
                            publicacion.fechaFin,
                          )}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-surface-container-low p-3">
                        <dt className="text-xs font-semibold text-on-surface-variant">
                          Contenido
                        </dt>

                        <dd className="mt-1 text-2xl font-bold text-primary">
                          {
                            publicacion.totalPartidos
                          }
                        </dd>

                        <dd className="text-xs text-on-surface-variant">
                          {
                            publicacion.totalPaginas
                          }{" "}
                          {publicacion.totalPaginas ===
                          1
                            ? "imagen"
                            : "imágenes"}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-auto flex gap-2 pt-5">
                      <a
                        href={`/panel/publicaciones/partidos/${encodeURIComponent(
                          publicacion.id,
                        )}`}
                        className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container"
                      >
                        Editar
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          setPublicacionAArchivar(
                            publicacion,
                          )
                        }
                        disabled={
                          publicacionArchivando ===
                          publicacion.id
                        }
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-outline-variant px-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-error hover:bg-error-container hover:text-error disabled:opacity-50"
                        aria-label={`Archivar ${publicacion.nombre}`}
                      >
                        Archivar
                      </button>
                    </div>
                  </div>
                </article>
              ),
            )}
          </section>
        </>
      )}

      {publicacionAArchivar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(evento) => {
            if (
              evento.target ===
              evento.currentTarget
            ) {
              setPublicacionAArchivar(
                null,
              );
            }
          }}
        >
          <section
            className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-archivar-publicacion"
          >
            <h2
              id="titulo-archivar-publicacion"
              className="text-xl font-bold text-on-surface"
            >
              Archivar publicación
            </h2>

            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Se archivará{" "}
              <strong className="text-on-surface">
                {
                  publicacionAArchivar.nombre
                }
              </strong>
              . Dejará de aparecer en el
              historial, pero su
              configuración seguirá guardada
              en la base de datos.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setPublicacionAArchivar(
                    null,
                  )
                }
                disabled={Boolean(
                  publicacionArchivando,
                )}
                className="min-h-11 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={
                  archivarPublicacion
                }
                disabled={Boolean(
                  publicacionArchivando,
                )}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-error px-5 py-3 text-sm font-bold text-on-error disabled:opacity-50"
              >
                {publicacionArchivando && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-on-error/40 border-t-on-error"
                    aria-hidden="true"
                  />
                )}

                {publicacionArchivando
                  ? "Archivando..."
                  : "Archivar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}