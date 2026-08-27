import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import CalendarioTemporada from "@components/calendario/CalendarioTemporada";

import {
  escucharCambiosFavoritos,
  obtenerEquiposFavoritos,
} from "@servicios/favoritos/equiposFavoritos";

import type {
  EventoCalendario,
  TipoEventoCalendario,
} from "@components/calendario/CalendarioTemporada";

export interface EventoCalendarioClub
  extends EventoCalendario {
  equipoId?: string | null;
  equipoNombre?: string | null;
  alcance?: "club" | "equipo";
}

interface DatosCalendarioApi {
  temporadaId: string | null;
  eventos: EventoCalendarioClub[];
}

interface RespuestaCalendarioApi {
  ok: boolean;
  data: DatosCalendarioApi | null;
  error?: string | null;
}

type AlcanceCalendario =
  | "club"
  | "favoritos";

type FiltroActividad =
  | "todo"
  | "entrenamientos"
  | "partidos"
  | "eventos";

interface PropiedadesBotonFiltro {
  activo: boolean;
  etiqueta: string;
  cantidad?: number;
  onClick: () => void;
  deshabilitado?: boolean;
}

interface PropiedadesIcono {
  tipo: TipoEventoCalendario;
  className?: string;
}

function BotonFiltro({
  activo,
  etiqueta,
  cantidad,
  onClick,
  deshabilitado = false,
}: PropiedadesBotonFiltro) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-pressed={activo}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        activo
          ? "border-primary bg-primary text-on-primary shadow-sm"
          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary"
      }`}
    >
      <span>{etiqueta}</span>

      {typeof cantidad ===
        "number" && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            activo
              ? "bg-on-primary/15 text-on-primary"
              : "bg-surface-container text-on-surface-variant"
          }`}
        >
          {cantidad}
        </span>
      )}
    </button>
  );
}

function IconoTipoEvento({
  tipo,
  className = "h-4 w-4",
}: PropiedadesIcono) {
  const ruta =
    `/iconos/calendario/${tipo}.svg`;

  return (
    <span
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{
        maskImage:
          `url("${ruta}")`,
        WebkitMaskImage:
          `url("${ruta}")`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat:
          "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition:
          "center",
        maskSize: "contain",
        WebkitMaskSize:
          "contain",
      }}
      aria-hidden="true"
    />
  );
}

function perteneceFiltroActividad(
  evento: EventoCalendarioClub,
  filtro: FiltroActividad,
): boolean {
  if (filtro === "todo") {
    return true;
  }

  if (
    filtro ===
    "entrenamientos"
  ) {
    return (
      evento.tipo === "entreno" ||
      evento.tipo ===
        "entreno-modificado" ||
      evento.tipo ===
        "entreno-cancelado"
    );
  }

  if (filtro === "partidos") {
    return (
      evento.tipo ===
        "partido-casa" ||
      evento.tipo ===
        "partido-fuera"
    );
  }

  return evento.tipo === "evento";
}

function obtenerClaveEvento(
  evento: EventoCalendarioClub,
): string {
  return [
    evento.id,
    evento.fecha,
    evento.fechaFin ?? "",
    evento.tipo,
  ].join(":");
}

function combinarEventos(
  eventosPorMes: Record<
    string,
    EventoCalendarioClub[]
  >,
): EventoCalendarioClub[] {
  const eventosUnicos =
    new Map<
      string,
      EventoCalendarioClub
    >();

  Object.values(
    eventosPorMes,
  ).forEach((eventos) => {
    eventos.forEach((evento) => {
      eventosUnicos.set(
        obtenerClaveEvento(
          evento,
        ),
        evento,
      );
    });
  });

  return Array.from(
    eventosUnicos.values(),
  );
}

function esEventoGeneralClub(
  evento: EventoCalendarioClub,
): boolean {
  return (
    evento.alcance === "club" ||
    !evento.equipoId
  );
}

export default function ContenedorCalendario() {
  const [
    alcance,
    setAlcance,
  ] = useState<AlcanceCalendario>(
    "club",
  );

  const [
    filtroActividad,
    setFiltroActividad,
  ] =
    useState<FiltroActividad>(
      "todo",
    );

  const [
    temporadaId,
    setTemporadaId,
  ] = useState<string | null>(
    null,
  );

  const [
    favoritosIds,
    setFavoritosIds,
  ] = useState<string[]>([]);

  const [
    eventosPorMes,
    setEventosPorMes,
  ] = useState<
    Record<
      string,
      EventoCalendarioClub[]
    >
  >({});

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    mesSolicitado,
    setMesSolicitado,
  ] = useState<{
    anio: number;
    mes: number;
  } | null>(null);

  const mesesCargados =
    useRef<Set<string>>(
      new Set(),
    );

  const mesesCargando =
    useRef<Set<string>>(
      new Set(),
    );

  const cargarMes =
    useCallback(
      async (
        anio: number,
        mes: number,
        forzar = false,
      ) => {
        const claveMes =
          `${anio}-${String(
            mes,
          ).padStart(2, "0")}`;

        setMesSolicitado({
          anio,
          mes,
        });

        if (
          !forzar &&
          (
            mesesCargados.current.has(
              claveMes,
            ) ||
            mesesCargando.current.has(
              claveMes,
            )
          )
        ) {
          return;
        }

        mesesCargando.current.add(
          claveMes,
        );

        try {
          setCargando(true);
          setError(null);

          const parametros =
            new URLSearchParams({
              anio:
                String(anio),
              mes:
                String(mes),
            });

          const respuesta =
            await fetch(
              `/api/calendario?${parametros.toString()}`,
              {
                method: "GET",
                credentials:
                  "same-origin",
                headers: {
                  Accept:
                    "application/json",
                },
              },
            );

          const contenido =
            (
              await respuesta.json()
            ) as RespuestaCalendarioApi;

          if (
            !respuesta.ok ||
            !contenido.ok ||
            !contenido.data
          ) {
            throw new Error(
              contenido.error ??
                "No se ha podido cargar el calendario.",
            );
          }

          const eventosRecibidos =
            Array.isArray(
              contenido.data.eventos,
            )
              ? contenido.data
                  .eventos
              : [];

          setTemporadaId(
            contenido.data
              .temporadaId,
          );

          setEventosPorMes(
            (
              eventosActuales,
            ) => ({
              ...eventosActuales,

              [claveMes]:
                eventosRecibidos,
            }),
          );

          mesesCargados.current.add(
            claveMes,
          );
        } catch (error) {
          console.error(
            `Error cargando el calendario de ${mes}/${anio}:`,
            error,
          );

          mesesCargados.current.delete(
            claveMes,
          );

          setError(
            error instanceof Error
              ? error.message
              : "No se ha podido cargar el calendario.",
          );
        } finally {
          mesesCargando.current.delete(
            claveMes,
          );

          setCargando(false);
        }
      },
      [],
    );

  /*
   * Cargamos los UUID favoritos usando
   * exactamente el ID de la temporada
   * activa devuelto por la API.
   */
  useEffect(() => {
    if (!temporadaId) {
      setFavoritosIds([]);
      return;
    }

    const favoritos =
      obtenerEquiposFavoritos(
        temporadaId,
      );

    setFavoritosIds(
      favoritos,
    );

    return escucharCambiosFavoritos(
      temporadaId,
      setFavoritosIds,
    );
  }, [temporadaId]);

  /*
   * Todo el club no permite mostrar
   * entrenamientos. Si el usuario tenía
   * ese filtro seleccionado en Favoritos,
   * volvemos automáticamente a Todo.
   */
  useEffect(() => {
    if (
      alcance === "club" &&
      filtroActividad ===
        "entrenamientos"
    ) {
      setFiltroActividad(
        "todo",
      );
    }
  }, [
    alcance,
    filtroActividad,
  ]);

  const todosLosEventos =
    useMemo(
      () =>
        combinarEventos(
          eventosPorMes,
        ),
      [eventosPorMes],
    );

  const favoritosSet =
    useMemo(
      () =>
        new Set(
          favoritosIds,
        ),
      [favoritosIds],
    );

  /*
   * Todo el club:
   * - Partidos de todos los equipos.
   * - Eventos generales del club.
   * - Nunca entrenamientos.
   *
   * Favoritos:
   * - Partidos de equipos favoritos.
   * - Entrenamientos de favoritos.
   * - Modificaciones y cancelaciones.
   * - Eventos generales del club.
   */
  const eventosPorAlcance =
    useMemo(() => {
      if (
        alcance === "club"
      ) {
        return todosLosEventos.filter(
          (evento) =>
            evento.tipo ===
              "partido-casa" ||
            evento.tipo ===
              "partido-fuera" ||
            esEventoGeneralClub(
              evento,
            ),
        );
      }

      return todosLosEventos.filter(
        (evento) => {
          if (
            esEventoGeneralClub(
              evento,
            )
          ) {
            return true;
          }

          return Boolean(
            evento.equipoId &&
              favoritosSet.has(
                evento.equipoId,
              ),
          );
        },
      );
    }, [
      alcance,
      todosLosEventos,
      favoritosSet,
    ]);

  const eventosFiltrados =
    useMemo(
      () =>
        eventosPorAlcance.filter(
          (evento) =>
            perteneceFiltroActividad(
              evento,
              filtroActividad,
            ),
        ),
      [
        eventosPorAlcance,
        filtroActividad,
      ],
    );

  const cantidades =
    useMemo(() => {
      return {
        todo:
          eventosPorAlcance.length,

        entrenamientos:
          eventosPorAlcance.filter(
            (evento) =>
              perteneceFiltroActividad(
                evento,
                "entrenamientos",
              ),
          ).length,

        partidos:
          eventosPorAlcance.filter(
            (evento) =>
              perteneceFiltroActividad(
                evento,
                "partidos",
              ),
          ).length,

        eventos:
          eventosPorAlcance.filter(
            (evento) =>
              perteneceFiltroActividad(
                evento,
                "eventos",
              ),
          ).length,
      };
    }, [eventosPorAlcance]);

  const reintentar = () => {
    if (!mesSolicitado) {
      return;
    }

    void cargarMes(
      mesSolicitado.anio,
      mesSolicitado.mes,
      true,
    );
  };

  return (
    <section
      className="mx-auto max-w-6xl"
      aria-labelledby="titulo-calendario"
    >
      <div className="mb-4 overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-low shadow-sm">
        <div className="border-b border-outline-variant/60 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2
                id="titulo-calendario"
                className="font-bold text-on-surface"
              >
                Actividades del club
              </h2>

              <p className="mt-1 text-sm text-on-surface-variant">
                Consulta partidos,
                entrenamientos y eventos
                sin seleccionar equipos
                individualmente.
              </p>
            </div>

            <div
              className="flex rounded-xl border border-outline-variant bg-surface-container-lowest p-1"
              aria-label="Alcance del calendario"
            >
              <button
                type="button"
                onClick={() =>
                  setAlcance(
                    "club",
                  )
                }
                aria-pressed={
                  alcance ===
                  "club"
                }
                className={`min-h-10 flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors sm:flex-none ${
                  alcance ===
                  "club"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                Todo el club
              </button>

              <button
                type="button"
                onClick={() =>
                  setAlcance(
                    "favoritos",
                  )
                }
                aria-pressed={
                  alcance ===
                  "favoritos"
                }
                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors sm:flex-none ${
                  alcance ===
                  "favoritos"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                Favoritos

                {favoritosIds.length >
                  0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      alcance ===
                      "favoritos"
                        ? "bg-on-primary/15"
                        : "bg-surface-container"
                    }`}
                  >
                    {
                      favoritosIds.length
                    }
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Mostrar
          </p>

          <div className="flex flex-wrap gap-2">
            <BotonFiltro
              activo={
                filtroActividad ===
                "todo"
              }
              etiqueta="Todo"
              cantidad={
                cantidades.todo
              }
              onClick={() =>
                setFiltroActividad(
                  "todo",
                )
              }
            />

            <BotonFiltro
              activo={
                filtroActividad ===
                "entrenamientos"
              }
              etiqueta="Entrenamientos"
              cantidad={
                cantidades.entrenamientos
              }
              deshabilitado={
                alcance === "club"
              }
              onClick={() =>
                setFiltroActividad(
                  "entrenamientos",
                )
              }
            />

            <BotonFiltro
              activo={
                filtroActividad ===
                "partidos"
              }
              etiqueta="Partidos"
              cantidad={
                cantidades.partidos
              }
              onClick={() =>
                setFiltroActividad(
                  "partidos",
                )
              }
            />

            <BotonFiltro
              activo={
                filtroActividad ===
                "eventos"
              }
              etiqueta="Eventos"
              cantidad={
                cantidades.eventos
              }
              onClick={() =>
                setFiltroActividad(
                  "eventos",
                )
              }
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5 text-primary">
              <IconoTipoEvento tipo="evento" />
              Evento del club
            </span>

            {alcance ===
              "favoritos" && (
              <>
                <span className="inline-flex items-center gap-1.5 text-success">
                  <IconoTipoEvento tipo="entreno" />
                  Entrenamiento
                </span>

                <span className="inline-flex items-center gap-1.5 text-primary">
                  <IconoTipoEvento tipo="entreno-modificado" />
                  Modificación
                </span>

                <span className="inline-flex items-center gap-1.5 text-error">
                  <IconoTipoEvento tipo="entreno-cancelado" />
                  Cancelado
                </span>
              </>
            )}

            <span className="inline-flex items-center gap-1.5 text-secondary">
              <IconoTipoEvento tipo="partido-casa" />
              Partido en casa
            </span>

            <span className="inline-flex items-center gap-1.5 text-outline">
              <IconoTipoEvento tipo="partido-fuera" />
              Partido fuera
            </span>
          </div>
        </div>
      </div>

      {alcance ===
        "favoritos" &&
        favoritosIds.length ===
          0 && (
        <div className="mb-4 rounded-2xl border border-primary/30 bg-primary-fixed/50 px-4 py-4 text-on-primary-fixed sm:px-5">
          <p className="text-sm font-bold">
            Todavía no tienes equipos
            favoritos
          </p>

          <p className="mt-1 text-sm">
            Se seguirán mostrando los
            eventos generales del club.
            Añade equipos a favoritos
            para ver sus entrenamientos
            y partidos.
          </p>

          <a
            href="/equipos"
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary"
          >
            Elegir equipos favoritos
          </a>
        </div>
      )}

      {error && (
        <div
          className="mb-4 rounded-2xl border border-error/40 bg-error-container px-4 py-4 text-on-error-container"
          role="alert"
        >
          <p className="font-bold">
            No se ha podido cargar el
            calendario
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>

          <button
            type="button"
            onClick={reintentar}
            className="mt-3 min-h-10 rounded-xl border border-error px-4 py-2 text-sm font-bold transition-colors hover:bg-error hover:text-on-error"
          >
            Volver a intentarlo
          </button>
        </div>
      )}

      <div className="relative">
        {cargando && (
          <div
            className="absolute right-3 top-3 z-20 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest/95 px-3 py-2 text-xs font-bold text-on-surface-variant shadow-sm"
            role="status"
          >
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
              aria-hidden="true"
            />

            Actualizando…
          </div>
        )}

        <CalendarioTemporada
          eventos={
            eventosFiltrados
          }
          alCambiarMes={
            cargarMes
          }
        />
      </div>

      <div className="mt-6 rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-4 sm:px-5">
        <p className="text-xs leading-5 text-on-surface-variant">
          Las fechas y los horarios
          pueden sufrir modificaciones.
          Comprueba siempre los avisos
          oficiales del club y la
          información publicada por la
          FBIB.
        </p>
      </div>
    </section>
  );
}