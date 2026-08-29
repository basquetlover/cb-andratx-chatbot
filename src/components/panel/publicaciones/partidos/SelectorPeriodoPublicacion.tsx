import {
  useEffect,
  useMemo,
  useState,
} from "react";

interface PeriodoPublicacion {
  fechaInicio: string;
  fechaFin: string;
}

interface Propiedades {
  fechaInicio: string;
  fechaFin: string;

  alCambiar: (
    periodo: PeriodoPublicacion,
  ) => void;

  deshabilitado?: boolean;
}

type TipoPeriodo =
  | "esta-semana"
  | "proxima-semana"
  | "personalizado";

function obtenerFechaMadrid(): Date {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const obtenerParte = (
    tipo:
      Intl.DateTimeFormatPartTypes,
  ): number =>
    Number(
      partes.find(
        (parte) =>
          parte.type === tipo,
      )?.value ?? 0,
    );

  return new Date(
    Date.UTC(
      obtenerParte("year"),
      obtenerParte("month") - 1,
      obtenerParte("day"),
    ),
  );
}

function convertirFechaIso(
  fecha: Date,
): string {
  const anio =
    fecha.getUTCFullYear();

  const mes = String(
    fecha.getUTCMonth() + 1,
  ).padStart(2, "0");

  const dia = String(
    fecha.getUTCDate(),
  ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function sumarDias(
  fecha: Date,
  dias: number,
): Date {
  const resultado =
    new Date(fecha);

  resultado.setUTCDate(
    resultado.getUTCDate() +
      dias,
  );

  return resultado;
}

function obtenerInicioSemana(
  fecha: Date,
): Date {
  const diaSemana =
    fecha.getUTCDay();

  const diasDesdeLunes =
    diaSemana === 0
      ? 6
      : diaSemana - 1;

  return sumarDias(
    fecha,
    -diasDesdeLunes,
  );
}

function obtenerPeriodoSemanaActual():
  PeriodoPublicacion {
  const inicio =
    obtenerInicioSemana(
      obtenerFechaMadrid(),
    );

  return {
    fechaInicio:
      convertirFechaIso(inicio),

    fechaFin:
      convertirFechaIso(
        sumarDias(inicio, 6),
      ),
  };
}

function obtenerPeriodoProximaSemana():
  PeriodoPublicacion {
  const inicioSemanaActual =
    obtenerInicioSemana(
      obtenerFechaMadrid(),
    );

  const inicioProximaSemana =
    sumarDias(
      inicioSemanaActual,
      7,
    );

  return {
    fechaInicio:
      convertirFechaIso(
        inicioProximaSemana,
      ),

    fechaFin:
      convertirFechaIso(
        sumarDias(
          inicioProximaSemana,
          6,
        ),
      ),
  };
}

function formatearFecha(
  fecha: string,
): string {
  if (!fecha) {
    return "Sin definir";
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
    return "Fecha no válida";
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
  ).format(fechaConvertida);
}

function periodosIguales(
  primero:
    PeriodoPublicacion,
  segundo:
    PeriodoPublicacion,
): boolean {
  return (
    primero.fechaInicio ===
      segundo.fechaInicio &&
    primero.fechaFin ===
      segundo.fechaFin
  );
}

function detectarTipoPeriodo(
  fechaInicio: string,
  fechaFin: string,
): TipoPeriodo {
  const periodoRecibido = {
    fechaInicio,
    fechaFin,
  };

  if (
    periodosIguales(
      periodoRecibido,
      obtenerPeriodoSemanaActual(),
    )
  ) {
    return "esta-semana";
  }

  if (
    periodosIguales(
      periodoRecibido,
      obtenerPeriodoProximaSemana(),
    )
  ) {
    return "proxima-semana";
  }

  return "personalizado";
}

export default function SelectorPeriodoPublicacion({
  fechaInicio,
  fechaFin,
  alCambiar,
  deshabilitado = false,
}: Propiedades) {
  const [
    tipoPeriodo,
    setTipoPeriodo,
  ] = useState<TipoPeriodo>(() =>
    detectarTipoPeriodo(
      fechaInicio,
      fechaFin,
    ),
  );

  const [
    fechaInicioPersonalizada,
    setFechaInicioPersonalizada,
  ] = useState(fechaInicio);

  const [
    fechaFinPersonalizada,
    setFechaFinPersonalizada,
  ] = useState(fechaFin);

  useEffect(() => {
    setFechaInicioPersonalizada(
      fechaInicio,
    );

    setFechaFinPersonalizada(
      fechaFin,
    );

    /*
     * Si el usuario ya ha abierto el modo
     * personalizado, lo mantenemos abierto
     * aunque sus fechas coincidan con una
     * de las semanas predeterminadas.
     */
    setTipoPeriodo(
      (tipoActual) =>
        tipoActual ===
        "personalizado"
          ? "personalizado"
          : detectarTipoPeriodo(
              fechaInicio,
              fechaFin,
            ),
    );
  }, [fechaInicio, fechaFin]);

  const errorPeriodo =
    useMemo(() => {
      if (
        !fechaInicioPersonalizada ||
        !fechaFinPersonalizada
      ) {
        return null;
      }

      if (
        fechaFinPersonalizada <
        fechaInicioPersonalizada
      ) {
        return (
          "La fecha final no puede ser " +
          "anterior a la fecha inicial."
        );
      }

      return null;
    }, [
      fechaInicioPersonalizada,
      fechaFinPersonalizada,
    ]);

  const seleccionarPeriodo = (
    tipo: TipoPeriodo,
  ) => {
    if (deshabilitado) {
      return;
    }

    if (
      tipo === "personalizado"
    ) {
      setTipoPeriodo(
        "personalizado",
      );

      return;
    }

    const periodo =
      tipo === "esta-semana"
        ? obtenerPeriodoSemanaActual()
        : obtenerPeriodoProximaSemana();

    setTipoPeriodo(tipo);

    setFechaInicioPersonalizada(
      periodo.fechaInicio,
    );

    setFechaFinPersonalizada(
      periodo.fechaFin,
    );

    alCambiar(periodo);
  };

  const cambiarFechaInicio = (
    nuevaFecha: string,
  ) => {
    setTipoPeriodo(
      "personalizado",
    );

    setFechaInicioPersonalizada(
      nuevaFecha,
    );

    if (!nuevaFecha) {
      return;
    }

    const siguienteFinal =
      fechaFinPersonalizada &&
      fechaFinPersonalizada >=
        nuevaFecha
        ? fechaFinPersonalizada
        : nuevaFecha;

    setFechaFinPersonalizada(
      siguienteFinal,
    );

    alCambiar({
      fechaInicio: nuevaFecha,
      fechaFin: siguienteFinal,
    });
  };

  const cambiarFechaFin = (
    nuevaFecha: string,
  ) => {
    setTipoPeriodo(
      "personalizado",
    );

    setFechaFinPersonalizada(
      nuevaFecha,
    );

    if (
      !fechaInicioPersonalizada ||
      !nuevaFecha ||
      nuevaFecha <
        fechaInicioPersonalizada
    ) {
      return;
    }

    alCambiar({
      fechaInicio:
        fechaInicioPersonalizada,

      fechaFin:
        nuevaFecha,
    });
  };

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="font-bold text-on-surface">
          Periodo de los partidos
        </h2>

        <p className="mt-1 text-sm text-on-surface-variant">
          Selecciona una semana o define
          un periodo personalizado.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() =>
            seleccionarPeriodo(
              "esta-semana",
            )
          }
          disabled={deshabilitado}
          className={`min-h-11 rounded-xl border px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            tipoPeriodo ===
            "esta-semana"
              ? "border-primary bg-primary text-on-primary shadow-sm"
              : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary hover:text-primary"
          }`}
          aria-pressed={
            tipoPeriodo ===
            "esta-semana"
          }
        >
          Esta semana
        </button>

        <button
          type="button"
          onClick={() =>
            seleccionarPeriodo(
              "proxima-semana",
            )
          }
          disabled={deshabilitado}
          className={`min-h-11 rounded-xl border px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            tipoPeriodo ===
            "proxima-semana"
              ? "border-primary bg-primary text-on-primary shadow-sm"
              : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary hover:text-primary"
          }`}
          aria-pressed={
            tipoPeriodo ===
            "proxima-semana"
          }
        >
          Próxima semana
        </button>

        <button
          type="button"
          onClick={() =>
            seleccionarPeriodo(
              "personalizado",
            )
          }
          disabled={deshabilitado}
          className={`min-h-11 rounded-xl border px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            tipoPeriodo ===
            "personalizado"
              ? "border-primary bg-primary text-on-primary shadow-sm"
              : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-primary hover:text-primary"
          }`}
          aria-pressed={
            tipoPeriodo ===
            "personalizado"
          }
        >
          Fecha personalizada
        </button>
      </div>

      {tipoPeriodo ===
        "personalizado" && (
        <div className="mt-4 grid gap-4 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Fecha inicial
            </span>

            <input
              type="date"
              value={
                fechaInicioPersonalizada
              }
              onChange={(evento) =>
                cambiarFechaInicio(
                  evento.target.value,
                )
              }
              disabled={deshabilitado}
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Fecha final
            </span>

            <input
              type="date"
              value={
                fechaFinPersonalizada
              }
              min={
                fechaInicioPersonalizada ||
                undefined
              }
              onChange={(evento) =>
                cambiarFechaFin(
                  evento.target.value,
                )
              }
              disabled={deshabilitado}
              className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                errorPeriodo
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant focus:border-primary focus:ring-primary/20"
              }`}
            />
          </label>

          {errorPeriodo && (
            <p
              className="text-sm font-medium text-error sm:col-span-2"
              role="alert"
            >
              {errorPeriodo}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 rounded-xl bg-primary-fixed/40 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-on-primary-fixed-variant">
          Periodo seleccionado
        </p>

        <p className="mt-1 text-sm font-bold text-on-primary-fixed">
          {formatearFecha(
            fechaInicio,
          )}{" "}
          –{" "}
          {formatearFecha(
            fechaFin,
          )}
        </p>
      </div>
    </section>
  );
}