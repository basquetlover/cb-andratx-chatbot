import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  CarnetTemporadaSocio,
  EstadoCarnetSocio,
  SocioPanel,
} from "@tipos/SocioPanel";

interface Propiedades {
  socioId: string;

  carnet:
    CarnetTemporadaSocio;

  tiposSocio: string[];
  puedeEditar: boolean;

  alActualizar: (
    socio: SocioPanel,
  ) => void;
}

interface RespuestaActualizarCarnet {
  ok: boolean;

  data: {
    socio: SocioPanel;
  } | null;

  error: string | null;
}

const estadosCarnet: Array<{
  valor: EstadoCarnetSocio;
  nombre: string;
  descripcion: string;
}> = [
  {
    valor: "pendiente",
    nombre: "Pendiente",
    descripcion:
      "El carnet todavía no permite acceder.",
  },
  {
    valor: "activo",
    nombre: "Activo",
    descripcion:
      "El socio puede iniciar sesión y consultar su carnet.",
  },
  {
    valor: "bloqueado",
    nombre: "Bloqueado",
    descripcion:
      "El acceso de este carnet queda bloqueado hasta que vuelva a activarse.",
  },
  {
    valor: "caducado",
    nombre: "Caducado",
    descripcion:
      "El carnet ya no es válido para acceder.",
  },
];

function obtenerNombreTemporada(
  carnet:
    CarnetTemporadaSocio,
): string {
  return (
    carnet.temporada.nombre
      .trim() ||
    "Temporada"
  );
}

function formatearFecha(
  fecha: string | null,
): string {
  if (!fecha) {
    return "No indicada";
  }

  const fechaConvertida =
    new Date(
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
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone:
        "Europe/Madrid",
    },
  ).format(
    fechaConvertida,
  );
}

function formatearFechaHora(
  fecha: string | null,
): string {
  if (!fecha) {
    return "No disponible";
  }

  const fechaConvertida =
    new Date(fecha);

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
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Europe/Madrid",
    },
  ).format(
    fechaConvertida,
  );
}

function obtenerClasesEstado(
  estado:
    EstadoCarnetSocio,
): string {
  switch (estado) {
    case "activo":
      return "border-success/30 bg-success-container text-on-success-container";

    case "bloqueado":
      return "border-error/30 bg-error-container text-on-error-container";

    case "caducado":
      return "border-outline-variant bg-surface-container-high text-on-surface-variant";

    case "pendiente":
    default:
      return "border-tertiary/30 bg-tertiary-container text-on-tertiary-container";
  }
}

function obtenerNombreEstado(
  estado:
    EstadoCarnetSocio,
): string {
  return (
    estadosCarnet.find(
      (opcion) =>
        opcion.valor ===
        estado,
    )?.nombre ?? estado
  );
}

function esEstadoCarnet(
  valor: string,
): valor is EstadoCarnetSocio {
  return estadosCarnet.some(
    (estado) =>
      estado.valor ===
      valor,
  );
}

export default function TarjetaCarnetSocioPanel({
  socioId,
  carnet,
  tiposSocio,
  puedeEditar,
  alActualizar,
}: Propiedades) {
  const [
    editando,
    setEditando,
  ] = useState(false);

  const [
    tipoSocio,
    setTipoSocio,
  ] = useState(
    carnet.tipoSocio
      ?.trim() ||
      "General",
  );

  const [
    estado,
    setEstado,
  ] =
    useState<EstadoCarnetSocio>(
      carnet.estado,
    );

  const [
    fechaAlta,
    setFechaAlta,
  ] = useState(
    carnet.fechaAlta,
  );

  const [
    fechaCaducidad,
    setFechaCaducidad,
  ] = useState(
    carnet.fechaCaducidad,
  );

  const [
    motivoBloqueo,
    setMotivoBloqueo,
  ] = useState(
    carnet.motivoBloqueo ??
      "",
  );

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    mensaje,
    setMensaje,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    setTipoSocio(
      carnet.tipoSocio
        ?.trim() ||
        "General",
    );

    setEstado(
      carnet.estado,
    );

    setFechaAlta(
      carnet.fechaAlta,
    );

    setFechaCaducidad(
      carnet.fechaCaducidad,
    );

    setMotivoBloqueo(
      carnet.motivoBloqueo ??
        "",
    );

    setError(null);
    setMensaje(null);
    setEditando(false);
  }, [carnet]);

  const opcionesTipoSocio =
    useMemo(() => {
      const opciones =
        new Set<string>();

      opciones.add(
        "General",
      );

      tiposSocio.forEach(
        (tipo) => {
          const tipoLimpio =
            tipo.trim();

          if (tipoLimpio) {
            opciones.add(
              tipoLimpio,
            );
          }
        },
      );

      const tipoActual =
        carnet.tipoSocio
          ?.trim();

      if (tipoActual) {
        opciones.add(
          tipoActual,
        );
      }

      return Array.from(
        opciones,
      ).sort(
        (
          tipoA,
          tipoB,
        ) =>
          tipoA.localeCompare(
            tipoB,
            "es",
          ),
      );
    }, [
      tiposSocio,
      carnet.tipoSocio,
    ]);

  const estadoSeleccionado =
    estadosCarnet.find(
      (opcion) =>
        opcion.valor ===
        estado,
    );

  const hayCambios =
    tipoSocio.trim() !==
      (
        carnet.tipoSocio
          ?.trim() ||
        "General"
      ) ||
    estado !==
      carnet.estado ||
    fechaAlta !==
      carnet.fechaAlta ||
    fechaCaducidad !==
      carnet.fechaCaducidad ||
    motivoBloqueo.trim() !==
      (
        carnet.motivoBloqueo
          ?.trim() ??
        ""
      );

  function restablecerFormulario() {
    setTipoSocio(
      carnet.tipoSocio
        ?.trim() ||
        "General",
    );

    setEstado(
      carnet.estado,
    );

    setFechaAlta(
      carnet.fechaAlta,
    );

    setFechaCaducidad(
      carnet.fechaCaducidad,
    );

    setMotivoBloqueo(
      carnet.motivoBloqueo ??
        "",
    );

    setError(null);
  }

  function cancelarEdicion() {
    restablecerFormulario();
    setMensaje(null);
    setEditando(false);
  }

  async function guardarCambios() {
    if (
      !puedeEditar ||
      guardando ||
      !hayCambios
    ) {
      return;
    }

    if (
      !fechaAlta ||
      !fechaCaducidad
    ) {
      setError(
        "Debes indicar las fechas de alta y caducidad.",
      );

      return;
    }

    if (
      fechaCaducidad <
      fechaAlta
    ) {
      setError(
        "La fecha de caducidad no puede ser anterior a la fecha de alta.",
      );

      return;
    }

    if (
      estado ===
        "bloqueado" &&
      !motivoBloqueo.trim()
    ) {
      setError(
        "Debes indicar el motivo del bloqueo.",
      );

      return;
    }

    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const respuesta =
        await fetch(
          `/api/panel/socios/${encodeURIComponent(
            socioId,
          )}/carnets/${encodeURIComponent(
            carnet.id,
          )}`,
          {
            method: "PATCH",

            credentials:
              "same-origin",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                tipoSocio:
                  tipoSocio.trim() ||
                  "General",

                estado,

                fechaAlta,

                fechaCaducidad,

                motivoBloqueo:
                  estado ===
                  "bloqueado"
                    ? motivoBloqueo.trim() ||
                      null
                    : null,
              }),
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaActualizarCarnet;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
          ?.socio
      ) {
        throw new Error(
          contenido.error ??
            "No se ha podido actualizar el carnet.",
        );
      }

      alActualizar(
        contenido.data.socio,
      );

      setMensaje(
        "El carnet se ha actualizado correctamente.",
      );

      setEditando(false);
    } catch (error) {
      console.error(
        "Error actualizando el carnet del socio:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se ha podido actualizar el carnet.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <header className="flex flex-col gap-4 border-b border-outline-variant/60 bg-surface-container-low px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-on-surface">
              {obtenerNombreTemporada(
                carnet,
              )}
            </h3>

            {carnet.temporada
              .activa && (
              <span className="inline-flex rounded-full border border-primary/30 bg-primary-container px-2.5 py-1 text-xs font-bold text-on-primary-container">
                Temporada activa
              </span>
            )}

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${obtenerClasesEstado(
                carnet.estado,
              )}`}
            >
              {obtenerNombreEstado(
                carnet.estado,
              )}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="font-mono text-xl font-black tracking-wide text-primary">
              {
                carnet.numeroCarnet
              }
            </p>

            <span className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-xs font-bold text-on-surface-variant">
              Socio nº{" "}
              {
                carnet.numeroSocio
              }
            </span>
          </div>

          <p className="mt-2 text-sm text-on-surface-variant">
            {carnet.tipoSocio
              ?.trim() ||
              "General"}
          </p>
        </div>

        {puedeEditar &&
          !editando && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMensaje(null);
                setEditando(true);
              }}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary"
            >
              <span
                className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/editar.svg')",

                  WebkitMaskImage:
                    "url('/iconos/panel/editar.svg')",
                }}
                aria-hidden="true"
              />

              Editar carnet
            </button>
          )}
      </header>

      {mensaje && (
        <div
          className="mx-5 mt-5 rounded-xl border border-success/30 bg-success-container px-4 py-3 text-sm text-on-success-container sm:mx-6"
          role="status"
        >
          {mensaje}
        </div>
      )}

      {error && (
        <div
          className="mx-5 mt-5 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container sm:mx-6"
          role="alert"
        >
          {error}
        </div>
      )}

      {editando ? (
        <div className="grid gap-5 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Tipo de socio
              </span>

              <select
                value={
                  tipoSocio
                }
                onChange={(evento) =>
                  setTipoSocio(
                    evento.target.value,
                  )
                }
                disabled={
                  guardando
                }
                className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {opcionesTipoSocio.map(
                  (tipo) => (
                    <option
                      key={tipo}
                      value={tipo}
                    >
                      {tipo}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Estado del carnet
              </span>

              <select
                value={estado}
                onChange={(evento) => {
                  const nuevoEstado =
                    evento.target
                      .value;

                  if (
                    esEstadoCarnet(
                      nuevoEstado,
                    )
                  ) {
                    setEstado(
                      nuevoEstado,
                    );
                  }
                }}
                disabled={
                  guardando
                }
                className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {estadosCarnet.map(
                  (opcion) => (
                    <option
                      key={
                        opcion.valor
                      }
                      value={
                        opcion.valor
                      }
                    >
                      {
                        opcion.nombre
                      }
                    </option>
                  ),
                )}
              </select>

              {estadoSeleccionado && (
                <span className="text-xs leading-5 text-on-surface-variant">
                  {
                    estadoSeleccionado
                      .descripcion
                  }
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Fecha de alta
              </span>

              <input
                type="date"
                value={
                  fechaAlta
                }
                onChange={(evento) =>
                  setFechaAlta(
                    evento.target.value,
                  )
                }
                min={
                  carnet.temporada
                    .fechaInicio
                }
                max={
                  carnet.temporada
                    .fechaFin
                }
                disabled={
                  guardando
                }
                required
                className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Fecha de caducidad
              </span>

              <input
                type="date"
                value={
                  fechaCaducidad
                }
                onChange={(evento) =>
                  setFechaCaducidad(
                    evento.target.value,
                  )
                }
                min={
                  fechaAlta ||
                  carnet.temporada
                    .fechaInicio
                }
                max={
                  carnet.temporada
                    .fechaFin
                }
                disabled={
                  guardando
                }
                required
                className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>

          {estado ===
            "bloqueado" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Motivo del bloqueo
              </span>

              <textarea
                value={
                  motivoBloqueo
                }
                onChange={(evento) =>
                  setMotivoBloqueo(
                    evento.target.value,
                  )
                }
                disabled={
                  guardando
                }
                required
                rows={3}
                maxLength={500}
                placeholder="Indica por qué se ha bloqueado este carnet"
                className="resize-y rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          )}

          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3">
            <p className="text-xs leading-5 text-on-surface-variant">
              El número de socio y el número de carnet no pueden modificarse después de crear el carnet. Al cambiar su estado se invalidarán los accesos anteriores de esta temporada. La contraseña permanente no cambiará.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={
                cancelarEdicion
              }
              disabled={
                guardando
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={
                guardarCambios
              }
              disabled={
                guardando ||
                !hayCambios
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"
                  aria-hidden="true"
                />
              )}

              {guardando
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Número de socio
            </p>

            <p className="mt-1 text-sm font-bold text-on-surface">
              {
                carnet.numeroSocio
              }
            </p>
          </div>

          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Fecha de alta
            </p>

            <p className="mt-1 text-sm font-bold text-on-surface">
              {formatearFecha(
                carnet.fechaAlta,
              )}
            </p>
          </div>

          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Fecha de caducidad
            </p>

            <p className="mt-1 text-sm font-bold text-on-surface">
              {formatearFecha(
                carnet.fechaCaducidad,
              )}
            </p>
          </div>

          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Versión de acceso
            </p>

            <p className="mt-1 text-sm font-bold text-on-surface">
              {
                carnet.versionAcceso
              }
            </p>
          </div>

          <div className="rounded-xl bg-surface-container-low p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Activado
            </p>

            <p className="mt-1 text-sm font-bold text-on-surface">
              {formatearFechaHora(
                carnet.activadoAt,
              )}
            </p>
          </div>

          <div className="roundedrounded-xl bg-surface-container-low p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Última actualización
            </p>

            <p className="mt-1 text-sm font-bold text-on-surface">
              {formatearFechaHora(
                carnet.updatedAt,
              )}
            </p>
          </div>

          {carnet.estado ===
            "bloqueado" && (
            <div className="rounded-xl border border-error/30 bg-error-container p-4 text-on-error-container sm:col-span-2 lg:col-span-4">
              <p className="text-xs font-bold uppercase tracking-wide">
                Motivo del bloqueo
              </p>

              <p className="mt-1 text-sm">
                {carnet.motivoBloqueo
                  ?.trim() ||
                  "No se ha indicado ningún motivo."}
              </p>

              <p className="mt-2 text-xs opacity-80">
                Bloqueado el{" "}
                {formatearFechaHora(
                  carnet.bloqueadoAt,
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}