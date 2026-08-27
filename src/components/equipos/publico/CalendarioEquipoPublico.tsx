import {
  useCallback,
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

interface RespuestaCalendario {
  ok: boolean;

  data: {
    anio: number;
    mes: number;
    eventos?: EventoCalendario[];
  } | null;

  error: string | null;
}

export default function CalendarioEquipoPublico({
  equipoId,
}: Propiedades) {
  const [eventos, setEventos] =
    useState<EventoCalendario[]>([]);

  const [cargando, setCargando] =
    useState(false);

  const [
    errorCarga,
    setErrorCarga,
  ] = useState<string | null>(null);

  const numeroPeticion =
    useRef(0);

  const cargarMes = useCallback(
    async (
      anio: number,
      mes: number,
    ) => {
      const peticion =
        numeroPeticion.current + 1;

      numeroPeticion.current =
        peticion;

      setCargando(true);
      setErrorCarga(null);

      try {
        const parametros =
          new URLSearchParams({
            anio: String(anio),
            mes: String(mes),
          });

        const respuesta =
          await fetch(
            `/api/equipos/${encodeURIComponent(equipoId)}/calendario?${parametros.toString()}`,
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
          (await respuesta.json()) as RespuestaCalendario;

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

        if (
          numeroPeticion.current !==
          peticion
        ) {
          return;
        }

        const eventosRecibidos =
          contenido.data.eventos;

        setEventos(
          Array.isArray(
            eventosRecibidos,
          )
            ? eventosRecibidos
            : [],
        );
      } catch (error) {
        if (
          numeroPeticion.current !==
          peticion
        ) {
          return;
        }

        console.error(
          "Error cargando el calendario del equipo:",
          error,
        );

        setEventos([]);

        setErrorCarga(
          error instanceof Error
            ? error.message
            : "No se ha podido cargar el calendario.",
        );
      } finally {
        if (
          numeroPeticion.current ===
          peticion
        ) {
          setCargando(false);
        }
      }
    },
    [equipoId],
  );

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

          <p className="mt-1 text-sm text-on-surface-variant">
            Consulta entrenamientos,
            modificaciones, cancelaciones
            y partidos del equipo.
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

      {errorCarga && (
        <div
          className="mb-4 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
          role="alert"
        >
          {errorCarga}
        </div>
      )}

      <CalendarioTemporada
        eventos={eventos}
        alCambiarMes={cargarMes}
      />
    </section>
  );
}