import CalendarioTemporada, {
  type EventoCalendario,
} from "@components/calendario/CalendarioTemporada";
import MensajeIA from "@components/MensajeIA";
import MapaLocalizaciones, {
  type LocalizacionMapa,
} from "@components/mapas/MapaLocalizaciones";

import type {
  EntrenamientoSemana,
  ResultadoEntrenamientos,
} from "@tipos/Entrenamiento";

interface Propiedades {
  resultado: ResultadoEntrenamientos;
}

interface LimitesCalendario {
  inicio: string;
  fin: string;
}

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
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Madrid",
    },
  ).format(
    convertirFecha(fecha),
  );
}

function formatearFechaCorta(
  fecha: string,
): string {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "numeric",
      month: "short",
      timeZone: "Europe/Madrid",
    },
  ).format(
    convertirFecha(fecha),
  );
}

function formatearFechaCompleta(
  fecha: string,
): string {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Madrid",
    },
  ).format(
    convertirFecha(fecha),
  );
}

function formatearHora(
  hora: string | null,
): string {
  return hora
    ? hora.slice(0, 5)
    : "Hora pendiente";
}

function convertirFechaIso(
  fecha: Date,
): string {
  const anio =
    fecha.getUTCFullYear();

  const mes =
    String(
      fecha.getUTCMonth() + 1,
    ).padStart(2, "0");

  const dia =
    String(
      fecha.getUTCDate(),
    ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function obtenerFechaActualMadrid():
  string {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Europe/Madrid",
      },
    ).formatToParts(new Date());

  const anio =
    partes.find(
      (parte) =>
        parte.type === "year",
    )?.value ?? "";

  const mes =
    partes.find(
      (parte) =>
        parte.type === "month",
    )?.value ?? "";

  const dia =
    partes.find(
      (parte) =>
        parte.type === "day",
    )?.value ?? "";

  return `${anio}-${mes}-${dia}`;
}

function obtenerLimitesCalendario():
  LimitesCalendario {
  const hoy =
    obtenerFechaActualMadrid();

  const [anioTexto, mesTexto] =
    hoy.split("-");

  const anio =
    Number(anioTexto);

  const mes =
    Number(mesTexto);

  const inicioMesActual =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        1,
      ),
    );

  const finMesSiguiente =
    new Date(
      Date.UTC(
        anio,
        mes + 1,
        0,
      ),
    );

  return {
    inicio:
      convertirFechaIso(
        inicioMesActual,
      ),

    fin:
      convertirFechaIso(
        finMesSiguiente,
      ),
  };
}

function obtenerNombreInstalacion(
  entrenamiento: EntrenamientoSemana,
): string {
  return (
    entrenamiento.instalacion?.nombre ??
    entrenamiento.instalacion
      ?.nombreCorto ??
    "Instalación pendiente"
  );
}

function obtenerDireccionInstalacion(
  entrenamiento: EntrenamientoSemana,
): string {
  return [
    entrenamiento.instalacion
      ?.direccion,

    entrenamiento.instalacion
      ?.localidad,
  ]
    .filter(Boolean)
    .join(", ");
}

function obtenerInstalaciones(
  entrenamientos:
    EntrenamientoSemana[],
): LocalizacionMapa[] {
  const instalacionesPorId =
    new Map<
      string,
      LocalizacionMapa
    >();

  entrenamientos.forEach(
    (entrenamiento) => {
      /*
       * Un entrenamiento cancelado
       * no debe añadir una ubicación
       * al mapa.
       */
      if (
        entrenamiento.estado ===
        "cancelado"
      ) {
        return;
      }

      const instalacion =
        entrenamiento.instalacion;

      if (!instalacion?.id) {
        return;
      }

      instalacionesPorId.set(
        instalacion.id,
        {
          id:
            instalacion.id,

          nombre:
            instalacion.nombre,

          nombre_corto:
            instalacion.nombreCorto,

          direccion:
            instalacion.direccion,

          localidad:
            instalacion.localidad,

          codigo_postal:
            instalacion.codigoPostal,

          latitud:
            instalacion.latitud,

          longitud:
            instalacion.longitud,
        },
      );
    },
  );

  return Array.from(
    instalacionesPorId.values(),
  );
}

function convertirEntrenamientosEnEventos(
  entrenamientos:
    EntrenamientoSemana[],
  nombreEquipo: string,
): EventoCalendario[] {
  const limites =
    obtenerLimitesCalendario();

  return entrenamientos
    .filter((entrenamiento) => {
      return (
        entrenamiento.fecha >=
          limites.inicio &&
        entrenamiento.fecha <=
          limites.fin
      );
    })
    .map((entrenamiento) => {
      const nombreInstalacion =
        obtenerNombreInstalacion(
          entrenamiento,
        );

      const direccion =
        obtenerDireccionInstalacion(
          entrenamiento,
        );

      /*
       * El estado viene del backend.
       * El fallback mantiene
       * compatibilidad con respuestas
       * antiguas.
       */
      const estado =
        entrenamiento.estado ??
        "normal";

      let tipo:
        EventoCalendario["tipo"] =
          "entreno";

      let titulo =
        `Entrenamiento · ${nombreEquipo}`;

      let descripcion =
        entrenamiento.observaciones ??
        undefined;

      if (
        estado === "modificado"
      ) {
        tipo =
          "entreno-modificado";

        titulo =
          `Modificación · ${nombreEquipo}`;

        descripcion =
          entrenamiento.observaciones ??
          "Entrenamiento añadido o modificado.";
      }

      if (
        estado === "cancelado"
      ) {
        tipo =
          "entreno-cancelado";

        titulo =
          `Entrenamiento cancelado · ${nombreEquipo}`;

        descripcion =
          entrenamiento.observaciones ??
          "Este entrenamiento ha sido cancelado.";
      }

      return {
        id:
          `entreno-${entrenamiento.id}-${entrenamiento.fecha}`,

        titulo,
        fecha:
          entrenamiento.fecha,
        tipo,

        horaInicio:
          entrenamiento.horaInicio ??
          undefined,

        horaFin:
          entrenamiento.horaFin ??
          undefined,

        ubicacion:
          direccion ||
          nombreInstalacion,

        descripcion,
      };
    });
}

export default function RespuestaHorariosEntrenamiento({
  resultado,
}: Propiedades) {
  const nombreEquipo =
    resultado.equipo.nombre?.trim() ||
    "Equipo";

  const antesDelInicio =
    resultado.periodo.estado ===
    "antes-inicio";

  const despuesDelFinal =
    resultado.periodo.estado ===
    "despues-fin";

  const entrenamientosCalendario =
    resultado
      .entrenamientosCalendario ??
    resultado.entrenamientos;

  const eventosCalendario =
    convertirEntrenamientosEnEventos(
      entrenamientosCalendario,
      nombreEquipo,
    );

  const instalaciones =
    obtenerInstalaciones(
      entrenamientosCalendario,
    );

  let titulo =
    `Entrenamientos de esta semana: ${nombreEquipo}`;

  let descripcion =
    `Del ${formatearFechaCorta(
      resultado.semana.inicio,
    )} al ${formatearFechaCorta(
      resultado.semana.fin,
    )}`;

  if (
    antesDelInicio &&
    resultado.periodo.fechaInicio
  ) {
    titulo =
      `Los entrenamientos de ${nombreEquipo} todavía no han comenzado`;

    descripcion =
      `Está previsto que comiencen el ${formatearFechaCompleta(
        resultado.periodo.fechaInicio,
      )}. Estos son los horarios correspondientes a la primera semana de entrenamientos.`;
  }

  if (
    despuesDelFinal &&
    resultado.periodo.fechaFin
  ) {
    titulo =
      `Los entrenamientos de ${nombreEquipo} han finalizado`;

    descripcion =
      `El periodo de entrenamientos terminó el ${formatearFechaCompleta(
        resultado.periodo.fechaFin,
      )}. Estos fueron los horarios correspondientes a la última semana.`;
  }

  if (
    resultado.entrenamientos.length ===
      0 &&
    eventosCalendario.length === 0
  ) {
    return (
      <MensajeIA>
        <p className="font-semibold text-on-secondary-fixed">
          {titulo}
        </p>

        <p className="mt-1 text-sm text-on-surface-variant">
          {descripcion}
        </p>

        <p className="mt-3 text-sm text-on-surface-variant">
          No hay sesiones configuradas
          para este periodo.
        </p>
      </MensajeIA>
    );
  }

  return (
    <MensajeIA>
      <p className="font-semibold text-on-secondary-fixed">
        {titulo}
      </p>

      <p className="mt-1 text-sm text-on-surface-variant">
        {descripcion}
      </p>

      {resultado.entrenamientos.length >
        0 && (
        <div className="mt-4 flex flex-col gap-3">
          {resultado.entrenamientos.map(
            (entrenamiento) => {
              const nombreInstalacion =
                obtenerNombreInstalacion(
                  entrenamiento,
                );

              const direccion =
                obtenerDireccionInstalacion(
                  entrenamiento,
                );

              const cancelado =
                entrenamiento.estado ===
                "cancelado";

              const modificado =
                entrenamiento.estado ===
                "modificado";

              return (
                <article
                  key={`${entrenamiento.id}-${entrenamiento.fecha}`}
                  className={`rounded-xl border p-4 ${
                    cancelado
                      ? "border-error/40 bg-error-container/30"
                      : modificado
                        ? "border-primary/40 bg-primary-fixed/30"
                        : "border-outline-variant bg-surface-container-lowest"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p
                      className={`font-semibold capitalize ${
                        cancelado
                          ? "text-error line-through"
                          : "text-on-secondary-fixed"
                      }`}
                    >
                      {formatearFecha(
                        entrenamiento.fecha,
                      )}
                    </p>

                    {cancelado && (
                      <span className="rounded-full bg-error-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-error-container">
                        Cancelado
                      </span>
                    )}

                    {modificado && (
                      <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-primary-fixed">
                        Modificación
                      </span>
                    )}
                  </div>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      cancelado
                        ? "text-error line-through"
                        : modificado
                          ? "text-primary"
                          : "text-secondary"
                    }`}
                  >
                    {formatearHora(
                      entrenamiento.horaInicio,
                    )}{" "}
                    –{" "}
                    {formatearHora(
                      entrenamiento.horaFin,
                    )}
                  </p>

                  <p
                    className={`mt-2 text-sm ${
                      cancelado
                        ? "text-on-error-container/80"
                        : "text-on-surface"
                    }`}
                  >
                    {nombreInstalacion}
                  </p>

                  {direccion && (
                    <p
                      className={`mt-1 text-sm ${
                        cancelado
                          ? "text-on-error-container/70"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {direccion}
                    </p>
                  )}

                  {entrenamiento.observaciones && (
                    <p
                      className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                        cancelado
                          ? "bg-error-container text-on-error-container"
                          : modificado
                            ? "bg-primary-fixed/60 text-on-primary-fixed"
                            : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {
                        entrenamiento.observaciones
                      }
                    </p>
                  )}
                </article>
              );
            },
          )}
        </div>
      )}

      {eventosCalendario.length >
        0 && (
        <section
          className="mt-5"
          aria-labelledby="titulo-calendario-entrenamientos"
        >
          <div className="mb-3">
            <p
              id="titulo-calendario-entrenamientos"
              className="font-semibold text-on-secondary-fixed"
            >
              Calendario de entrenamientos
            </p>

            <p className="mt-1 text-sm text-on-surface-variant">
              Consulta los entrenamientos
              programados para este mes y
              el siguiente.
            </p>
          </div>

          <CalendarioTemporada
            eventos={
              eventosCalendario
            }
          />
        </section>
      )}

      {instalaciones.length >
        0 && (
        <section
          className="mt-5"
          aria-labelledby="titulo-ubicaciones-entrenamientos"
        >
          <div className="mb-3">
            <p
              id="titulo-ubicaciones-entrenamientos"
              className="font-semibold text-on-secondary-fixed"
            >
              {instalaciones.length ===
              1
                ? "Ubicación del entrenamiento"
                : "Ubicaciones de los entrenamientos"}
            </p>

            <p className="mt-1 text-sm text-on-surface-variant">
              {instalaciones.length ===
              1
                ? "Consulta dónde se realizan los entrenamientos."
                : "Los entrenamientos se realizan en distintas instalaciones."}
            </p>
          </div>

          <div className="h-80 w-full overflow-hidden rounded-2xl border border-outline-variant md:h-110">
            <MapaLocalizaciones
              localizaciones={
                instalaciones
              }
              zoom={15}
              mostrarControles
              mostrarLeyenda
              temaMapa="azul"
            />
          </div>
        </section>
      )}

      <p className="mt-4 text-xs text-on-surface-variant">
        Los horarios pueden sufrir
        modificaciones. Comprueba los
        avisos oficiales del club.
      </p>
    </MensajeIA>
  );
}