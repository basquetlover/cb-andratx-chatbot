import {
  useEffect,
  useMemo,
  useState,
} from "react";

import TarjetaEventoPanel from "./TarjetaEventoPanel";

import {
  ALCANCES_EVENTO,
  ESTADOS_EVENTO,
  TIPOS_EVENTO,
} from "@tipos/EventoPanel";

import type {
  AlcanceEvento,
  EstadoEvento,
  FiltrosListadoEventos,
  RespuestaListadoEventosPanel,
  ResultadoListadoEventosPanel,
  TipoEvento,
} from "@tipos/EventoPanel";

interface Propiedades {
  puedeCrear: boolean;
}

const resultadoVacio: ResultadoListadoEventosPanel = {
  temporada: null,

  resumen: {
    total: 0,
    publicados: 0,
    borradores: 0,
    cancelados: 0,
    archivados: 0,
    proximos: 0,
    enCurso: 0,
    finalizados: 0,
  },

  eventos: [],
};

const filtrosIniciales: FiltrosListadoEventos = {
  consulta: "",
  tipo: "todos",
  estado: "todos",
  alcance: "todos",
  fechaInicio: undefined,
  fechaFin: undefined,
};

const etiquetasTipos: Record<
  TipoEvento,
  string
> = {
  evento: "Evento",
  campus: "Campus",
  torneo: "Torneo",
  presentacion: "Presentación",
  reunion: "Reunión",
  actividad: "Actividad",
  otro: "Otro",
};

const etiquetasEstados: Record<
  EstadoEvento,
  string
> = {
  borrador: "Borrador",
  publicado: "Publicado",
  cancelado: "Cancelado",
  archivado: "Archivado",
};

const etiquetasAlcances: Record<
  AlcanceEvento,
  string
> = {
  "todo-club": "Todo el club",
  equipos: "Equipos concretos",
};

function crearParametros(
  filtros: FiltrosListadoEventos,
): URLSearchParams {
  const parametros =
    new URLSearchParams();

  const consulta =
    filtros.consulta?.trim() ?? "";

  if (consulta) {
    parametros.set(
      "consulta",
      consulta,
    );
  }

  if (
    filtros.tipo &&
    filtros.tipo !== "todos"
  ) {
    parametros.set(
      "tipo",
      filtros.tipo,
    );
  }

  if (
    filtros.estado &&
    filtros.estado !== "todos"
  ) {
    parametros.set(
      "estado",
      filtros.estado,
    );
  }

  if (
    filtros.alcance &&
    filtros.alcance !== "todos"
  ) {
    parametros.set(
      "alcance",
      filtros.alcance,
    );
  }

  if (filtros.fechaInicio) {
    parametros.set(
      "fechaInicio",
      filtros.fechaInicio,
    );
  }

  if (filtros.fechaFin) {
    parametros.set(
      "fechaFin",
      filtros.fechaFin,
    );
  }

  return parametros;
}

interface PropiedadesResumen {
  etiqueta: string;
  cantidad: number;
  color: string;
  icono: string;
}

function TarjetaResumen({
  etiqueta,
  cantidad,
  color,
  icono,
}: PropiedadesResumen) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        <span
          className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat"
          style={{
            maskImage:
              `url("${icono}")`,

            WebkitMaskImage:
              `url("${icono}")`,
          }}
          aria-hidden="true"
        />
      </span>

      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none text-on-surface">
          {cantidad}
        </span>

        <span className="mt-1 block truncate text-xs font-semibold text-on-surface-variant">
          {etiqueta}
        </span>
      </span>
    </article>
  );
}

export default function ListadoEventosPanel({
  puedeCrear,
}: Propiedades) {
  const [
    resultado,
    setResultado,
  ] =
    useState<ResultadoListadoEventosPanel>(
      resultadoVacio,
    );

  const [
    filtros,
    setFiltros,
  ] =
    useState<FiltrosListadoEventos>(
      filtrosIniciales,
    );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    intento,
    setIntento,
  ] = useState(0);

  const hayFiltrosActivos =
    useMemo(
      () =>
        Boolean(
          filtros.consulta?.trim() ||
            (
              filtros.tipo &&
              filtros.tipo !== "todos"
            ) ||
            (
              filtros.estado &&
              filtros.estado !== "todos"
            ) ||
            (
              filtros.alcance &&
              filtros.alcance !== "todos"
            ) ||
            filtros.fechaInicio ||
            filtros.fechaFin,
        ),
      [filtros],
    );

  useEffect(() => {
    const controlador =
      new AbortController();

    const temporizador =
      window.setTimeout(
        async () => {
          try {
            setCargando(true);
            setError(null);

            const parametros =
              crearParametros(
                filtros,
              );

            const ruta =
              parametros.size > 0
                ? `/api/panel/eventos?${parametros.toString()}`
                : "/api/panel/eventos";

            const respuesta =
              await fetch(
                ruta,
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
                RespuestaListadoEventosPanel;

            if (
              !respuesta.ok ||
              !contenido.ok ||
              !contenido.data
            ) {
              throw new Error(
                contenido.error ??
                  "No se han podido cargar los eventos.",
              );
            }

            setResultado(
              contenido.data,
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
              "Error cargando el listado de eventos:",
              error,
            );

            setError(
              error instanceof Error
                ? error.message
                : "No se han podido cargar los eventos.",
            );
          } finally {
            if (
              !controlador.signal
                .aborted
            ) {
              setCargando(false);
            }
          }
        },
        300,
      );

    return () => {
      window.clearTimeout(
        temporizador,
      );

      controlador.abort();
    };
  }, [
    filtros,
    intento,
  ]);

  const actualizarFiltro = <
    Campo extends
      keyof FiltrosListadoEventos,
  >(
    campo: Campo,
    valor:
      FiltrosListadoEventos[Campo],
  ) => {
    setFiltros(
      (filtrosActuales) => ({
        ...filtrosActuales,
        [campo]: valor,
      }),
    );
  };

  const limpiarFiltros = () => {
    setFiltros({
      ...filtrosIniciales,
    });
  };

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            Gestión del club
          </p>

          <h1 className="mt-1 text-3xl font-bold text-on-surface">
            Eventos
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Crea y gestiona eventos
            generales o actividades
            dirigidas a equipos
            concretos.
          </p>

          {resultado.temporada && (
            <p className="mt-2 text-xs font-semibold text-on-surface-variant">
              Temporada:{" "}
              {resultado.temporada
                .nombre ??
                "Temporada activa"}
            </p>
          )}
        </div>

        {puedeCrear && (
          <a
            href="/panel/eventos/nuevo"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <span
              className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/mas.svg')",

                WebkitMaskImage:
                  "url('/iconos/panel/mas.svg')",
              }}
              aria-hidden="true"
            />

            Crear evento
          </a>
        )}
      </header>

      <section
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7"
        aria-label="Resumen de eventos"
      >
        <TarjetaResumen
          etiqueta="Total"
          cantidad={
            resultado.resumen.total
          }
          color="bg-primary-container text-on-primary-container"
          icono="/iconos/panel/eventos.svg"
        />

        <TarjetaResumen
          etiqueta="Publicados"
          cantidad={
            resultado.resumen
              .publicados
          }
          color="bg-success-container text-on-success-container"
          icono="/iconos/panel/correcto.svg"
        />

        <TarjetaResumen
          etiqueta="Borradores"
          cantidad={
            resultado.resumen
              .borradores
          }
          color="bg-surface-container-high text-on-surface-variant"
          icono="/iconos/panel/editar.svg"
        />

        <TarjetaResumen
          etiqueta="Próximos"
          cantidad={
            resultado.resumen
              .proximos
          }
          color="bg-secondary-container text-on-secondary-container"
          icono="/iconos/panel/calendario.svg"
        />

        <TarjetaResumen
          etiqueta="En curso"
          cantidad={
            resultado.resumen.enCurso
          }
          color="bg-tertiary-container text-on-tertiary-container"
          icono="/iconos/panel/reloj.svg"
        />

        <TarjetaResumen
          etiqueta="Finalizados"
          cantidad={
            resultado.resumen
              .finalizados
          }
          color="bg-surface-container-high text-on-surface-variant"
          icono="/iconos/panel/archivar.svg"
        />

        <TarjetaResumen
          etiqueta="Cancelados"
          cantidad={
            resultado.resumen
              .cancelados
          }
          color="bg-error-container text-on-error-container"
          icono="/iconos/panel/error.svg"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
          <h2 className="text-lg font-bold text-on-surface">
            Buscar y filtrar
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            Localiza eventos por texto,
            estado, alcance o periodo.
          </p>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-6">
          <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <span className="text-xs font-bold text-on-surface">
              Buscar
            </span>

            <span className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 bg-outline mask-center mask-contain mask-no-repeat"
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
                value={
                  filtros.consulta ??
                  ""
                }
                onChange={(evento) =>
                  actualizarFiltro(
                    "consulta",
                    evento.target.value,
                  )
                }
                placeholder="Título, descripción o ubicación"
                className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface">
              Tipo
            </span>

            <select
              value={
                filtros.tipo ??
                "todos"
              }
              onChange={(evento) =>
                actualizarFiltro(
                  "tipo",
                  evento.target
                    .value as
                    FiltrosListadoEventos["tipo"],
                )
              }
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="todos">
                Todos los tipos
              </option>

              {TIPOS_EVENTO.map(
                (tipo) => (
                  <option
                    key={tipo}
                    value={tipo}
                  >
                    {
                      etiquetasTipos[
                        tipo
                      ]
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface">
              Estado
            </span>

            <select
              value={
                filtros.estado ??
                "todos"
              }
              onChange={(evento) =>
                actualizarFiltro(
                  "estado",
                  evento.target
                    .value as
                    FiltrosListadoEventos["estado"],
                )
              }
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="todos">
                Todos los estados
              </option>

              {ESTADOS_EVENTO.map(
                (estado) => (
                  <option
                    key={estado}
                    value={estado}
                  >
                    {
                      etiquetasEstados[
                        estado
                      ]
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface">
              Alcance
            </span>

            <select
              value={
                filtros.alcance ??
                "todos"
              }
              onChange={(evento) =>
                actualizarFiltro(
                  "alcance",
                  evento.target
                    .value as
                    FiltrosListadoEventos["alcance"],
                )
              }
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="todos">
                Todos los alcances
              </option>

              {ALCANCES_EVENTO.map(
                (alcance) => (
                  <option
                    key={alcance}
                    value={alcance}
                  >
                    {
                      etiquetasAlcances[
                        alcance
                      ]
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-2 xl:col-span-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-bold text-on-surface">
                Desde
              </span>

              <input
                type="date"
                value={
                  filtros.fechaInicio ??
                  ""
                }
                onChange={(evento) =>
                  actualizarFiltro(
                    "fechaInicio",
                    evento.target
                      .value ||
                      undefined,
                  )
                }
                max={
                  filtros.fechaFin ||
                  undefined
                }
                className="h-11 min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest px-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-bold text-on-surface">
                Hasta
              </span>

              <input
                type="date"
                value={
                  filtros.fechaFin ??
                  ""
                }
                onChange={(evento) =>
                  actualizarFiltro(
                    "fechaFin",
                    evento.target
                      .value ||
                      undefined,
                  )
                }
                min={
                  filtros.fechaInicio ||
                  undefined
                }
                className="h-11 min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest px-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
        </div>

        {hayFiltrosActivos && (
          <div className="flex justify-end border-t border-outline-variant/60 px-5 py-3 sm:px-6">
            <button
              type="button"
              onClick={
                limpiarFiltros
              }
              className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-bold text-primary transition-colors hover:bg-primary-container"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </section>

      {error && (
        <section
          className="rounded-2xl border border-error/40 bg-error-container p-6 text-on-error-container shadow-sm"
          role="alert"
        >
          <div className="flex items-start gap-4">
            <span
              className="inline-block h-7 w-7 shrink-0 bg-current mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/error.svg')",

                WebkitMaskImage:
                  "url('/iconos/panel/error.svg')",
              }}
              aria-hidden="true"
            />

            <div>
              <h2 className="font-bold">
                No se han podido cargar
                los eventos
              </h2>

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
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-error px-4 py-2 text-sm font-bold transition-colors hover:bg-error hover:text-on-error"
              >
                Volver a intentarlo
              </button>
            </div>
          </div>
        </section>
      )}

      {!error && cargando && (
        <section
          className="flex min-h-64 items-center justify-center rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-8 shadow-sm"
          role="status"
        >
          <div className="text-center">
            <span
              className="mx-auto block h-9 w-9 animate-spin rounded-full border-4 border-outline-variant border-t-primary"
              aria-hidden="true"
            />

            <p className="mt-4 text-sm font-semibold text-on-surface-variant">
              Cargando eventos...
            </p>
          </div>
        </section>
      )}

      {!error &&
        !cargando &&
        resultado.eventos.length >
          0 && (
          <section
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-label="Listado de eventos"
          >
            {resultado.eventos.map(
              (evento) => (
                <TarjetaEventoPanel
                  key={evento.id}
                  evento={evento}
                />
              ),
            )}
          </section>
        )}

      {!error &&
        !cargando &&
        resultado.eventos.length ===
          0 && (
          <section className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
            <div className="max-w-md">
              <span
                className="mx-auto inline-block h-14 w-14 bg-outline mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/eventos.svg')",

                  WebkitMaskImage:
                    "url('/iconos/panel/eventos.svg')",
                }}
                aria-hidden="true"
              />

              <h2 className="mt-4 text-xl font-bold text-on-surface">
                {hayFiltrosActivos
                  ? "No hay eventos que coincidan"
                  : "Todavía no hay eventos"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                {hayFiltrosActivos
                  ? "Prueba a modificar o limpiar los filtros utilizados."
                  : "Los eventos que se creen aparecerán en este listado."}
              </p>

              {hayFiltrosActivos ? (
                <button
                  type="button"
                  onClick={
                    limpiarFiltros
                  }
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary-container"
                >
                  Limpiar filtros
                </button>
              ) : (
                puedeCrear && (
                  <a
                    href="/panel/eventos/nuevo"
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary"
                  >
                    Crear el primer
                    evento
                  </a>
                )
              )}
            </div>
          </section>
        )}
    </div>
  );
}