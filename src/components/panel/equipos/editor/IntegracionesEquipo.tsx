import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type { IntegracionesEquipoDetalle } from "@tipos/EquipoDetallePanel";

interface Propiedades {
  equipoId: string;
  datosIniciales: IntegracionesEquipoDetalle;
  alActualizar: (
    datos: IntegracionesEquipoDetalle,
  ) => void;
}

interface EstadoFormulario {
  chatbot: boolean;
  idEquipoFbib: string;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaActualizacion {
  ok: boolean;
  data: {
    integraciones: IntegracionesEquipoDetalle;
  } | null;
  error: string | null;
  errores: ErrorCampo[];
}

interface PropiedadesInterruptor {
  activo: boolean;
  alCambiar: (activo: boolean) => void;
  etiqueta: string;
  descripcion: string;
  deshabilitado?: boolean;
}

function Interruptor({
  activo,
  alCambiar,
  etiqueta,
  descripcion,
  deshabilitado = false,
}: PropiedadesInterruptor) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={deshabilitado}
      onClick={() => alCambiar(!activo)}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 ${
        activo
          ? "border-primary/40 bg-primary-fixed/50"
          : "border-outline-variant/60 bg-surface-container-low"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-on-surface">
          {etiqueta}
        </span>

        <span className="mt-0.5 block text-xs leading-4 text-on-surface-variant">
          {descripcion}
        </span>
      </span>

      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ease-out ${
          activo
            ? "bg-primary"
            : "bg-outline-variant"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
            activo
              ? "translate-x-5"
              : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function crearEstadoInicial(
  datos: IntegracionesEquipoDetalle,
): EstadoFormulario {
  return {
    chatbot: datos.chatbot,
    idEquipoFbib: datos.idEquipoFbib,
  };
}

function normalizarFormulario(
  formulario: EstadoFormulario,
): EstadoFormulario {
  return {
    chatbot: formulario.chatbot,
    idEquipoFbib:
      formulario.idEquipoFbib.trim(),
  };
}

export default function IntegracionesEquipo({
  equipoId,
  datosIniciales,
  alActualizar,
}: Propiedades) {
  const [formulario, setFormulario] =
    useState<EstadoFormulario>(() =>
      crearEstadoInicial(datosIniciales),
    );

  const [errores, setErrores] = useState<
    Record<string, string>
  >({});

  const [errorGeneral, setErrorGeneral] = useState<
    string | null
  >(null);

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
  }, [datosIniciales]);

  const datosModificados = useMemo(() => {
    const datosActuales =
      normalizarFormulario(formulario);

    const datosOriginales =
      normalizarFormulario({
        chatbot: datosIniciales.chatbot,
        idEquipoFbib:
          datosIniciales.idEquipoFbib,
      });

    return (
      JSON.stringify(datosActuales) !==
      JSON.stringify(datosOriginales)
    );
  }, [formulario, datosIniciales]);

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
    setGuardadoCorrectamente(false);
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> =
      {};

    if (
      formulario.idEquipoFbib.trim().length > 100
    ) {
      nuevosErrores.idEquipoFbib =
        "El identificador FBIB no puede superar los 100 caracteres.";
    }

    setErrores(nuevosErrores);

    return (
      Object.keys(nuevosErrores).length === 0
    );
  };

  const cancelarCambios = () => {
    setFormulario(
      crearEstadoInicial(datosIniciales),
    );

    setErrores({});
    setErrorGeneral(null);
    setGuardadoCorrectamente(false);
  };

  const guardarCambios = async (
    evento: FormEvent<HTMLFormElement>,
  ) => {
    evento.preventDefault();

    if (
      !datosModificados ||
      guardando ||
      !validarFormulario()
    ) {
      return;
    }

    try {
      setGuardando(true);
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
            seccion: "integraciones",
            datos: {
              chatbot: formulario.chatbot,
              idEquipoFbib:
                formulario.idEquipoFbib || null,
            },
          }),
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaActualizacion;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.integraciones
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
            "No se han podido guardar las integraciones.",
        );
      }

      const integracionesActualizadas =
        contenido.data.integraciones;

      alActualizar(integracionesActualizadas);

      setFormulario(
        crearEstadoInicial(
          integracionesActualizadas,
        ),
      );

      setErrores({});
      setGuardadoCorrectamente(true);
    } catch (error) {
      console.error(
        "Error actualizando las integraciones del equipo:",
        error,
      );

      setErrorGeneral(
        error instanceof Error
          ? error.message
          : "No se han podido guardar las integraciones.",
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
          Integraciones
        </h2>

        <p className="mt-1 text-sm text-on-surface-variant">
          Configura la conexión del equipo con la FBIB y
          el asistente virtual.
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

            Las integraciones se han actualizado
            correctamente.
          </div>
        )}

        <div className="grid gap-5">
          <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
                <span
                  className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat"
                  style={{
                    maskImage:
                      "url('/iconos/panel/integracion.svg')",
                    WebkitMaskImage:
                      "url('/iconos/panel/integracion.svg')",
                  }}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3 className="font-bold text-on-surface">
                  Federación
                </h3>

                <p className="mt-0.5 text-sm text-on-surface-variant">
                  Relaciona el equipo con su identificador
                  en la FBIB.
                </p>
              </div>
            </div>

            <label className="mt-5 flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                ID del equipo FBIB
              </span>

              <input
                type="text"
                value={formulario.idEquipoFbib}
                onChange={(evento) =>
                  actualizarCampo(
                    "idEquipoFbib",
                    evento.target.value,
                  )
                }
                disabled={guardando}
                maxLength={100}
                placeholder="Ej. 10486"
                autoComplete="off"
                className={`h-11 w-full rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors placeholder:text-outline disabled:cursor-not-allowed disabled:opacity-60 ${
                  errores.idEquipoFbib
                    ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                }`}
              />

              <span className="text-xs leading-5 text-on-surface-variant">
                Permite obtener partidos, resultados y
                clasificación correspondientes al equipo.
              </span>

              {errores.idEquipoFbib && (
                <span className="text-xs font-medium text-error">
                  {errores.idEquipoFbib}
                </span>
              )}
            </label>
          </section>

          <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary">
                <span
                  className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat"
                  style={{
                    maskImage:
                      "url('/iconos/panel/panel.svg')",
                    WebkitMaskImage:
                      "url('/iconos/panel/panel.svg')",
                  }}
                  aria-hidden="true"
                />
              </span>

              <div>
                <h3 className="font-bold text-on-surface">
                  Asistente virtual
                </h3>

                <p className="mt-0.5 text-sm text-on-surface-variant">
                  Decide si el equipo puede aparecer en
                  las consultas públicas.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Interruptor
                activo={formulario.chatbot}
                alCambiar={(activo) =>
                  actualizarCampo(
                    "chatbot",
                    activo,
                  )
                }
                etiqueta="Mostrar en el asistente"
                descripcion="El equipo estará disponible en las consultas de entrenamientos, partidos y clasificación."
                deshabilitado={guardando}
              />
            </div>
          </section>
        </div>
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
          disabled={!datosModificados || guardando}
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