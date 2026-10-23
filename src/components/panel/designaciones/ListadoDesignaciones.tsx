
import {
  useMemo,
  useState,
} from "react";

import type {
  DiaListadoDesignacion,
  EstadoDesignacion,
  PartidoListadoDesignacion,
  ResultadoListadoDesignaciones,
} from "@servicios/backend/designaciones/obtenerListadoDesignaciones";

// ======================================================
// C.B. ANDRATX
// LISTADO DE DESIGNACIONES
//
// - Partidos FBIB consultados en tiempo real.
// - Partidos CBA y FBIB guardados en Supabase.
// - Navegación semanal.
// - Solo días con partidos.
// - Enlaces FBIB con fecha de referencia.
// - Sin escrituras en Supabase.
// ======================================================

// ======================================================
// TIPOS
// ======================================================

interface Props {
  resultadoInicial: ResultadoListadoDesignaciones;
  puedeCrear: boolean;
  puedeEditar: boolean;
}

type FiltroEstado =
  | "todos"
  | EstadoDesignacion;

type FiltroOrigen =
  | "todos"
  | "fbib"
  | "cba";

interface OpcionNavegacion {
  titulo: string;
  href: string;
  activa: boolean;
}

interface ConfiguracionEstado {
  etiqueta: string;
  clases: string;
}

// ======================================================
// CONFIGURACIÓN
// ======================================================

const RUTA_BASE =
  "/panel/designaciones";

const OPCIONES_ESTADO: {
  valor: FiltroEstado;
  nombre: string;
}[] = [
  {
    valor: "todos",
    nombre: "Todos los estados",
  },
  {
    valor: "sin_designar",
    nombre: "Sin designar",
  },
  {
    valor: "pendiente",
    nombre: "Pendientes",
  },
  {
    valor: "realizado",
    nombre: "Realizados",
  },
];

const OPCIONES_ORIGEN: {
  valor: FiltroOrigen;
  nombre: string;
}[] = [
  {
    valor: "todos",
    nombre: "Todos los partidos",
  },
  {
    valor: "fbib",
    nombre: "Partidos FBIB",
  },
  {
    valor: "cba",
    nombre: "Partidos CBA",
  },
];

// ======================================================
// UTILIDADES DE FECHAS
// ======================================================

function convertirFecha(
  valor: string,
): Date | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      valor,
    )
  ) {
    return null;
  }

  const fecha = new Date(
    `${valor}T12:00:00Z`,
  );

  if (
    Number.isNaN(
      fecha.getTime(),
    )
  ) {
    return null;
  }

  if (
    fecha.toISOString().slice(0, 10) !==
    valor
  ) {
    return null;
  }

  return fecha;
}

function formatoFecha(
  valor: string,
  opciones: Intl.DateTimeFormatOptions = {},
): string {
  const fecha = convertirFecha(
    valor,
  );

  if (!fecha) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      timeZone: "UTC",
      ...opciones,
    },
  ).format(fecha);
}

function formatoDia(
  fecha: string,
): string {
  return formatoFecha(
    fecha,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    },
  );
}

function formatoRangoSemana(
  inicio: string,
  fin: string,
): string {
  const fechaInicio = convertirFecha(
    inicio,
  );

  const fechaFin = convertirFecha(
    fin,
  );

  if (
    !fechaInicio ||
    !fechaFin
  ) {
    return `${inicio} - ${fin}`;
  }

  const mismoMes =
    fechaInicio.getUTCMonth() ===
      fechaFin.getUTCMonth() &&
    fechaInicio.getUTCFullYear() ===
      fechaFin.getUTCFullYear();

  if (mismoMes) {
    return (
      `${fechaInicio.getUTCDate()}–` +
      `${fechaFin.getUTCDate()} de ` +
      formatoFecha(fin, {
        month: "long",
        year: "numeric",
      })
    );
  }

  return (
    `${formatoFecha(inicio, {
      day: "numeric",
      month: "short",
    })} – ` +
    formatoFecha(fin, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  );
}

function capitalizar(
  valor: string,
): string {
  if (!valor) {
    return valor;
  }

  return (
    valor.charAt(0).toLocaleUpperCase("es") +
    valor.slice(1)
  );
}

// ======================================================
// ENLACES
// ======================================================

function crearUrlSemana(
  fecha: string,
): string {
  const parametros =
    new URLSearchParams();

  parametros.set(
    "semana",
    fecha,
  );

  return (
    `${RUTA_BASE}?` +
    parametros.toString()
  );
}

function crearUrlPartido(
  partido: PartidoListadoDesignacion,
): string {
  const parametros =
    new URLSearchParams();

  parametros.set(
    "idPartido",
    partido.id,
  );

  // Solo los partidos FBIB sin guardar
  // necesitan la fecha de referencia.
  //
  // El identificador temporal tiene
  // el formato "fbib:89116".
  //
  // Los partidos ya guardados utilizan
  // directamente el UUID de Supabase.

  if (
    partido.origen === "fbib" &&
    !partido.guardado
  ) {
    parametros.set(
      "fecha",
      partido.fecha,
    );
  }

  return (
    `${RUTA_BASE}/partido?` +
    parametros.toString()
  );
}

// ======================================================
// ESTADOS
// ======================================================

function obtenerConfiguracionEstado(
  estado: EstadoDesignacion,
): ConfiguracionEstado {
  switch (estado) {
    case "realizado":
      return {
        etiqueta: "Realizado",
        clases:
          "bg-success-container text-on-success-container",
      };

    case "pendiente":
      return {
        etiqueta: "Pendiente",
        clases:
          "bg-tertiary-fixed text-on-tertiary-fixed",
      };

    default:
      return {
        etiqueta: "Sin designar",
        clases:
          "bg-surface-container-high text-on-surface-variant",
      };
  }
}

// ======================================================
// ICONOS
// ======================================================

type NombreIcono =
  | "anterior"
  | "siguiente"
  | "calendario"
  | "partido"
  | "personal"
  | "estadisticas"
  | "anadir"
  | "ubicacion"
  | "reloj"
  | "buscar"
  | "flecha";

interface IconoProps {
  nombre: NombreIcono;
  className?: string;
}

function Icono({
  nombre,
  className = "h-5 w-5",
}: IconoProps) {
  const propiedades = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
  };

  switch (nombre) {
    case "anterior":
      return (
        <svg {...propiedades}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );

    case "siguiente":
    case "flecha":
      return (
        <svg {...propiedades}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "calendario":
      return (
        <svg {...propiedades}>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
          />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case "partido":
      return (
        <svg {...propiedades}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M3 12h18M12 3v18" />
          <path d="M5.6 5.6c4 2.1 8.8 10.9 12.8 12.8" />
        </svg>
      );

    case "personal":
      return (
        <svg {...propiedades}>
          <circle
            cx="9"
            cy="8"
            r="3"
          />
          <path d="M3 20v-2a6 6 0 0 1 12 0v2" />
          <path d="M17 5a3 3 0 0 1 0 6" />
          <path d="M18 14a5 5 0 0 1 3 4v2" />
        </svg>
      );

    case "estadisticas":
      return (
        <svg {...propiedades}>
          <path d="M4 20V12M10 20V5M16 20v-9M22 20V8" />
        </svg>
      );

    case "anadir":
      return (
        <svg {...propiedades}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );

    case "ubicacion":
      return (
        <svg {...propiedades}>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle
            cx="12"
            cy="10"
            r="2.5"
          />
        </svg>
      );

    case "reloj":
      return (
        <svg {...propiedades}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "buscar":
      return (
        <svg {...propiedades}>
          <circle
            cx="10.5"
            cy="10.5"
            r="6.5"
          />
          <path d="m16 16 5 5" />
        </svg>
      );
  }
}

// ======================================================
// TARJETA DE RESUMEN
// ======================================================

interface ResumenProps {
  titulo: string;
  valor: number;
  descripcion?: string;
  principal?: boolean;
}

function TarjetaResumen({
  titulo,
  valor,
  descripcion,
  principal = false,
}: ResumenProps) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 shadow-sm sm:p-5",
        principal
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant/60 bg-surface-container-lowest text-on-surface",
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-bold uppercase tracking-wide",
          principal
            ? "text-on-primary/80"
            : "text-on-surface-variant",
        ].join(" ")}
      >
        {titulo}
      </p>

      <p className="mt-2 text-3xl font-extrabold tabular-nums">
        {valor}
      </p>

      {descripcion && (
        <p
          className={[
            "mt-1 text-xs",
            principal
              ? "text-on-primary/80"
              : "text-on-surface-variant",
          ].join(" ")}
        >
          {descripcion}
        </p>
      )}
    </div>
  );
}

// ======================================================
// TARJETA DE PARTIDO
// ======================================================

interface TarjetaPartidoProps {
  partido: PartidoListadoDesignacion;
}

function TarjetaPartido({
  partido,
}: TarjetaPartidoProps) {
  const estado = obtenerConfiguracionEstado(
    partido.estado,
  );

  const url = crearUrlPartido(
    partido,
  );

  return (
    <a
      href={url}
      className="group block rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
              partido.origen === "fbib"
                ? "bg-primary-fixed text-on-primary-fixed"
                : "bg-secondary-container text-on-secondary-container",
            ].join(" ")}
          >
            {partido.origen}
          </span>

          <span className="text-xs font-semibold text-on-surface-variant">
            Nº {partido.numeroPartido ?? "—"}
          </span>

          {partido.origen === "fbib" &&
            !partido.guardado && (
              <span className="rounded-lg bg-surface-container px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
                Sin guardar
              </span>
            )}
        </div>

        <span
          className={[
            "rounded-lg px-3 py-1 text-xs font-bold",
            estado.clases,
          ].join(" ")}
        >
          {estado.etiqueta}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center">
        <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1">
          <Icono
            nombre="reloj"
            className="h-4 w-4 text-on-surface-variant"
          />

          <span className="text-lg font-extrabold tabular-nums text-on-surface">
            {partido.hora ?? "—"}
          </span>
        </div>

        <div className="min-w-0">
          <p className="font-bold text-on-surface">
            {partido.equipoLocal}
          </p>

          <p className="my-1 text-xs font-medium text-on-surface-variant">
            vs
          </p>

          <p className="font-bold text-on-surface">
            {partido.equipoVisitante}
          </p>
        </div>

        <Icono
          nombre="flecha"
          className="hidden h-5 w-5 text-on-surface-variant transition-transform group-hover:translate-x-1 group-hover:text-primary sm:block"
        />
      </div>

      {(partido.categoria ||
        partido.grupo ||
        partido.jornada ||
        partido.competicion) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant/60 pt-4">
          {partido.categoria && (
            <span className="rounded-lg bg-surface-container-low px-2.5 py-1 text-xs text-on-surface-variant">
              {partido.categoria}
            </span>
          )}

          {partido.grupo && (
            <span className="rounded-lg bg-surface-container-low px-2.5 py-1 text-xs text-on-surface-variant">
              {partido.grupo}
            </span>
          )}

          {partido.jornada && (
            <span className="rounded-lg bg-surface-container-low px-2.5 py-1 text-xs text-on-surface-variant">
              Jornada {partido.jornada}
            </span>
          )}

          {partido.competicion && (
            <span className="rounded-lg bg-surface-container-low px-2.5 py-1 text-xs text-on-surface-variant">
              {partido.competicion}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
        <div className="flex items-center gap-2">
          <Icono
            nombre="ubicacion"
            className="h-4 w-4 shrink-0"
          />

          <span>
            {partido.nombreInstalacion ??
              (partido.instalacionId
                ? "Instalación asignada"
                : "Instalación sin asignar")}
          </span>
        </div>

        <span className="font-semibold tabular-nums">
          {partido.totalDesignados} designados
          {" · "}
          {partido.totalRealizados} realizados
        </span>
      </div>
    </a>
  );
}

// ======================================================
// DÍA CON PARTIDOS
// ======================================================

function BloqueDia({
  dia,
}: {
  dia: DiaListadoDesignacion;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <h3 className="text-base font-extrabold text-on-surface sm:text-lg">
          {capitalizar(formatoDia(dia.fecha))}
        </h3>

        <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">
          {dia.partidos.length}
          {" "}
          {dia.partidos.length === 1
            ? "partido"
            : "partidos"}
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {dia.partidos.map(
          (partido) => (
            <TarjetaPartido
              key={partido.id}
              partido={partido}
            />
          ),
        )}
      </div>
    </section>
  );
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function ListadoDesignaciones({
  resultadoInicial,
  puedeCrear,
  puedeEditar,
}: Props) {
  const [busqueda, setBusqueda] =
    useState("");

  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("todos");

  const [filtroOrigen, setFiltroOrigen] =
    useState<FiltroOrigen>("todos");

  const {
    temporada,
    semana,
    dias,
    resumen,
    avisos,
    equiposDesignables,
  } = resultadoInicial;

  // ====================================================
  // FILTRADO LOCAL
  // ====================================================

  const diasFiltrados = useMemo(() => {
    const consulta = busqueda
      .trim()
      .toLocaleLowerCase("es");

    return dias
      .map((dia) => ({
        fecha: dia.fecha,

        partidos: dia.partidos.filter(
          (partido) => {
            if (
              filtroEstado !== "todos" &&
              partido.estado !== filtroEstado
            ) {
              return false;
            }

            if (
              filtroOrigen !== "todos" &&
              partido.origen !== filtroOrigen
            ) {
              return false;
            }

            if (!consulta) {
              return true;
            }

            const contenido = [
              partido.numeroPartido,
              partido.equipoLocal,
              partido.equipoVisitante,
              partido.categoria,
              partido.grupo,
              partido.jornada,
              partido.competicion,
              partido.nombreInstalacion,
            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase("es");

            return contenido.includes(
              consulta,
            );
          },
        ),
      }))
      .filter(
        (dia) =>
          dia.partidos.length > 0,
      );
  }, [
    dias,
    busqueda,
    filtroEstado,
    filtroOrigen,
  ]);

  const totalFiltrado = diasFiltrados.reduce(
    (total, dia) =>
      total + dia.partidos.length,
    0,
  );

  // ====================================================
  // NAVEGACIÓN PRINCIPAL
  // ====================================================

  const navegacion: OpcionNavegacion[] = [
    {
      titulo: "Partidos",
      href: RUTA_BASE,
      activa: true,
    },
    {
      titulo: "Personal",
      href: `${RUTA_BASE}/personal`,
      activa: false,
    },
    {
      titulo: "Estadísticas",
      href: `${RUTA_BASE}/estadisticas`,
      activa: false,
    },
  ];

  // ====================================================
  // INTERFAZ
  // ====================================================

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed">
                <Icono nombre="partido" />
              </span>

              <div>
                <h2 className="text-xl font-extrabold text-on-surface sm:text-2xl">
                  Designaciones
                </h2>

                <p className="mt-1 text-sm text-on-surface-variant">
                  Árbitros y oficiales de mesa del C.B. Andratx
                </p>
              </div>
            </div>

            {temporada && (
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Temporada {temporada.nombre}
              </p>
            )}
          </div>

          {puedeCrear && (
            <a
              href={`${RUTA_BASE}/nuevo`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-sm transition-opacity hover:opacity-90"
            >
              <Icono
                nombre="anadir"
                className="h-5 w-5"
              />
              Crear partido
            </a>
          )}
        </div>

        <nav
          aria-label="Apartados de designaciones"
          className="mt-6 flex flex-wrap gap-2 border-t border-outline-variant/60 pt-4"
        >
          {navegacion.map((opcion) => (
            <a
              key={opcion.href}
              href={opcion.href}
              aria-current={
                opcion.activa
                  ? "page"
                  : undefined
              }
              className={[
                "inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition-colors",
                opcion.activa
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-primary",
              ].join(" ")}
            >
              {opcion.titulo}
            </a>
          ))}
        </nav>
      </section>

      {/* RESUMEN SEMANAL */}

      <section
        aria-label="Resumen de designaciones"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      >
        <TarjetaResumen
          titulo="Partidos"
          valor={resumen.total}
          descripcion="Total de la semana"
          principal
        />

        <TarjetaResumen
          titulo="FBIB"
          valor={resumen.fbib}
          descripcion="Partidos federados"
        />

        <TarjetaResumen
          titulo="CBA"
          valor={resumen.cba}
          descripcion="Partidos del club"
        />

        <TarjetaResumen
          titulo="Sin designar"
          valor={resumen.sinDesignar}
        />

        <TarjetaResumen
          titulo="Pendientes"
          valor={resumen.pendientes}
        />

        <TarjetaResumen
          titulo="Realizados"
          valor={resumen.realizados}
        />
      </section>

      {/* SELECTOR DE SEMANA */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary">
              <Icono
                nombre="calendario"
                className="h-5 w-5"
              />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Semana seleccionada
              </p>

              <h3 className="mt-1 text-base font-extrabold text-on-surface sm:text-lg">
                {formatoRangoSemana(
                  semana.inicio,
                  semana.fin,
                )}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={crearUrlSemana(
                semana.anterior,
              )}
              aria-label="Semana anterior"
              title="Semana anterior"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface transition-colors hover:border-primary hover:text-primary"
            >
              <Icono nombre="anterior" />
            </a>

            {!semana.esSemanaActual && (
              <a
                href={crearUrlSemana(
                  semana.actual,
                )}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-4 text-sm font-bold text-on-surface transition-colors hover:border-primary hover:text-primary"
              >
                Semana actual
              </a>
            )}

            <a
              href={crearUrlSemana(
                semana.siguiente,
              )}
              aria-label="Semana siguiente"
              title="Semana siguiente"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface transition-colors hover:border-primary hover:text-primary"
            >
              <Icono nombre="siguiente" />
            </a>
          </div>
        </div>

        <form
          action={RUTA_BASE}
          method="get"
          className="mt-4 flex flex-wrap items-end gap-3 border-t border-outline-variant/60 pt-4"
        >
          <label className="flex-1 sm:max-w-xs">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Ir a una fecha
            </span>

            <input
              type="date"
              name="semana"
              defaultValue={semana.inicio}
              required
              className="min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary"
            />
          </label>

          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary transition-opacity hover:opacity-90"
          >
            Ver semana
          </button>
        </form>
      </section>

      {/* AVISOS */}

      {avisos.length > 0 && (
        <section
          aria-label="Avisos"
          className="space-y-2"
        >
          {avisos.map((aviso, indice) => (
            <div
              key={`${indice}-${aviso}`}
              className="rounded-xl border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant"
            >
              {aviso}
            </div>
          ))}
        </section>
      )}

      {/* FILTROS */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_14rem]">
          <label className="relative block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Buscar partido
            </span>

            <span className="absolute bottom-3 left-3 text-on-surface-variant">
              <Icono
                nombre="buscar"
                className="h-4 w-4"
              />
            </span>

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value,
                )
              }
              placeholder="Equipo, categoría, número..."
              className="min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-2 pl-10 pr-3 text-sm text-on-surface outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Estado
            </span>

            <select
              value={filtroEstado}
              onChange={(evento) =>
                setFiltroEstado(
                  evento.target.value as FiltroEstado,
                )
              }
              className="min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              {OPCIONES_ESTADO.map((opcion) => (
                <option
                  key={opcion.valor}
                  value={opcion.valor}
                >
                  {opcion.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Origen
            </span>

            <select
              value={filtroOrigen}
              onChange={(evento) =>
                setFiltroOrigen(
                  evento.target.value as FiltroOrigen,
                )
              }
              className="min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              {OPCIONES_ORIGEN.map((opcion) => (
                <option
                  key={opcion.valor}
                  value={opcion.valor}
                >
                  {opcion.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-on-surface-variant">
            <span className="font-bold text-on-surface">
              {totalFiltrado}
            </span>
            {" "}
            {totalFiltrado === 1
              ? "partido visible"
              : "partidos visibles"}
          </p>

          {(busqueda ||
            filtroEstado !== "todos" ||
            filtroOrigen !== "todos") && (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setFiltroEstado("todos");
                setFiltroOrigen("todos");
              }}
              className="text-sm font-bold text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {/* LISTADO SEMANAL */}

      {diasFiltrados.length > 0 ? (
        <div className="space-y-8">
          {diasFiltrados.map((dia) => (
            <BloqueDia
              key={dia.fecha}
              dia={dia}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest px-5 py-12 text-center shadow-sm">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-primary">
            <Icono
              nombre="calendario"
              className="h-8 w-8"
            />
          </span>

          <h3 className="mt-5 text-lg font-extrabold text-on-surface">
            {resumen.total === 0
              ? "No hay partidos esta semana"
              : "No hay partidos con estos filtros"}
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-on-surface-variant">
            {resumen.total === 0
              ? "No se han encontrado partidos FBIB o CBA para esta semana. Puedes consultar otra semana o crear un partido del club."
              : "Prueba a cambiar la búsqueda, el estado o el origen de los partidos."}
          </p>

          {resumen.total === 0 ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href={crearUrlSemana(
                  semana.siguiente,
                )}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 text-sm font-bold text-on-surface hover:border-primary hover:text-primary"
              >
                Semana siguiente
              </a>

              {puedeCrear && (
                <a
                  href={`${RUTA_BASE}/nuevo`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-on-primary hover:opacity-90"
                >
                  Crear partido
                </a>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setFiltroEstado("todos");
                setFiltroOrigen("todos");
              }}
              className="mt-6 min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary hover:opacity-90"
            >
              Mostrar todos
            </button>
          )}
        </section>
      )}

      {/* PIE INFORMATIVO */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-on-surface-variant">
            Equipos configurados como designables:
            {" "}
            <span className="font-bold text-on-surface">
              {equiposDesignables.length}
            </span>
          </p>

          {/* <p className="text-xs text-on-surface-variant">
            Los partidos FBIB sin designar se consultan
            sin guardarse en Supabase.
          </p> */}
        </div>

        {!puedeEditar && (
          <p className="mt-3 text-xs text-on-surface-variant">
            Tienes acceso de consulta. Para modificar
            designaciones necesitas permisos de edición.
          </p>
        )}
      </section>
    </div>
  );
}
