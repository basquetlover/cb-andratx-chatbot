import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type {
  DiaSemanaEntrenamiento,
  EntrenamientoHabitualEquipoPanel,
  EntrenamientosEquipoPanel,
  InstalacionEntrenamientoPanel,
} from "@tipos/EntrenamientosEquipoPanel";

interface Propiedades {
  equipoId: string;
}

interface EstadoFormulario {
  instalacionId: string;
  diaSemana: DiaSemanaEntrenamiento;
  horaInicio: string;
  horaFin: string;
  fechaInicio: string;
  fechaFin: string;
  observaciones: string;
  activo: boolean;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaCarga {
  ok: boolean;
  data: {
    entrenamientos: EntrenamientosEquipoPanel;
  } | null;
  error: string | null;
}

interface RespuestaMutacion {
  ok: boolean;
  data: {
    entrenamiento: EntrenamientoHabitualEquipoPanel;
  } | null;
  error: string | null;
  errores: ErrorCampo[];
}

interface RespuestaEliminacion {
  ok: boolean;
  data: {
    entrenamientoId: string;
  } | null;
  error: string | null;
}

const DIAS_SEMANA: Array<{
  valor: DiaSemanaEntrenamiento;
  nombre: string;
}> = [
  { valor: 1, nombre: "Lunes" },
  { valor: 2, nombre: "Martes" },
  { valor: 3, nombre: "Miércoles" },
  { valor: 4, nombre: "Jueves" },
  { valor: 5, nombre: "Viernes" },
  { valor: 6, nombre: "Sábado" },
  { valor: 7, nombre: "Domingo" },
];

function obtenerNombreDia(
  diaSemana: DiaSemanaEntrenamiento,
): string {
  return (
    DIAS_SEMANA.find(
      (dia) => dia.valor === diaSemana,
    )?.nombre ?? "Día desconocido"
  );
}

function crearFormularioNuevo(
  instalaciones: InstalacionEntrenamientoPanel[],
): EstadoFormulario {
  const primeraInstalacionActiva =
    instalaciones.find(
      (instalacion) => instalacion.activa,
    );

  return {
    instalacionId:
      primeraInstalacionActiva?.id ?? "",
    diaSemana: 1,
    horaInicio: "18:00",
    horaFin: "19:30",
    fechaInicio: "",
    fechaFin: "",
    observaciones: "",
    activo: true,
  };
}

function crearFormularioEdicion(
  entrenamiento: EntrenamientoHabitualEquipoPanel,
): EstadoFormulario {
  return {
    instalacionId:
      entrenamiento.instalacionId,
    diaSemana: entrenamiento.diaSemana,
    horaInicio: entrenamiento.horaInicio,
    horaFin: entrenamiento.horaFin,
    fechaInicio:
      entrenamiento.fechaInicio ?? "",
    fechaFin: entrenamiento.fechaFin ?? "",
    observaciones:
      entrenamiento.observaciones,
    activo: entrenamiento.activo,
  };
}

function ordenarEntrenamientos(
  entrenamientos: EntrenamientoHabitualEquipoPanel[],
): EntrenamientoHabitualEquipoPanel[] {
  return [...entrenamientos].sort(
    (a, b) =>
      a.diaSemana - b.diaSemana ||
      a.horaInicio.localeCompare(
        b.horaInicio,
      ),
  );
}

function describirInstalacion(
  instalacion: InstalacionEntrenamientoPanel | null,
): string {
  if (!instalacion) {
    return "Instalación no disponible";
  }

  const ubicacion = [
    instalacion.direccion,
    instalacion.localidad,
  ]
    .filter(Boolean)
    .join(" · ");

  return ubicacion || "Sin dirección indicada";
}

export default function HorarioHabitualEquipo({
  equipoId,
}: Propiedades) {
  const [datos, setDatos] =
    useState<EntrenamientosEquipoPanel | null>(
      null,
    );

  const [cargando, setCargando] =
    useState(true);

  const [errorCarga, setErrorCarga] = useState<
    string | null
  >(null);

  const [intentoCarga, setIntentoCarga] =
    useState(0);

  const [formularioVisible, setFormularioVisible] =
    useState(false);

  const [
    entrenamientoEditandoId,
    setEntrenamientoEditandoId,
  ] = useState<string | null>(null);

  const [formulario, setFormulario] =
    useState<EstadoFormulario>(() =>
      crearFormularioNuevo([]),
    );

  const [errores, setErrores] = useState<
    Record<string, string>
  >({});

  const [errorGeneral, setErrorGeneral] =
    useState<string | null>(null);

  const [mensajeCorrecto, setMensajeCorrecto] =
    useState<string | null>(null);

  const [guardando, setGuardando] =
    useState(false);

  const [
    entrenamientoPendienteEliminar,
    setEntrenamientoPendienteEliminar,
  ] = useState<string | null>(null);

  const [
    entrenamientoEliminando,
    setEntrenamientoEliminando,
  ] = useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();

    const cargarEntrenamientos = async () => {
      try {
        setCargando(true);
        setErrorCarga(null);

        const respuesta = await fetch(
          `/api/panel/equipos/${encodeURIComponent(equipoId)}/entrenamientos`,
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
          (await respuesta.json()) as RespuestaCarga;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data?.entrenamientos
        ) {
          throw new Error(
            contenido.error ??
              "No se han podido cargar los entrenamientos.",
          );
        }

        const entrenamientos =
          contenido.data.entrenamientos;

        setDatos({
          ...entrenamientos,
          habituales: ordenarEntrenamientos(
            entrenamientos.habituales,
          ),
        });
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Error cargando los entrenamientos:",
          error,
        );

        setErrorCarga(
          error instanceof Error
            ? error.message
            : "No se han podido cargar los entrenamientos.",
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    };

    void cargarEntrenamientos();

    return () => controlador.abort();
  }, [equipoId, intentoCarga]);

  const instalacionesFormulario = useMemo(() => {
    if (!datos) {
      return [];
    }

    return datos.instalaciones.filter(
      (instalacion) =>
        instalacion.activa ||
        instalacion.id ===
          formulario.instalacionId,
    );
  }, [datos, formulario.instalacionId]);

  const hayInstalacionesActivas = useMemo(
    () =>
      Boolean(
        datos?.instalaciones.some(
          (instalacion) => instalacion.activa,
        ),
      ),
    [datos],
  );

  const actualizarCampo = <
    Campo extends keyof EstadoFormulario,
  >(
    campo: Campo,
    valor: EstadoFormulario[Campo],
  ) => {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }));

    setErrores((erroresActuales) => {
      if (!erroresActuales[campo]) {
        return erroresActuales;
      }

      const siguientesErrores = {
        ...erroresActuales,
      };

      delete siguientesErrores[campo];

      return siguientesErrores;
    });

    setErrorGeneral(null);
    setMensajeCorrecto(null);
  };

  const abrirFormularioCreacion = () => {
    if (!datos) {
      return;
    }

    setEntrenamientoEditandoId(null);

    setFormulario(
      crearFormularioNuevo(
        datos.instalaciones,
      ),
    );

    setErrores({});
    setErrorGeneral(null);
    setMensajeCorrecto(null);
    setFormularioVisible(true);
  };

  const abrirFormularioEdicion = (
    entrenamiento: EntrenamientoHabitualEquipoPanel,
  ) => {
    setEntrenamientoEditandoId(
      entrenamiento.id,
    );

    setFormulario(
      crearFormularioEdicion(entrenamiento),
    );

    setErrores({});
    setErrorGeneral(null);
    setMensajeCorrecto(null);
    setFormularioVisible(true);
  };

  const cerrarFormulario = () => {
    setFormularioVisible(false);
    setEntrenamientoEditandoId(null);
    setErrores({});
    setErrorGeneral(null);
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<
      string,
      string
    > = {};

    if (!formulario.instalacionId) {
      nuevosErrores.instalacionId =
        "Selecciona una instalación.";
    }

    if (
      formulario.diaSemana < 1 ||
      formulario.diaSemana > 7
    ) {
      nuevosErrores.diaSemana =
        "Selecciona un día válido.";
    }

    if (!formulario.horaInicio) {
      nuevosErrores.horaInicio =
        "Introduce la hora de inicio.";
    }

    if (!formulario.horaFin) {
      nuevosErrores.horaFin =
        "Introduce la hora de finalización.";
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

    if (
      formulario.fechaInicio &&
      formulario.fechaFin &&
      formulario.fechaFin <
        formulario.fechaInicio
    ) {
      nuevosErrores.fechaFin =
        "La fecha final no puede ser anterior a la inicial.";
    }

    if (
      formulario.observaciones.length >
      1000
    ) {
      nuevosErrores.observaciones =
        "Las observaciones no pueden superar los 1000 caracteres.";
    }

    setErrores(nuevosErrores);

    return (
      Object.keys(nuevosErrores).length === 0
    );
  };

  const guardarEntrenamiento = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    if (
      guardando ||
      !validarFormulario()
    ) {
      return;
    }

    const editando =
      entrenamientoEditandoId !== null;

    const url = editando
      ? `/api/panel/equipos/${encodeURIComponent(equipoId)}/entrenamientos/${encodeURIComponent(entrenamientoEditandoId)}`
      : `/api/panel/equipos/${encodeURIComponent(equipoId)}/entrenamientos`;

    try {
      setGuardando(true);
      setErrorGeneral(null);
      setMensajeCorrecto(null);

      const respuesta = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instalacionId:
            formulario.instalacionId,
          diaSemana: formulario.diaSemana,
          horaInicio: formulario.horaInicio,
          horaFin: formulario.horaFin,
          fechaInicio:
            formulario.fechaInicio || null,
          fechaFin:
            formulario.fechaFin || null,
          observaciones:
            formulario.observaciones || null,
          activo: formulario.activo,
        }),
      });

      const contenido =
        (await respuesta.json()) as RespuestaMutacion;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.entrenamiento
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
            "No se ha podido guardar el entrenamiento.",
        );
      }

      const entrenamientoGuardado =
        contenido.data.entrenamiento;

      setDatos((datosActuales) => {
        if (!datosActuales) {
          return datosActuales;
        }

        const siguientesEntrenamientos =
          editando
            ? datosActuales.habituales.map(
                (entrenamiento) =>
                  entrenamiento.id ===
                  entrenamientoGuardado.id
                    ? entrenamientoGuardado
                    : entrenamiento,
              )
            : [
                ...datosActuales.habituales,
                entrenamientoGuardado,
              ];

        return {
          ...datosActuales,
          habituales: ordenarEntrenamientos(
            siguientesEntrenamientos,
          ),
        };
      });

      setFormularioVisible(false);
      setEntrenamientoEditandoId(null);
      setErrores({});

      setMensajeCorrecto(
        editando
          ? "El entrenamiento se ha actualizado correctamente."
          : "El entrenamiento se ha creado correctamente.",
      );
    } catch (error) {
      console.error(
        "Error guardando el entrenamiento:",
        error,
      );

      setErrorGeneral(
        error instanceof Error
          ? error.message
          : "No se ha podido guardar el entrenamiento.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const eliminarEntrenamiento = async (
    entrenamientoId: string,
  ) => {
    if (entrenamientoEliminando) {
      return;
    }

    try {
      setEntrenamientoEliminando(
        entrenamientoId,
      );

      setErrorGeneral(null);
      setMensajeCorrecto(null);

      const respuesta = await fetch(
        `/api/panel/equipos/${encodeURIComponent(equipoId)}/entrenamientos/${encodeURIComponent(entrenamientoId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaEliminacion;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.entrenamientoId
      ) {
        throw new Error(
          contenido.error ??
            "No se ha podido eliminar el entrenamiento.",
        );
      }

      setDatos((datosActuales) => {
        if (!datosActuales) {
          return datosActuales;
        }

        return {
          ...datosActuales,
          habituales:
            datosActuales.habituales.filter(
              (entrenamiento) =>
                entrenamiento.id !==
                contenido.data
                  ?.entrenamientoId,
            ),
        };
      });

      if (
        entrenamientoEditandoId ===
        entrenamientoId
      ) {
        cerrarFormulario();
      }

      setEntrenamientoPendienteEliminar(null);

      setMensajeCorrecto(
        "El entrenamiento se ha eliminado correctamente.",
      );
    } catch (error) {
      console.error(
        "Error eliminando el entrenamiento:",
        error,
      );

      setErrorGeneral(
        error instanceof Error
          ? error.message
          : "No se ha podido eliminar el entrenamiento.",
      );
    } finally {
      setEntrenamientoEliminando(null);
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low">
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
          aria-hidden="true"
        />

        <span className="text-sm font-semibold text-on-surface-variant">
          Cargando horario habitual...
        </span>
      </div>
    );
  }

  if (errorCarga || !datos) {
    return (
      <div className="rounded-2xl border border-error/30 bg-error-container p-6 text-center text-on-error-container">
        <p className="font-bold">
          No se ha podido cargar el horario
        </p>

        <p className="mt-2 text-sm">
          {errorCarga ??
            "No se han recibido los datos del horario."}
        </p>

        <button
          type="button"
          onClick={() =>
            setIntentoCarga(
              (intentoActual) =>
                intentoActual + 1,
            )
          }
          className="mt-5 min-h-11 rounded-xl bg-error px-5 py-3 text-sm font-bold text-on-error"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      {errorGeneral && (
        <div
          className="mb-5 rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container"
          role="alert"
        >
          <p className="font-bold">
            No se ha podido completar la operación
          </p>

          <p className="mt-1">{errorGeneral}</p>
        </div>
      )}

      {mensajeCorrecto && (
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

          {mensajeCorrecto}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-on-surface">
            Horario semanal
          </h3>

          <p className="mt-1 text-sm text-on-surface-variant">
            {datos.habituales.length === 1
              ? "1 entrenamiento configurado"
              : `${datos.habituales.length} entrenamientos configurados`}
          </p>
        </div>

        <button
          type="button"
          onClick={abrirFormularioCreacion}
          disabled={!hayInstalacionesActivas}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-40"
        >
          Añadir entrenamiento
        </button>
      </div>

      {!hayInstalacionesActivas && (
        <div className="mt-4 rounded-xl border border-outline-variant/60 bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
          No hay instalaciones activas disponibles
          para crear entrenamientos.
        </div>
      )}

      {formularioVisible && (
        <form
          onSubmit={guardarEntrenamiento}
          className="mt-5 overflow-hidden rounded-2xl border border-primary/30 bg-primary-fixed/20"
          noValidate
        >
          <div className="flex items-center justify-between gap-3 border-b border-primary/20 px-4 py-4 sm:px-5">
            <div>
              <h4 className="font-bold text-on-surface">
                {entrenamientoEditandoId
                  ? "Editar entrenamiento"
                  : "Nuevo entrenamiento"}
              </h4>

              <p className="mt-0.5 text-xs text-on-surface-variant">
                Define el día, horario e instalación.
              </p>
            </div>

            <button
              type="button"
              onClick={cerrarFormulario}
              disabled={guardando}
              className="rounded-lg px-3 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-semibold text-on-surface">
                Instalación{" "}
                <span className="text-error">*</span>
              </span>

              <select
                value={formulario.instalacionId}
                onChange={(evento) =>
                  actualizarCampo(
                    "instalacionId",
                    evento.target.value,
                  )
                }
                disabled={guardando}
                className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none ${
                  errores.instalacionId
                    ? "border-error focus:ring-2 focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              >
                <option value="">
                  Seleccionar instalación
                </option>

                {instalacionesFormulario.map(
                  (instalacion) => (
                    <option
                      key={instalacion.id}
                      value={instalacion.id}
                    >
                      {instalacion.nombre}
                      {!instalacion.activa
                        ? " (inactiva)"
                        : ""}
                    </option>
                  ),
                )}
              </select>

              {errores.instalacionId && (
                <span className="text-xs font-medium text-error">
                  {errores.instalacionId}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Día{" "}
                <span className="text-error">*</span>
              </span>

              <select
                value={formulario.diaSemana}
                onChange={(evento) =>
                  actualizarCampo(
                    "diaSemana",
                    Number(
                      evento.target.value,
                    ) as DiaSemanaEntrenamiento,
                  )
                }
                disabled={guardando}
                className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {DIAS_SEMANA.map((dia) => (
                  <option
                    key={dia.valor}
                    value={dia.valor}
                  >
                    {dia.nombre}
                  </option>
                ))}
              </select>

              {errores.diaSemana && (
                <span className="text-xs font-medium text-error">
                  {errores.diaSemana}
                </span>
              )}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Inicio
                </span>

                <input
                  type="time"
                  value={formulario.horaInicio}
                  onChange={(evento) =>
                    actualizarCampo(
                      "horaInicio",
                      evento.target.value,
                    )
                  }
                  disabled={guardando}
                  className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none ${
                    errores.horaInicio
                      ? "border-error"
                      : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />

                {errores.horaInicio && (
                  <span className="text-xs font-medium text-error">
                    {errores.horaInicio}
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-on-surface">
                  Fin
                </span>

                <input
                  type="time"
                  value={formulario.horaFin}
                  onChange={(evento) =>
                    actualizarCampo(
                      "horaFin",
                      evento.target.value,
                    )
                  }
                  disabled={guardando}
                  className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none ${
                    errores.horaFin
                      ? "border-error"
                      : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />

                {errores.horaFin && (
                  <span className="text-xs font-medium text-error">
                    {errores.horaFin}
                  </span>
                )}
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Fecha de inicio
              </span>

              <input
                type="date"
                value={formulario.fechaInicio}
                onChange={(evento) =>
                  actualizarCampo(
                    "fechaInicio",
                    evento.target.value,
                  )
                }
                disabled={guardando}
                className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Fecha de finalización
              </span>

              <input
                type="date"
                value={formulario.fechaFin}
                onChange={(evento) =>
                  actualizarCampo(
                    "fechaFin",
                    evento.target.value,
                  )
                }
                disabled={guardando}
                className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none ${
                  errores.fechaFin
                    ? "border-error"
                    : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />

              {errores.fechaFin && (
                <span className="text-xs font-medium text-error">
                  {errores.fechaFin}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-semibold text-on-surface">
                Observaciones
              </span>

              <textarea
                value={formulario.observaciones}
                onChange={(evento) =>
                  actualizarCampo(
                    "observaciones",
                    evento.target.value,
                  )
                }
                disabled={guardando}
                maxLength={1000}
                rows={3}
                className={`resize-y rounded-xl border bg-surface-container-lowest px-3 py-3 text-on-surface outline-none ${
                  errores.observaciones
                    ? "border-error"
                    : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />

              <span className="text-right text-xs text-on-surface-variant">
                {formulario.observaciones.length}
                /1000
              </span>

              {errores.observaciones && (
                <span className="text-xs font-medium text-error">
                  {errores.observaciones}
                </span>
              )}
            </label>

            <div className="sm:col-span-2">
              <span className="text-sm font-semibold text-on-surface">
                Estado
              </span>

              <div className="mt-1.5 grid h-11 max-w-sm grid-cols-2 rounded-xl border border-outline-variant bg-surface-container p-1">
                <button
                  type="button"
                  onClick={() =>
                    actualizarCampo(
                      "activo",
                      true,
                    )
                  }
                  disabled={guardando}
                  className={`rounded-lg text-sm font-bold ${
                    formulario.activo
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant"
                  }`}
                >
                  Activo
                </button>

                <button
                  type="button"
                  onClick={() =>
                    actualizarCampo(
                      "activo",
                      false,
                    )
                  }
                  disabled={guardando}
                  className={`rounded-lg text-sm font-bold ${
                    !formulario.activo
                      ? "bg-on-surface text-surface shadow-sm"
                      : "text-on-surface-variant"
                  }`}
                >
                  Inactivo
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-primary/20 px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
            <button
              type="button"
              onClick={cerrarFormulario}
              disabled={guardando}
              className="min-h-11 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant disabled:opacity-40"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:opacity-40"
            >
              {guardando && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary"
                  aria-hidden="true"
                />
              )}

              {guardando
                ? "Guardando..."
                : entrenamientoEditandoId
                  ? "Guardar cambios"
                  : "Crear entrenamiento"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 grid gap-3">
        {datos.habituales.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-7 text-center">
            <p className="font-bold text-on-surface">
              No hay entrenamientos configurados
            </p>

            <p className="mt-1 text-sm text-on-surface-variant">
              Añade el primer entrenamiento del
              horario habitual.
            </p>
          </div>
        ) : (
          datos.habituales.map(
            (entrenamiento) => (
              <article
                key={entrenamiento.id}
                className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-28 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-fixed px-4 py-3 text-center text-on-primary-fixed">
                    <span className="text-sm font-bold">
                      {obtenerNombreDia(
                        entrenamiento.diaSemana,
                      )}
                    </span>

                    <span className="mt-1 text-lg font-black">
                      {entrenamiento.horaInicio}
                      {" – "}
                      {entrenamiento.horaFin}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate font-bold text-on-surface">
                        {entrenamiento.instalacion
                          ?.nombre ??
                          "Instalación no disponible"}
                      </h4>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          entrenamiento.activo
                            ? "bg-success-container text-on-success-container"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {entrenamiento.activo
                          ? "Activo"
                          : "Inactivo"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-on-surface-variant">
                      {describirInstalacion(
                        entrenamiento.instalacion,
                      )}
                    </p>

                    {(entrenamiento.fechaInicio ||
                      entrenamiento.fechaFin) && (
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Vigencia:{" "}
                        {entrenamiento.fechaInicio ??
                          "sin fecha inicial"}
                        {" – "}
                        {entrenamiento.fechaFin ??
                          "sin fecha final"}
                      </p>
                    )}

                    {entrenamiento.observaciones && (
                      <p className="mt-2 text-sm text-on-surface">
                        {
                          entrenamiento.observaciones
                        }
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        abrirFormularioEdicion(
                          entrenamiento,
                        )
                      }
                      disabled={
                        Boolean(
                          entrenamientoEliminando,
                        ) || guardando
                      }
                      className="min-h-10 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40"
                    >
                      Editar
                    </button>

                    {entrenamientoPendienteEliminar ===
                    entrenamiento.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setEntrenamientoPendienteEliminar(
                              null,
                            )
                          }
                          disabled={
                            entrenamientoEliminando ===
                            entrenamiento.id
                          }
                          className="min-h-10 rounded-xl border border-outline-variant px-3 py-2 text-sm font-bold text-on-surface-variant"
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void eliminarEntrenamiento(
                              entrenamiento.id,
                            )
                          }
                          disabled={
                            entrenamientoEliminando ===
                            entrenamiento.id
                          }
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-error px-4 py-2 text-sm font-bold text-on-error disabled:opacity-40"
                        >
                          {entrenamientoEliminando ===
                            entrenamiento.id &&
                            "Eliminando..."}

                          {entrenamientoEliminando !==
                            entrenamiento.id &&
                            "Confirmar"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setEntrenamientoPendienteEliminar(
                            entrenamiento.id,
                          )
                        }
                        disabled={
                          Boolean(
                            entrenamientoEliminando,
                          ) || guardando
                        }
                        className="min-h-10 rounded-xl border border-error/40 px-4 py-2 text-sm font-bold text-error hover:bg-error-container disabled:opacity-40"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ),
          )
        )}
      </div>
    </div>
  );
}