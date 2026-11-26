
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import ConfiguracionTarifas from "./ConfiguracionTarifas";

import ResumenLiquidaciones from "./ResumenLiquidaciones";

import GeneradorPdfLiquidaciones from "./GeneradorPdfLiquidaciones";

import {
  cargarTarifas,
  crearTarifasIniciales,
  type TarifasLiquidaciones,
} from "@servicios/backend/designaciones/tarifasLiquidaciones";

import {
  calcularLiquidaciones,
  puedeExportarLiquidaciones,
  formatearPeriodoLiquidacion,
} from "@servicios/backend/designaciones/calcularLiquidaciones";

import type {
  PeriodoLiquidacion,
  ResultadoDatosLiquidaciones,
} from "@servicios/backend/designaciones/obtenerLiquidacionesDesignaciones";

// ======================================================
// TIPOS
// ======================================================

interface Props {
  resultadoInicial: ResultadoDatosLiquidaciones;
}

interface OpcionNavegacion {
  titulo: string;
  href: string;
  activa: boolean;
}

type NombreIcono =
  | "liquidaciones"
  | "calendario"
  | "buscar"
  | "informacion"
  | "actualizar"
  | "error";

interface PropsIcono {
  nombre: NombreIcono;
  className?: string;
}

// ======================================================
// CONFIGURACIÓN
// ======================================================

const RUTA_BASE =
  "/panel/designaciones";

const RUTA_ACTUAL =
  `${RUTA_BASE}/liquidaciones`;

const ZONA_HORARIA =
  "Europe/Madrid";

const NAVEGACION: OpcionNavegacion[] = [
  {
    titulo: "Partidos",
    href: RUTA_BASE,
    activa: false,
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
  {
    titulo: "Liquidaciones",
    href: RUTA_ACTUAL,
    activa: true,
  },
];

// ======================================================
// UTILIDADES DE FECHA
// ======================================================

function fechaValida(
  valor: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const fecha = new Date(
    `${valor}T12:00:00Z`,
  );

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

function obtenerFechaActual(): string {
  const partes = new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: ZONA_HORARIA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(new Date());

  const anio =
    partes.find(
      (parte) => parte.type === "year",
    )?.value ?? "";

  const mes =
    partes.find(
      (parte) => parte.type === "month",
    )?.value ?? "";

  const dia =
    partes.find(
      (parte) => parte.type === "day",
    )?.value ?? "";

  return `${anio}-${mes}-${dia}`;
}

function formatearFechaISO(
  fecha: Date,
): string {
  return fecha
    .toISOString()
    .slice(0, 10);
}

function obtenerPeriodoMesActual():
  PeriodoLiquidacion {
  const hoy =
    obtenerFechaActual();

  return {
    fechaInicio:
      `${hoy.slice(0, 7)}-01`,

    fechaFin: hoy,
  };
}

function obtenerPeriodoMesAnterior():
  PeriodoLiquidacion {
  const hoy =
    obtenerFechaActual();

  const [anio, mes] =
    hoy.split("-").map(Number);

  const inicio = new Date(
    Date.UTC(
      anio,
      mes - 2,
      1,
      12,
    ),
  );

  const fin = new Date(
    Date.UTC(
      anio,
      mes - 1,
      0,
      12,
    ),
  );

  return {
    fechaInicio:
      formatearFechaISO(inicio),

    fechaFin:
      formatearFechaISO(fin),
  };
}

function obtenerPeriodoUltimosDias(
  dias: number,
): PeriodoLiquidacion {
  const hoy =
    obtenerFechaActual();

  const inicio = new Date(
    `${hoy}T12:00:00Z`,
  );

  inicio.setUTCDate(
    inicio.getUTCDate() - dias + 1,
  );

  return {
    fechaInicio:
      formatearFechaISO(inicio),

    fechaFin: hoy,
  };
}

// ======================================================
// VALIDACIÓN DEL PERIODO
// ======================================================

function validarPeriodo(
  periodo: PeriodoLiquidacion,
): string | null {
  if (
    !fechaValida(
      periodo.fechaInicio,
    )
  ) {
    return "Introduce una fecha inicial válida.";
  }

  if (
    !fechaValida(
      periodo.fechaFin,
    )
  ) {
    return "Introduce una fecha final válida.";
  }

  if (
    periodo.fechaInicio >
    periodo.fechaFin
  ) {
    return "La fecha inicial no puede ser posterior a la fecha final.";
  }

  return null;
}

// ======================================================
// URL DE CONSULTA
// ======================================================

function crearUrlPeriodo(
  periodo: PeriodoLiquidacion,
): string {
  const parametros =
    new URLSearchParams();

  parametros.set(
    "desde",
    periodo.fechaInicio,
  );

  parametros.set(
    "hasta",
    periodo.fechaFin,
  );

  return (
    `${RUTA_ACTUAL}?` +
    parametros.toString()
  );
}

// ======================================================
// ICONOS
// ======================================================

function Icono({
  nombre,
  className = "h-5 w-5",
}: PropsIcono) {
  const propiedades = {
    className,

    width: 24,
    height: 24,

    viewBox: "0 0 24 24",

    fill: "none",

    stroke: "currentColor",
    strokeWidth: 1.8,

    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,

    "aria-hidden": true as const,
  };

  switch (nombre) {
    case "liquidaciones":
      return (
        <svg {...propiedades}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />

          <path d="M14 2v6h6" />

          <path d="M15 12a3 3 0 0 0-5 2v2a3 3 0 0 0 5 2M8 14h5M8 16h5" />
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

    case "buscar":
      return (
        <svg {...propiedades}>
          <circle
            cx="11"
            cy="11"
            r="7"
          />

          <path d="m20 20-4-4" />
        </svg>
      );

    case "informacion":
      return (
        <svg {...propiedades}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />

          <path d="M12 11v5M12 8h.01" />
        </svg>
      );

    case "actualizar":
      return (
        <svg {...propiedades}>
          <path d="M20 7v5h-5M4 17v-5h5" />

          <path d="M20 12a8 8 0 0 0-14-5M4 12a8 8 0 0 0 14 5" />
        </svg>
      );

    case "error":
      return (
        <svg {...propiedades}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />

          <path d="M12 8v5M12 16h.01" />
        </svg>
      );

    default:
      return null;
  }
}

// ======================================================
// INDICADOR DE CARGA
// ======================================================

function IndicadorCarga({
  mensaje,
}: {
  mensaje: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest px-5 py-12"
    >
      <span
        aria-hidden="true"
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-outline-variant border-t-primary"
      />

      <p className="text-sm font-bold text-on-surface-variant">
        {mensaje}
      </p>
    </div>
  );
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function LiquidacionesDesignacionesPanel({
  resultadoInicial,
}: Props) {
  // ----------------------------------------------------
  // ESTADOS
  // ----------------------------------------------------

  const [tarifas, setTarifas] =
    useState<TarifasLiquidaciones>(
      crearTarifasIniciales,
    );

  const [tarifasCargadas, setTarifasCargadas] =
    useState(false);

  const [periodo, setPeriodo] =
    useState<PeriodoLiquidacion>(
      () => ({
        ...resultadoInicial.periodo,
      }),
    );

  const [consultando, setConsultando] =
    useState(false);

  const [errorPeriodo, setErrorPeriodo] =
    useState<string | null>(null);

  // ----------------------------------------------------
  // CARGAR TARIFAS LOCALES
  // ----------------------------------------------------

  useEffect(() => {
    setTarifas(
      cargarTarifas(),
    );

    setTarifasCargadas(true);
  }, []);

  // ----------------------------------------------------
  // RESTABLECER ESTADO AL VOLVER A LA PÁGINA
  // ----------------------------------------------------

  useEffect(() => {
    function restaurarPagina() {
      setConsultando(false);

      setTarifas(
        cargarTarifas(),
      );
    }

    window.addEventListener(
      "pageshow",
      restaurarPagina,
    );

    return () => {
      window.removeEventListener(
        "pageshow",
        restaurarPagina,
      );
    };
  }, []);

  // ----------------------------------------------------
  // CALCULAR LIQUIDACIONES
  // ----------------------------------------------------

  const resultado = useMemo(
    () =>
      calcularLiquidaciones(
        resultadoInicial,
        tarifas,
      ),
    [
      resultadoInicial,
      tarifas,
    ],
  );

  // ----------------------------------------------------
  // INFORMACIÓN DERIVADA
  // ----------------------------------------------------

  const periodoConsultado =
    resultadoInicial.periodo;

  const periodoModificado =
    periodo.fechaInicio !==
      periodoConsultado.fechaInicio ||
    periodo.fechaFin !==
      periodoConsultado.fechaFin;

  const exportacionDisponible =
    tarifasCargadas &&
    !consultando &&
    !periodoModificado &&
    puedeExportarLiquidaciones(
      resultado,
    );

  // ----------------------------------------------------
  // CAMBIAR TARIFAS
  // ----------------------------------------------------

  function cambiarTarifas(
    nuevasTarifas: TarifasLiquidaciones,
  ): void {
    setTarifas(
      nuevasTarifas,
    );
  }

  // ----------------------------------------------------
  // CAMBIAR FECHAS
  // ----------------------------------------------------

  function cambiarFechaInicio(
    valor: string,
  ): void {
    setPeriodo(
      (anterior) => ({
        ...anterior,
        fechaInicio: valor,
      }),
    );

    setErrorPeriodo(null);
  }

  function cambiarFechaFin(
    valor: string,
  ): void {
    setPeriodo(
      (anterior) => ({
        ...anterior,
        fechaFin: valor,
      }),
    );

    setErrorPeriodo(null);
  }

  // ----------------------------------------------------
  // SELECCIONAR PERIODOS RÁPIDOS
  // ----------------------------------------------------

  function seleccionarPeriodo(
    nuevoPeriodo: PeriodoLiquidacion,
  ): void {
    setPeriodo({
      ...nuevoPeriodo,
    });

    setErrorPeriodo(null);
  }

  // ----------------------------------------------------
  // CONSULTAR PERIODO
  // ----------------------------------------------------

  function consultarPeriodo(
    evento: FormEvent<HTMLFormElement>,
  ): void {
    evento.preventDefault();

    if (consultando) {
      return;
    }

    const error =
      validarPeriodo(periodo);

    if (error) {
      setErrorPeriodo(error);

      return;
    }

    setErrorPeriodo(null);

    setConsultando(true);

    window.location.assign(
      crearUrlPeriodo(periodo),
    );
  }

  // ----------------------------------------------------
  // ACTUALIZAR DATOS
  // ----------------------------------------------------

  function actualizarDatos(): void {
    if (consultando) {
      return;
    }

    setConsultando(true);

    window.location.assign(
      crearUrlPeriodo(
        periodoConsultado,
      ),
    );
  }

  // ----------------------------------------------------
  // MOTIVO DE EXPORTACIÓN NO DISPONIBLE
  // ----------------------------------------------------

  function obtenerMotivoExportacion():
    string | null {
    if (!tarifasCargadas) {
      return "Se están cargando las tarifas.";
    }

    if (consultando) {
      return "Se están consultando los partidos.";
    }

    if (periodoModificado) {
      return "Consulta el nuevo periodo antes de generar el PDF.";
    }

    if (
      resultado.resumen.totalActuaciones === 0
    ) {
      return "No hay actuaciones para exportar.";
    }

    if (
      resultado.funcionesSinTarifa.length > 0
    ) {
      return (
        "Configura las tarifas pendientes: " +
        resultado.funcionesSinTarifa.join(", ") +
        "."
      );
    }

    if (!resultado.completa) {
      return "Revisa las incidencias de la liquidación antes de exportar.";
    }

    return null;
  }

  const motivoExportacion =
    obtenerMotivoExportacion();

  // ====================================================
  // INTERFAZ
  // ====================================================

  return (
    <div className="space-y-6">

      {/* ENCABEZADO PRINCIPAL */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          <div className="flex min-w-0 items-start gap-3">

            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed">
              <Icono
                nombre="liquidaciones"
                className="h-6 w-6"
              />
            </span>

            <div className="min-w-0">

              <h2 className="text-xl font-extrabold text-on-surface sm:text-2xl">
                Liquidaciones de arbitraje
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                Gestión económica de árbitros y
                oficiales de mesa del C.B. Andratx.
              </p>

            </div>

          </div>

          <button
            type="button"
            disabled={consultando}
            onClick={actualizarDatos}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icono
              nombre="actualizar"
              className={[
                "h-4 w-4",

                consultando
                  ? "animate-spin"
                  : "",
              ].join(" ")}
            />

            Actualizar datos
          </button>

        </div>

        {/* NAVEGACIÓN */}

        <nav
          aria-label="Apartados de designaciones"
          className="mt-6 flex flex-wrap gap-2 border-t border-outline-variant/60 pt-4"
        >
          {NAVEGACION.map(
            (opcion) => (
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
            ),
          )}
        </nav>

      </section>

      {/* CONFIGURACIÓN DE TARIFAS */}

      {tarifasCargadas ? (
        <ConfiguracionTarifas
          tarifas={tarifas}
          onTarifasChange={cambiarTarifas}
          disabled={consultando}
        />
      ) : (
        <IndicadorCarga
          mensaje="Cargando configuración de tarifas..."
        />
      )}

      {/* SELECTOR DEL PERIODO */}

      <section
        aria-label="Periodo de liquidación"
        className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6"
      >

        <div className="flex items-start gap-3">

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed">
            <Icono
              nombre="calendario"
              className="h-5 w-5"
            />
          </span>

          <div>

            <h2 className="text-lg font-extrabold text-on-surface">
              Periodo de liquidación
            </h2>

            <p className="mt-1 text-sm text-on-surface-variant">
              Selecciona el rango de fechas que
              quieres consultar.
            </p>

          </div>

        </div>

        {/* PERIODOS RÁPIDOS */}

        <div className="mt-5 flex flex-wrap gap-2">

          <button
            type="button"
            disabled={consultando}
            onClick={() =>
              seleccionarPeriodo(
                obtenerPeriodoMesActual(),
              )
            }
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
          >
            Mes actual
          </button>

          <button
            type="button"
            disabled={consultando}
            onClick={() =>
              seleccionarPeriodo(
                obtenerPeriodoMesAnterior(),
              )
            }
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
          >
            Mes anterior
          </button>

          <button
            type="button"
            disabled={consultando}
            onClick={() =>
              seleccionarPeriodo(
                obtenerPeriodoUltimosDias(7),
              )
            }
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
          >
            Últimos 7 días
          </button>

          <button
            type="button"
            disabled={consultando}
            onClick={() =>
              seleccionarPeriodo(
                obtenerPeriodoUltimosDias(30),
              )
            }
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
          >
            Últimos 30 días
          </button>

        </div>

        {/* FORMULARIO DE FECHAS */}

        <form
          method="get"
          action={RUTA_ACTUAL}
          onSubmit={consultarPeriodo}
          className="mt-5 space-y-4"
        >

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end">

            <label className="block min-w-0">

              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Fecha inicial
              </span>

              <input
                type="date"
                name="desde"
                required
                value={periodo.fechaInicio}
                max={
                  periodo.fechaFin ||
                  undefined
                }
                disabled={consultando}
                onChange={(evento) =>
                  cambiarFechaInicio(
                    evento.target.value,
                  )
                }
                className="min-h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary disabled:opacity-50"
              />

            </label>

            <label className="block min-w-0">

              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Fecha final
              </span>

              <input
                type="date"
                name="hasta"
                required
                value={periodo.fechaFin}
                min={
                  periodo.fechaInicio ||
                  undefined
                }
                disabled={consultando}
                onChange={(evento) =>
                  cambiarFechaFin(
                    evento.target.value,
                  )
                }
                className="min-h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface outline-none transition-colors focus:border-primary disabled:opacity-50"
              />

            </label>

            <button
              type="submit"
              disabled={consultando}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 xl:col-span-1"
            >
              {consultando ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Icono
                  nombre="buscar"
                  className="h-5 w-5"
                />
              )}

              {consultando
                ? "Consultando..."
                : "Consultar periodo"}
            </button>

          </div>

          {/* ERROR DEL PERIODO */}

          {errorPeriodo && (
            <div
              role="alert"
              className="flex items-center gap-3 rounded-xl border border-error/30 bg-error-container p-3 text-sm font-medium text-on-error-container"
            >
              <Icono
                nombre="error"
                className="h-5 w-5 shrink-0"
              />

              {errorPeriodo}
            </div>
          )}

        </form>

        {/* PERIODO MOSTRADO */}

        <div className="mt-5 flex flex-col gap-2 border-t border-outline-variant/60 pt-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-sm text-on-surface-variant">
            Mostrando resultados del{" "}

            <strong className="font-bold text-on-surface">
              {formatearPeriodoLiquidacion(
                periodoConsultado,
              )}
            </strong>
          </p>

          {periodoModificado && (
            <button
              type="button"
              disabled={consultando}
              onClick={() =>
                seleccionarPeriodo(
                  periodoConsultado,
                )
              }
              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline disabled:opacity-50"
            >
              Descartar cambio de fechas
            </button>
          )}

        </div>

        {/* AVISO DE CAMBIO DE FECHAS */}

        {periodoModificado &&
          !consultando && (
            <div
              role="status"
              className="mt-3 flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-3 text-sm text-on-surface-variant"
            >
              <Icono
                nombre="informacion"
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              />

              <p>
                Has modificado las fechas. Pulsa
                «Consultar periodo» para actualizar
                los resultados.
              </p>
            </div>
          )}

      </section>

      {/* RESULTADOS Y EXPORTACIÓN */}

      {consultando ? (
        <IndicadorCarga
          mensaje="Consultando las actuaciones del periodo..."
        />
      ) : !tarifasCargadas ? (
        <IndicadorCarga
          mensaje="Preparando las liquidaciones..."
        />
      ) : (
        <>

          {/* RESUMEN DE LIQUIDACIONES */}

          <div
            className={
              periodoModificado
                ? "opacity-70"
                : ""
            }
          >
            <ResumenLiquidaciones
              resultado={resultado}
            />
          </div>

          {/* GENERADOR PDF */}

          <GeneradorPdfLiquidaciones
            resultado={resultado}
            disabled={!exportacionDisponible}
            motivoDeshabilitado={motivoExportacion}
          />

        </>
      )}

      {/* INFORMACIÓN GENERAL */}

      <footer className="flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">

        <Icono
          nombre="informacion"
          className="mt-0.5 h-5 w-5 shrink-0 text-primary"
        />

        <div className="space-y-1 text-xs leading-relaxed text-on-surface-variant">

          <p className="font-bold text-on-surface">
            Información sobre las liquidaciones
          </p>

          <p>
            Los importes se calculan a partir de las
            funciones realmente realizadas y las
            tarifas configuradas en este navegador.
          </p>

          <p>
            Este apartado genera documentos de
            liquidación interna y no facturas
            fiscales. No registra pagos ni almacena
            liquidaciones históricas.
          </p>

        </div>

      </footer>

    </div>
  );
}
