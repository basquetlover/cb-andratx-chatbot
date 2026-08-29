import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  RespuestaBusquedaRivalesFbib,
  RivalFbibPublicacion,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  alSeleccionar: (
    rival: RivalFbibPublicacion,
  ) => void;

  alCerrar: () => void;

  deshabilitado?: boolean;
}

function normalizarTexto(
  valor: string | null | undefined,
): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

export default function BuscadorRivalFbib({
  alSeleccionar,
  alCerrar,
  deshabilitado = false,
}: Propiedades) {
  const [
    consulta,
    setConsulta,
  ] = useState("");

  const [
    todosLosRivales,
    setTodosLosRivales,
  ] = useState<
    RivalFbibPublicacion[]
  >([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

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
    escudosConError,
    setEscudosConError,
  ] = useState<
    Set<string>
  >(() => new Set());

  useEffect(() => {
    const controlador =
      new AbortController();

    const cargarEquipos =
      async () => {
        try {
          setCargando(true);
          setError(null);
          setEscudosConError(
            new Set(),
          );

          const respuesta =
            await fetch(
              "/api/panel/publicaciones/partidos/buscar-rivales",
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
              RespuestaBusquedaRivalesFbib;

          if (
            !respuesta.ok ||
            !contenido.ok ||
            !contenido.data
          ) {
            throw new Error(
              contenido.error ??
                "No se ha podido obtener la lista de equipos de la FBIB.",
            );
          }

          const rivalesOrdenados =
            [
              ...contenido.data
                .resultados,
            ].sort(
              (
                rivalA,
                rivalB,
              ) =>
                rivalA.nombre.localeCompare(
                  rivalB.nombre,
                  "es",
                  {
                    sensitivity:
                      "base",
                  },
                ),
            );

          setTodosLosRivales(
            rivalesOrdenados,
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
            "Error cargando los equipos de la FBIB:",
            error,
          );

          setTodosLosRivales([]);

          setError(
            error instanceof Error
              ? error.message
              : "No se ha podido obtener la lista de equipos de la FBIB.",
          );
        } finally {
          if (
            !controlador.signal
              .aborted
          ) {
            setCargando(false);
          }
        }
      };

    cargarEquipos();

    return () => {
      controlador.abort();
    };
  }, [intento]);

  const resultados =
    useMemo(() => {
      const consultaNormalizada =
        normalizarTexto(
          consulta,
        );

      if (!consultaNormalizada) {
        return todosLosRivales;
      }

      return todosLosRivales.filter(
        (rival) => {
          const contenido =
            [
              rival.nombre,
              rival.nombreCorto,
              rival.clubNombre,
            ]
              .map(normalizarTexto)
              .join(" ");

          return contenido.includes(
            consultaNormalizada,
          );
        },
      );
    }, [
      consulta,
      todosLosRivales,
    ]);

  const registrarErrorEscudo = (
    rivalId: string,
  ) => {
    setEscudosConError(
      (idsActuales) => {
        const siguientesIds =
          new Set(idsActuales);

        siguientesIds.add(
          rivalId,
        );

        return siguientesIds;
      },
    );
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-lg"
      aria-labelledby="titulo-buscador-rival"
    >
      <div className="flex items-start justify-between gap-4 border-b border-outline-variant/60 px-4 py-4 sm:px-5">
        <div>
          <h3
            id="titulo-buscador-rival"
            className="font-bold text-on-surface"
          >
            Seleccionar rival de la FBIB
          </h3>

          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            Se muestran todos los equipos.
            Escribe para ir filtrando la
            lista.
          </p>
        </div>

        <button
          type="button"
          onClick={alCerrar}
          disabled={
            deshabilitado ||
            cargando
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Cerrar el buscador"
        >
          <span
            className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat"
            style={{
              maskImage:
                "url('/iconos/panel/cerrar.svg')",
              WebkitMaskImage:
                "url('/iconos/panel/cerrar.svg')",
            }}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="border-b border-outline-variant/60 bg-surface-container-low p-4 sm:p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">
            Filtrar equipos
          </span>

          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 inline-block h-5 w-5 -translate-y-1/2 bg-outline mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/buscar.svg')",
                WebkitMaskImage:
                  "url('/iconos/panel/buscar.svg')",
              }}
              aria-hidden="true"
            />

            <input
              type="search"
              value={consulta}
              onChange={(evento) =>
                setConsulta(
                  evento.target.value,
                )
              }
              disabled={
                deshabilitado ||
                cargando ||
                Boolean(error)
              }
              maxLength={100}
              autoComplete="off"
              placeholder="Escribe el nombre del equipo o club..."
              className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-10 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />

            {consulta && (
              <button
                type="button"
                onClick={() =>
                  setConsulta("")
                }
                disabled={
                  deshabilitado
                }
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
                aria-label="Limpiar filtro"
              >
                <span
                  className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
                  style={{
                    maskImage:
                      "url('/iconos/panel/cerrar.svg')",
                    WebkitMaskImage:
                      "url('/iconos/panel/cerrar.svg')",
                  }}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>

          {!cargando &&
            !error &&
            todosLosRivales.length >
              0 && (
              <span
                className="text-xs text-on-surface-variant"
                aria-live="polite"
              >
                {consulta.trim()
                  ? `${resultados.length} de ${todosLosRivales.length} equipos`
                  : `${todosLosRivales.length} equipos disponibles`}
              </span>
            )}
        </label>
      </div>

      <div className="max-h-96 overflow-y-auto p-4 sm:p-5">
        {cargando && (
          <div
            className="flex flex-col items-center justify-center py-8 text-center"
            role="status"
          >
            <span
              className="h-7 w-7 animate-spin rounded-full border-2 border-outline-variant border-t-primary"
              aria-hidden="true"
            />

            <p className="mt-3 text-sm font-semibold text-on-surface">
              Cargando equipos de la FBIB...
            </p>

            <p className="mt-1 text-xs text-on-surface-variant">
              La primera carga puede tardar
              unos segundos.
            </p>
          </div>
        )}

        {!cargando && error && (
          <div
            className="rounded-xl border border-error/30 bg-error-container p-4 text-on-error-container"
            role="alert"
          >
            <p className="text-sm font-bold">
              No se han podido cargar los
              equipos
            </p>

            <p className="mt-1 text-xs leading-5">
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
              disabled={
                deshabilitado
              }
              className="mt-4 min-h-10 rounded-xl border border-error px-4 py-2 text-sm font-bold transition-colors hover:bg-error hover:text-on-error disabled:cursor-not-allowed disabled:opacity-50"
            >
              Volver a intentarlo
            </button>
          </div>
        )}

        {!cargando &&
          !error &&
          todosLosRivales.length ===
            0 && (
            <div className="py-6 text-center">
              <p className="text-sm font-semibold text-on-surface">
                No hay equipos disponibles
              </p>

              <p className="mt-1 text-xs text-on-surface-variant">
                La FBIB no ha devuelto
                ningún equipo.
              </p>
            </div>
          )}

        {!cargando &&
          !error &&
          todosLosRivales.length >
            0 &&
          resultados.length ===
            0 && (
            <div className="py-6 text-center">
              <span
                className="mx-auto inline-block h-10 w-10 bg-outline mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/buscar.svg')",
                  WebkitMaskImage:
                    "url('/iconos/panel/buscar.svg')",
                }}
                aria-hidden="true"
              />

              <p className="mt-3 text-sm font-semibold text-on-surface">
                No coincide ningún equipo
              </p>

              <p className="mt-1 text-xs text-on-surface-variant">
                Prueba con otra parte del
                nombre del equipo o del
                club.
              </p>
            </div>
          )}

        {!cargando &&
          !error &&
          resultados.length >
            0 && (
            <ul className="grid gap-2">
              {resultados.map(
                (rival) => {
                  const mostrarEscudo =
                    Boolean(
                      rival.escudo,
                    ) &&
                    !escudosConError.has(
                      rival.id,
                    );

                  return (
                    <li
                      key={rival.id}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          alSeleccionar(
                            rival,
                          )
                        }
                        disabled={
                          deshabilitado
                        }
                        className="flex w-full items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-3 text-left transition-colors hover:border-primary hover:bg-primary-fixed/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container text-sm font-bold text-primary">
                          {rival.nombre
                            .charAt(0)
                            .toUpperCase()}

                          {mostrarEscudo && (
                            <img
                              src={
                                rival.escudo ??
                                undefined
                              }
                              alt=""
                              loading="lazy"
                              onError={() =>
                                registrarErrorEscudo(
                                  rival.id,
                                )
                              }
                              className="absolute inset-0 h-full w-full bg-white object-contain p-1"
                            />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-on-surface">
                            {
                              rival.nombre
                            }
                          </span>

                          {rival.nombreCorto && (
                            <span className="mt-0.5 block truncate text-xs text-on-surface-variant">
                              {
                                rival.nombreCorto
                              }
                            </span>
                          )}

                          {rival.clubNombre && (
                            <span className="mt-1 block truncate text-xs font-semibold text-secondary">
                              {
                                rival.clubNombre
                              }
                            </span>
                          )}
                        </span>

                        <span
                          className="inline-block h-5 w-5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat"
                          style={{
                            maskImage:
                              "url('/iconos/panel/continuar.svg')",
                            WebkitMaskImage:
                              "url('/iconos/panel/continuar.svg')",
                          }}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                },
              )}
            </ul>
          )}
      </div>
    </section>
  );
}