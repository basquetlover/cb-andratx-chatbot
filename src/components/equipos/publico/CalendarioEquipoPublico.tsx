
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import CalendarioTemporada from "@components/calendario/CalendarioTemporada";

import type {
  EventoCalendario,
} from "@components/calendario/CalendarioTemporada";

interface Propiedades {
  equipoId: string;
}

interface DatosCalendario {
  anio: number;
  mes: number;
  eventos?: EventoCalendario[];
  puedeVerEntrenamientos?: boolean;
}

interface RespuestaCalendario {
  ok: boolean;
  data: DatosCalendario | null;
  error: string | null;
}

interface MesConsultado {
  anio: number;
  mes: number;
}

type EstadoAcceso =
  | "comprobando"
  | "autorizado"
  | "restringido"
  | "desconocido";

function esEntrenamiento(
  evento: EventoCalendario,
): boolean {
  return (
    evento.tipo === "entreno" ||
    evento.tipo === "entreno-modificado" ||
    evento.tipo === "entreno-cancelado"
  );
}

function AvisoEntrenamientosSocios() {
  return (
    <div
      className="mb-5 overflow-hidden rounded-2xl border border-primary/25 bg-surface-container-low shadow-sm"
      role="note"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary"
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

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Acceso restringido
          </p>

          <h3 className="mt-1 text-lg font-black text-on-surface">
            Información exclusiva para socios
          </h3>

          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Los horarios de entrenamiento,
            sus modificaciones y cancelaciones
            solo están disponibles para los
            socios del club con un carnet activo.
          </p>

          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Puedes seguir consultando los
            partidos del equipo en el
            calendario. Para ver también
            sus entrenamientos, inicia
            sesión como socio.
          </p>

          <a
            href="/socios/iniciar-sesion"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:opacity-90"
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
    </div>
  );
}

export default function CalendarioEquipoPublico({
  equipoId,
}: Propiedades) {
  const [
    eventos,
    setEventos,
  ] = useState<EventoCalendario[]>([]);

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    errorCarga,
    setErrorCarga,
  ] = useState<string | null>(null);

  const [
    estadoAcceso,
    setEstadoAcceso,
  ] = useState<EstadoAcceso>(
    "comprobando",
  );

  const numeroPeticion = useRef(0);

  const controladorActivo =
    useRef<AbortController | null>(
      null,
    );

  const mesActual =
    useRef<MesConsultado | null>(
      null,
    );

  // ==================================================
  // CARGAR CALENDARIO
  // ==================================================

  const cargarMes = useCallback(
    async (
      anio: number,
      mes: number,
    ) => {
      mesActual.current = {
        anio,
        mes,
      };

      numeroPeticion.current += 1;

      const peticion =
        numeroPeticion.current;

      // Cancelar cualquier consulta anterior.

      controladorActivo.current?.abort();

      const controlador =
        new AbortController();

      controladorActivo.current =
        controlador;

      // Eliminar datos de la consulta anterior
      // mientras se comprueba la nueva sesión.

      setEventos([]);
      setCargando(true);
      setErrorCarga(null);
      setEstadoAcceso("comprobando");

      try {
        const parametros =
          new URLSearchParams({
            anio: String(anio),
            mes: String(mes),
          });

        const respuesta = await fetch(
          `/api/equipos/${encodeURIComponent(equipoId)}/calendario?${parametros.toString()}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",

            headers: {
              Accept: "application/json",
            },

            signal: controlador.signal,
          },
        );

        const contenido =
          (await respuesta.json()) as
            RespuestaCalendario;

        if (
          controlador.signal.aborted ||
          numeroPeticion.current !== peticion
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

        // La autorización procede del servidor.

        const autorizado =
          contenido.data
            .puedeVerEntrenamientos === true;

        const eventosRecibidos =
          Array.isArray(
            contenido.data.eventos,
          )
            ? contenido.data.eventos
            : [];

        // Protección adicional en el navegador.
        // Si no está autorizado, descartar
        // cualquier evento de entrenamiento.

        const eventosPermitidos =
          autorizado
            ? eventosRecibidos
            : eventosRecibidos.filter(
                (evento) =>
                  !esEntrenamiento(evento),
              );

        setEventos(
          eventosPermitidos,
        );

        setEstadoAcceso(
          autorizado
            ? "autorizado"
            : "restringido",
        );
      } catch (error) {
        if (
          controlador.signal.aborted ||
          numeroPeticion.current !== peticion
        ) {
          return;
        }

        console.error(
          "Error cargando el calendario del equipo:",
          error,
        );

        setEventos([]);

        // Un error de conexión no significa
        // que el usuario no sea socio.

        setEstadoAcceso(
          "desconocido",
        );

        setErrorCarga(
          error instanceof Error
            ? error.message
            : "No se ha podido cargar el calendario.",
        );
      } finally {
        if (
          numeroPeticion.current === peticion
        ) {
          setCargando(false);

          if (
            controladorActivo.current ===
            controlador
          ) {
            controladorActivo.current =
              null;
          }
        }
      }
    },
    [equipoId],
  );

  // ==================================================
  // ACTUALIZAR AL RECUPERAR LA PESTAÑA
  // ==================================================

  useEffect(() => {
    function actualizarCalendario() {
      const mes =
        mesActual.current;

      if (!mes) {
        return;
      }

      void cargarMes(
        mes.anio,
        mes.mes,
      );
    }

    function comprobarVisibilidad() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        actualizarCalendario();
      }
    }

    function comprobarPaginaRestaurada(
      evento: PageTransitionEvent,
    ) {
      if (evento.persisted) {
        actualizarCalendario();
      }
    }

    window.addEventListener(
      "focus",
      actualizarCalendario,
    );

    document.addEventListener(
      "visibilitychange",
      comprobarVisibilidad,
    );

    window.addEventListener(
      "pageshow",
      comprobarPaginaRestaurada,
    );

    return () => {
      window.removeEventListener(
        "focus",
        actualizarCalendario,
      );

      document.removeEventListener(
        "visibilitychange",
        comprobarVisibilidad,
      );

      window.removeEventListener(
        "pageshow",
        comprobarPaginaRestaurada,
      );
    };
  }, [cargarMes]);

  // ==================================================
  // LIMPIEZA AL DESMONTAR EL COMPONENTE
  // ==================================================

  useEffect(() => {
    return () => {
      numeroPeticion.current += 1;

      controladorActivo.current?.abort();

      controladorActivo.current =
        null;
    };
  }, []);

  // ==================================================
  // REINTENTAR CONSULTA
  // ==================================================

  function reintentar() {
    const mes =
      mesActual.current;

    if (!mes) {
      return;
    }

    void cargarMes(
      mes.anio,
      mes.mes,
    );
  }

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
            Agenda del equipo
          </p>

          <h2 className="mt-1 text-2xl font-black text-on-surface">
            Calendario completo
          </h2>

          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            Consulta los partidos del
            equipo y, si eres socio,
            sus entrenamientos,
            modificaciones y cancelaciones.
          </p>
        </div>

        {cargando && (
          <span
            className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1.5 text-xs font-bold text-on-primary-fixed"
            role="status"
          >
            <span
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-primary-fixed/30 border-t-on-primary-fixed"
              aria-hidden="true"
            />

            Cargando calendario...
          </span>
        )}
      </header>

      {/* AVISO PARA USUARIOS SIN ACCESO */}

      {estadoAcceso === "restringido" && (
        <AvisoEntrenamientosSocios />
      )}

      {/* ERROR DE CONSULTA */}

      {errorCarga && (
        <div
          className="mb-4 rounded-xl border border-error/30 bg-error-container px-4 py-4 text-on-error-container"
          role="alert"
        >
          <p className="font-bold">
            No se ha podido cargar el
            calendario
          </p>

          <p className="mt-2 text-sm">
            {errorCarga}
          </p>

          <button
            type="button"
            onClick={reintentar}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-error px-4 py-2 text-sm font-bold text-on-error-container transition-colors hover:bg-error hover:text-on-error"
          >
            Volver a intentarlo
          </button>
        </div>
      )}

      {/* CALENDARIO DE PARTIDOS Y ENTRENAMIENTOS */}

      <CalendarioTemporada
        eventos={eventos}
        alCambiarMes={cargarMes}
      />
    </section>
  );
}
