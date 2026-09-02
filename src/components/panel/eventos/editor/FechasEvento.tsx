import {
  useMemo,
} from "react";

interface ErroresFechasEvento {
  fechaInicio?: string;
  fechaFin?: string;
  horaInicio?: string;
  horaFin?: string;
  todoElDia?: string;
}

interface Propiedades {
  fechaInicio: string;
  fechaFin: string;

  horaInicio: string;
  horaFin: string;

  todoElDia: boolean;

  alCambiarFechaInicio: (
    fecha: string,
  ) => void;

  alCambiarFechaFin: (
    fecha: string,
  ) => void;

  alCambiarHoraInicio: (
    hora: string,
  ) => void;

  alCambiarHoraFin: (
    hora: string,
  ) => void;

  alCambiarTodoElDia: (
    todoElDia: boolean,
  ) => void;

  errores?: ErroresFechasEvento;
  deshabilitado?: boolean;
}

function convertirFecha(
  fecha: string,
): Date | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      fecha,
    )
  ) {
    return null;
  }

  const [
    anio,
    mes,
    dia,
  ] = fecha
    .split("-")
    .map(Number);

  const resultado =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia,
      ),
    );

  if (
    resultado.getUTCFullYear() !==
      anio ||
    resultado.getUTCMonth() !==
      mes - 1 ||
    resultado.getUTCDate() !== dia
  ) {
    return null;
  }

  return resultado;
}

function calcularDias(
  fechaInicio: string,
  fechaFin: string,
): number | null {
  const inicio =
    convertirFecha(fechaInicio);

  const fin =
    convertirFecha(fechaFin);

  if (!inicio || !fin) {
    return null;
  }

  const diferencia =
    fin.getTime() -
    inicio.getTime();

  if (diferencia < 0) {
    return null;
  }

  return (
    Math.floor(
      diferencia /
        (24 * 60 * 60 * 1000),
    ) + 1
  );
}

function formatearFecha(
  fecha: string,
): string {
  const fechaConvertida =
    convertirFecha(fecha);

  if (!fechaConvertida) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(fechaConvertida);
}

export default function FechasEvento({
  fechaInicio,
  fechaFin,
  horaInicio,
  horaFin,
  todoElDia,
  alCambiarFechaInicio,
  alCambiarFechaFin,
  alCambiarHoraInicio,
  alCambiarHoraFin,
  alCambiarTodoElDia,
  errores = {},
  deshabilitado = false,
}: Propiedades) {
  const totalDias = useMemo(
    () =>
      calcularDias(
        fechaInicio,
        fechaFin,
      ),
    [
      fechaInicio,
      fechaFin,
    ],
  );

  const descripcionPeriodo =
    useMemo(() => {
      if (
        !fechaInicio ||
        !fechaFin ||
        totalDias === null
      ) {
        return null;
      }

      if (totalDias === 1) {
        return `Evento de un día: ${formatearFecha(
          fechaInicio,
        )}.`;
      }

      return `El evento durará ${totalDias} días, desde el ${formatearFecha(
        fechaInicio,
      )} hasta el ${formatearFecha(
        fechaFin,
      )}.`;
    }, [
      fechaInicio,
      fechaFin,
      totalDias,
    ]);

  const cambiarFechaInicio = (
    nuevaFecha: string,
  ) => {
    alCambiarFechaInicio(
      nuevaFecha,
    );

    if (
      nuevaFecha &&
      (
        !fechaFin ||
        fechaFin < nuevaFecha
      )
    ) {
      alCambiarFechaFin(
        nuevaFecha,
      );
    }
  };

  const cambiarTodoElDia = (
    activo: boolean,
  ) => {
    alCambiarTodoElDia(
      activo,
    );

    if (activo) {
      alCambiarHoraInicio("");
      alCambiarHoraFin("");
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Fechas y horarios
        </h2>

        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          El evento puede ocupar un solo
          día, varios días o una semana
          completa.
        </p>
      </div>

      <div className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Fecha de inicio
              <span
                className="ml-1 text-error"
                aria-hidden="true"
              >
                *
              </span>
            </span>

            <input
              type="date"
              value={fechaInicio}
              onChange={(evento) =>
                cambiarFechaInicio(
                  evento.target.value,
                )
              }
              disabled={deshabilitado}
              required
              max={
                fechaFin ||
                undefined
              }
              aria-invalid={
                Boolean(
                  errores.fechaInicio,
                )
              }
              className={`h-11 min-w-0 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                errores.fechaInicio
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant focus:border-primary focus:ring-primary/20"
              }`}
            />

            {errores.fechaInicio && (
              <span className="text-xs font-semibold text-error">
                {
                  errores.fechaInicio
                }
              </span>
            )}
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Fecha de finalización
              <span
                className="ml-1 text-error"
                aria-hidden="true"
              >
                *
              </span>
            </span>

            <input
              type="date"
              value={fechaFin}
              onChange={(evento) =>
                alCambiarFechaFin(
                  evento.target.value,
                )
              }
              disabled={deshabilitado}
              required
              min={
                fechaInicio ||
                undefined
              }
              aria-invalid={
                Boolean(
                  errores.fechaFin,
                )
              }
              className={`h-11 min-w-0 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                errores.fechaFin
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant focus:border-primary focus:ring-primary/20"
              }`}
            />

            {errores.fechaFin && (
              <span className="text-xs font-semibold text-error">
                {errores.fechaFin}
              </span>
            )}
          </label>
        </div>

        {descripcionPeriodo && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-container/30 px-4 py-3">
            <span
              className="mt-0.5 inline-block h-5 w-5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/calendario.svg')",

                WebkitMaskImage:
                  "url('/iconos/panel/calendario.svg')",
              }}
              aria-hidden="true"
            />

            <p className="text-sm leading-6 text-on-surface">
              {descripcionPeriodo}
            </p>
          </div>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={todoElDia}
          disabled={deshabilitado}
          onClick={() =>
            cambiarTodoElDia(
              !todoElDia,
            )
          }
          className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            todoElDia
              ? "border-primary/50 bg-primary-container/40"
              : "border-outline-variant/60 bg-surface-container-low"
          }`}
        >
          <span>
            <span className="block text-sm font-bold text-on-surface">
              Evento de todo el día
            </span>

            <span className="mt-0.5 block text-xs leading-5 text-on-surface-variant">
              Actívalo cuando el evento
              no tenga un horario
              concreto.
            </span>
          </span>

          <span
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              todoElDia
                ? "bg-primary"
                : "bg-outline-variant"
            }`}
            aria-hidden="true"
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                todoElDia
                  ? "translate-x-5"
                  : "translate-x-0"
              }`}
            />
          </span>
        </button>

        {!todoElDia && (
          <div className="grid gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:grid-cols-2 sm:p-5">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Hora de inicio
                <span
                  className="ml-1 text-error"
                  aria-hidden="true"
                >
                  *
                </span>
              </span>

              <input
                type="time"
                value={horaInicio}
                onChange={(evento) =>
                  alCambiarHoraInicio(
                    evento.target.value,
                  )
                }
                disabled={deshabilitado}
                required
                aria-invalid={
                  Boolean(
                    errores.horaInicio,
                  )
                }
                className={`h-11 min-w-0 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                  errores.horaInicio
                    ? "border-error focus:border-error focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-primary/20"
                }`}
              />

              {errores.horaInicio && (
                <span className="text-xs font-semibold text-error">
                  {
                    errores.horaInicio
                  }
                </span>
              )}
            </label>

            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-semibold text-on-surface">
                Hora de finalización
              </span>

              <input
                type="time"
                value={horaFin}
                onChange={(evento) =>
                  alCambiarHoraFin(
                    evento.target.value,
                  )
                }
                disabled={deshabilitado}
                min={
                  fechaInicio ===
                    fechaFin &&
                  horaInicio
                    ? horaInicio
                    : undefined
                }
                aria-invalid={
                  Boolean(
                    errores.horaFin,
                  )
                }
                className={`h-11 min-w-0 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                  errores.horaFin
                    ? "border-error focus:border-error focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-primary/20"
                }`}
              />

              <span
                className={`text-xs ${
                  errores.horaFin
                    ? "font-semibold text-error"
                    : "text-on-surface-variant"
                }`}
              >
                {errores.horaFin ??
                  "Puede dejarse vacía si todavía no se conoce."}
              </span>
            </label>
          </div>
        )}

        {errores.todoElDia && (
          <p
            className="text-sm font-semibold text-error"
            role="alert"
          >
            {errores.todoElDia}
          </p>
        )}

        <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3">
          <p className="text-xs leading-5 text-on-surface-variant">
            En los eventos de varios
            días, las fechas inicial y
            final se incluyen dentro del
            periodo. Por ejemplo, del
            lunes al domingo cuenta como
            siete días.
          </p>
        </div>
      </div>
    </section>
  );
}