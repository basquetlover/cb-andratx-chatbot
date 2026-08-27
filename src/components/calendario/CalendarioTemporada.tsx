import {
  useEffect,
  useMemo,
  useState,
} from "react";

export type TipoEventoCalendario =
  | "evento"
  | "entreno"
  | "entreno-modificado"
  | "entreno-cancelado"
  | "partido-casa"
  | "partido-fuera";

export interface EventoCalendario {
  id: string;
  titulo: string;
  fecha: string;
  fechaFin?: string | null;
  tipo: TipoEventoCalendario;
  horaInicio?: string | null;
  horaFin?: string | null;
  ubicacion?: string | null;
  descripcion?: string | null;
  color?: string | null;
  url?: string | null;
}

interface Propiedades {
  eventos: EventoCalendario[];
  className?: string;

  alSeleccionarEvento?: (
    evento: EventoCalendario,
  ) => void;

  alCambiarMes?: (
    anio: number,
    mes: number,
  ) => void;
}

interface MesCalendario {
  anio: number;
  mes: number;
}

interface TemporadaCalendario {
  anioInicio: number;
  anioFin: number;
  fechaInicio: string;
  fechaFin: string;
  mesInicio: number;
  mesFin: number;
}

interface DiaCalendario {
  fecha: string;
  numero: number;
  anio: number;
  mes: number;
  perteneceMesActual: boolean;
  dentroTemporada: boolean;
  esHoy: boolean;
}

interface EsquemaEvento {
  etiqueta: string;
  colorIcono: string;
  fondo: string;
  texto: string;
  borde: string;
}

interface PropiedadesIconoEvento {
  tipo: TipoEventoCalendario;
  color?: string | null;
  tamano?: "pequeno" | "normal";
}

const nombresDias = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];

const nombresDiasCompletos = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

const esquemasEventos: Record<
  TipoEventoCalendario,
  EsquemaEvento
> = {
  evento: {
    etiqueta: "Evento del club",
    colorIcono: "text-primary",
    fondo: "bg-primary-fixed/70",
    texto: "text-on-primary-fixed",
    borde: "border-primary/30",
  },

  entreno: {
    etiqueta: "Entrenamiento",
    colorIcono: "text-success",
    fondo: "bg-success-container/70",
    texto: "text-on-success-container",
    borde: "border-success/30",
  },

  "entreno-modificado": {
    etiqueta: "Modificación",
    colorIcono: "text-primary",
    fondo: "bg-primary-fixed/70",
    texto: "text-on-primary-fixed",
    borde: "border-primary/40",
  },

  "entreno-cancelado": {
    etiqueta: "Cancelado",
    colorIcono: "text-error",
    fondo: "bg-error-container",
    texto: "text-on-error-container",
    borde: "border-error/40",
  },

  "partido-casa": {
    etiqueta: "Partido en casa",
    colorIcono: "text-secondary",
    fondo: "bg-secondary-fixed/70",
    texto: "text-on-secondary-fixed",
    borde: "border-secondary/30",
  },

  "partido-fuera": {
    etiqueta: "Partido fuera",
    colorIcono: "text-outline",
    fondo: "bg-surface-container-high",
    texto: "text-on-surface",
    borde: "border-outline/40",
  },
};

function obtenerEsquemaEvento(
  tipo: TipoEventoCalendario,
): EsquemaEvento {
  return esquemasEventos[tipo];
}

/**
 * Carga automáticamente el SVG correspondiente:
 *
 * /public/iconos/calendario/evento.svg
 * /public/iconos/calendario/entreno.svg
 * /public/iconos/calendario/entreno-modificado.svg
 * /public/iconos/calendario/entreno-cancelado.svg
 * /public/iconos/calendario/partido-casa.svg
 * /public/iconos/calendario/partido-fuera.svg
 */
function IconoEventoCalendario({
  tipo,
  color,
  tamano = "normal",
}: PropiedadesIconoEvento) {
  const esquema =
    obtenerEsquemaEvento(tipo);

  const rutaIcono =
    `/iconos/calendario/${tipo}.svg`;

  const pequeno =
    tamano === "pequeno";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-surface-container-lowest/90 shadow-sm ${
        pequeno
          ? "h-4 w-4"
          : "h-5 w-5"
      } ${esquema.colorIcono}`}
      style={
        color
          ? {
              color,
            }
          : undefined
      }
      aria-hidden="true"
    >
      <span
        className={`inline-block bg-current ${
          pequeno
            ? "h-2.5 w-2.5"
            : "h-3 w-3"
        }`}
        style={{
          maskImage:
            `url("${rutaIcono}")`,
          WebkitMaskImage:
            `url("${rutaIcono}")`,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskSize: "contain",
          WebkitMaskSize: "contain",
        }}
      />
    </span>
  );
}

function rellenarNumero(
  numero: number,
): string {
  return String(numero).padStart(
    2,
    "0",
  );
}

function crearFechaIso(
  anio: number,
  mes: number,
  dia: number,
): string {
  return `${anio}-${rellenarNumero(
    mes + 1,
  )}-${rellenarNumero(dia)}`;
}

function obtenerFechaMadrid(): {
  anio: number;
  mes: number;
  dia: number;
  fecha: string;
} {
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
    tipo: Intl.DateTimeFormatPartTypes,
  ): number => {
    return Number(
      partes.find(
        (parte) =>
          parte.type === tipo,
      )?.value ?? 0,
    );
  };

  const anio =
    obtenerParte("year");

  const mes =
    obtenerParte("month") - 1;

  const dia =
    obtenerParte("day");

  return {
    anio,
    mes,
    dia,

    fecha: crearFechaIso(
      anio,
      mes,
      dia,
    ),
  };
}

function obtenerTemporadaActual(
  anio: number,
  mes: number,
): TemporadaCalendario {
  const anioInicio =
    mes >= 7
      ? anio
      : anio - 1;

  const anioFin =
    anioInicio + 1;

  return {
    anioInicio,
    anioFin,
    fechaInicio:
      `${anioInicio}-08-01`,
    fechaFin:
      `${anioFin}-07-31`,
    mesInicio:
      anioInicio * 12 + 7,
    mesFin:
      anioFin * 12 + 6,
  };
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

  const [anio, mes, dia] =
    fecha.split("-").map(
      Number,
    );

  const fechaConvertida =
    new Date(
      Date.UTC(
        anio,
        mes - 1,
        dia,
      ),
    );

  if (
    fechaConvertida.getUTCFullYear() !==
      anio ||
    fechaConvertida.getUTCMonth() !==
      mes - 1 ||
    fechaConvertida.getUTCDate() !==
      dia
  ) {
    return null;
  }

  return fechaConvertida;
}

function convertirDateAString(
  fecha: Date,
): string {
  return crearFechaIso(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate(),
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

function obtenerIndiceMes(
  mes: MesCalendario,
): number {
  return (
    mes.anio * 12 +
    mes.mes
  );
}

function obtenerMesDesdeIndice(
  indice: number,
): MesCalendario {
  return {
    anio:
      Math.floor(
        indice / 12,
      ),

    mes:
      indice % 12,
  };
}

function obtenerDiasCalendario(
  mesVisible: MesCalendario,
  temporada: TemporadaCalendario,
  fechaHoy: string,
): DiaCalendario[] {
  const primerDiaMes =
    new Date(
      Date.UTC(
        mesVisible.anio,
        mesVisible.mes,
        1,
      ),
    );

  const ultimoDiaMes =
    new Date(
      Date.UTC(
        mesVisible.anio,
        mesVisible.mes + 1,
        0,
      ),
    );

  const desplazamientoInicio =
    (
      primerDiaMes.getUTCDay() +
      6
    ) % 7;

  const totalDiasMes =
    ultimoDiaMes.getUTCDate();

  const totalCeldas =
    Math.ceil(
      (
        desplazamientoInicio +
        totalDiasMes
      ) / 7,
    ) * 7;

  const fechaInicial =
    sumarDias(
      primerDiaMes,
      -desplazamientoInicio,
    );

  return Array.from(
    {
      length: totalCeldas,
    },
    (_, indice) => {
      const fecha =
        sumarDias(
          fechaInicial,
          indice,
        );

      const anio =
        fecha.getUTCFullYear();

      const mes =
        fecha.getUTCMonth();

      const numero =
        fecha.getUTCDate();

      const fechaIso =
        convertirDateAString(
          fecha,
        );

      return {
        fecha: fechaIso,
        numero,
        anio,
        mes,

        perteneceMesActual:
          anio ===
            mesVisible.anio &&
          mes ===
            mesVisible.mes,

        dentroTemporada:
          fechaIso >=
            temporada.fechaInicio &&
          fechaIso <=
            temporada.fechaFin,

        esHoy:
          fechaIso ===
          fechaHoy,
      };
    },
  );
}

function formatearMes(
  mes: MesCalendario,
): string {
  const fecha =
    new Date(
      Date.UTC(
        mes.anio,
        mes.mes,
        1,
      ),
    );

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(fecha);
}

function formatearFechaCompleta(
  fecha: string,
): string {
  const fechaConvertida =
    convertirFecha(fecha);

  if (!fechaConvertida) {
    return fecha;
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
  ).format(
    fechaConvertida,
  );
}

function formatearHora(
  hora:
    | string
    | null
    | undefined,
): string | null {
  if (!hora) {
    return null;
  }

  return hora.slice(0, 5);
}

function ordenarEventos(
  eventos: EventoCalendario[],
): EventoCalendario[] {
  return [...eventos].sort(
    (primero, segundo) => {
      const horaPrimero =
        primero.horaInicio ??
        "99:99";

      const horaSegundo =
        segundo.horaInicio ??
        "99:99";

      const comparacionHora =
        horaPrimero.localeCompare(
          horaSegundo,
        );

      if (
        comparacionHora !== 0
      ) {
        return comparacionHora;
      }

      return primero.titulo.localeCompare(
        segundo.titulo,
        "es",
      );
    },
  );
}

function crearIndiceEventos(
  eventos: EventoCalendario[],
): Map<
  string,
  EventoCalendario[]
> {
  const eventosPorFecha =
    new Map<
      string,
      EventoCalendario[]
    >();

  eventos.forEach(
    (evento) => {
      const fechaInicio =
        convertirFecha(
          evento.fecha,
        );

      if (!fechaInicio) {
        return;
      }

      const fechaFin =
        evento.fechaFin
          ? convertirFecha(
              evento.fechaFin,
            )
          : fechaInicio;

      const fechaFinal =
        fechaFin &&
        fechaFin >=
          fechaInicio
          ? fechaFin
          : fechaInicio;

      let fechaActual =
        fechaInicio;

      let totalDias = 0;

      while (
        fechaActual <=
          fechaFinal &&
        totalDias <= 366
      ) {
        const fechaIso =
          convertirDateAString(
            fechaActual,
          );

        const eventosFecha =
          eventosPorFecha.get(
            fechaIso,
          ) ?? [];

        eventosFecha.push(
          evento,
        );

        eventosPorFecha.set(
          fechaIso,
          eventosFecha,
        );

        fechaActual =
          sumarDias(
            fechaActual,
            1,
          );

        totalDias += 1;
      }
    },
  );

  eventosPorFecha.forEach(
    (
      eventosFecha,
      fecha,
    ) => {
      eventosPorFecha.set(
        fecha,
        ordenarEventos(
          eventosFecha,
        ),
      );
    },
  );

  return eventosPorFecha;
}

function eventoEstaCancelado(
  evento: EventoCalendario,
): boolean {
  return (
    evento.tipo ===
    "entreno-cancelado"
  );
}

export default function CalendarioTemporada({
  eventos = [],
  className = "",
  alSeleccionarEvento,
  alCambiarMes,
}: Propiedades) {
  const fechaActual =
    useMemo(
      () =>
        obtenerFechaMadrid(),
      [],
    );

  const temporada =
    useMemo(
      () =>
        obtenerTemporadaActual(
          fechaActual.anio,
          fechaActual.mes,
        ),
      [
        fechaActual.anio,
        fechaActual.mes,
      ],
    );

  const [
    mesVisible,
    setMesVisible,
  ] = useState<MesCalendario>({
    anio: fechaActual.anio,
    mes: fechaActual.mes,
  });

  const [
    fechaSeleccionada,
    setFechaSeleccionada,
  ] = useState(
    fechaActual.fecha,
  );

  const dias =
    useMemo(
      () =>
        obtenerDiasCalendario(
          mesVisible,
          temporada,
          fechaActual.fecha,
        ),
      [
        mesVisible,
        temporada,
        fechaActual.fecha,
      ],
    );

  const eventosPorFecha =
    useMemo(
      () =>
        crearIndiceEventos(
          eventos,
        ),
      [eventos],
    );

  const eventosSeleccionados =
    eventosPorFecha.get(
      fechaSeleccionada,
    ) ?? [];

  const indiceMesVisible =
    obtenerIndiceMes(
      mesVisible,
    );

  const puedeRetroceder =
    indiceMesVisible >
    temporada.mesInicio;

  const puedeAvanzar =
    indiceMesVisible <
    temporada.mesFin;

  useEffect(() => {
    alCambiarMes?.(
      mesVisible.anio,
      mesVisible.mes + 1,
    );
  }, [
    mesVisible,
    alCambiarMes,
  ]);

  const cambiarMes = (
    direccion: -1 | 1,
  ) => {
    const nuevoIndice =
      indiceMesVisible +
      direccion;

    if (
      nuevoIndice <
        temporada.mesInicio ||
      nuevoIndice >
        temporada.mesFin
    ) {
      return;
    }

    const nuevoMes =
      obtenerMesDesdeIndice(
        nuevoIndice,
      );

    setMesVisible(
      nuevoMes,
    );

    setFechaSeleccionada(
      crearFechaIso(
        nuevoMes.anio,
        nuevoMes.mes,
        1,
      ),
    );
  };

  const volverAHoy = () => {
    setMesVisible({
      anio:
        fechaActual.anio,

      mes:
        fechaActual.mes,
    });

    setFechaSeleccionada(
      fechaActual.fecha,
    );
  };

  const seleccionarDia = (
    dia: DiaCalendario,
  ) => {
    if (
      !dia.dentroTemporada
    ) {
      return;
    }

    setFechaSeleccionada(
      dia.fecha,
    );
  };

  const activarEvento = (
    evento: EventoCalendario,
  ) => {
    if (
      eventoEstaCancelado(
        evento,
      )
    ) {
      return;
    }

    if (
      alSeleccionarEvento
    ) {
      alSeleccionarEvento(
        evento,
      );

      return;
    }

    if (evento.url) {
      window.open(
        evento.url,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={`Calendario de la temporada ${temporada.anioInicio}/${String(
        temporada.anioFin,
      ).slice(-2)}`}
    >
      <header className="border-b border-outline-variant/60 bg-surface-container-low px-3 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Temporada{" "}
              {temporada.anioInicio}/
              {String(
                temporada.anioFin,
              ).slice(-2)}
            </p>

            <h2 className="mt-1 text-xl font-bold capitalize text-on-surface">
              {formatearMes(
                mesVisible,
              )}
            </h2>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() =>
                cambiarMes(-1)
              }
              disabled={
                !puedeRetroceder
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-xl font-bold text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Mes anterior"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={
                volverAHoy
              }
              className="min-h-10 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={() =>
                cambiarMes(1)
              }
              disabled={
                !puedeAvanzar
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-xl font-bold text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>
        </div>
      </header>

      <div className="overflow-hidden">
        <div
          className="grid grid-cols-7 border-b border-outline-variant/60 bg-surface-container"
          role="row"
        >
          {nombresDias.map(
            (
              nombre,
              indice,
            ) => (
              <div
                key={nombre}
                className="px-0.5 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-on-surface-variant sm:px-2 sm:text-xs"
                role="columnheader"
                aria-label={
                  nombresDiasCompletos[
                    indice
                  ]
                }
              >
                {nombre}
              </div>
            ),
          )}
        </div>

        <div
          className="grid grid-cols-7 gap-px bg-outline-variant/60"
          role="grid"
        >
          {dias.map((dia) => {
            const eventosDia =
              eventosPorFecha.get(
                dia.fecha,
              ) ?? [];

            const seleccionado =
              fechaSeleccionada ===
              dia.fecha;

            return (
              <button
                key={dia.fecha}
                type="button"
                role="gridcell"
                disabled={
                  !dia.dentroTemporada
                }
                onClick={() =>
                  seleccionarDia(
                    dia,
                  )
                }
                aria-selected={
                  seleccionado
                }
                aria-label={`${formatearFechaCompleta(
                  dia.fecha,
                )}${
                  eventosDia.length >
                  0
                    ? `, ${eventosDia.length} ${
                        eventosDia.length ===
                        1
                          ? "evento"
                          : "eventos"
                      }`
                    : ", sin eventos"
                }`}
                className={`relative min-h-16 min-w-0 overflow-hidden bg-surface-container-lowest p-1 text-left align-top transition-colors sm:min-h-28 sm:p-2 ${
                  seleccionado
                    ? "z-10 bg-primary-fixed/40 ring-2 ring-inset ring-primary"
                    : dia.dentroTemporada
                      ? "hover:bg-surface-container-low"
                      : "cursor-default opacity-30"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold sm:h-7 sm:w-7 sm:text-sm ${
                    dia.esHoy
                      ? "bg-primary text-on-primary"
                      : dia.perteneceMesActual
                        ? "text-on-surface"
                        : "text-outline"
                  }`}
                >
                  {dia.numero}
                </span>

                {eventosDia.length >
                  0 && (
                  <>
                    <span className="mt-1 flex flex-wrap gap-1 sm:hidden">
                      {eventosDia
                        .slice(0, 3)
                        .map(
                          (evento) => (
                            <IconoEventoCalendario
                              key={`${dia.fecha}-${evento.id}`}
                              tipo={
                                evento.tipo
                              }
                              color={
                                evento.color
                              }
                              tamano="pequeno"
                            />
                          ),
                        )}

                      {eventosDia.length >
                        3 && (
                        <span className="text-[9px] font-bold leading-4 text-on-surface-variant">
                          +
                          {eventosDia.length -
                            3}
                        </span>
                      )}
                    </span>

                    <span className="mt-1 hidden flex-col gap-1 sm:flex">
                      {eventosDia
                        .slice(0, 3)
                        .map(
                          (evento) => {
                            const esquema =
                              obtenerEsquemaEvento(
                                evento.tipo,
                              );

                            const hora =
                              formatearHora(
                                evento.horaInicio,
                              );

                            const cancelado =
                              eventoEstaCancelado(
                                evento,
                              );

                            return (
                              <span
                                key={`${dia.fecha}-${evento.id}`}
                                className={`flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px] font-semibold ${esquema.fondo} ${esquema.texto} ${
                                  cancelado
                                    ? "opacity-80"
                                    : ""
                                }`}
                              >
                                <IconoEventoCalendario
                                  tipo={
                                    evento.tipo
                                  }
                                  color={
                                    evento.color
                                  }
                                  tamano="pequeno"
                                />

                                <span
                                  className={`truncate ${
                                    cancelado
                                      ? "line-through"
                                      : ""
                                  }`}
                                >
                                  {hora
                                    ? `${hora} `
                                    : ""}

                                  {
                                    evento.titulo
                                  }
                                </span>
                              </span>
                            );
                          },
                        )}

                      {eventosDia.length >
                        3 && (
                        <span className="px-1 text-[10px] font-bold text-on-surface-variant">
                          +
                          {eventosDia.length -
                            3}{" "}
                          más
                        </span>
                      )}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-outline-variant/60 bg-surface-container-low p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold capitalize text-on-surface">
            {formatearFechaCompleta(
              fechaSeleccionada,
            )}
          </h3>

          <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
            {
              eventosSeleccionados.length
            }{" "}
            {eventosSeleccionados.length ===
            1
              ? "evento"
              : "eventos"}
          </span>
        </div>

        {eventosSeleccionados.length ===
        0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest px-4 py-5 text-center">
            <p className="text-sm text-on-surface-variant">
              No hay actividades para
              este día.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {eventosSeleccionados.map(
              (evento) => {
                const esquema =
                  obtenerEsquemaEvento(
                    evento.tipo,
                  );

                const horaInicio =
                  formatearHora(
                    evento.horaInicio,
                  );

                const horaFin =
                  formatearHora(
                    evento.horaFin,
                  );

                const cancelado =
                  eventoEstaCancelado(
                    evento,
                  );

                const interactivo =
                  !cancelado &&
                  Boolean(
                    alSeleccionarEvento ||
                      evento.url,
                  );

                return (
                  <article
                    key={evento.id}
                    className={`overflow-hidden rounded-xl border bg-surface-container-lowest ${esquema.borde} ${
                      cancelado
                        ? "bg-error-container/20"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      disabled={
                        !interactivo
                      }
                      onClick={() =>
                        activarEvento(
                          evento,
                        )
                      }
                      className="flex h-full w-full flex-col p-4 text-left disabled:cursor-default"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${esquema.fondo} ${esquema.texto}`}
                        >
                          <IconoEventoCalendario
                            tipo={
                              evento.tipo
                            }
                            color={
                              evento.color
                            }
                            tamano="pequeno"
                          />

                          {
                            esquema.etiqueta
                          }
                        </span>

                        {(horaInicio ||
                          horaFin) && (
                          <span
                            className={`text-xs font-bold ${
                              cancelado
                                ? "text-error line-through"
                                : "text-secondary"
                            }`}
                          >
                            {horaInicio ??
                              "Hora pendiente"}

                            {horaFin
                              ? ` – ${horaFin}`
                              : ""}
                          </span>
                        )}
                      </span>

                      <span
                        className={`mt-3 font-bold ${
                          cancelado
                            ? "text-error line-through"
                            : "text-on-surface"
                        }`}
                      >
                        {evento.titulo}
                      </span>

                      {evento.ubicacion && (
                        <span
                          className={`mt-1 text-sm ${
                            cancelado
                              ? "text-on-error-container/80"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {
                            evento.ubicacion
                          }
                        </span>
                      )}

                      {evento.descripcion && (
                        <span
                          className={`mt-2 text-sm leading-5 ${
                            cancelado
                              ? "font-medium text-on-error-container"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {
                            evento.descripcion
                          }
                        </span>
                      )}

                      {interactivo && (
                        <span className="mt-3 text-xs font-bold text-primary">
                          Ver información
                        </span>
                      )}
                    </button>
                  </article>
                );
              },
            )}
          </div>
        )}
      </div>
    </section>
  );
}