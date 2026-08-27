import type {
  EntrenamientoHabitualEquipoPublico,
} from "@tipos/EquipoPublico";

interface Propiedades {
  entrenamientos?:
    EntrenamientoHabitualEquipoPublico[];
}

const nombresDias: Record<
  number,
  string
> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

function formatearHora(
  hora: string | null | undefined,
): string {
  if (!hora) {
    return "--:--";
  }

  return hora.slice(0, 5);
}

export default function HorariosEquipoPublico({
  entrenamientos = [],
}: Propiedades) {
  const entrenamientosSeguros =
    Array.isArray(entrenamientos)
      ? entrenamientos
      : [];

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-secondary"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="8.5"
          />

          <path
            d="M12 7.5V12l3 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <h2 className="font-bold text-on-surface">
          Horarios de entrenamiento
        </h2>
      </div>

      {entrenamientosSeguros.length >
      0 ? (
        <div className="mt-4 grid gap-3">
          {entrenamientosSeguros.map(
            (entrenamiento) => (
              <article
                key={
                  entrenamiento.id
                }
                className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-on-surface">
                    {nombresDias[
                      entrenamiento
                        .diaSemana
                    ] ?? "Día"}
                  </p>

                  <p className="rounded-lg bg-secondary-fixed px-2 py-1 text-xs font-black text-on-secondary-fixed">
                    {formatearHora(
                      entrenamiento
                        .horaInicio,
                    )}

                    {" – "}

                    {formatearHora(
                      entrenamiento
                        .horaFin,
                    )}
                  </p>
                </div>

                {entrenamiento.instalacion && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-on-surface-variant">
                    <svg
                      viewBox="0 0 24 24"
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 21s6-5.15 6-11a6 6 0 1 0-12 0c0 5.85 6 11 6 11Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      <circle
                        cx="12"
                        cy="10"
                        r="2"
                      />
                    </svg>

                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface">
                        {entrenamiento
                          .instalacion
                          .nombreCorto ||
                          entrenamiento
                            .instalacion
                            .nombre}
                      </p>

                      {entrenamiento
                        .instalacion
                        .direccion && (
                        <p className="mt-0.5">
                          {
                            entrenamiento
                              .instalacion
                              .direccion
                          }
                        </p>
                      )}

                      {entrenamiento
                        .instalacion
                        .localidad && (
                        <p className="mt-0.5">
                          {
                            entrenamiento
                              .instalacion
                              .localidad
                          }
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {entrenamiento.observaciones && (
                  <p className="mt-2 border-t border-outline-variant/50 pt-2 text-xs italic text-on-surface-variant">
                    {
                      entrenamiento
                        .observaciones
                    }
                  </p>
                )}
              </article>
            ),
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4 text-center">
          <p className="text-sm font-bold text-on-surface">
            Sin horarios publicados
          </p>

          <p className="mt-1 text-xs text-on-surface-variant">
            Este equipo todavía no tiene
            entrenamientos habituales
            configurados.
          </p>
        </div>
      )}
    </section>
  );
}