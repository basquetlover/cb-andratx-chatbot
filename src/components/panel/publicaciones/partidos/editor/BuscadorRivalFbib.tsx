import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type {
  RespuestaBusquedaRivalesFbib,
  RivalFbibPublicacion,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  alSeleccionar: (
    rival:
      RivalFbibPublicacion,
  ) => void;

  alCerrar: () => void;

  deshabilitado?: boolean;
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
    resultados,
    setResultados,
  ] = useState<
    RivalFbibPublicacion[]
  >([]);

  const [
    buscando,
    setBuscando,
  ] = useState(false);

  const [
    busquedaRealizada,
    setBusquedaRealizada,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    escudosConError,
    setEscudosConError,
  ] = useState<
    Set<string>
  >(() => new Set());

  const controladorRef =
    useRef<
      AbortController | null
    >(null);

  useEffect(() => {
    return () => {
      controladorRef.current?.abort();
    };
  }, []);

  const buscar = async (
    evento:
      FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    const consultaLimpia =
      consulta.trim();

    if (
      consultaLimpia.length < 2 ||
      buscando ||
      deshabilitado
    ) {
      if (
        consultaLimpia.length < 2
      ) {
        setError(
          "Escribe al menos dos caracteres.",
        );
      }

      return;
    }

    controladorRef.current?.abort();

    const controlador =
      new AbortController();

    controladorRef.current =
      controlador;

    try {
      setBuscando(true);
      setBusquedaRealizada(false);
      setResultados([]);
      setError(null);
      setEscudosConError(
        new Set(),
      );

      const parametros =
        new URLSearchParams({
          consulta:
            consultaLimpia,
        });

      const respuesta =
        await fetch(
          `/api/panel/publicaciones/partidos/buscar-rivales?${parametros.toString()}`,
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
            "No se han podido buscar los rivales.",
        );
      }

      setResultados(
        contenido.data.resultados,
      );

      setBusquedaRealizada(true);
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
        "Error buscando rivales en la FBIB:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se han podido buscar los rivales.",
      );

      setBusquedaRealizada(true);
    } finally {
      if (
        !controlador.signal.aborted
      ) {
        setBuscando(false);
      }
    }
  };

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
            Buscar rival en la FBIB
          </h3>

          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            Busca el club y selecciona
            después el equipo concreto.
          </p>
        </div>

        <button
          type="button"
          onClick={alCerrar}
          disabled={
            deshabilitado ||
            buscando
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

      <form
        onSubmit={buscar}
        className="border-b border-outline-variant/60 bg-surface-container-low p-4 sm:p-5"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">
            Nombre del club
          </span>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={consulta}
              onChange={(evento) => {
                setConsulta(
                  evento.target.value,
                );

                setError(null);
              }}
              disabled={
                deshabilitado ||
                buscando
              }
              minLength={2}
              maxLength={100}
              autoComplete="off"
              placeholder="Ej. Alcúdia, Sa Pobla, Pollença..."
              className="h-11 min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={
                deshabilitado ||
                buscando ||
                consulta.trim()
                  .length < 2
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-40"
            >
              {buscando && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary"
                  aria-hidden="true"
                />
              )}

              {buscando
                ? "Buscando..."
                : "Buscar"}
            </button>
          </div>
        </label>

        {error && (
          <p
            className="mt-3 rounded-xl border border-error/30 bg-error-container px-3 py-2 text-sm text-on-error-container"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>

      <div className="max-h-96 overflow-y-auto p-4 sm:p-5">
        {!buscando &&
          !busquedaRealizada &&
          resultados.length === 0 && (
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
                Busca un club
              </p>

              <p className="mt-1 text-xs text-on-surface-variant">
                Los equipos encontrados
                aparecerán aquí.
              </p>
            </div>
          )}

        {!buscando &&
          busquedaRealizada &&
          !error &&
          resultados.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-sm font-semibold text-on-surface">
                No se han encontrado
                resultados
              </p>

              <p className="mt-1 text-xs text-on-surface-variant">
                Prueba a buscar solamente
                una parte del nombre del
                club.
              </p>
            </div>
          )}

        {resultados.length > 0 && (
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