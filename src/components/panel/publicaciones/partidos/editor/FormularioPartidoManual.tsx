import {
  useState,
  type FormEvent,
} from "react";

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
  orden: number;

  alAnadir: (
    partido: PartidoPublicacion,
  ) => void;

  alCancelar: () => void;

  deshabilitado?: boolean;
}

interface EstadoFormulario {
  estado:
    EstadoPartidoPublicacion;

  equipoId: string | null;
  equipoFbibId: string | null;
  imagenEquipo: string | null;
  nombreEquipo: string;

  fecha: string;
  hora: string;

  local: boolean | null;

  rivalFbibId: string | null;
  nombreRival: string;
  logoRival: string | null;

  municipio: string;
  pabellon: string;
  campo: string;
}

function crearEstadoInicial():
  EstadoFormulario {
  return {
    estado: "partido",

    equipoId: null,
    equipoFbibId: null,
    imagenEquipo: null,
    nombreEquipo: "",

    fecha: "",
    hora: "",

    local: true,

    rivalFbibId: null,
    nombreRival: "",
    logoRival: null,

    municipio: "",
    pabellon: "",
    campo: "",
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

  const limpiarErrores = (
    ...campos: string[]
  ) => {
    setErrores(
      (erroresActuales) => {
        const siguientesErrores = {
          ...erroresActuales,
        };

        campos.forEach((campo) => {
          delete siguientesErrores[
            campo
          ];
        });

        return siguientesErrores;
      },
    );
  };

  const cambiarEstado = (
    estado:
      EstadoPartidoPublicacion,
  ) => {
    setFormulario(
      (formularioActual) => {
        if (
          estado !== "descansa"
        ) {
          return {
            ...formularioActual,
            estado,
            local:
              formularioActual.local ??
              true,
          };
        }

        return {
          ...formularioActual,

          estado,

          fecha: "",
          hora: "",

          local: null,

          rivalFbibId: null,
          nombreRival: "",
          logoRival: null,

          municipio: "",
          pabellon: "",
          campo: "",
        };
      },
    );

    setErrores({});
    setBuscadorAbierto(false);
  };

  const seleccionarEquipoClub = (
    equipo:
      EquipoClubPublicacion | null,
  ) => {
    if (!equipo) {
      setFormulario(
        (formularioActual) => ({
          ...formularioActual,

          equipoId: null,
          equipoFbibId: null,
          imagenEquipo: null,
          nombreEquipo: "",
        }),
      );

      return;
    }

    setFormulario(
      (formularioActual) => ({
        ...formularioActual,

        equipoId: equipo.id,

        equipoFbibId:
          equipo.idEquipoFbib,

        imagenEquipo:
          equipo.imagen,

        nombreEquipo:
          equipo.nombre,
      }),
    );

    limpiarErrores(
      "equipoId",
      "nombreEquipo",
    );
  };

  const cambiarCondicion = (
    local: boolean | null,
  ) => {
    setFormulario(
      (formularioActual) => {
        if (local === true) {
          return {
            ...formularioActual,

            local: true,

            municipio: "",
            campo:
              formularioActual.pabellon,
          };
        }

        if (local === false) {
          return {
            ...formularioActual,

            local: false,

            pabellon: "",
            campo:
              formularioActual.municipio,
          };
        }

        return {
          ...formularioActual,
          local: null,
        };
      },
    );

    limpiarErrores(
      "campo",
      "municipio",
      "pabellon",
    );
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

    limpiarErrores(
      "nombreRival",
    );

    setBuscadorAbierto(false);
  };

  const cambiarNombreRival = (
    nombreRival: string,
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,

        nombreRival,
        rivalFbibId: null,
      }),
    );

    limpiarErrores(
      "nombreRival",
    );
  };

  const cambiarMunicipio = (
    municipio: string,
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,

        municipio,
        pabellon: "",

        campo:
          municipio,
      }),
    );

    limpiarErrores(
      "municipio",
      "campo",
    );
  };

  const cambiarPabellon = (
    pabellon: string,
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,

        pabellon,
        municipio: "",

        campo:
          pabellon,
      }),
    );

    limpiarErrores(
      "pabellon",
      "campo",
    );
  };

  const cambiarLugarGeneral = (
    campo: string,
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,

        campo,
        municipio: "",
        pabellon: "",
      }),
    );

    limpiarErrores(
      "campo",
    );
  };

  const validar = (): boolean => {
    const nuevosErrores:
      Record<string, string> = {};

    if (!formulario.equipoId) {
      nuevosErrores.equipoId =
        "Debes seleccionar un equipo del club.";
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
        "Debes indicar el rival.";
    }

    if (
      formulario.nombreRival
        .trim().length > 200
    ) {
      nuevosErrores.nombreRival =
        "El nombre del rival no puede superar los 200 caracteres.";
    }

    if (
      formulario.municipio
        .trim().length > 100
    ) {
      nuevosErrores.municipio =
        "El municipio no puede superar los 100 caracteres.";
    }

    if (
      formulario.pabellon
        .trim().length > 200
    ) {
      nuevosErrores.pabellon =
        "El pabellón no puede superar los 200 caracteres.";
    }

    if (
      formulario.campo
        .trim().length > 200
    ) {
      nuevosErrores.campo =
        "El lugar no puede superar los 200 caracteres.";
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

    const esDescanso =
      formulario.estado ===
      "descansa";

    const municipio =
      !esDescanso &&
      formulario.local === false
        ? formulario.municipio.trim() ||
          null
        : null;

    const pabellon =
      !esDescanso &&
      formulario.local === true
        ? formulario.pabellon.trim() ||
          null
        : null;

    const campo =
      esDescanso
        ? ""
        : formulario.local === true
          ? pabellon ?? ""
          : formulario.local === false
            ? municipio ?? ""
            : formulario.campo.trim();

    const partido:
      PartidoPublicacion = {
        id:
          `manual-${crypto.randomUUID()}`,

        partidoFbibId: null,
        origen: "manual",

        orden,
        visible: true,

        equipoId:
          formulario.equipoId,

        equipoFbibId:
          formulario.equipoFbibId,

        imagenEquipo:
          formulario.imagenEquipo,

        nombreEquipo:
          formulario.nombreEquipo.trim(),

        fecha:
          esDescanso
            ? null
            : formulario.fecha ||
              null,

        hora:
          esDescanso
            ? null
            : formulario.hora ||
              null,

        rivalFbibId:
          esDescanso
            ? null
            : formulario.rivalFbibId,

        nombreRival:
          esDescanso
            ? ""
            : formulario.nombreRival.trim(),

        logoRival:
          esDescanso
            ? null
            : formulario.logoRival,

        campo,
        municipio,
        pabellon,

        local:
          esDescanso
            ? null
            : formulario.local,

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
        <fieldset
          disabled={deshabilitado}
        >
          <legend className="text-sm font-semibold text-on-surface">
            Tipo de fila
          </legend>

          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(
              [
                {
                  id: "partido",
                  nombre: "Partido",
                },
                {
                  id: "descansa",
                  nombre: "Descansa",
                },
                {
                  id: "aplazado",
                  nombre: "Aplazado",
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

        <SelectorEquipoClubPublicacion
          equipoId={
            formulario.equipoId
          }
          alCambiar={
            seleccionarEquipoClub
          }
          deshabilitado={
            deshabilitado
          }
          error={
            errores.equipoId
          }
        />

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
                    {errores.fecha}
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

            <fieldset
              disabled={deshabilitado}
            >
              <legend className="text-sm font-semibold text-on-surface">
                Condición
              </legend>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    {
                      valor: true,
                      nombre: "En casa",
                    },
                    {
                      valor: false,
                      nombre: "Fuera",
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
                            cambiarCondicion(
                              opcion.valor,
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
                  onChange={(evento) =>
                    cambiarNombreRival(
                      evento.target.value,
                    )
                  }
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

              <span className="text-xs leading-5 text-on-surface-variant">
                El nombre se utiliza para
                identificar y buscar al
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

            {formulario.local ===
              true && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Pabellón en Andratx
                </span>

                <input
                  type="text"
                  value={
                    formulario.pabellon
                  }
                  onChange={(evento) =>
                    cambiarPabellon(
                      evento.target.value,
                    )
                  }
                  disabled={
                    deshabilitado
                  }
                  maxLength={200}
                  placeholder="Ej. Palau d'Esports d'Andratx"
                  className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60 ${
                    errores.pabellon
                      ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                      : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />

                {errores.pabellon && (
                  <span className="text-xs font-medium text-error">
                    {
                      errores.pabellon
                    }
                  </span>
                )}

                <span className="text-xs text-on-surface-variant">
                  En los partidos de casa
                  se mostrará el nombre del
                  pabellón.
                </span>
              </label>
            )}

            {formulario.local ===
              false && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Municipio
                </span>

                <input
                  type="text"
                  value={
                    formulario.municipio
                  }
                  onChange={(evento) =>
                    cambiarMunicipio(
                      evento.target.value,
                    )
                  }
                  disabled={
                    deshabilitado
                  }
                  maxLength={100}
                  placeholder="Ej. Alcúdia"
                  className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60 ${
                    errores.municipio
                      ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                      : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />

                {errores.municipio && (
                  <span className="text-xs font-medium text-error">
                    {
                      errores.municipio
                    }
                  </span>
                )}

                <span className="text-xs text-on-surface-variant">
                  En los partidos fuera
                  solamente se mostrará el
                  municipio.
                </span>
              </label>
            )}

            {formulario.local ===
              null && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Lugar
                </span>

                <input
                  type="text"
                  value={
                    formulario.campo
                  }
                  onChange={(evento) =>
                    cambiarLugarGeneral(
                      evento.target.value,
                    )
                  }
                  disabled={
                    deshabilitado
                  }
                  maxLength={200}
                  placeholder="Lugar del partido"
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
            )}
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