import {
  useMemo,
  useState,
} from "react";

import type {
  AlcanceEvento,
  EquipoEventoPanel,
} from "@tipos/EventoPanel";

interface Propiedades {
  alcance: AlcanceEvento;

  equiposDisponibles:
    EquipoEventoPanel[];

  equiposSeleccionados:
    EquipoEventoPanel[];

  alCambiarAlcance: (
    alcance: AlcanceEvento,
  ) => void;

  alCambiarEquipos: (
    equipos: EquipoEventoPanel[],
  ) => void;

  error?: string | null;
  deshabilitado?: boolean;
}

function normalizarTexto(
  texto: string,
): string {
  return texto
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

export default function SelectorEquiposEvento({
  alcance,
  equiposDisponibles,
  equiposSeleccionados,
  alCambiarAlcance,
  alCambiarEquipos,
  error = null,
  deshabilitado = false,
}: Propiedades) {
  const [
    consulta,
    setConsulta,
  ] = useState("");

  const idsSeleccionados = useMemo(
    () =>
      new Set(
        equiposSeleccionados.map(
          (equipo) => equipo.id,
        ),
      ),
    [equiposSeleccionados],
  );

  const equiposFiltrados = useMemo(
    () => {
      const consultaNormalizada =
        normalizarTexto(consulta);

      if (!consultaNormalizada) {
        return equiposDisponibles;
      }

      return equiposDisponibles.filter(
        (equipo) => {
          const contenido =
            normalizarTexto(
              [
                equipo.nombre,
                equipo.nombreCorto,
                equipo.categoria,
                equipo.genero,
              ]
                .filter(Boolean)
                .join(" "),
            );

          return contenido.includes(
            consultaNormalizada,
          );
        },
      );
    },
    [
      consulta,
      equiposDisponibles,
    ],
  );

  const seleccionarAlcance = (
    siguienteAlcance:
      AlcanceEvento,
  ) => {
    if (deshabilitado) {
      return;
    }

    alCambiarAlcance(
      siguienteAlcance,
    );

    if (
      siguienteAlcance ===
      "todo-club"
    ) {
      alCambiarEquipos([]);
    }
  };

  const alternarEquipo = (
    equipo: EquipoEventoPanel,
  ) => {
    if (deshabilitado) {
      return;
    }

    if (
      idsSeleccionados.has(
        equipo.id,
      )
    ) {
      alCambiarEquipos(
        equiposSeleccionados.filter(
          (seleccionado) =>
            seleccionado.id !==
            equipo.id,
        ),
      );

      return;
    }

    alCambiarEquipos([
      ...equiposSeleccionados,
      equipo,
    ]);
  };

  const seleccionarTodosVisibles =
    () => {
      if (
        deshabilitado ||
        equiposFiltrados.length === 0
      ) {
        return;
      }

      const equiposPorId =
        new Map(
          equiposSeleccionados.map(
            (equipo) => [
              equipo.id,
              equipo,
            ],
          ),
        );

      equiposFiltrados.forEach(
        (equipo) => {
          equiposPorId.set(
            equipo.id,
            equipo,
          );
        },
      );

      alCambiarEquipos(
        Array.from(
          equiposPorId.values(),
        ),
      );
    };

  const quitarTodosVisibles =
    () => {
      if (deshabilitado) {
        return;
      }

      const idsVisibles =
        new Set(
          equiposFiltrados.map(
            (equipo) => equipo.id,
          ),
        );

      alCambiarEquipos(
        equiposSeleccionados.filter(
          (equipo) =>
            !idsVisibles.has(
              equipo.id,
            ),
        ),
      );
    };

  const todosVisiblesSeleccionados =
    equiposFiltrados.length > 0 &&
    equiposFiltrados.every(
      (equipo) =>
        idsSeleccionados.has(
          equipo.id,
        ),
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Destinatarios
        </h2>

        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          Decide si el evento está
          dirigido a todo el club o
          solamente a determinados
          equipos.
        </p>
      </div>

      <div className="grid gap-5 p-5 sm:p-6">
        <fieldset
          disabled={deshabilitado}
          className="grid gap-3 sm:grid-cols-2"
        >
          <legend className="sr-only">
            Alcance del evento
          </legend>

          <button
            type="button"
            role="radio"
            aria-checked={
              alcance ===
              "todo-club"
            }
            onClick={() =>
              seleccionarAlcance(
                "todo-club",
              )
            }
            disabled={
              deshabilitado
            }
            className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              alcance ===
              "todo-club"
                ? "border-primary bg-primary-container/60"
                : "border-outline-variant bg-surface-container-low hover:border-primary/50"
            }`}
          >
            <span
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                alcance ===
                "todo-club"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              <span
                className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/club.svg')",

                  WebkitMaskImage:
                    "url('/iconos/panel/club.svg')",
                }}
                aria-hidden="true"
              />
            </span>

            <span>
              <span className="block font-bold text-on-surface">
                Todo el club
              </span>

              <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                El evento aparecerá
                para todos los equipos
                y usuarios del club.
              </span>
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={
              alcance === "equipos"
            }
            onClick={() =>
              seleccionarAlcance(
                "equipos",
              )
            }
            disabled={
              deshabilitado
            }
            className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              alcance === "equipos"
                ? "border-primary bg-primary-container/60"
                : "border-outline-variant bg-surface-container-low hover:border-primary/50"
            }`}
          >
            <span
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                alcance === "equipos"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              <span
                className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/equipos.svg')",

                  WebkitMaskImage:
                    "url('/iconos/panel/equipos.svg')",
                }}
                aria-hidden="true"
              />
            </span>

            <span>
              <span className="block font-bold text-on-surface">
                Equipos concretos
              </span>

              <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
                El evento solamente
                afectará a los equipos
                seleccionados.
              </span>
            </span>
          </button>
        </fieldset>

        {alcance === "equipos" && (
          <div className="overflow-hidden rounded-2xl border border-outline-variant/60">
            <div className="border-b border-outline-variant/60 bg-surface-container-low p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-on-surface">
                    Seleccionar equipos
                  </p>

                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {
                      equiposSeleccionados
                        .length
                    }{" "}
                    {equiposSeleccionados
                      .length === 1
                      ? "equipo seleccionado"
                      : "equipos seleccionados"}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    deshabilitado ||
                    equiposFiltrados
                      .length === 0
                  }
                  onClick={
                    todosVisiblesSeleccionados
                      ? quitarTodosVisibles
                      : seleccionarTodosVisibles
                  }
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {todosVisiblesSeleccionados
                    ? "Quitar visibles"
                    : "Seleccionar visibles"}
                </button>
              </div>

              <label className="relative mt-4 block">
                <span className="sr-only">
                  Buscar equipos
                </span>

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
                  value={consulta}
                  onChange={(evento) =>
                    setConsulta(
                      evento.target
                        .value,
                    )
                  }
                  disabled={
                    deshabilitado
                  }
                  placeholder="Buscar por nombre, categoría o género"
                  className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-3 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </div>

            {equiposFiltrados.length >
            0 ? (
              <div className="grid max-h-96 gap-2 overflow-y-auto p-3 sm:grid-cols-2">
                {equiposFiltrados.map(
                  (equipo) => {
                    const seleccionado =
                      idsSeleccionados.has(
                        equipo.id,
                      );

                    const informacion =
                      [
                        equipo.categoria,
                        equipo.genero,
                      ]
                        .filter(Boolean)
                        .join(" · ");

                    return (
                      <button
                        key={equipo.id}
                        type="button"
                        role="checkbox"
                        aria-checked={
                          seleccionado
                        }
                        disabled={
                          deshabilitado
                        }
                        onClick={() =>
                          alternarEquipo(
                            equipo,
                          )
                        }
                        className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          seleccionado
                            ? "border-primary bg-primary-container/60"
                            : "border-outline-variant/60 bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            seleccionado
                              ? "border-primary bg-primary text-on-primary"
                              : "border-outline bg-transparent"
                          }`}
                        >
                          {seleccionado && (
                            <span
                              className="inline-block h-3 w-3 bg-current mask-center mask-contain mask-no-repeat"
                              style={{
                                maskImage:
                                  "url('/iconos/panel/correcto.svg')",

                                WebkitMaskImage:
                                  "url('/iconos/panel/correcto.svg')",
                              }}
                              aria-hidden="true"
                            />
                          )}
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-on-surface">
                            {equipo.nombre ||
                              equipo.nombreCorto ||
                              "Equipo sin nombre"}
                          </span>

                          {informacion && (
                            <span className="mt-0.5 block truncate text-xs text-on-surface-variant">
                              {
                                informacion
                              }
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="p-7 text-center">
                <p className="text-sm font-bold text-on-surface">
                  No se han encontrado
                  equipos
                </p>

                <p className="mt-1 text-xs text-on-surface-variant">
                  Prueba con otro término
                  de búsqueda.
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p
            className="text-sm font-semibold text-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {alcance ===
          "todo-club" && (
          <div className="rounded-xl border border-primary/30 bg-primary-container/30 px-4 py-3 text-sm text-on-surface-variant">
            Para crear o modificar un
            evento dirigido a todo el
            club se necesita el permiso
            de gestión de eventos
            generales.
          </div>
        )}
      </div>
    </section>
  );
}