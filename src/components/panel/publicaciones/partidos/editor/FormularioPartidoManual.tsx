import {
  useState,
  type FormEvent,
} from "react";

import BuscadorRivalFbib from "./BuscadorRivalFbib";
import SelectorLogoRival from "./SelectorLogoRival";

import type {
  EstadoPartidoPublicacion,
  PartidoPublicacion,
  RivalFbibPublicacion,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  orden: number;

  alAnadir: (
    partido:
      PartidoPublicacion,
  ) => void;

  alCancelar: () => void;

  deshabilitado?: boolean;
}

interface EstadoFormulario {
  estado:
    EstadoPartidoPublicacion;

  fecha: string;
  hora: string;

  nombreEquipo: string;

  rivalFbibId: string | null;
  nombreRival: string;
  logoRival: string | null;

  campo: string;
  local: boolean | null;
}

function crearEstadoInicial():
  EstadoFormulario {
  return {
    estado: "partido",

    fecha: "",
    hora: "",

    nombreEquipo: "",

    rivalFbibId: null,
    nombreRival: "",
    logoRival: null,

    campo: "",
    local: true,
  };
}

export default function FormularioPartidoManual({
  orden,
  alAnadir,
  alCancelar,
  deshabilitado = false,
}: Propiedades) {
  const [
    formulario,
    setFormulario,
  ] = useState<EstadoFormulario>(
    crearEstadoInicial,
  );

  const [
    errores,
    setErrores,
  ] = useState<
    Record<string, string>
  >({});

  const [
    buscadorAbierto,
    setBuscadorAbierto,
  ] = useState(false);

  const actualizarCampo = <
    Campo extends keyof EstadoFormulario,
  >(
    campo: Campo,
    valor:
      EstadoFormulario[Campo],
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        [campo]: valor,
      }),
    );

    setErrores(
      (erroresActuales) => {
        if (
          !erroresActuales[campo]
        ) {
          return erroresActuales;
        }

        const siguientesErrores = {
          ...erroresActuales,
        };

        delete siguientesErrores[
          campo
        ];

        return siguientesErrores;
      },
    );
  };

  const cambiarEstado = (
    estado:
      EstadoPartidoPublicacion,
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        estado,

        fecha:
          estado === "descansa"
            ? ""
            : formularioActual.fecha,

        hora:
          estado === "descansa"
            ? ""
            : formularioActual.hora,

        rivalFbibId:
          estado === "descansa"
            ? null
            : formularioActual.rivalFbibId,

        nombreRival:
          estado === "descansa"
            ? ""
            : formularioActual.nombreRival,

        logoRival:
          estado === "descansa"
            ? null
            : formularioActual.logoRival,

        campo:
          estado === "descansa"
            ? ""
            : formularioActual.campo,

        local:
          estado === "descansa"
            ? null
            : formularioActual.local,
      }),
    );

    setErrores({});
    setBuscadorAbierto(false);
  };

  const seleccionarRival = (
    rival:
      RivalFbibPublicacion,
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,

        rivalFbibId:
          rival.id,

        nombreRival:
          rival.nombre,

        logoRival:
          rival.escudo,
      }),
    );

    setErrores(
      (erroresActuales) => {
        const siguientesErrores = {
          ...erroresActuales,
        };

        delete siguientesErrores
          .nombreRival;

        return siguientesErrores;
      },
    );

    setBuscadorAbierto(false);
  };

  const validar = (): boolean => {
    const nuevosErrores:
      Record<string, string> = {};

    if (
      !formulario.nombreEquipo.trim()
    ) {
      nuevosErrores.nombreEquipo =
        "Debes indicar el nombre del equipo.";
    }

    if (
      formulario.estado ===
        "partido" &&
      !formulario.fecha
    ) {
      nuevosErrores.fecha =
        "Debes indicar la fecha del partido.";
    }

    if (
      formulario.estado ===
        "partido" &&
      !formulario.nombreRival.trim()
    ) {
      nuevosErrores.nombreRival =
        "Debes indicar el nombre del rival.";
    }

    if (
      formulario.nombreEquipo
        .trim().length > 200
    ) {
      nuevosErrores.nombreEquipo =
        "El nombre del equipo no puede superar los 200 caracteres.";
    }

    if (
      formulario.nombreRival
        .trim().length > 200
    ) {
      nuevosErrores.nombreRival =
        "El nombre del rival no puede superar los 200 caracteres.";
    }

    if (
      formulario.campo
        .trim().length > 200
    ) {
      nuevosErrores.campo =
        "El campo no puede superar los 200 caracteres.";
    }

    setErrores(nuevosErrores);

    return (
      Object.keys(
        nuevosErrores,
      ).length === 0
    );
  };

  const guardarPartido = (
    evento:
      FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    if (
      deshabilitado ||
      !validar()
    ) {
      return;
    }

    const partido:
      PartidoPublicacion = {
        id:
          `manual-${crypto.randomUUID()}`,

        partidoFbibId: null,
        origen: "manual",

        orden,
        visible: true,

        equipoId: null,
        equipoFbibId: null,

        fecha:
          formulario.fecha ||
          null,

        hora:
          formulario.hora ||
          null,

        nombreEquipo:
          formulario.nombreEquipo.trim(),

        rivalFbibId:
          formulario.rivalFbibId,

        nombreRival:
          formulario.nombreRival.trim(),

        logoRival:
          formulario.logoRival,

        campo:
          formulario.campo.trim(),

        local:
          formulario.local,

        estado:
          formulario.estado,
      };

    alAnadir(partido);
  };

  const esDescanso =
    formulario.estado ===
    "descansa";

  return (
    <form
      onSubmit={guardarPartido}
      className="overflow-hidden rounded-2xl border border-primary/30 bg-surface-container-lowest shadow-sm"
      noValidate
    >
      <div className="border-b border-outline-variant/60 bg-primary-fixed/30 px-4 py-4 sm:px-5">
        <h3 className="font-bold text-on-surface">
          Añadir manualmente
        </h3>

        <p className="mt-1 text-xs leading-5 text-on-surface-variant">
          Añade un partido, un descanso o
          un encuentro aplazado que no
          aparezca correctamente en la
          FBIB.
        </p>
      </div>

      <div className="grid gap-5 p-4 sm:p-5">
        <fieldset>
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
                formulario.estado ===
                opcion.id;

              return (
                <label
                  key={opcion.id}
                  className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-bold transition-colors ${
                    seleccionado
                      ? "border-primary bg-primary-fixed/60 text-on-primary-fixed"
                      : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="estado-partido-manual"
                    value={opcion.id}
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

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">
            Nombre del equipo
          </span>

          <textarea
            value={
              formulario.nombreEquipo
            }
            onChange={(evento) =>
              actualizarCampo(
                "nombreEquipo",
                evento.target.value,
              )
            }
            disabled={deshabilitado}
            maxLength={200}
            rows={2}
            placeholder="Ej. INSTALADORA 2001&#10;INFANTIL FEM"
            className={`min-h-20 resize-y rounded-xl border bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none transition-colors placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60 ${
              errores.nombreEquipo
                ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
            }`}
          />

          {errores.nombreEquipo && (
            <span className="text-xs font-medium text-error">
              {
                errores.nombreEquipo
              }
            </span>
          )}
        </label>

        {!esDescanso && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Fecha
                </span>

                <input
                  type="date"
                  value={
                    formulario.fecha
                  }
                  onChange={(evento) =>
                    actualizarCampo(
                      "fecha",
                      evento.target.value,
                    )
                  }
                  disabled={
                    deshabilitado
                  }
                  className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    errores.fecha
                      ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                      : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />

                {errores.fecha && (
                  <span className="text-xs font-medium text-error">
                    {
                      errores.fecha
                    }
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Hora
                </span>

                <input
                  type="time"
                  value={
                    formulario.hora
                  }
                  onChange={(evento) =>
                    actualizarCampo(
                      "hora",
                      evento.target.value,
                    )
                  }
                  disabled={
                    deshabilitado
                  }
                  className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </div>

            <fieldset>
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
                      formulario.local ===
                      opcion.valor;

                    return (
                      <label
                        key={indice}
                        className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-bold transition-colors ${
                          seleccionado
                            ? "border-secondary bg-secondary-fixed/50 text-on-secondary-fixed"
                            : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-secondary/60"
                        }`}
                      >
                        <input
                          type="radio"
                          name="condicion-partido-manual"
                          checked={
                            seleccionado
                          }
                          onChange={() =>
                            actualizarCampo(
                              "local",
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
                    formulario.nombreRival
                  }
                  onChange={(evento) => {
                    actualizarCampo(
                      "nombreRival",
                      evento.target.value,
                    );

                    actualizarCampo(
                      "rivalFbibId",
                      null,
                    );
                  }}
                  disabled={
                    deshabilitado
                  }
                  maxLength={200}
                  placeholder="Nombre del equipo rival"
                  className={`h-11 min-w-0 flex-1 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60 ${
                    errores.nombreRival
                      ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                      : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
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

              {errores.nombreRival && (
                <span className="text-xs font-medium text-error">
                  {
                    errores.nombreRival
                  }
                </span>
              )}
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
                formulario.logoRival
              }
              nombreRival={
                formulario.nombreRival
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

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Campo
              </span>

              <input
                type="text"
                value={
                  formulario.campo
                }
                onChange={(evento) =>
                  actualizarCampo(
                    "campo",
                    evento.target.value,
                  )
                }
                disabled={
                  deshabilitado
                }
                maxLength={200}
                placeholder="Ej. Palau d'Esports d'Andratx"
                className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60 ${
                  errores.campo
                    ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />

              {errores.campo && (
                <span className="text-xs font-medium text-error">
                  {errores.campo}
                </span>
              )}
            </label>
          </>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 bg-surface-container-low px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
        <button
          type="button"
          onClick={alCancelar}
          disabled={deshabilitado}
          className="min-h-11 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={deshabilitado}
          className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-50"
        >
          Añadir a la publicación
        </button>
      </div>
    </form>
  );
}