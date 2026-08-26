import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type {
  PatrocinadorEquipoDetalle,
  PatrocinadoresEquipoDetalle,
} from "@tipos/EquipoDetallePanel";

interface Propiedades {
  equipoId: string;
  datosIniciales: PatrocinadoresEquipoDetalle;
  alActualizar: (
    datos: PatrocinadoresEquipoDetalle,
  ) => void;
}

interface EstadoFormulario {
  mostrarSponsor: boolean;
  patrocinadoresIds: string[];
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaListaPatrocinadores {
  ok: boolean;
  data: {
    patrocinadores: PatrocinadorEquipoDetalle[];
  } | null;
  error: string | null;
}

interface RespuestaActualizacion {
  ok: boolean;
  data: {
    patrocinadores: PatrocinadoresEquipoDetalle;
  } | null;
  error: string | null;
  errores: ErrorCampo[];
}

interface PropiedadesInterruptor {
  activo: boolean;
  alCambiar: (activo: boolean) => void;
  deshabilitado?: boolean;
}

function Interruptor({
  activo,
  alCambiar,
  deshabilitado = false,
}: PropiedadesInterruptor) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={deshabilitado}
      onClick={() => alCambiar(!activo)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${
        activo
          ? "bg-primary"
          : "bg-outline-variant"
      }`}
    >
      <span
        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
          activo
            ? "translate-x-5"
            : "translate-x-0"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

function crearEstadoInicial(
  datos: PatrocinadoresEquipoDetalle,
): EstadoFormulario {
  return {
    mostrarSponsor: Boolean(
      datos.mostrarSponsor,
    ),
    patrocinadoresIds:
      datos.seleccionados.map(
        (patrocinador) => patrocinador.id,
      ),
  };
}

function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function ordenarIds(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) =>
    a.localeCompare(b),
  );
}

function combinarPatrocinadores(
  disponibles: PatrocinadorEquipoDetalle[],
  seleccionados: PatrocinadorEquipoDetalle[],
): PatrocinadorEquipoDetalle[] {
  const patrocinadoresPorId = new Map<
    string,
    PatrocinadorEquipoDetalle
  >();

  [...disponibles, ...seleccionados].forEach(
    (patrocinador) => {
      patrocinadoresPorId.set(
        patrocinador.id,
        patrocinador,
      );
    },
  );

  return Array.from(
    patrocinadoresPorId.values(),
  ).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", {
      sensitivity: "base",
    }),
  );
}

export default function PatrocinadoresEquipo({
  equipoId,
  datosIniciales,
  alActualizar,
}: Propiedades) {
  const [formulario, setFormulario] =
    useState<EstadoFormulario>(() =>
      crearEstadoInicial(datosIniciales),
    );

  const [
    patrocinadoresDisponibles,
    setPatrocinadoresDisponibles,
  ] = useState<PatrocinadorEquipoDetalle[]>(
    datosIniciales.seleccionados,
  );

  const [busqueda, setBusqueda] = useState("");

  const [cargandoLista, setCargandoLista] =
    useState(true);

  const [errorCarga, setErrorCarga] = useState<
    string | null
  >(null);

  const [intentoCarga, setIntentoCarga] =
    useState(0);

  const [errores, setErrores] = useState<
    Record<string, string>
  >({});

  const [errorGeneral, setErrorGeneral] =
    useState<string | null>(null);

  const [guardando, setGuardando] =
    useState(false);

  const [
    guardadoCorrectamente,
    setGuardadoCorrectamente,
  ] = useState(false);

  useEffect(() => {
    setFormulario(
      crearEstadoInicial(datosIniciales),
    );

    setPatrocinadoresDisponibles(
      (disponiblesActuales) =>
        combinarPatrocinadores(
          disponiblesActuales,
          datosIniciales.seleccionados,
        ),
    );
  }, [datosIniciales]);

  useEffect(() => {
    const controlador = new AbortController();

    const cargarPatrocinadores = async () => {
      try {
        setCargandoLista(true);
        setErrorCarga(null);

        const respuesta = await fetch(
          `/api/panel/equipos/${encodeURIComponent(equipoId)}?seccion=patrocinadores`,
          {
            method: "GET",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
            },
            signal: controlador.signal,
          },
        );

        const contenido =
          (await respuesta.json()) as RespuestaListaPatrocinadores;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data?.patrocinadores
        ) {
          throw new Error(
            contenido.error ??
              "No se han podido cargar los patrocinadores.",
          );
        }

        setPatrocinadoresDisponibles(
          combinarPatrocinadores(
            contenido.data.patrocinadores,
            datosIniciales.seleccionados,
          ),
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Error cargando los patrocinadores:",
          error,
        );

        setErrorCarga(
          error instanceof Error
            ? error.message
            : "No se han podido cargar los patrocinadores.",
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoLista(false);
        }
      }
    };

    void cargarPatrocinadores();

    return () => controlador.abort();
  }, [
    equipoId,
    intentoCarga,
    datosIniciales.seleccionados,
  ]);

  const datosModificados = useMemo(() => {
    const idsActuales = ordenarIds(
      formulario.patrocinadoresIds,
    );

    const idsOriginales = ordenarIds(
      datosIniciales.seleccionados.map(
        (patrocinador) => patrocinador.id,
      ),
    );

    return (
      formulario.mostrarSponsor !==
        Boolean(datosIniciales.mostrarSponsor) ||
      JSON.stringify(idsActuales) !==
        JSON.stringify(idsOriginales)
    );
  }, [formulario, datosIniciales]);

  const patrocinadoresFiltrados = useMemo(() => {
    const termino = normalizarBusqueda(busqueda);

    if (!termino) {
      return patrocinadoresDisponibles;
    }

    return patrocinadoresDisponibles.filter(
      (patrocinador) =>
        normalizarBusqueda(
          patrocinador.nombre,
        ).includes(termino) ||
        normalizarBusqueda(
          patrocinador.nombreCorto,
        ).includes(termino),
    );
  }, [busqueda, patrocinadoresDisponibles]);

  const actualizarMostrarSponsor = (
    mostrarSponsor: boolean,
  ) => {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      mostrarSponsor,
    }));

    setErrores((erroresActuales) => {
      if (!erroresActuales.mostrarSponsor) {
        return erroresActuales;
      }

      const siguientesErrores = {
        ...erroresActuales,
      };

      delete siguientesErrores.mostrarSponsor;

      return siguientesErrores;
    });

    setErrorGeneral(null);
    setGuardadoCorrectamente(false);
  };

  const alternarPatrocinador = (
    patrocinadorId: string,
  ) => {
    setFormulario((formularioActual) => {
      const seleccionado =
        formularioActual.patrocinadoresIds.includes(
          patrocinadorId,
        );

      return {
        ...formularioActual,
        patrocinadoresIds: seleccionado
          ? formularioActual.patrocinadoresIds.filter(
              (id) => id !== patrocinadorId,
            )
          : [
              ...formularioActual.patrocinadoresIds,
              patrocinadorId,
            ],
      };
    });

    setErrores((erroresActuales) => {
      if (!erroresActuales.patrocinadoresIds) {
        return erroresActuales;
      }

      const siguientesErrores = {
        ...erroresActuales,
      };

      delete siguientesErrores.patrocinadoresIds;

      return siguientesErrores;
    });

    setErrorGeneral(null);
    setGuardadoCorrectamente(false);
  };

  const cancelarCambios = () => {
    setFormulario(
      crearEstadoInicial(datosIniciales),
    );

    setBusqueda("");
    setErrores({});
    setErrorGeneral(null);
    setGuardadoCorrectamente(false);
  };

  const guardarCambios = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    if (!datosModificados || guardando) {
      return;
    }

    try {
      setGuardando(true);
      setErrores({});
      setErrorGeneral(null);
      setGuardadoCorrectamente(false);

      const respuesta = await fetch(
        `/api/panel/equipos/${encodeURIComponent(equipoId)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            seccion: "patrocinadores",
            datos: {
              mostrarSponsor:
                formulario.mostrarSponsor,
              patrocinadoresIds:
                formulario.patrocinadoresIds,
            },
          }),
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaActualizacion;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.patrocinadores
      ) {
        const erroresServidor: Record<
          string,
          string
        > = {};

        contenido.errores?.forEach((error) => {
          erroresServidor[error.campo] =
            error.mensaje;
        });

        setErrores(erroresServidor);

        throw new Error(
          contenido.error ??
            "No se han podido guardar los patrocinadores.",
        );
      }

      const patrocinadoresActualizados =
        contenido.data.patrocinadores;

      alActualizar(patrocinadoresActualizados);

      setFormulario(
        crearEstadoInicial(
          patrocinadoresActualizados,
        ),
      );

      setPatrocinadoresDisponibles(
        (disponiblesActuales) =>
          combinarPatrocinadores(
            disponiblesActuales,
            patrocinadoresActualizados.seleccionados,
          ),
      );

      setErrores({});
      setGuardadoCorrectamente(true);
    } catch (error) {
      console.error(
        "Error actualizando los patrocinadores del equipo:",
        error,
      );

      setErrorGeneral(
        error instanceof Error
          ? error.message
          : "No se han podido guardar los patrocinadores.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      onSubmit={guardarCambios}
      className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm"
      noValidate
    >
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Patrocinadores
        </h2>

        <p className="mt-1 text-sm text-on-surface-variant">
          Gestiona los patrocinadores asociados al
          equipo y su visibilidad pública.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        {errorGeneral && (
          <div
            className="mb-5 rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container"
            role="alert"
          >
            <p className="font-bold">
              No se han podido guardar los cambios
            </p>

            <p className="mt-1">{errorGeneral}</p>
          </div>
        )}

        {guardadoCorrectamente && (
          <div
            className="mb-5 flex items-center gap-3 rounded-xl border border-success/30 bg-success-container px-4 py-3 text-sm font-semibold text-on-success-container"
            role="status"
          >
            <span
              className="inline-block h-5 w-5 shrink-0 bg-success mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/correcto.svg')",
                WebkitMaskImage:
                  "url('/iconos/panel/correcto.svg')",
              }}
              aria-hidden="true"
            />

            Los patrocinadores se han actualizado
            correctamente.
          </div>
        )}

        <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-on-surface">
                Mostrar patrocinadores
              </h3>

              <p className="mt-0.5 text-xs leading-5 text-on-surface-variant">
                Mostrar sus logotipos públicamente en
                la información del equipo.
              </p>
            </div>

            <Interruptor
              activo={formulario.mostrarSponsor}
              alCambiar={actualizarMostrarSponsor}
              deshabilitado={guardando}
            />
          </div>

          {errores.mostrarSponsor && (
            <p className="mt-3 text-xs font-medium text-error">
              {errores.mostrarSponsor}
            </p>
          )}
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-low">
          <div className="border-b border-outline-variant/60 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Buscar patrocinador
                </span>

                <input
                  type="search"
                  value={busqueda}
                  onChange={(evento) =>
                    setBusqueda(evento.target.value)
                  }
                  disabled={guardando}
                  placeholder="Nombre del patrocinador"
                  autoComplete="off"
                  className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>

              <div className="shrink-0 rounded-full bg-primary-fixed px-3 py-1.5 text-xs font-bold text-on-primary-fixed">
                {formulario.patrocinadoresIds.length}{" "}
                seleccionados
              </div>
            </div>

            {errores.patrocinadoresIds && (
              <p className="mt-3 text-xs font-medium text-error">
                {errores.patrocinadoresIds}
              </p>
            )}
          </div>

          <div className="p-4 sm:p-5">
            {cargandoLista ? (
              <div className="flex min-h-40 items-center justify-center gap-3 text-sm font-semibold text-on-surface-variant">
                <span
                  className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                  aria-hidden="true"
                />

                Cargando patrocinadores...
              </div>
            ) : errorCarga ? (
              <div className="rounded-xl border border-error/30 bg-error-container p-5 text-center text-on-error-container">
                <p className="text-sm font-bold">
                  No se ha podido cargar la lista
                </p>

                <p className="mt-1 text-xs">
                  {errorCarga}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setIntentoCarga(
                      (intentoActual) =>
                        intentoActual + 1,
                    )
                  }
                  className="mt-4 min-h-10 rounded-xl bg-error px-4 py-2 text-sm font-bold text-on-error"
                >
                  Reintentar
                </button>
              </div>
            ) : patrocinadoresFiltrados.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {patrocinadoresFiltrados.map(
                  (patrocinador) => {
                    const seleccionado =
                      formulario.patrocinadoresIds.includes(
                        patrocinador.id,
                      );

                    return (
                      <button
                        key={patrocinador.id}
                        type="button"
                        onClick={() =>
                          alternarPatrocinador(
                            patrocinador.id,
                          )
                        }
                        disabled={guardando}
                        aria-pressed={seleccionado}
                        className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          seleccionado
                            ? "border-primary bg-primary-fixed/60"
                            : "border-outline-variant/60 bg-surface-container-lowest hover:border-primary/50"
                        }`}
                      >
                        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container text-sm font-bold text-primary">
                          {patrocinador.nombre
                            .charAt(0)
                            .toUpperCase()}

                          {patrocinador.logo && (
                            <img
                              src={patrocinador.logo}
                              alt=""
                              className="absolute inset-0 h-full w-full bg-white object-contain p-1"
                            />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-on-surface">
                            {patrocinador.nombre}
                          </span>

                          {patrocinador.nombreCorto && (
                            <span className="mt-0.5 block truncate text-xs text-on-surface-variant">
                              {patrocinador.nombreCorto}
                            </span>
                          )}
                        </span>

                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            seleccionado
                              ? "border-primary bg-primary text-on-primary"
                              : "border-outline-variant bg-surface-container-lowest"
                          }`}
                          aria-hidden="true"
                        >
                          {seleccionado && (
                            <span
                              className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
                              style={{
                                maskImage:
                                  "url('/iconos/panel/correcto.svg')",
                                WebkitMaskImage:
                                  "url('/iconos/panel/correcto.svg')",
                              }}
                            />
                          )}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6 text-center">
                <p className="text-sm font-bold text-on-surface">
                  No se han encontrado patrocinadores
                </p>

                <p className="mt-1 text-xs text-on-surface-variant">
                  Prueba con otro término de búsqueda.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 bg-surface-container-low px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          onClick={cancelarCambios}
          disabled={!datosModificados || guardando}
          className="min-h-11 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Descartar cambios
        </button>

        <button
          type="submit"
          disabled={
            !datosModificados ||
            guardando ||
            cargandoLista
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-40"
        >
          {guardando && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary"
              aria-hidden="true"
            />
          )}

          {guardando
            ? "Guardando..."
            : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}