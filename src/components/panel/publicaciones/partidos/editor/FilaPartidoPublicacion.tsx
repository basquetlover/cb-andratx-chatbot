import { useState } from "react";

import BuscadorRivalFbib from "./BuscadorRivalFbib";
import SelectorEquipoClubPublicacion, {
  type EquipoClubPublicacion,
} from "./SelectorEquipoClubPublicacion";
import SelectorLogoRival from "./SelectorLogoRival";

import type {
  EstadoPartidoPublicacion,
  PartidoPublicacion,
  RivalFbibPublicacion,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  partido:
    PartidoPublicacion;

  esPrimero: boolean;
  esUltimo: boolean;

  alActualizar: (
    partido:
      PartidoPublicacion,
  ) => void;

  alSubir: () => void;
  alBajar: () => void;
  alEliminar: () => void;

  deshabilitado?: boolean;
}

const NOMBRES_ESTADO:
  Record<
    EstadoPartidoPublicacion,
    string
  > = {
    partido: "Partido",
    descansa: "Descansa",
    aplazado: "Aplazado",
  };

function formatearFecha(
  fecha: string | null,
): string {
  if (!fecha) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "numeric",
      month: "short",
      timeZone:
        "Europe/Madrid",
    },
  ).format(
    new Date(
      `${fecha}T12:00:00`,
    ),
  );
}

export default function FilaPartidoPublicacion({
  partido,
  esPrimero,
  esUltimo,
  alActualizar,
  alSubir,
  alBajar,
  alEliminar,
  deshabilitado = false,
}: Propiedades) {
  const [
    expandido,
    setExpandido,
  ] = useState(false);

  const [
    buscadorAbierto,
    setBuscadorAbierto,
  ] = useState(false);

  const actualizarCampo = <
    Campo extends keyof PartidoPublicacion,
  >(
    campo: Campo,
    valor:
      PartidoPublicacion[Campo],
  ) => {
    alActualizar({
      ...partido,
      [campo]: valor,
    });
  };

  const cambiarEstado = (
    estado:
      EstadoPartidoPublicacion,
  ) => {
    if (estado === "descansa") {
      alActualizar({
        ...partido,

        estado,

        fecha: null,
        hora: null,

        rivalFbibId: null,
        nombreRival: "",
        logoRival: null,

        campo: "",
        municipio: null,
        pabellon: null,

        local: null,
      });

      setBuscadorAbierto(false);

      return;
    }

    alActualizar({
      ...partido,

      estado,

      local:
        partido.local ?? true,
    });
  };

  const seleccionarEquipoClub = (
    equipo:
      EquipoClubPublicacion | null,
  ) => {
    if (!equipo) {
      alActualizar({
        ...partido,

        equipoId: null,
        equipoFbibId: null,
        imagenEquipo: null,
        nombreEquipo: "",
      });

      return;
    }

    alActualizar({
      ...partido,

      equipoId: equipo.id,

      equipoFbibId:
        equipo.idEquipoFbib,

      imagenEquipo:
        equipo.imagen,

      nombreEquipo:
        equipo.nombre,
    });
  };

  const cambiarCondicion = (
    local: boolean | null,
  ) => {
    if (local === true) {
      alActualizar({
        ...partido,

        local: true,

        municipio: null,

        pabellon:
          partido.pabellon ??
          null,

        campo:
          partido.pabellon ??
          "",
      });

      return;
    }

    if (local === false) {
      alActualizar({
        ...partido,

        local: false,

        pabellon: null,

        municipio:
          partido.municipio ??
          null,

        campo:
          partido.municipio ??
          "",
      });

      return;
    }

    alActualizar({
      ...partido,

      local: null,

      municipio: null,
      pabellon: null,
    });
  };

  const cambiarPabellon = (
    pabellon: string,
  ) => {
    alActualizar({
      ...partido,

      pabellon:
        pabellon || null,

      municipio: null,

      campo: pabellon,
    });
  };

  const cambiarMunicipio = (
    municipio: string,
  ) => {
    alActualizar({
      ...partido,

      municipio:
        municipio || null,

      pabellon: null,

      campo: municipio,
    });
  };

  const cambiarLugarGeneral = (
    campo: string,
  ) => {
    alActualizar({
      ...partido,

      campo,

      municipio: null,
      pabellon: null,
    });
  };

  const seleccionarRival = (
    rival:
      RivalFbibPublicacion,
  ) => {
    alActualizar({
      ...partido,

      rivalFbibId:
        rival.id,

      nombreRival:
        rival.nombre,

      logoRival:
        rival.escudo,
    });

    setBuscadorAbierto(false);
  };

  const descripcionFecha =
    partido.estado ===
    "descansa"
      ? "Sin partido"
      : [
          formatearFecha(
            partido.fecha,
          ),
          partido.hora,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <article
      className={`overflow-hidden rounded-2xl border transition-colors ${
        partido.visible
          ? "border-outline-variant/60 bg-surface-container-lowest"
          : "border-outline-variant/40 bg-surface-container-low opacity-70"
      }`}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={alSubir}
            disabled={
              deshabilitado ||
              esPrimero
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low text-lg font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Subir el partido"
            title="Subir"
          >
            ↑
          </button>

          <button
            type="button"
            onClick={alBajar}
            disabled={
              deshabilitado ||
              esUltimo
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low text-lg font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Bajar el partido"
            title="Bajar"
          >
            ↓
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            setExpandido(
              (valor) => !valor,
            )
          }
          className="min-w-0 flex-1 text-left"
          aria-expanded={expandido}
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-xs font-bold text-on-primary-fixed">
              {partido.orden}
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                partido.estado ===
                "aplazado"
                  ? "bg-error-container text-on-error-container"
                  : partido.estado ===
                      "descansa"
                    ? "bg-surface-container-high text-on-surface-variant"
                    : "bg-secondary-fixed text-on-secondary-fixed"
              }`}
            >
              {
                NOMBRES_ESTADO[
                  partido.estado
                ]
              }
            </span>

            <span className="rounded-full border border-outline-variant px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
              {partido.origen ===
              "fbib"
                ? "FBIB"
                : "Manual"}
            </span>

            {!partido.visible && (
              <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-bold text-on-surface-variant">
                Oculto
              </span>
            )}
          </span>

          <span className="mt-2 block truncate text-sm font-bold text-on-surface">
            {partido.nombreEquipo ||
              "Equipo sin seleccionar"}
          </span>

          <span className="mt-1 block truncate text-xs text-on-surface-variant">
            {partido.estado ===
            "descansa"
              ? descripcionFecha
              : `${
                  partido.nombreRival ||
                  "Rival pendiente"
                } · ${descripcionFecha}`}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              actualizarCampo(
                "visible",
                !partido.visible,
              )
            }
            disabled={deshabilitado}
            className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-bold transition-colors ${
              partido.visible
                ? "border-success/40 bg-success-container text-on-success-container"
                : "border-outline-variant bg-surface-container text-on-surface-variant"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={
              partido.visible
                ? "Ocultar partido"
                : "Mostrar partido"
            }
            title={
              partido.visible
                ? "Ocultar"
                : "Mostrar"
            }
          >
            {partido.visible
              ? "Visible"
              : "Oculto"}
          </button>

          <button
            type="button"
            onClick={() =>
                setExpandido(
                (valor) => !valor,
                )
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            aria-label={
                expandido
                ? "Cerrar edición"
                : "Editar partido"
            }
            >
            {expandido
                ? "−"
                : "+"}
            </button>
        </div>
      </div>

      {expandido && (
        <div className="border-t border-outline-variant/60 bg-surface-container-low p-4 sm:p-5">
          <div className="grid gap-5">
            <fieldset
              disabled={
                deshabilitado
              }
            >
              <legend className="text-sm font-semibold text-on-surface">
                Tipo de fila
              </legend>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    {
                      id: "partido",
                      nombre:
                        "Partido",
                    },
                    {
                      id: "descansa",
                      nombre:
                        "Descansa",
                    },
                    {
                      id: "aplazado",
                      nombre:
                        "Aplazado",
                    },
                  ] as const
                ).map((opcion) => {
                  const seleccionado =
                    partido.estado ===
                    opcion.id;

                  return (
                    <label
                      key={opcion.id}
                      className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-bold transition-colors ${
                        seleccionado
                          ? "border-primary bg-primary-fixed/60 text-on-primary-fixed"
                          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`estado-${partido.id}`}
                        checked={
                          seleccionado
                        }
                        onChange={() =>
                          cambiarEstado(
                            opcion.id,
                          )
                        }
                        disabled={
                          deshabilitado
                        }
                        className="sr-only"
                      />

                      {opcion.nombre}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <SelectorEquipoClubPublicacion
              equipoId={
                partido.equipoId ??
                null
              }
              alCambiar={
                seleccionarEquipoClub
              }
              deshabilitado={
                deshabilitado
              }
            />

            {partido.estado !==
              "descansa" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-on-surface">
                      Fecha
                    </span>

                    <input
                      type="date"
                      value={
                        partido.fecha ??
                        ""
                      }
                      onChange={(evento) =>
                        actualizarCampo(
                          "fecha",
                          evento.target
                            .value ||
                            null,
                        )
                      }
                      disabled={
                        deshabilitado
                      }
                      className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-on-surface">
                      Hora
                    </span>

                    <input
                      type="time"
                      value={
                        partido.hora ??
                        ""
                      }
                      onChange={(evento) =>
                        actualizarCampo(
                          "hora",
                          evento.target
                            .value ||
                            null,
                        )
                      }
                      disabled={
                        deshabilitado
                      }
                      className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                </div>

                <fieldset
                  disabled={
                    deshabilitado
                  }
                >
                  <legend className="text-sm font-semibold text-on-surface">
                    Condición
                  </legend>

                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        {
                          valor: true,
                          nombre:
                            "En casa",
                        },
                        {
                          valor: false,
                          nombre:
                            "Fuera",
                        },
                        {
                          valor: null,
                          nombre:
                            "Sin definir",
                        },
                      ] as const
                    ).map(
                      (
                        opcion,
                        indice,
                      ) => {
                        const seleccionado =
                          partido.local ===
                          opcion.valor;

                        return (
                          <label
                            key={
                              indice
                            }
                            className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-bold transition-colors ${
                              seleccionado
                                ? "border-secondary bg-secondary-fixed/50 text-on-secondary-fixed"
                                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-secondary/60"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`local-${partido.id}`}
                              checked={
                                seleccionado
                              }
                              onChange={() =>
                                cambiarCondicion(
                                  opcion.valor,
                                )
                              }
                              disabled={
                                deshabilitado
                              }
                              className="sr-only"
                            />

                            {
                              opcion.nombre
                            }
                          </label>
                        );
                      },
                    )}
                  </div>
                </fieldset>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">
                    Nombre del rival
                  </span>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={
                        partido.nombreRival
                      }
                      onChange={(evento) =>
                        alActualizar({
                          ...partido,

                          nombreRival:
                            evento.target
                              .value,

                          rivalFbibId:
                            null,
                        })
                      }
                      disabled={
                        deshabilitado
                      }
                      maxLength={200}
                      placeholder="Nombre del rival"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setBuscadorAbierto(
                          true,
                        )
                      }
                      disabled={
                        deshabilitado
                      }
                      className="min-h-11 rounded-xl border border-secondary px-4 py-2 text-sm font-bold text-secondary transition-colors hover:bg-secondary hover:text-on-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Buscar en FBIB
                    </button>
                  </div>

                  <span className="text-xs leading-5 text-on-surface-variant">
                    El nombre se conserva
                    para identificar al
                    rival. En la imagen solo
                    aparecerá su escudo.
                  </span>
                </label>

                {buscadorAbierto && (
                  <BuscadorRivalFbib
                    alSeleccionar={
                      seleccionarRival
                    }
                    alCerrar={() =>
                      setBuscadorAbierto(
                        false,
                      )
                    }
                    deshabilitado={
                      deshabilitado
                    }
                  />
                )}

                <SelectorLogoRival
                  logoActual={
                    partido.logoRival
                  }
                  nombreRival={
                    partido.nombreRival
                  }
                  alCambiar={(logo) =>
                    actualizarCampo(
                      "logoRival",
                      logo,
                    )
                  }
                  deshabilitado={
                    deshabilitado
                  }
                />

                {partido.local ===
                  true && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-on-surface">
                      Pabellón en Andratx
                    </span>

                    <input
                      type="text"
                      value={
                        partido.pabellon ??
                        partido.campo
                      }
                      onChange={(evento) =>
                        cambiarPabellon(
                          evento.target
                            .value,
                        )
                      }
                      disabled={
                        deshabilitado
                      }
                      maxLength={200}
                      placeholder="Ej. Palau d'Esports d'Andratx"
                      className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <span className="text-xs text-on-surface-variant">
                      En los partidos de
                      casa aparecerá el
                      pabellón.
                    </span>
                  </label>
                )}

                {partido.local ===
                  false && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-on-surface">
                      Municipio
                    </span>

                    <input
                      type="text"
                      value={
                        partido.municipio ??
                        partido.campo
                      }
                      onChange={(evento) =>
                        cambiarMunicipio(
                          evento.target
                            .value,
                        )
                      }
                      disabled={
                        deshabilitado
                      }
                      maxLength={100}
                      placeholder="Ej. Alcúdia"
                      className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <span className="text-xs text-on-surface-variant">
                      En los partidos fuera
                      solamente aparecerá
                      el municipio.
                    </span>
                  </label>
                )}

                {partido.local ===
                  null && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-on-surface">
                      Lugar
                    </span>

                    <input
                      type="text"
                      value={
                        partido.campo
                      }
                      onChange={(evento) =>
                        cambiarLugarGeneral(
                          evento.target
                            .value,
                        )
                      }
                      disabled={
                        deshabilitado
                      }
                      maxLength={200}
                      placeholder="Lugar del partido"
                      className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                )}
              </>
            )}

            <div className="flex justify-end border-t border-outline-variant/60 pt-4">
              <button
                type="button"
                onClick={alEliminar}
                disabled={
                  deshabilitado
                }
                className="min-h-10 rounded-xl border border-error/40 px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                Eliminar de la publicación
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}