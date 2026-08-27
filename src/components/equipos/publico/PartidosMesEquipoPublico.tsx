import {
  useRef,
  useState,
} from "react";

import TarjetaPartidoEquipoPublico from "./TarjetaPartidoEquipoPublico";

import type { PartidoEquipoFbib } from "@tipos/FbibEquipoPublico";

interface Propiedades {
  equipoId: string;

  partidosIniciales?:
    PartidoEquipoFbib[];

  mesInicial?: number;
}

interface MesSeleccionado {
  anio: number;
  mes: number;
}

interface RespuestaCalendario {
  ok: boolean;

  data: {
    anio: number;
    mes: number;

    partidos?:
      PartidoEquipoFbib[];
  } | null;

  error: string | null;
}

function obtenerFechaMadrid(): MesSeleccionado {
  const partes =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "numeric",
      },
    ).formatToParts(new Date());

  const anio = Number(
    partes.find(
      (parte) =>
        parte.type === "year",
    )?.value,
  );

  const mes = Number(
    partes.find(
      (parte) =>
        parte.type === "month",
    )?.value,
  );

  return {
    anio:
      Number.isInteger(anio)
        ? anio
        : new Date().getFullYear(),

    mes:
      Number.isInteger(mes) &&
      mes >= 1 &&
      mes <= 12
        ? mes
        : new Date().getMonth() +
          1,
  };
}

function obtenerIndiceMes(
  mes: MesSeleccionado,
): number {
  return (
    mes.anio * 12 +
    mes.mes -
    1
  );
}

function obtenerMesDesdeIndice(
  indice: number,
): MesSeleccionado {
  return {
    anio:
      Math.floor(indice / 12),

    mes:
      indice % 12 + 1,
  };
}

function obtenerLimitesTemporada(
  fechaActual: MesSeleccionado,
): {
  inicio: number;
  fin: number;
} {
  const anioInicio =
    fechaActual.mes >= 8
      ? fechaActual.anio
      : fechaActual.anio - 1;

  return {
    inicio:
      anioInicio * 12 + 7,

    fin:
      (anioInicio + 1) *
        12 +
      6,
  };
}

function obtenerNombreMes(
  mes: MesSeleccionado,
): string {
  const fecha = new Date(
    Date.UTC(
      mes.anio,
      mes.mes - 1,
      1,
    ),
  );

  const nombre =
    new Intl.DateTimeFormat(
      "es-ES",
      {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      },
    ).format(fecha);

  return (
    nombre.charAt(0).toUpperCase() +
    nombre.slice(1)
  );
}

export default function PartidosMesEquipoPublico({
  equipoId,
  partidosIniciales = [],
  mesInicial,
}: Propiedades) {
  const fechaActual =
    obtenerFechaMadrid();

  const mesInicialSeguro =
    typeof mesInicial ===
      "number" &&
    Number.isInteger(mesInicial) &&
    mesInicial >= 1 &&
    mesInicial <= 12
      ? mesInicial
      : fechaActual.mes;

  const [
    mesSeleccionado,
    setMesSeleccionado,
  ] = useState<MesSeleccionado>({
    anio: fechaActual.anio,
    mes: mesInicialSeguro,
  });

  const [partidos, setPartidos] =
    useState<
      PartidoEquipoFbib[]
    >(() =>
      Array.isArray(
        partidosIniciales,
      )
        ? partidosIniciales
        : [],
    );

  const [cargando, setCargando] =
    useState(false);

  const [
    errorCarga,
    setErrorCarga,
  ] = useState<string | null>(null);

  const numeroPeticion =
    useRef(0);

  const limitesTemporada =
    obtenerLimitesTemporada(
      fechaActual,
    );

  const indiceMesSeleccionado =
    obtenerIndiceMes(
      mesSeleccionado,
    );

  const puedeRetroceder =
    indiceMesSeleccionado >
    limitesTemporada.inicio;

  const puedeAvanzar =
    indiceMesSeleccionado <
    limitesTemporada.fin;

  const cargarMes = async (
    nuevoMes: MesSeleccionado,
  ) => {
    const peticion =
      numeroPeticion.current + 1;

    numeroPeticion.current =
      peticion;

    setMesSeleccionado(
      nuevoMes,
    );

    setCargando(true);
    setErrorCarga(null);

    try {
      const parametros =
        new URLSearchParams({
          anio:
            String(nuevoMes.anio),

          mes:
            String(nuevoMes.mes),
        });

      const respuesta = await fetch(
        `/api/equipos/${encodeURIComponent(equipoId)}/calendario?${parametros.toString()}`,
        {
          method: "GET",
          credentials: "same-origin",

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
            "No se han podido cargar los partidos.",
        );
      }

      if (
        numeroPeticion.current !==
        peticion
      ) {
        return;
      }

      setPartidos(
        Array.isArray(
          contenido.data.partidos,
        )
          ? contenido.data
              .partidos
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
        "Error cargando los partidos del mes:",
        error,
      );

      setPartidos([]);

      setErrorCarga(
        error instanceof Error
          ? error.message
          : "No se han podido cargar los partidos.",
      );
    } finally {
      if (
        numeroPeticion.current ===
        peticion
      ) {
        setCargando(false);
      }
    }
  };

  const cambiarMes = (
    direccion: -1 | 1,
  ) => {
    const nuevoIndice =
      indiceMesSeleccionado +
      direccion;

    if (
      nuevoIndice <
        limitesTemporada.inicio ||
      nuevoIndice >
        limitesTemporada.fin
    ) {
      return;
    }

    void cargarMes(
      obtenerMesDesdeIndice(
        nuevoIndice,
      ),
    );
  };

  const partidosSeguros =
    Array.isArray(partidos)
      ? partidos
      : [];

  const partidosFinalizados =
    partidosSeguros.filter(
      (partido) =>
        partido.estado ===
        "finalizado",
    ).length;

  const partidosPendientes =
    partidosSeguros.length -
    partidosFinalizados;

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
      <header className="mb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              Competición
            </p>

            <h2 className="mt-1 text-2xl font-black capitalize text-on-surface">
              Partidos de{" "}
              {obtenerNombreMes(
                mesSeleccionado,
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                cambiarMes(-1)
              }
              disabled={
                !puedeRetroceder ||
                cargando
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-xl font-black text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Mes anterior"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={() =>
                cambiarMes(1)
              }
              disabled={
                !puedeAvanzar ||
                cargando
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-xl font-black text-on-surface transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>
        </div>

        <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2">
          {cargando ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1.5 text-xs font-bold text-on-primary-fixed">
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-primary-fixed/30 border-t-on-primary-fixed"
                aria-hidden="true"
              />

              Cargando partidos...
            </span>
          ) : partidosSeguros.length >
            0 ? (
            <>
              <span className="rounded-full bg-surface-container-high px-3 py-1.5 text-xs font-bold text-on-surface-variant">
                {partidosFinalizados}{" "}
                jugados
              </span>

              <span className="rounded-full bg-primary-fixed px-3 py-1.5 text-xs font-bold text-on-primary-fixed">
                {partidosPendientes}{" "}
                pendientes
              </span>
            </>
          ) : null}
        </div>
      </header>

      {errorCarga && (
        <div
          className="mb-4 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
          role="alert"
        >
          {errorCarga}
        </div>
      )}

      {!cargando &&
      partidosSeguros.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {partidosSeguros.map(
            (partido) => (
              <TarjetaPartidoEquipoPublico
                key={partido.id}
                partido={partido}
              />
            ),
          )}
        </div>
      ) : !cargando ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
          <svg
            viewBox="0 0 24 24"
            className="mx-auto h-10 w-10 text-outline"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <rect
              x="3.5"
              y="5"
              width="17"
              height="15"
              rx="2"
            />

            <path
              d="M7.5 3v4M16.5 3v4M3.5 9.5h17"
              strokeLinecap="round"
            />
          </svg>

          <p className="mt-3 text-sm font-bold text-on-surface">
            No hay partidos este mes
          </p>

          <p className="mt-1 text-xs text-on-surface-variant">
            No se han encontrado encuentros
            publicados para este mes.
          </p>
        </div>
      ) : null}
    </section>
  );
}