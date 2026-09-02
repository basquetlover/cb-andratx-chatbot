import type {
  ResumenEventoPanel,
} from "@tipos/EventoPanel";

interface Propiedades {
  evento: ResumenEventoPanel;
}

const ETIQUETAS_TIPO = {
  evento: "Evento",
  campus: "Campus",
  torneo: "Torneo",
  presentacion:
    "Presentación",
  reunion: "Reunión",
  actividad: "Actividad",
  otro: "Otro",
} as const;

const ETIQUETAS_ESTADO = {
  borrador: "Borrador",
  publicado: "Publicado",
  cancelado: "Cancelado",
  archivado: "Archivado",
} as const;

const CLASES_ESTADO = {
  borrador:
    "bg-surface-container-high text-on-surface-variant",

  publicado:
    "bg-success-container text-on-success-container",

  cancelado:
    "bg-error-container text-on-error-container",

  archivado:
    "bg-surface-variant text-on-surface-variant",
} as const;

function convertirFecha(
  fecha: string,
): Date {
  return new Date(
    `${fecha}T12:00:00`,
  );
}

function formatearFecha(
  fecha: string,
): string {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone:
        "Europe/Madrid",
    },
  ).format(
    convertirFecha(fecha),
  );
}

function formatearHora(
  hora: string,
): string {
  return hora
    ? hora.slice(0, 5)
    : "";
}

function obtenerPeriodo(
  evento:
    ResumenEventoPanel,
): string {
  const fechaInicio =
    formatearFecha(
      evento.fechaInicio,
    );

  const fechaFin =
    formatearFecha(
      evento.fechaFin,
    );

  if (
    evento.fechaInicio ===
    evento.fechaFin
  ) {
    if (
      evento.todoElDia
    ) {
      return fechaInicio;
    }

    const horaInicio =
      formatearHora(
        evento.horaInicio,
      );

    const horaFin =
      formatearHora(
        evento.horaFin,
      );

    if (
      horaInicio &&
      horaFin
    ) {
      return (
        `${fechaInicio}, ` +
        `${horaInicio}–${horaFin}`
      );
    }

    if (horaInicio) {
      return (
        `${fechaInicio}, ` +
        horaInicio
      );
    }

    return fechaInicio;
  }

  const fechas =
    `Del ${fechaInicio} al ${fechaFin}`;

  if (
    evento.todoElDia
  ) {
    return fechas;
  }

  const horaInicio =
    formatearHora(
      evento.horaInicio,
    );

  const horaFin =
    formatearHora(
      evento.horaFin,
    );

  if (
    horaInicio &&
    horaFin
  ) {
    return (
      `${fechas}, ` +
      `${horaInicio}–${horaFin}`
    );
  }

  if (horaInicio) {
    return (
      `${fechas}, ` +
      horaInicio
    );
  }

  return fechas;
}

function obtenerEstadoTemporal(
  evento:
    ResumenEventoPanel,
): string {
  const hoy =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Madrid",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    ).format(
      new Date(),
    );

  if (
    evento.fechaInicio <=
      hoy &&
    evento.fechaFin >=
      hoy
  ) {
    return "En curso";
  }

  if (
    evento.fechaInicio >
    hoy
  ) {
    return "Próximo";
  }

  return "Finalizado";
}

export default function TarjetaEventoPanel({
  evento,
}: Propiedades) {
  const imagen =
    evento.imagen ??
    evento.bannerNotificacion;

  const estadoTemporal =
    obtenerEstadoTemporal(
      evento,
    );

  return (
    <article className="group overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="relative aspect-16/7 overflow-hidden bg-surface-container">
        {imagen ? (
          <img
            src={imagen}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-linear-to-br from-primary-fixed to-tertiary-container">
            <span
              className="inline-block h-14 w-14 bg-primary opacity-60 mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/calendario/evento.svg')",

                WebkitMaskImage:
                  "url('/iconos/calendario/evento.svg')",
              }}
              aria-hidden="true"
            />
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/5 to-transparent" />

        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-on-primary shadow-sm">
            {
              ETIQUETAS_TIPO[
                evento.tipo
              ]
            }
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
              CLASES_ESTADO[
                evento.estado
              ]
            }`}
          >
            {
              ETIQUETAS_ESTADO[
                evento.estado
              ]
            }
          </span>

          {evento.destacado && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-on-secondary shadow-sm">
              Destacado
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {estadoTemporal}
            </p>

            <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-tight text-on-surface">
              {evento.titulo}
            </h3>
          </div>

          <a
            href={`/panel/eventos/${encodeURIComponent(
              evento.id,
            )}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:bg-primary-fixed hover:text-primary"
            aria-label={`Editar ${evento.titulo}`}
          >
            <span
              className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/editar.svg')",

                WebkitMaskImage:
                  "url('/iconos/panel/editar.svg')",
              }}
              aria-hidden="true"
            />
          </a>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-on-surface-variant">
          <div className="flex items-start gap-2.5">
            <span
              className="mt-0.5 inline-block h-4.5 w-4.5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/calendario.svg')",

                WebkitMaskImage:
                  "url('/iconos/panel/calendario.svg')",
              }}
              aria-hidden="true"
            />

            <span>
              {obtenerPeriodo(evento)}
            </span>
          </div>

          {evento.ubicacion && (
            <div className="flex items-start gap-2.5">
              <span
                className="mt-0.5 inline-block h-4.5 w-4.5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/ubicacion.svg')",

                  WebkitMaskImage:
                    "url('/iconos/panel/ubicacion.svg')",
                }}
                aria-hidden="true"
              />

              <span className="line-clamp-2">
                {evento.ubicacion}
              </span>
            </div>
          )}

          <div className="flex items-start gap-2.5">
            <span
              className="mt-0.5 inline-block h-4.5 w-4.5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  evento.alcance ===
                  "todo-club"
                    ? "url('/iconos/panel/usuarios.svg')"
                    : "url('/iconos/panel/equipos.svg')",

                WebkitMaskImage:
                  evento.alcance ===
                  "todo-club"
                    ? "url('/iconos/panel/usuarios.svg')"
                    : "url('/iconos/panel/equipos.svg')",
              }}
              aria-hidden="true"
            />

            <span>
              {evento.alcance ===
              "todo-club"
                ? "Todo el club"
                : `${evento.totalEquipos} ${
                    evento.totalEquipos ===
                    1
                      ? "equipo"
                      : "equipos"
                  }`}
            </span>
          </div>
        </div>

        {evento.descripcionCorta && (
          <p className="mt-4 line-clamp-2 text-sm leading-5 text-on-surface-variant">
            {
              evento.descripcionCorta
            }
          </p>
        )}

        {evento.alcance ===
          "equipos" &&
          evento.equipos.length >
            0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {evento.equipos
                .slice(0, 3)
                .map(
                  (equipo) => (
                    <span
                      key={equipo.id}
                      className="max-w-full truncate rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant"
                    >
                      {
                        equipo.nombreCorto ??
                        equipo.nombre
                      }
                    </span>
                  ),
                )}

              {evento.equipos.length >
                3 && (
                <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                  +
                  {evento.equipos
                    .length - 3}
                </span>
              )}
            </div>
          )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-outline-variant/50 pt-4">
          <div className="flex flex-wrap gap-2">
            {!evento.mostrarCalendario && (
              <span className="rounded-full bg-error-container px-2.5 py-1 text-xs font-semibold text-on-error-container">
                Fuera del calendario
              </span>
            )}

            {evento.bannerNotificacion && (
              <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-xs font-semibold text-on-primary-fixed">
                Banner push
              </span>
            )}
          </div>

          <a
            href={`/panel/eventos/${encodeURIComponent(
              evento.id,
            )}`}
            className="shrink-0 text-sm font-bold text-primary transition-colors hover:text-secondary"
          >
            Editar evento
          </a>
        </div>
      </div>
    </article>
  );
}