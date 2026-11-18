
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
  alcance?:
    | "club"
    | "equipo"
    | "todo-club"
    | "equipos";
  equiposIds?: string[];
}

interface DatosCalendarioApi {
  temporadaId: string | null;
  temporadaNombre?: string | null;
  puedeVerEntrenamientos: boolean;
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

type EstadoAcceso =
  | "comprobando"
  | "autorizado"
  | "restringido";

interface MesCalendario {
  anio: number;
  mes: number;
}

interface PropiedadesBotonFiltro {
  activo: boolean;
  etiqueta: string;
  cantidad?: number;
  bloqueado?: boolean;
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
  bloqueado = false,
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
      {bloqueado && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="11"
            width="18"
            height="11"
            rx="2"
          />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}

      <span>{etiqueta}</span>

      {typeof cantidad === "number" && (
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
        maskImage: `url("${ruta}")`,
        WebkitMaskImage: `url("${ruta}")`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
      aria-hidden="true"
    />
  );
}

function esEntrenamiento(
  evento: EventoCalendarioClub,
): boolean {
  return (
    evento.tipo === "entreno" ||
    evento.tipo === "entreno-modificado" ||
    evento.tipo === "entreno-cancelado"
  );
}

function perteneceFiltroActividad(
  evento: EventoCalendarioClub,
  filtro: FiltroActividad,
): boolean {
  if (filtro === "todo") {
    return true;
  }

  if (filtro === "entrenamientos") {
    return esEntrenamiento(evento);
  }

  if (filtro === "partidos") {
    return (
      evento.tipo === "partido-casa" ||
      evento.tipo === "partido-fuera"
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
    new Map<string, EventoCalendarioClub>();

  Object.values(eventosPorMes).forEach(
    (eventos) => {
      eventos.forEach((evento) => {
        eventosUnicos.set(
          obtenerClaveEvento(evento),
          evento,
        );
      });
    },
  );

  return Array.from(eventosUnicos.values());
}

function esEventoGeneralClub(
  evento: EventoCalendarioClub,
): boolean {
  return (
    evento.alcance === "club" ||
    !evento.equipoId
  );
}

function AvisoAccesoSocios() {
  return (
    <section
      className="mb-5 overflow-hidden rounded-2xl border border-primary/25 bg-surface-container-lowest shadow-sm"
      aria-labelledby="titulo-acceso-entrenamientos"
    >
      <div className="border-b border-outline-variant/50 bg-primary-container/50 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
              />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Acceso restringido
            </p>

            <h3
              id="titulo-acceso-entrenamientos"
              className="mt-1 text-lg font-black text-on-surface sm:text-xl"
            >
              Información exclusiva para socios
            </h3>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <p className="text-sm leading-6 text-on-surface-variant">
          Los horarios de entrenamiento,
          sus modificaciones y cancelaciones
          son información exclusiva para
          los socios del Club Bàsquet Andratx.
        </p>

        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Si eres socio, inicia sesión con
          tu cuenta para consultar los
          entrenamientos de tus equipos
          favoritos.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/socios/iniciar-sesion"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:opacity-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" />
            </svg>

            Iniciar sesión como socio
          </a>
        </div>
      </div>
    </section>
  );
}

export default function ContenedorCalendario() {
  const [
    alcance,
    setAlcance,
  ] = useState<AlcanceCalendario>("club");

  const [
    filtroActividad,
    setFiltroActividad,
  ] = useState<FiltroActividad>("todo");

  const [
    estadoAcceso,
    setEstadoAcceso,
  ] = useState<EstadoAcceso>("comprobando");

  const [
    temporadaId,
    setTemporadaId,
  ] = useState<string | null>(null);

  const [
    favoritosIds,
    setFavoritosIds,
  ] = useState<string[]>([]);

  const [
    eventosPorMes,
    setEventosPorMes,
  ] = useState<
    Record<string, EventoCalendarioClub[]>
  >({});

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    mesSolicitado,
    setMesSolicitado,
  ] = useState<MesCalendario | null>(null);

  const mesSolicitadoRef =
    useRef<MesCalendario | null>(null);

  const mesesCargados =
    useRef<Set<string>>(new Set());

  const mesesCargando =
    useRef<Set<string>>(new Set());

  const versionCarga = useRef(0);

  const accesoAnterior =
    useRef<boolean | null>(null);

  // ============================================
  // CARGAR CALENDARIO
  // ============================================

  const cargarMes = useCallback(
    async (
      anio: number,
      mes: number,
      forzar = false,
    ) => {
      const claveMes =
        `${anio}-${String(mes).padStart(2, "0")}`;

      const mesActual = {
        anio,
        mes,
      };

      mesSolicitadoRef.current =
        mesActual;

      setMesSolicitado(mesActual);

      if (
        !forzar &&
        (
          mesesCargados.current.has(claveMes) ||
          mesesCargando.current.has(claveMes)
        )
      ) {
        return;
      }

      const versionActual =
        versionCarga.current;

      mesesCargando.current.add(claveMes);
      setCargando(true);
      setError(null);

      try {
        const parametros =
          new URLSearchParams({
            anio: String(anio),
            mes: String(mes),
          });

        const respuesta = await fetch(
          `/api/calendario?${parametros.toString()}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const contenido =
          (await respuesta.json()) as
            RespuestaCalendarioApi;

        if (
          versionActual !==
          versionCarga.current
        ) {
          return;
        }

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

        const autorizado =
          contenido.data
            .puedeVerEntrenamientos === true;

        const eventosRecibidos =
          Array.isArray(
            contenido.data.eventos,
          )
            ? contenido.data.eventos
            : [];

        // Protección adicional:
        // nunca conservar entrenamientos
        // si el acceso no está autorizado.

        const eventosSeguros =
          autorizado
            ? eventosRecibidos
            : eventosRecibidos.filter(
                (evento) =>
                  !esEntrenamiento(evento),
              );

        const haCambiadoAcceso =
          accesoAnterior.current !== null &&
          accesoAnterior.current !== autorizado;

        if (haCambiadoAcceso) {
          mesesCargados.current.clear();

          setEventosPorMes({
            [claveMes]: eventosSeguros,
          });
        } else {
          setEventosPorMes(
            (eventosActuales) => ({
              ...eventosActuales,
              [claveMes]: eventosSeguros,
            }),
          );
        }

        accesoAnterior.current =
          autorizado;

        setEstadoAcceso(
          autorizado
            ? "autorizado"
            : "restringido",
        );

        setTemporadaId(
          contenido.data.temporadaId,
        );

        mesesCargados.current.add(
          claveMes,
        );
      } catch (errorCarga) {
        if (
          versionActual !==
          versionCarga.current
        ) {
          return;
        }

        console.error(
          `Error cargando el calendario de ${mes}/${anio}:`,
          errorCarga,
        );

        mesesCargados.current.delete(
          claveMes,
        );

        setError(
          errorCarga instanceof Error
            ? errorCarga.message
            : "No se ha podido cargar el calendario.",
        );
      } finally {
        if (
          versionActual ===
          versionCarga.current
        ) {
          mesesCargando.current.delete(
            claveMes,
          );

          setCargando(
            mesesCargando.current.size > 0,
          );
        }
      }
    },
    [],
  );

  // ============================================
  // REFRESCAR ACCESO AL VOLVER A LA PESTAÑA
  // ============================================

  useEffect(() => {
    function actualizarSesion() {
      const mes =
        mesSolicitadoRef.current;

      if (!mes) {
        return;
      }

      versionCarga.current += 1;

      mesesCargados.current.clear();
      mesesCargando.current.clear();

      accesoAnterior.current = null;

      setEventosPorMes({});
      setEstadoAcceso("comprobando");
      setCargando(false);
      setError(null);

      void cargarMes(
        mes.anio,
        mes.mes,
        true,
      );
    }

    function comprobarPaginaRestaurada(
      evento: PageTransitionEvent,
    ) {
      if (evento.persisted) {
        actualizarSesion();
      }
    }

    window.addEventListener(
      "focus",
      actualizarSesion,
    );

    window.addEventListener(
      "pageshow",
      comprobarPaginaRestaurada,
    );

    return () => {
      window.removeEventListener(
        "focus",
        actualizarSesion,
      );

      window.removeEventListener(
        "pageshow",
        comprobarPaginaRestaurada,
      );
    };
  }, [cargarMes]);

  // ============================================
  // EQUIPOS FAVORITOS
  // ============================================

  useEffect(() => {
    if (!temporadaId) {
      setFavoritosIds([]);
      return;
    }

    setFavoritosIds(
      obtenerEquiposFavoritos(
        temporadaId,
      ),
    );

    return escucharCambiosFavoritos(
      temporadaId,
      setFavoritosIds,
    );
  }, [temporadaId]);

  // En "Todo el club" se mantiene
  // el comportamiento original:
  // los socios consultan entrenamientos
  // desde sus equipos favoritos.

  useEffect(() => {
    if (
      alcance === "club" &&
      filtroActividad === "entrenamientos" &&
      estadoAcceso === "autorizado"
    ) {
      setFiltroActividad("todo");
    }
  }, [
    alcance,
    filtroActividad,
    estadoAcceso,
  ]);

  const puedeVerEntrenamientos =
    estadoAcceso === "autorizado";

  const accesoRestringido =
    estadoAcceso === "restringido";

  const mostrandoAvisoAcceso =
    filtroActividad === "entrenamientos" &&
    accesoRestringido;

  // ============================================
  // EVENTOS AUTORIZADOS
  // ============================================

  const todosLosEventos = useMemo(
    () => {
      const eventos =
        combinarEventos(eventosPorMes);

      if (!puedeVerEntrenamientos) {
        return eventos.filter(
          (evento) =>
            !esEntrenamiento(evento),
        );
      }

      return eventos;
    },
    [
      eventosPorMes,
      puedeVerEntrenamientos,
    ],
  );

  const favoritosSet = useMemo(
    () => new Set(favoritosIds),
    [favoritosIds],
  );

  // Todo el club:
  // partidos y eventos generales.
  //
  // Favoritos:
  // partidos y entrenamientos de favoritos,
  // además de eventos generales.

  const eventosPorAlcance = useMemo(
    () => {
      if (alcance === "club") {
        return todosLosEventos.filter(
          (evento) =>
            evento.tipo === "partido-casa" ||
            evento.tipo === "partido-fuera" ||
            esEventoGeneralClub(evento),
        );
      }

      return todosLosEventos.filter(
        (evento) => {
          if (esEventoGeneralClub(evento)) {
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
    },
    [
      alcance,
      todosLosEventos,
      favoritosSet,
    ],
  );

  const eventosFiltrados = useMemo(
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

  // ============================================
  // CONTADORES
  // ============================================

  const cantidades = useMemo(
    () => ({
      todo: eventosPorAlcance.length,

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
    }),
    [eventosPorAlcance],
  );

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

  // ============================================
  // INTERFAZ
  // ============================================

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

              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                Consulta los partidos
                y eventos del club.
                Los entrenamientos están
                disponibles para socios.
              </p>
            </div>

            <div
              className="flex rounded-xl border border-outline-variant bg-surface-container-lowest p-1"
              aria-label="Alcance del calendario"
            >
              <button
                type="button"
                onClick={() =>
                  setAlcance("club")
                }
                aria-pressed={
                  alcance === "club"
                }
                className={`min-h-10 flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors sm:flex-none ${
                  alcance === "club"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                Todo el club
              </button>

              <button
                type="button"
                onClick={() =>
                  setAlcance("favoritos")
                }
                aria-pressed={
                  alcance === "favoritos"
                }
                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors sm:flex-none ${
                  alcance === "favoritos"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                Favoritos

                {favoritosIds.length > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      alcance === "favoritos"
                        ? "bg-on-primary/15"
                        : "bg-surface-container"
                    }`}
                  >
                    {favoritosIds.length}
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
                filtroActividad === "todo"
              }
              etiqueta="Todo"
              cantidad={cantidades.todo}
              onClick={() =>
                setFiltroActividad("todo")
              }
            />

            <BotonFiltro
              activo={
                filtroActividad ===
                "entrenamientos"
              }
              etiqueta="Entrenamientos"
              cantidad={
                puedeVerEntrenamientos &&
                alcance === "favoritos"
                  ? cantidades.entrenamientos
                  : undefined
              }
              bloqueado={
                accesoRestringido
              }
              deshabilitado={
                estadoAcceso ===
                  "comprobando" ||
                (
                  puedeVerEntrenamientos &&
                  alcance === "club"
                )
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
              cantidad={cantidades.partidos}
              onClick={() =>
                setFiltroActividad("partidos")
              }
            />

            <BotonFiltro
              activo={
                filtroActividad ===
                "eventos"
              }
              etiqueta="Eventos"
              cantidad={cantidades.eventos}
              onClick={() =>
                setFiltroActividad("eventos")
              }
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5 text-primary">
              <IconoTipoEvento tipo="evento" />
              Evento del club
            </span>

            {alcance === "favoritos" &&
              puedeVerEntrenamientos && (
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

      {/* AVISO DE ACCESO EXCLUSIVO */}

      {mostrandoAvisoAcceso && (
        <AvisoAccesoSocios />
      )}

      {/* AVISO EN FAVORITOS PARA VISITANTES */}

      {alcance === "favoritos" &&
        accesoRestringido &&
        !mostrandoAvisoAcceso && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-4 sm:px-5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-primary"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
              />

              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>

            <p className="text-sm leading-6 text-on-surface-variant">
              Los entrenamientos de tus
              equipos favoritos son
              exclusivos para socios.{" "}
              <a
                href="/socios/iniciar-sesion"
                className="font-bold text-primary underline underline-offset-4"
              >
                Iniciar sesión
              </a>
            </p>
          </div>
        )}

      {/* EQUIPOS FAVORITOS */}

      {alcance === "favoritos" &&
        favoritosIds.length === 0 &&
        !mostrandoAvisoAcceso && (
          <div className="mb-4 rounded-2xl border border-primary/30 bg-primary-fixed/50 px-4 py-4 text-on-primary-fixed sm:px-5">
            <p className="text-sm font-bold">
              Todavía no tienes equipos
              favoritos
            </p>

            <p className="mt-1 text-sm">
              Se seguirán mostrando los
              eventos generales del club.
              Añade equipos a favoritos
              para consultar sus partidos
              {puedeVerEntrenamientos
                ? " y entrenamientos."
                : "."}
            </p>

            <a
              href="/equipos"
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary"
            >
              Elegir equipos favoritos
            </a>
          </div>
        )}

      {/* ERRORES DE CARGA */}

      {error && (
        <div
          className="mb-4 rounded-2xl border border-error/40 bg-error-container px-4 py-4 text-on-error-container"
          role="alert"
        >
          <p className="font-bold">
            No se ha podido cargar
            el calendario
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

      {/* CALENDARIO */}

      {!mostrandoAvisoAcceso && (
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
            eventos={eventosFiltrados}
            alCambiarMes={cargarMes}
          />
        </div>
      )}

      {/* NOTA INFORMATIVA */}

      <div className="mt-6 rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-4 sm:px-5">
        <p className="text-xs leading-5 text-on-surface-variant">
          Las fechas y los horarios
          pueden sufrir modificaciones.
          Comprueba siempre los avisos
          oficiales del club y la
          información publicada por
          la FBIB.
        </p>
      </div>
    </section>
  );
}
