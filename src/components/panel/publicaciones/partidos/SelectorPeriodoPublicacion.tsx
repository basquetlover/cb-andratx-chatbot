interface Propiedades {
  fechaInicio: string;
  fechaFin: string;

  alCambiar: (
    fechaInicio: string,
    fechaFin: string,
  ) => void;

  deshabilitado?: boolean;
}

type TipoPeriodo =
  | "semana-actual"
  | "semana-siguiente"
  | "personalizado";

function obtenerFechaMadrid():
  Date {
  const partes =
    new Intl.DateTimeFormat(
      "es-ES",
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

function obtenerSemana(
  desplazamientoSemanas = 0,
): {
  inicio: string;
  fin: string;
} {
  const hoy =
    obtenerFechaMadrid();

  const diaSemana =
    hoy.getUTCDay();

  const diasDesdeLunes =
    diaSemana === 0
      ? 6
      : diaSemana - 1;

  const lunes =
    sumarDias(
      hoy,
      -diasDesdeLunes +
        desplazamientoSemanas *
          7,
    );

  const domingo =
    sumarDias(lunes, 6);

  return {
    inicio:
      convertirFechaIso(
        lunes,
      ),

    fin:
      convertirFechaIso(
        domingo,
      ),
  };
}

function formatearPeriodo(
  inicio: string,
  fin: string,
): string {
  if (!inicio || !fin) {
    return "Periodo pendiente";
  }

  const fechaInicio =
    new Date(
      `${inicio}T12:00:00`,
    );

  const fechaFin =
    new Date(
      `${fin}T12:00:00`,
    );

  const formateador =
    new Intl.DateTimeFormat(
      "es-ES",
      {
        day: "numeric",
        month: "long",
        timeZone:
          "Europe/Madrid",
      },
    );

  return `Del ${formateador.format(
    fechaInicio,
  )} al ${formateador.format(
    fechaFin,
  )}`;
}

export default function SelectorPeriodoPublicacion({
  fechaInicio,
  fechaFin,
  alCambiar,
  deshabilitado = false,
}: Propiedades) {
  const semanaActual =
    obtenerSemana(0);

  const semanaSiguiente =
    obtenerSemana(1);

  let tipoSeleccionado:
    TipoPeriodo =
      "personalizado";

  if (
    fechaInicio ===
      semanaActual.inicio &&
    fechaFin ===
      semanaActual.fin
  ) {
    tipoSeleccionado =
      "semana-actual";
  }

  if (
    fechaInicio ===
      semanaSiguiente.inicio &&
    fechaFin ===
      semanaSiguiente.fin
  ) {
    tipoSeleccionado =
      "semana-siguiente";
  }

  const seleccionarPeriodo = (
    tipo: TipoPeriodo,
  ) => {
    if (
      tipo ===
      "semana-actual"
    ) {
      alCambiar(
        semanaActual.inicio,
        semanaActual.fin,
      );

      return;
    }

    if (
      tipo ===
      "semana-siguiente"
    ) {
      alCambiar(
        semanaSiguiente.inicio,
        semanaSiguiente.fin,
      );
    }
  };

  const cambiarFechaInicio = (
    nuevaFecha: string,
  ) => {
    if (
      fechaFin &&
      nuevaFecha > fechaFin
    ) {
      alCambiar(
        nuevaFecha,
        nuevaFecha,
      );

      return;
    }

    alCambiar(
      nuevaFecha,
      fechaFin,
    );
  };

  const cambiarFechaFin = (
    nuevaFecha: string,
  ) => {
    if (
      fechaInicio &&
      nuevaFecha < fechaInicio
    ) {
      alCambiar(
        nuevaFecha,
        nuevaFecha,
      );

      return;
    }

    alCambiar(
      fechaInicio,
      nuevaFecha,
    );
  };

  return (
    <fieldset
      className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5"
      disabled={deshabilitado}
    >
      <legend className="px-1 text-sm font-bold text-on-surface">
        Periodo de partidos
      </legend>

      <p className="mt-1 text-xs leading-5 text-on-surface-variant">
        Selecciona las fechas que se
        utilizarán para consultar los partidos
        en la FBIB.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() =>
            seleccionarPeriodo(
              "semana-actual",
            )
          }
          disabled={deshabilitado}
          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
            tipoSeleccionado ===
            "semana-actual"
              ? "border-primary bg-primary-fixed/60 text-on-primary-fixed"
              : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/60"
          }`}
        >
          <span className="block text-sm font-bold">
            Esta semana
          </span>

          <span className="mt-1 block text-xs opacity-75">
            {formatearPeriodo(
              semanaActual.inicio,
              semanaActual.fin,
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            seleccionarPeriodo(
              "semana-siguiente",
            )
          }
          disabled={deshabilitado}
          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
            tipoSeleccionado ===
            "semana-siguiente"
              ? "border-primary bg-primary-fixed/60 text-on-primary-fixed"
              : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/60"
          }`}
        >
          <span className="block text-sm font-bold">
            Próxima semana
          </span>

          <span className="mt-1 block text-xs opacity-75">
            {formatearPeriodo(
              semanaSiguiente.inicio,
              semanaSiguiente.fin,
            )}
          </span>
        </button>

        <div
          className={`rounded-xl border px-4 py-3 ${
            tipoSeleccionado ===
            "personalizado"
              ? "border-primary bg-primary-fixed/60"
              : "border-outline-variant bg-surface-container-lowest"
          }`}
        >
          <span className="block text-sm font-bold text-on-surface">
            Personalizado
          </span>

          <span className="mt-1 block text-xs text-on-surface-variant">
            Elige las fechas manualmente.
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">
            Fecha inicial
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
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">
            Fecha final
          </span>

          <input
            type="date"
            value={fechaFin}
            min={
              fechaInicio ||
              undefined
            }
            onChange={(evento) =>
              cambiarFechaFin(
                evento.target.value,
              )
            }
            disabled={deshabilitado}
            required
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>

      <p className="mt-4 rounded-xl bg-surface-container px-3 py-2 text-xs font-semibold text-on-surface-variant">
        {formatearPeriodo(
          fechaInicio,
          fechaFin,
        )}
      </p>
    </fieldset>
  );
}