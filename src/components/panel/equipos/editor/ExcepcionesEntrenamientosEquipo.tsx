import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type {
  EntrenamientoReferenciaExcepcion,
  ExcepcionEntrenamientoPanel,
  ResultadoExcepcionesEntrenamientosPanel,
  TipoExcepcionEntrenamiento,
} from "@tipos/ExcepcionesEntrenamientosPanel";

interface Propiedades {
  equipoId: string;
  temporadaId: string;
}

interface EstadoFormulario {
  tipo: TipoExcepcionEntrenamiento;
  fecha: string;
  entrenamientoId: string;
  instalacionId: string;
  horaInicio: string;
  horaFin: string;
  motivo: string;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaApi {
  ok: boolean;
  data: ResultadoExcepcionesEntrenamientosPanel | null;
  error: string | null;
  errores: ErrorCampo[];
}

const nombresDias: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

function obtenerFechaActual(): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).format(new Date());
}

function crearFormularioVacio(): EstadoFormulario {
  return {
    tipo: "cancelacion",
    fecha: obtenerFechaActual(),
    entrenamientoId: "",
    instalacionId: "",
    horaInicio: "",
    horaFin: "",
    motivo: "",
  };
}

function formatearFecha(
  fecha: string | null,
): string {
  if (!fecha) {
    return "Fecha sin configurar";
  }

  const fechaConvertida = new Date(
    `${fecha}T12:00:00`,
  );

  if (
    Number.isNaN(
      fechaConvertida.getTime(),
    )
  ) {
    return fecha;
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Madrid",
    },
  ).format(fechaConvertida);
}

function formatearHora(
  hora: string | null,
): string {
  return hora?.slice(0, 5) ?? "--:--";
}

function obtenerNombreTipo(
  tipo: TipoExcepcionEntrenamiento | null,
): string {
  if (tipo === "cancelacion") {
    return "Cancelación";
  }

  if (tipo === "modificacion") {
    return "Modificación";
  }

  if (tipo === "adicional") {
    return "Entrenamiento adicional";
  }

  return "Sin configurar";
}

function clasesTipo(
  tipo: TipoExcepcionEntrenamiento | null,
): string {
  if (tipo === "cancelacion") {
    return "border-error/40 bg-error-container text-on-error-container";
  }

  if (tipo === "modificacion") {
    return "border-primary/40 bg-primary-fixed text-on-primary-fixed";
  }

  if (tipo === "adicional") {
    return "border-success/40 bg-success-container text-on-success-container";
  }

  return "border-outline-variant bg-surface-container text-on-surface-variant";
}

function etiquetaEntrenamiento(
  entrenamiento: EntrenamientoReferenciaExcepcion,
): string {
  const dia =
    entrenamiento.diaSemana !== null
      ? nombresDias[
          entrenamiento.diaSemana
        ] ??
        `Día ${entrenamiento.diaSemana}`
      : "Día sin configurar";

  const horario =
    entrenamiento.horaInicio &&
    entrenamiento.horaFin
      ? `${formatearHora(
          entrenamiento.horaInicio,
        )}–${formatearHora(
          entrenamiento.horaFin,
        )}`
      : "Horario sin configurar";

  const instalacion =
    entrenamiento.instalacion?.nombre ??
    "Instalación sin configurar";

  return `${dia} · ${horario} · ${instalacion}`;
}

export default function ExcepcionesEntrenamientosEquipo({
  equipoId,
  temporadaId,
}: Propiedades) {
  const [datos, setDatos] =
    useState<ResultadoExcepcionesEntrenamientosPanel | null>(
      null,
    );

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [
    excepcionEliminando,
    setExcepcionEliminando,
  ] = useState<string | null>(null);

  const [
    confirmarEliminacion,
    setConfirmarEliminacion,
  ] = useState<ExcepcionEntrenamientoPanel | null>(
    null,
  );

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [editandoId, setEditandoId] =
    useState<string | null>(null);

  const [formulario, setFormulario] =
    useState<EstadoFormulario>(
      crearFormularioVacio,
    );

  const [errores, setErrores] =
    useState<Record<string, string>>({});

  const [errorGeneral, setErrorGeneral] =
    useState<string | null>(null);

  const [mensajeExito, setMensajeExito] =
    useState<string | null>(null);

  const cargarDatos = useCallback(
    async () => {
      try {
        setCargando(true);
        setErrorGeneral(null);

        const parametros =
          new URLSearchParams({
            temporadaId,
          });

        const respuesta = await fetch(
          `/api/panel/equipos/${encodeURIComponent(
            equipoId,
          )}/entrenamientos/excepciones?${parametros.toString()}`,
          {
            method: "GET",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const contenido =
          (await respuesta.json()) as RespuestaApi;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data
        ) {
          throw new Error(
            contenido.error ??
              "No se han podido cargar las excepciones.",
          );
        }

        setDatos(contenido.data);
      } catch (error) {
        console.error(
          "Error cargando las excepciones:",
          error,
        );

        setErrorGeneral(
          error instanceof Error
            ? error.message
            : "No se han podido cargar las excepciones.",
        );
      } finally {
        setCargando(false);
      }
    },
    [equipoId, temporadaId],
  );

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const excepcionesOrdenadas =
    useMemo(() => {
      return [
        ...(datos?.excepciones ?? []),
      ].sort((primera, segunda) => {
        const fechaPrimera =
          primera.fecha ?? "9999-12-31";

        const fechaSegunda =
          segunda.fecha ?? "9999-12-31";

        const comparacionFecha =
          fechaPrimera.localeCompare(
            fechaSegunda,
          );

        if (comparacionFecha !== 0) {
          return comparacionFecha;
        }

        return (
          primera.horaInicio ?? ""
        ).localeCompare(
          segunda.horaInicio ?? "",
        );
      });
    }, [datos]);

  const actualizarCampo = <
    Campo extends keyof EstadoFormulario,
  >(
    campo: Campo,
    valor: EstadoFormulario[Campo],
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        [campo]: valor,
      }),
    );

    setErrores((erroresActuales) => {
      if (!erroresActuales[campo]) {
        return erroresActuales;
      }

      const nuevosErrores = {
        ...erroresActuales,
      };

      delete nuevosErrores[campo];

      return nuevosErrores;
    });

    setErrorGeneral(null);
    setMensajeExito(null);
  };

  const cambiarTipo = (
    tipo: TipoExcepcionEntrenamiento,
  ) => {
    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        tipo,
        entrenamientoId:
          tipo === "adicional"
            ? ""
            : formularioActual.entrenamientoId,
        instalacionId:
          tipo === "cancelacion"
            ? ""
            : formularioActual.instalacionId,
        horaInicio:
          tipo === "cancelacion"
            ? ""
            : formularioActual.horaInicio,
        horaFin:
          tipo === "cancelacion"
            ? ""
            : formularioActual.horaFin,
      }),
    );

    setErrores({});
    setErrorGeneral(null);
    setMensajeExito(null);
  };

  const seleccionarEntrenamiento = (
    entrenamientoId: string,
  ) => {
    const entrenamiento =
      datos?.entrenamientos.find(
        (elemento) =>
          elemento.id === entrenamientoId,
      );

    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        entrenamientoId,
        instalacionId:
          formularioActual.tipo ===
            "modificacion" &&
          entrenamiento?.instalacion
            ? entrenamiento.instalacion.id
            : formularioActual.tipo ===
                "cancelacion"
              ? ""
              : formularioActual.instalacionId,
        horaInicio:
          formularioActual.tipo ===
          "modificacion"
            ? entrenamiento?.horaInicio ??
              ""
            : "",
        horaFin:
          formularioActual.tipo ===
          "modificacion"
            ? entrenamiento?.horaFin ?? ""
            : "",
      }),
    );

    setErrores((erroresActuales) => {
      const nuevosErrores = {
        ...erroresActuales,
      };

      delete nuevosErrores.entrenamientoId;

      return nuevosErrores;
    });
  };

  const abrirCreacion = () => {
    setFormulario(
      crearFormularioVacio(),
    );

    setEditandoId(null);
    setErrores({});
    setErrorGeneral(null);
    setMensajeExito(null);
    setMostrarFormulario(true);
  };

  const abrirEdicion = (
    excepcion: ExcepcionEntrenamientoPanel,
  ) => {
    setFormulario({
      tipo:
        excepcion.tipo ??
        "cancelacion",
      fecha: excepcion.fecha ?? "",
      entrenamientoId:
        excepcion.entrenamientoId ?? "",
      instalacionId:
        excepcion.instalacionId ?? "",
      horaInicio:
        excepcion.horaInicio ?? "",
      horaFin:
        excepcion.horaFin ?? "",
      motivo: excepcion.motivo ?? "",
    });

    setEditandoId(excepcion.id);
    setErrores({});
    setErrorGeneral(null);
    setMensajeExito(null);
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    if (guardando) {
      return;
    }

    setMostrarFormulario(false);
    setEditandoId(null);
    setFormulario(
      crearFormularioVacio(),
    );
    setErrores({});
    setErrorGeneral(null);
  };

  const validarFormulario =
    (): boolean => {
      const nuevosErrores: Record<
        string,
        string
      > = {};

      if (!formulario.fecha) {
        nuevosErrores.fecha =
          "Debes indicar la fecha.";
      }

      if (
        formulario.tipo ===
          "cancelacion" ||
        formulario.tipo ===
          "modificacion"
      ) {
        if (!formulario.entrenamientoId) {
          nuevosErrores.entrenamientoId =
            "Debes seleccionar el entrenamiento habitual.";
        }
      }

      if (
        formulario.tipo ===
        "modificacion"
      ) {
        const modificaInstalacion =
          Boolean(
            formulario.instalacionId,
          );

        const modificaHorario =
          Boolean(
            formulario.horaInicio ||
              formulario.horaFin,
          );

        if (
          !modificaInstalacion &&
          !modificaHorario
        ) {
          nuevosErrores.tipo =
            "Debes modificar la instalación o el horario.";
        }
      }

      if (
        formulario.tipo === "adicional" &&
        !formulario.instalacionId
      ) {
        nuevosErrores.instalacionId =
          "Debes seleccionar una instalación.";
      }

      if (
        formulario.tipo !==
        "cancelacion"
      ) {
        if (
          Boolean(
            formulario.horaInicio,
          ) !==
          Boolean(formulario.horaFin)
        ) {
          nuevosErrores.horaInicio =
            "Debes indicar el horario completo.";
        }

        if (
          formulario.tipo ===
            "adicional" &&
          (!formulario.horaInicio ||
            !formulario.horaFin)
        ) {
          nuevosErrores.horaInicio =
            "Debes indicar el horario completo.";
        }

        if (
          formulario.horaInicio &&
          formulario.horaFin &&
          formulario.horaFin <=
            formulario.horaInicio
        ) {
          nuevosErrores.horaFin =
            "La hora de finalización debe ser posterior.";
        }
      }

      if (
        formulario.motivo.trim()
          .length > 500
      ) {
        nuevosErrores.motivo =
          "El motivo no puede superar los 500 caracteres.";
      }

      setErrores(nuevosErrores);

      return (
        Object.keys(nuevosErrores)
          .length === 0
      );
    };

  const guardarExcepcion = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    if (
      guardando ||
      !validarFormulario()
    ) {
      return;
    }

    try {
      setGuardando(true);
      setErrorGeneral(null);
      setMensajeExito(null);

      const esEdicion =
        Boolean(editandoId);

      const url = esEdicion
        ? `/api/panel/equipos/${encodeURIComponent(
            equipoId,
          )}/entrenamientos/excepciones/${encodeURIComponent(
            editandoId!,
          )}`
        : `/api/panel/equipos/${encodeURIComponent(
            equipoId,
          )}/entrenamientos/excepciones`;

      const respuesta = await fetch(
        url,
        {
          method: esEdicion
            ? "PATCH"
            : "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            temporadaId,
            datos: {
              tipo: formulario.tipo,
              fecha: formulario.fecha,
              entrenamientoId:
                formulario.tipo ===
                "adicional"
                  ? null
                  : formulario.entrenamientoId ||
                    null,
              instalacionId:
                formulario.tipo ===
                "cancelacion"
                  ? null
                  : formulario.instalacionId ||
                    null,
              horaInicio:
                formulario.tipo ===
                "cancelacion"
                  ? null
                  : formulario.horaInicio ||
                    null,
              horaFin:
                formulario.tipo ===
                "cancelacion"
                  ? null
                  : formulario.horaFin ||
                    null,
              motivo:
                formulario.motivo.trim() ||
                null,
            },
          }),
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaApi;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
      ) {
        const erroresServidor: Record<
          string,
          string
        > = {};

        contenido.errores?.forEach(
          (error) => {
            erroresServidor[
              error.campo
            ] = error.mensaje;
          },
        );

        setErrores(
          erroresServidor,
        );

        throw new Error(
          contenido.error ??
            "No se ha podido guardar la excepción.",
        );
      }

      setDatos(contenido.data);
      setMostrarFormulario(false);
      setEditandoId(null);
      setFormulario(
        crearFormularioVacio(),
      );
      setErrores({});

      setMensajeExito(
        esEdicion
          ? "La excepción se ha actualizado correctamente."
          : "La excepción se ha creado correctamente.",
      );
    } catch (error) {
      console.error(
        "Error guardando la excepción:",
        error,
      );

      setErrorGeneral(
        error instanceof Error
          ? error.message
          : "No se ha podido guardar la excepción.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const eliminarExcepcion =
    async () => {
      if (
        !confirmarEliminacion ||
        excepcionEliminando
      ) {
        return;
      }

      try {
        setExcepcionEliminando(
          confirmarEliminacion.id,
        );

        setErrorGeneral(null);
        setMensajeExito(null);

        const parametros =
          new URLSearchParams({
            temporadaId,
          });

        const respuesta = await fetch(
          `/api/panel/equipos/${encodeURIComponent(
            equipoId,
          )}/entrenamientos/excepciones/${encodeURIComponent(
            confirmarEliminacion.id,
          )}?${parametros.toString()}`,
          {
            method: "DELETE",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const contenido =
          (await respuesta.json()) as RespuestaApi;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data
        ) {
          throw new Error(
            contenido.error ??
              "No se ha podido eliminar la excepción.",
          );
        }

        setDatos(contenido.data);
        setConfirmarEliminacion(null);

        setMensajeExito(
          "La excepción se ha eliminado correctamente.",
        );
      } catch (error) {
        console.error(
          "Error eliminando la excepción:",
          error,
        );

        setErrorGeneral(
          error instanceof Error
            ? error.message
            : "No se ha podido eliminar la excepción.",
        );
      } finally {
        setExcepcionEliminando(null);
      }
    };

  if (cargando) {
    return (
      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm">
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-on-surface-variant">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
            aria-hidden="true"
          />

          Cargando excepciones...
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="flex flex-col gap-4 border-b border-outline-variant/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h3 className="text-lg font-bold text-on-surface">
            Excepciones
          </h3>

          <p className="mt-1 text-sm text-on-surface-variant">
            Gestiona cancelaciones, cambios
            puntuales y entrenamientos
            adicionales.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirCreacion}
          disabled={mostrarFormulario}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-40"
        >
          Añadir excepción
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {errorGeneral && (
          <div
            className="mb-5 rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container"
            role="alert"
          >
            <p className="font-bold">
              Se ha producido un error
            </p>

            <p className="mt-1">
              {errorGeneral}
            </p>
          </div>
        )}

        {mensajeExito && (
          <div
            className="mb-5 rounded-xl border border-success/40 bg-success-container px-4 py-3 text-sm font-semibold text-on-success-container"
            role="status"
          >
            {mensajeExito}
          </div>
        )}

        {mostrarFormulario && (
          <form
            onSubmit={guardarExcepcion}
            className="mb-6 rounded-2xl border border-primary/30 bg-primary-fixed/20 p-4 sm:p-5"
            noValidate
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-bold text-on-surface">
                  {editandoId
                    ? "Editar excepción"
                    : "Nueva excepción"}
                </h4>

                <p className="mt-1 text-xs text-on-surface-variant">
                  Los campos mostrados cambian
                  según el tipo seleccionado.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={guardando}
                className="rounded-lg px-3 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Tipo
                </span>

                <select
                  value={formulario.tipo}
                  onChange={(evento) =>
                    cambiarTipo(
                      evento.target
                        .value as TipoExcepcionEntrenamiento,
                    )
                  }
                  disabled={guardando}
                  className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="cancelacion">
                    Cancelación
                  </option>

                  <option value="modificacion">
                    Modificación
                  </option>

                  <option value="adicional">
                    Entrenamiento adicional
                  </option>
                </select>

                {errores.tipo && (
                  <span className="text-xs font-medium text-error">
                    {errores.tipo}
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Fecha
                </span>

                <input
                  type="date"
                  value={formulario.fecha}
                  onChange={(evento) =>
                    actualizarCampo(
                      "fecha",
                      evento.target.value,
                    )
                  }
                  disabled={guardando}
                  className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:ring-2 ${
                    errores.fecha
                      ? "border-error focus:border-error focus:ring-error/20"
                      : "border-outline-variant focus:border-primary focus:ring-primary/20"
                  }`}
                />

                {errores.fecha && (
                  <span className="text-xs font-medium text-error">
                    {errores.fecha}
                  </span>
                )}
              </label>
            </div>

            {formulario.tipo !==
              "adicional" && (
              <label className="mt-4 flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Entrenamiento habitual
                </span>

                <select
                  value={
                    formulario.entrenamientoId
                  }
                  onChange={(evento) =>
                    seleccionarEntrenamiento(
                      evento.target.value,
                    )
                  }
                  disabled={guardando}
                  className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:ring-2 ${
                    errores.entrenamientoId
                      ? "border-error focus:border-error focus:ring-error/20"
                      : "border-outline-variant focus:border-primary focus:ring-primary/20"
                  }`}
                >
                  <option value="">
                    Selecciona un entrenamiento
                  </option>

                  {datos?.entrenamientos.map(
                    (entrenamiento) => (
                      <option
                        key={
                          entrenamiento.id
                        }
                        value={
                          entrenamiento.id
                        }
                      >
                        {etiquetaEntrenamiento(
                          entrenamiento,
                        )}
                      </option>
                    ),
                  )}
                </select>

                {errores.entrenamientoId && (
                  <span className="text-xs font-medium text-error">
                    {
                      errores.entrenamientoId
                    }
                  </span>
                )}

                {datos?.entrenamientos.length ===
                  0 && (
                  <span className="text-xs text-error">
                    El equipo no tiene
                    entrenamientos habituales
                    configurados.
                  </span>
                )}
              </label>
            )}

            {formulario.tipo !==
              "cancelacion" && (
              <>
                <label className="mt-4 flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-on-surface">
                    {formulario.tipo ===
                    "modificacion"
                      ? "Nueva instalación"
                      : "Instalación"}
                  </span>

                  <select
                    value={
                      formulario.instalacionId
                    }
                    onChange={(evento) =>
                      actualizarCampo(
                        "instalacionId",
                        evento.target.value,
                      )
                    }
                    disabled={guardando}
                    className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:ring-2 ${
                      errores.instalacionId
                        ? "border-error focus:border-error focus:ring-error/20"
                        : "border-outline-variant focus:border-primary focus:ring-primary/20"
                    }`}
                  >
                    <option value="">
                      {formulario.tipo ===
                      "modificacion"
                        ? "Mantener la instalación habitual"
                        : "Selecciona una instalación"}
                    </option>

                    {datos?.instalaciones.map(
                      (instalacion) => (
                        <option
                          key={
                            instalacion.id
                          }
                          value={
                            instalacion.id
                          }
                        >
                          {instalacion.nombre}
                          {!instalacion.activa
                            ? " · Inactiva"
                            : ""}
                        </option>
                      ),
                    )}
                  </select>

                  {errores.instalacionId && (
                    <span className="text-xs font-medium text-error">
                      {
                        errores.instalacionId
                      }
                    </span>
                  )}
                </label>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-on-surface">
                      Nueva hora de inicio
                    </span>

                    <input
                      type="time"
                      value={
                        formulario.horaInicio
                      }
                      onChange={(evento) =>
                        actualizarCampo(
                          "horaInicio",
                          evento.target.value,
                        )
                      }
                      disabled={guardando}
                      className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:ring-2 ${
                        errores.horaInicio
                          ? "border-error focus:border-error focus:ring-error/20"
                          : "border-outline-variant focus:border-primary focus:ring-primary/20"
                      }`}
                    />

                    {errores.horaInicio && (
                      <span className="text-xs font-medium text-error">
                        {
                          errores.horaInicio
                        }
                      </span>
                    )}
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-on-surface">
                      Nueva hora de finalización
                    </span>

                    <input
                      type="time"
                      value={
                        formulario.horaFin
                      }
                      onChange={(evento) =>
                        actualizarCampo(
                          "horaFin",
                          evento.target.value,
                        )
                      }
                      disabled={guardando}
                      className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:ring-2 ${
                        errores.horaFin
                          ? "border-error focus:border-error focus:ring-error/20"
                          : "border-outline-variant focus:border-primary focus:ring-primary/20"
                      }`}
                    />

                    {errores.horaFin && (
                      <span className="text-xs font-medium text-error">
                        {errores.horaFin}
                      </span>
                    )}
                  </label>
                </div>
              </>
            )}

            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Motivo
              </span>

              <textarea
                value={formulario.motivo}
                onChange={(evento) =>
                  actualizarCampo(
                    "motivo",
                    evento.target.value,
                  )
                }
                disabled={guardando}
                rows={3}
                maxLength={500}
                placeholder="Ej. Pabellón no disponible"
                className={`resize-y rounded-xl border bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-2 ${
                  errores.motivo
                    ? "border-error focus:border-error focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-primary/20"
                }`}
              />

              <span className="text-right text-xs text-on-surface-variant">
                {
                  formulario.motivo.length
                }
                /500
              </span>

              {errores.motivo && (
                <span className="text-xs font-medium text-error">
                  {errores.motivo}
                </span>
              )}
            </label>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarFormulario}
                disabled={guardando}
                className="min-h-11 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-bold text-on-surface-variant disabled:opacity-40"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardando && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"
                    aria-hidden="true"
                  />
                )}

                {guardando
                  ? "Guardando..."
                  : editandoId
                    ? "Guardar cambios"
                    : "Crear excepción"}
              </button>
            </div>
          </form>
        )}

        {excepcionesOrdenadas.length ===
        0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-7 text-center">
            <p className="text-sm font-bold text-on-surface">
              No hay excepciones configuradas
            </p>

            <p className="mt-1 text-xs text-on-surface-variant">
              El horario habitual se aplicará
              sin cambios.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {excepcionesOrdenadas.map(
              (excepcion) => (
                <article
                  key={excepcion.id}
                  className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${clasesTipo(
                            excepcion.tipo,
                          )}`}
                        >
                          {obtenerNombreTipo(
                            excepcion.tipo,
                          )}
                        </span>

                        <span className="text-sm font-bold capitalize text-on-surface">
                          {formatearFecha(
                            excepcion.fecha,
                          )}
                        </span>
                      </div>

                      {excepcion.entrenamiento && (
                        <p className="mt-3 text-sm text-on-surface-variant">
                          <span className="font-semibold text-on-surface">
                            Horario habitual:
                          </span>{" "}
                          {etiquetaEntrenamiento(
                            excepcion.entrenamiento,
                          )}
                        </p>
                      )}

                      {excepcion.tipo !==
                        "cancelacion" && (
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-on-surface-variant">
                          <p>
                            <span className="font-semibold text-on-surface">
                              Horario:
                            </span>{" "}
                            {formatearHora(
                              excepcion.horaInicio,
                            )}
                            –
                            {formatearHora(
                              excepcion.horaFin,
                            )}
                          </p>

                          <p>
                            <span className="font-semibold text-on-surface">
                              Instalación:
                            </span>{" "}
                            {excepcion.instalacion
                              ?.nombre ??
                              excepcion
                                .entrenamiento
                                ?.instalacion
                                ?.nombre ??
                              "Sin configurar"}
                          </p>
                        </div>
                      )}

                      {excepcion.motivo && (
                        <p className="mt-3 rounded-xl bg-surface-container px-3 py-2 text-sm text-on-surface-variant">
                          {excepcion.motivo}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          abrirEdicion(
                            excepcion,
                          )
                        }
                        disabled={
                          mostrarFormulario ||
                          Boolean(
                            excepcionEliminando,
                          )
                        }
                        className="min-h-10 rounded-xl border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmarEliminacion(
                            excepcion,
                          )
                        }
                        disabled={
                          Boolean(
                            excepcionEliminando,
                          )
                        }
                        className="min-h-10 rounded-xl border border-error/50 px-3 py-2 text-xs font-bold text-error hover:bg-error-container disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>

      {confirmarEliminacion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-eliminar-excepcion"
        >
          <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl">
            <h3
              id="titulo-eliminar-excepcion"
              className="text-lg font-bold text-on-surface"
            >
              Eliminar excepción
            </h3>

            <p className="mt-2 text-sm text-on-surface-variant">
              Se eliminará la excepción del{" "}
              <span className="font-bold text-on-surface">
                {formatearFecha(
                  confirmarEliminacion.fecha,
                )}
              </span>
              . Esta acción no se puede
              deshacer.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setConfirmarEliminacion(
                    null,
                  )
                }
                disabled={Boolean(
                  excepcionEliminando,
                )}
                className="min-h-11 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-bold text-on-surface-variant disabled:opacity-40"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void eliminarExcepcion()
                }
                disabled={Boolean(
                  excepcionEliminando,
                )}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-error px-4 py-2.5 text-sm font-bold text-on-error disabled:cursor-not-allowed disabled:opacity-40"
              >
                {excepcionEliminando && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-on-error/30 border-t-on-error"
                    aria-hidden="true"
                  />
                )}

                {excepcionEliminando
                  ? "Eliminando..."
                  : "Eliminar excepción"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}