import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  DiaPartidosPortada,
  EquipoPartidoPortada,
  PartidoPortada,
  PeriodoPartidosPortada,
} from "@tipos/PartidoPortada";

interface Propiedades {
  datos:
    PeriodoPartidosPortada;

  mostrarCabecera?: boolean;

  tituloId?: string;
}

interface PropiedadesEscudo {
  equipo:
    EquipoPartidoPortada;
}

interface PropiedadesPartido {
  partido:
    PartidoPortada;
}

function convertirFecha(
  fecha: string,
): Date {
  return new Date(
    `${fecha}T12:00:00`,
  );
}

function capitalizar(
  texto: string,
): string {
  if (!texto) {
    return texto;
  }

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1)
  );
}

function formatearDiaSemana(
  fecha: string,
): string {
  return capitalizar(
    new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday: "long",
        timeZone:
          "Europe/Madrid",
      },
    ).format(
      convertirFecha(
        fecha,
      ),
    ),
  );
}

function formatearDiaCorto(
  fecha: string,
): string {
  return capitalizar(
    new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday: "short",
        timeZone:
          "Europe/Madrid",
      },
    )
      .format(
        convertirFecha(
          fecha,
        ),
      )
      .replace(".", ""),
  );
}

function formatearNumeroDia(
  fecha: string,
): string {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "numeric",
      timeZone:
        "Europe/Madrid",
    },
  ).format(
    convertirFecha(
      fecha,
    ),
  );
}

function formatearMesCorto(
  fecha: string,
): string {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      month: "short",
      timeZone:
        "Europe/Madrid",
    },
  )
    .format(
      convertirFecha(
        fecha,
      ),
    )
    .replace(".", "");
}

function formatearFechaCompleta(
  fecha: string,
): string {
  return capitalizar(
    new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone:
          "Europe/Madrid",
      },
    ).format(
      convertirFecha(
        fecha,
      ),
    ),
  );
}

function obtenerIniciales(
  nombre: string,
): string {
  const palabras =
    nombre
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    palabras.length === 0
  ) {
    return "—";
  }

  if (
    palabras.length === 1
  ) {
    return palabras[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    palabras[0][0] +
    palabras[
      palabras.length - 1
    ][0]
  ).toUpperCase();
}

function IconoUbicacion() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />

      <circle
        cx="12"
        cy="10"
        r="2.5"
      />
    </svg>
  );
}

function IconoEnlace() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 4h5v5" />

      <path d="m20 4-9 9" />

      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function IconoCalendario() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 2v3" />

      <path d="M17 2v3" />

      <path d="M3 9h18" />

      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="3"
      />

      <path d="M8 13h.01" />

      <path d="M12 13h.01" />

      <path d="M16 13h.01" />

      <path d="M8 17h.01" />

      <path d="M12 17h.01" />
    </svg>
  );
}

function IconoFlecha({
  direccion,
}: {
  direccion:
    | "izquierda"
    | "derecha";
}) {
  const derecha =
    direccion ===
    "derecha";

  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {derecha ? (
        <>
          <path d="m9 18 6-6-6-6" />
        </>
      ) : (
        <>
          <path d="m15 18-6-6 6-6" />
        </>
      )}
    </svg>
  );
}

function EscudoEquipo({
  equipo,
}: PropiedadesEscudo) {
  const [
    imagenIncorrecta,
    setImagenIncorrecta,
  ] =
    useState(false);

  const mostrarImagen =
    Boolean(
      equipo.escudo,
    ) &&
    !imagenIncorrecta;

  return (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface-container-lowest p-2 shadow-sm sm:h-20 sm:w-20 sm:p-2.5 ${
        equipo.esClub
          ? "border-primary/50 ring-2 ring-primary/15"
          : "border-outline-variant/70"
      }`}
    >
      {mostrarImagen ? (
        <img
          src={
            equipo.escudo ??
            undefined
          }
          alt={`Escudo de ${equipo.nombre}`}
          width="64"
          height="64"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          onError={() =>
            setImagenIncorrecta(
              true,
            )
          }
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-container text-center text-xs font-black text-on-surface-variant">
          {obtenerIniciales(
            equipo.nombre,
          )}
        </span>
      )}
    </div>
  );
}

function EtiquetaEstado({
  partido,
}: PropiedadesPartido) {
  if (
    partido.estado ===
    "en-juego"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-error px-3 py-1 text-[0.68rem] font-black uppercase tracking-wider text-on-error">
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-on-error"
          aria-hidden="true"
        />

        En juego
      </span>
    );
  }

  if (
    partido.estado ===
    "finalizado"
  ) {
    return (
      <span className="inline-flex rounded-full bg-surface-container-high px-3 py-1 text-[0.68rem] font-black uppercase tracking-wider text-on-surface-variant">
        Finalizado
      </span>
    );
  }

  if (
    partido.estado ===
    "aplazado"
  ) {
    return (
      <span className="inline-flex rounded-full bg-error-container px-3 py-1 text-[0.68rem] font-black uppercase tracking-wider text-on-error-container">
        Aplazado
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-primary-fixed px-3 py-1 text-[0.68rem] font-black uppercase tracking-wider text-on-primary-fixed">
      Programado
    </span>
  );
}

function MarcadorPartido({
  partido,
}: PropiedadesPartido) {
  const tieneResultado =
    partido.puntosLocal !==
      null &&
    partido.puntosVisitante !==
      null &&
    (
      partido.estado ===
        "finalizado" ||
      partido.estado ===
        "en-juego"
    );

  if (
    partido.estado ===
    "aplazado"
  ) {
    return (
      <div className="flex min-w-24 flex-col items-center justify-center text-center sm:min-w-32">
        <span className="text-xl font-black uppercase text-error sm:text-2xl">
          Aplazado
        </span>

        {partido.hora && (
          <span className="mt-1 text-xs font-semibold text-on-surface-variant">
            {partido.hora} h
          </span>
        )}
      </div>
    );
  }

  if (
    tieneResultado
  ) {
    return (
      <div className="flex min-w-24 flex-col items-center justify-center text-center sm:min-w-36">
        <div className="flex items-center gap-2 text-3xl font-black tabular-nums text-on-secondary-fixed sm:gap-3 sm:text-4xl">
          <span>
            {partido.puntosLocal}
          </span>

          <span className="text-lg font-bold text-outline sm:text-xl">
            –
          </span>

          <span>
            {partido.puntosVisitante}
          </span>
        </div>

        {partido.estado ===
          "en-juego" && (
          <span className="mt-1 text-[0.65rem] font-black uppercase tracking-wider text-error">
            Resultado en directo
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-24 flex-col items-center justify-center text-center sm:min-w-32">
      <span className="text-3xl font-black tabular-nums text-secondary sm:text-4xl">
        {partido.hora ??
          "—"}
      </span>

      {partido.hora && (
        <span className="mt-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-on-surface-variant">
          Hora del partido
        </span>
      )}
    </div>
  );
}

function PartidoFila({
  partido,
}: PropiedadesPartido) {
  return (
    <article className="relative py-7 first:pt-4 last:pb-3 sm:py-9">
      <div className="mb-5 flex flex-wrap items-center justify-center gap-2 sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <EtiquetaEstado
            partido={partido}
          />

          {partido.jornada && (
            <span className="text-xs font-bold text-on-surface-variant">
              {partido.jornada}
            </span>
          )}
        </div>

        <span className="text-xs font-semibold text-on-surface-variant">
          {formatearFechaCompleta(
            partido.fecha,
          )}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-6">
        <div className="flex min-w-0 flex-col items-center text-center">
          <span className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-secondary">
            Local
          </span>

          <EscudoEquipo
            equipo={
              partido.equipoLocal
            }
          />

          <p
            className={`mt-3 max-w-44 text-sm font-black leading-tight sm:text-base ${
              partido.equipoLocal
                .esClub
                ? "text-on-secondary-fixed"
                : "text-on-surface"
            }`}
          >
            {
              partido.equipoLocal
                .nombre
            }
          </p>

          {partido.equipoLocal
            .esClub && (
            <span className="mt-1 text-[0.65rem] font-black uppercase tracking-wider text-secondary">
              C.B. Andratx
            </span>
          )}
        </div>

        <div className="flex min-h-32 items-center pt-7 sm:min-h-40 sm:pt-8">
          <MarcadorPartido
            partido={partido}
          />
        </div>

        <div className="flex min-w-0 flex-col items-center text-center">
          <span className="mb-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-secondary">
            Visitante
          </span>

          <EscudoEquipo
            equipo={
              partido
                .equipoVisitante
            }
          />

          <p
            className={`mt-3 max-w-44 text-sm font-black leading-tight sm:text-base ${
              partido
                .equipoVisitante
                .esClub
                ? "text-on-secondary-fixed"
                : "text-on-surface"
            }`}
          >
            {
              partido
                .equipoVisitante
                .nombre
            }
          </p>

          {partido
            .equipoVisitante
            .esClub && (
            <span className="mt-1 text-[0.65rem] font-black uppercase tracking-wider text-secondary">
              C.B. Andratx
            </span>
          )}
        </div>
      </div>

      <footer className="mt-6 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
        {partido.ubicacion && (
          <span className="inline-flex items-center gap-1.5 text-center font-medium text-on-surface-variant">
            <span className="shrink-0 text-secondary">
              <IconoUbicacion />
            </span>

            {partido.ubicacion}
          </span>
        )}

        {partido.enlaceFbib && (
          <a
            href={
              partido.enlaceFbib
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-secondary underline decoration-secondary/30 underline-offset-4 transition-colors hover:text-primary"
          >
            Ver en la FBIB

            <IconoEnlace />
          </a>
        )}
      </footer>
    </article>
  );
}

function construirDias(
  datos:
    PeriodoPartidosPortada,
): DiaPartidosPortada[] {
  const partidosPorFecha =
    new Map<
      string,
      PartidoPortada[]
    >();

  datos.partidos.forEach(
    (partido) => {
      const partidosFecha =
        partidosPorFecha.get(
          partido.fecha,
        ) ?? [];

      partidosFecha.push(
        partido,
      );

      partidosPorFecha.set(
        partido.fecha,
        partidosFecha,
      );
    },
  );

  if (
    !partidosPorFecha.has(
      datos.fechaActual,
    )
  ) {
    partidosPorFecha.set(
      datos.fechaActual,
      [],
    );
  }

  return Array.from(
    partidosPorFecha.entries(),
  )
    .sort(
      (
        [fechaA],
        [fechaB],
      ) =>
        fechaA.localeCompare(
          fechaB,
        ),
    )
    .map(
      (
        [
          fecha,
          partidos,
        ],
      ) => ({
        fecha,

        esHoy:
          fecha ===
          datos.fechaActual,

        partidos:
          [...partidos].sort(
            (
              partidoA,
              partidoB,
            ) =>
              (
                partidoA.hora ??
                "23:59"
              ).localeCompare(
                partidoB.hora ??
                  "23:59",
              ),
          ),
      }),
    );
}

export default function PartidosPortada({
  datos,
  mostrarCabecera = true,
  tituloId = "partidos-portada-titulo",
}: Propiedades) {
  const dias =
    useMemo(
      () =>
        construirDias(
          datos,
        ),
      [datos],
    );

  const [
    fechaSeleccionada,
    setFechaSeleccionada,
  ] =
    useState(
      datos.fechaActual,
    );

  const [
    puedeDesplazarIzquierda,
    setPuedeDesplazarIzquierda,
  ] =
    useState(false);

  const [
    puedeDesplazarDerecha,
    setPuedeDesplazarDerecha,
  ] =
    useState(false);

  const contenedorDiasRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const botonesDiasRef =
    useRef<
      Map<
        string,
        HTMLButtonElement
      >
    >(
      new Map(),
    );

  const diaSeleccionado =
    dias.find(
      (dia) =>
        dia.fecha ===
        fechaSeleccionada,
    ) ??
    dias[0] ??
    null;

  const actualizarEstadoScroll =
    useCallback(
      () => {
        const contenedor =
          contenedorDiasRef.current;

        if (!contenedor) {
          return;
        }

        const margen = 2;

        setPuedeDesplazarIzquierda(
          contenedor.scrollLeft >
            margen,
        );

        setPuedeDesplazarDerecha(
          contenedor.scrollLeft +
            contenedor.clientWidth <
            contenedor.scrollWidth -
              margen,
        );
      },
      [],
    );

  const centrarDia = useCallback(
    (
      fecha: string,
      comportamiento:
        ScrollBehavior =
          "smooth",
    ) => {
      const boton =
        botonesDiasRef.current.get(
          fecha,
        );

      boton?.scrollIntoView({
        behavior:
          comportamiento,

        block:
          "nearest",

        inline:
          "center",
      });
    },
    [],
  );

  const desplazarMenu = (
    direccion:
      | "izquierda"
      | "derecha",
  ) => {
    const contenedor =
      contenedorDiasRef.current;

    if (!contenedor) {
      return;
    }

    const distancia =
      Math.max(
        220,
        contenedor.clientWidth *
          0.65,
      );

    contenedor.scrollBy({
      left:
        direccion ===
        "derecha"
          ? distancia
          : -distancia,

      behavior:
        "smooth",
    });
  };

  useEffect(
    () => {
      if (
        !dias.some(
          (dia) =>
            dia.fecha ===
            fechaSeleccionada,
        )
      ) {
        setFechaSeleccionada(
          datos.fechaActual,
        );
      }
    },
    [
      datos.fechaActual,
      dias,
      fechaSeleccionada,
    ],
  );

  useEffect(
    () => {
      const identificador =
        window.requestAnimationFrame(
          () => {
            centrarDia(
              fechaSeleccionada,
              "auto",
            );

            actualizarEstadoScroll();
          },
        );

      return () => {
        window.cancelAnimationFrame(
          identificador,
        );
      };
    },
    [
      actualizarEstadoScroll,
      centrarDia,
      fechaSeleccionada,
    ],
  );

  useEffect(
    () => {
      const contenedor =
        contenedorDiasRef.current;

      if (!contenedor) {
        return;
      }

      actualizarEstadoScroll();

      contenedor.addEventListener(
        "scroll",
        actualizarEstadoScroll,
        {
          passive: true,
        },
      );

      window.addEventListener(
        "resize",
        actualizarEstadoScroll,
      );

      return () => {
        contenedor.removeEventListener(
          "scroll",
          actualizarEstadoScroll,
        );

        window.removeEventListener(
          "resize",
          actualizarEstadoScroll,
        );
      };
    },
    [
      actualizarEstadoScroll,
    ],
  );

  return (
    <section
      className="relative overflow-hidden bg-surface-container-lowest py-10 sm:py-14"
      aria-labelledby="partidos-portada-titulo"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm">
                <IconoCalendario />
              </span>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-secondary">
                  Agenda del club
                </p>

                <h2
                  id="partidos-portada-titulo"
                  className="mt-0.5 text-2xl font-black text-on-secondary-fixed sm:text-3xl"
                >
                  Próximos partidos
                </h2>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Consulta los partidos disputados y programados durante el periodo actual.
            </p>
          </div>

          <a
            href="/calendario"
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-xl border border-secondary px-4 py-2 text-sm font-bold text-secondary transition-colors hover:bg-secondary hover:text-on-secondary"
          >
            Ver calendario completo
          </a>
        </header> */}

        <div className="relative mt-7 border-y border-outline-variant/60">
          {puedeDesplazarIzquierda && (
            <button
              type="button"
              onClick={() =>
                desplazarMenu(
                  "izquierda",
                )
              }
              className="absolute left-1 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface shadow-md transition-colors hover:bg-primary hover:text-on-primary"
              aria-label="Ver días anteriores"
            >
              <IconoFlecha
                direccion="izquierda"
              />
            </button>
          )}

          <div
            ref={
              contenedorDiasRef
            }
            role="tablist"
            aria-label="Días con partidos"
            className="flex snap-x snap-mandatory gap-1 overflow-x-auto px-[calc(50%-4rem)] py-2 scrollbar-none [&::-webkit-scrollbar]:hidden"
          >
            {dias.map(
              (dia) => {
                const seleccionado =
                  dia.fecha ===
                  diaSeleccionado
                    ?.fecha;

                return (
                  <button
                    key={
                      dia.fecha
                    }
                    ref={(
                      elemento,
                    ) => {
                      if (
                        elemento
                      ) {
                        botonesDiasRef.current.set(
                          dia.fecha,
                          elemento,
                        );
                      } else {
                        botonesDiasRef.current.delete(
                          dia.fecha,
                        );
                      }
                    }}
                    type="button"
                    role="tab"
                    aria-selected={
                      seleccionado
                    }
                    aria-controls="contenido-dia-partidos"
                    onClick={() => {
                      setFechaSeleccionada(
                        dia.fecha,
                      );

                      centrarDia(
                        dia.fecha,
                      );
                    }}
                    className={`relative flex w-32 shrink-0 snap-center flex-col items-center justify-center rounded-xl px-3 py-3 text-center transition-colors ${
                      seleccionado
                        ? "bg-secondary text-on-secondary shadow-sm"
                        : "text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    <span
                      className={`text-[0.65rem] font-black uppercase tracking-[0.14em] ${
                        seleccionado
                          ? "text-primary-fixed"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {dia.esHoy
                        ? "Hoy"
                        : formatearDiaCorto(
                            dia.fecha,
                          )}
                    </span>

                    <span className="mt-0.5 text-xl font-black leading-none">
                      {formatearNumeroDia(
                        dia.fecha,
                      )}
                    </span>

                    <span
                      className={`mt-1 text-xs font-semibold ${
                        seleccionado
                          ? "text-on-secondary/80"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {formatearMesCorto(
                        dia.fecha,
                      )}
                    </span>

                    <span
                      className={`mt-1.5 text-[0.65rem] font-bold ${
                        seleccionado
                          ? "text-primary-fixed"
                          : dia.partidos
                                .length >
                              0
                            ? "text-secondary"
                            : "text-outline"
                      }`}
                    >
                      {dia.partidos
                        .length === 0
                        ? "Sin partidos"
                        : `${dia.partidos.length} ${
                            dia.partidos
                              .length ===
                            1
                              ? "partido"
                              : "partidos"
                          }`}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <div
            className={`pointer-events-none absolute inset-y-0 left-0 z-20 w-14 bg-linear-to-r from-surface-container-lowest via-surface-container-lowest/85 to-transparent transition-opacity ${
              puedeDesplazarIzquierda
                ? "opacity-100"
                : "opacity-0"
            }`}
            style={{
              boxShadow:
                "inset 18px 0 18px -20px rgba(3, 42, 85, 0.8)",
            }}
            aria-hidden="true"
          />

          <div
            className={`pointer-events-none absolute inset-y-0 right-0 z-20 w-14 bg-linear-to-l from-surface-container-lowest via-surface-container-lowest/85 to-transparent transition-opacity ${
              puedeDesplazarDerecha
                ? "opacity-100"
                : "opacity-0"
            }`}
            style={{
              boxShadow:
                "inset -18px 0 18px -20px rgba(3, 42, 85, 0.8)",
            }}
            aria-hidden="true"
          />

          {puedeDesplazarDerecha && (
            <button
              type="button"
              onClick={() =>
                desplazarMenu(
                  "derecha",
                )
              }
              className="absolute right-1 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface shadow-md transition-colors hover:bg-primary hover:text-on-primary"
              aria-label="Ver días posteriores"
            >
              <IconoFlecha
                direccion="derecha"
              />
            </button>
          )}
        </div>

        {diaSeleccionado && (
          <div
            id="contenido-dia-partidos"
            role="tabpanel"
            className="mx-auto mt-7 max-w-4xl"
          >
            <header className="flex flex-wrap items-end justify-between gap-2 border-b border-outline-variant pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-secondary">
                  {diaSeleccionado
                    .esHoy
                    ? "Partidos de hoy"
                    : "Partidos del día"}
                </p>

                <h3 className="mt-1 text-xl font-black text-on-secondary-fixed sm:text-2xl">
                  {formatearDiaSemana(
                    diaSeleccionado
                      .fecha,
                  )}
                  {", "}
                  {formatearNumeroDia(
                    diaSeleccionado
                      .fecha,
                  )}
                  {" de "}
                  {formatearMesCorto(
                    diaSeleccionado
                      .fecha,
                  )}
                </h3>
              </div>

              {diaSeleccionado
                .partidos.length >
                0 && (
                <span className="text-sm font-semibold text-on-surface-variant">
                  {
                    diaSeleccionado
                      .partidos
                      .length
                  }{" "}
                  {diaSeleccionado
                    .partidos
                    .length === 1
                    ? "partido"
                    : "partidos"}
                </span>
              )}
            </header>

            {diaSeleccionado
              .partidos.length >
            0 ? (
              <div className="divide-y divide-outline-variant/80">
                {diaSeleccionado.partidos.map(
                  (
                    partido,
                  ) => (
                    <PartidoFila
                      key={
                        partido.id
                      }
                      partido={
                        partido
                      }
                    />
                  ),
                )}
              </div>
            ) : (
              <div className="py-12 text-center sm:py-16">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low text-outline">
                  <IconoCalendario />
                </span>

                <h3 className="mt-4 text-lg font-black text-on-surface">
                  {diaSeleccionado
                    .esHoy
                    ? "Hoy no hay partidos"
                    : "No hay partidos este día"}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
                  Utiliza el selector superior para consultar los partidos de los días anteriores o posteriores.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}