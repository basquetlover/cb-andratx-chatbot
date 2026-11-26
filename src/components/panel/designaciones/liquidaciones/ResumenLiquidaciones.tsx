
import {
  formatearImporte,
} from "@servicios/backend/designaciones/tarifasLiquidaciones";

import {
  formatearFechaLiquidacion,
  formatearPeriodoLiquidacion,
  type ResultadoLiquidaciones,
  type LiquidacionPersona,
  type LineaLiquidacion,
} from "@servicios/backend/designaciones/calcularLiquidaciones";

// ======================================================
// TIPOS
// ======================================================

interface Props {
  resultado: ResultadoLiquidaciones;
}

type NombreIcono =
  | "personal"
  | "partidos"
  | "actuaciones"
  | "importe"
  | "informacion"
  | "calendario"
  | "vacio"
  | "advertencia";

interface PropsIcono {
  nombre: NombreIcono;
  className?: string;
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
    case "personal":
      return (
        <svg {...propiedades}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "partidos":
      return (
        <svg {...propiedades}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3v18" />
          <path d="M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8" />
        </svg>
      );

    case "actuaciones":
      return (
        <svg {...propiedades}>
          <rect
            x="5"
            y="4"
            width="14"
            height="17"
            rx="2"
          />
          <path d="M9 4V2h6v2M8 10l2 2 4-4M8 16h8" />
        </svg>
      );

    case "importe":
      return (
        <svg {...propiedades}>
          <path d="M19 5a7 7 0 0 0-11 5v4a7 7 0 0 0 11 5" />
          <path d="M4 10h12M4 14h10" />
        </svg>
      );

    case "informacion":
      return (
        <svg {...propiedades}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
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

    case "vacio":
      return (
        <svg {...propiedades}>
          <rect
            x="5"
            y="3"
            width="14"
            height="18"
            rx="2"
          />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );

    case "advertencia":
      return (
        <svg {...propiedades}>
          <path d="m10.3 3.9-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );

    default:
      return null;
  }
}

// ======================================================
// UTILIDADES
// ======================================================

function mostrarImporte(
  importe: number | null,
): string {
  return importe === null
    ? "Pendiente"
    : formatearImporte(importe);
}

// ======================================================
// TARJETAS DE RESUMEN GENERAL
// ======================================================

interface PropsIndicador {
  titulo: string;
  valor: string | number;
  descripcion?: string;
  icono: NombreIcono;
  principal?: boolean;
}

function IndicadorResumen({
  titulo,
  valor,
  descripcion,
  icono,
  principal = false,
}: PropsIndicador) {
  return (
    <div
      className={[
        "min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5",

        principal
          ? "border-primary/30 bg-primary-container"
          : "border-outline-variant/60 bg-surface-container-lowest",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={[
            "text-xs font-bold uppercase tracking-wide",

            principal
              ? "text-on-primary-container"
              : "text-on-surface-variant",
          ].join(" ")}
        >
          {titulo}
        </span>

        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",

            principal
              ? "bg-primary text-on-primary"
              : "bg-primary-fixed text-on-primary-fixed",
          ].join(" ")}
        >
          <Icono
            nombre={icono}
            className="h-5 w-5"
          />
        </span>
      </div>

      <p
        className={[
          "mt-3 break-words text-2xl font-extrabold tabular-nums sm:text-3xl",

          principal
            ? "text-on-primary-container"
            : "text-on-surface",
        ].join(" ")}
      >
        {valor}
      </p>

      {descripcion && (
        <p
          className={[
            "mt-1 text-xs",

            principal
              ? "text-on-primary-container"
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
// AVISOS DE LA LIQUIDACIÓN
// ======================================================

interface PropsAvisos {
  avisos: string[];
}

function AvisosLiquidacion({
  avisos,
}: PropsAvisos) {
  if (avisos.length === 0) {
    return null;
  }

  return (
    <section
      role="alert"
      aria-label="Avisos de la liquidación"
      className="rounded-2xl border border-error/30 bg-error-container p-4 text-on-error-container sm:p-5"
    >
      <div className="flex items-start gap-3">
        <Icono
          nombre="advertencia"
          className="mt-0.5 h-6 w-6 shrink-0"
        />

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold">
            Revisa los datos de la liquidación
          </h3>

          <p className="mt-1 text-sm leading-relaxed">
            Se han detectado incidencias en los
            datos o en la configuración de tarifas.
          </p>

          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
            {avisos.map(
              (aviso, indice) => (
                <li key={`${indice}-${aviso}`}>
                  {aviso}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ======================================================
// FILA DE ACTUACIÓN
// ======================================================

interface PropsFilaActuacion {
  actuacion: LineaLiquidacion;
}

function FilaActuacion({
  actuacion,
}: PropsFilaActuacion) {
  return (
    <tr className="border-b border-outline-variant/40 transition-colors last:border-b-0 hover:bg-surface-container-low">
      {/* CATEGORÍA */}

      <td className="px-4 py-3 text-sm font-semibold text-on-surface sm:px-5">
        {actuacion.categoria}
      </td>

      {/* NÚMERO DE PARTIDO */}

      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium tabular-nums text-on-surface-variant">
        {actuacion.numeroPartido}
      </td>

      {/* FECHA Y HORA */}

      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-on-surface">
        <span>
          {formatearFechaLiquidacion(
            actuacion.fecha,
          )}
        </span>

        <span className="ml-2 text-on-surface-variant">
          {actuacion.hora
            ? `${actuacion.hora} h`
            : "Sin hora"}
        </span>
      </td>

      {/* FUNCIÓN REALIZADA */}

      <td className="whitespace-nowrap px-4 py-3">
        <span
          title={actuacion.nombreFuncion}
          className="inline-flex min-w-9 items-center justify-center rounded-md bg-primary-fixed px-2.5 py-1 text-xs font-extrabold text-on-primary-fixed"
        >
          {actuacion.funcion}
        </span>
      </td>

      {/* IMPORTE */}

      <td className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
        {actuacion.importe === null ? (
          <span className="text-xs font-bold text-error">
            Sin tarifa
          </span>
        ) : (
          <span className="text-sm font-bold tabular-nums text-on-surface">
            {formatearImporte(
              actuacion.importe,
            )}
          </span>
        )}
      </td>
    </tr>
  );
}

// ======================================================
// TABLA DE ACTUACIONES
// ======================================================

interface PropsTablaActuaciones {
  liquidacion: LiquidacionPersona;
}

function TablaActuaciones({
  liquidacion,
}: PropsTablaActuaciones) {
  return (
    <div
      role="region"
      aria-label={`Actuaciones de ${liquidacion.nombreCompleto}`}
      tabIndex={0}
      className="overflow-x-auto"
    >
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-y border-outline-variant/60 bg-surface-container-low text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            <th
              scope="col"
              className="px-4 py-3 sm:px-5"
            >
              Categoría
            </th>

            <th
              scope="col"
              className="whitespace-nowrap px-4 py-3"
            >
              N.º partido
            </th>

            <th
              scope="col"
              className="whitespace-nowrap px-4 py-3"
            >
              Fecha y hora
            </th>

            <th
              scope="col"
              className="px-4 py-3"
            >
              Función
            </th>

            <th
              scope="col"
              className="px-4 py-3 text-right sm:px-5"
            >
              Importe
            </th>
          </tr>
        </thead>

        <tbody>
          {liquidacion.actuaciones.map(
            (actuacion) => (
              <FilaActuacion
                key={actuacion.id}
                actuacion={actuacion}
              />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

// ======================================================
// LIQUIDACIÓN INDIVIDUAL
// ======================================================

interface PropsLiquidacionIndividual {
  liquidacion: LiquidacionPersona;
}

function LiquidacionIndividual({
  liquidacion,
}: PropsLiquidacionIndividual) {
  const importePendiente =
    liquidacion.totalImporte === null;

  return (
    <article className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      {/* ENCABEZADO DE LA PERSONA */}

      <header className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="break-words text-lg font-extrabold text-on-surface">
              {liquidacion.nombreCompleto}
            </h3>

            <span className="inline-flex shrink-0 items-center rounded-lg bg-surface-container-high px-2.5 py-1 text-xs font-bold tabular-nums text-on-surface-variant">
              {liquidacion.codigo}
            </span>
          </div>

          <p className="mt-2 text-xs font-medium text-on-surface-variant sm:text-sm">
            {liquidacion.totalPartidos}{" "}
            {liquidacion.totalPartidos === 1
              ? "partido"
              : "partidos"}

            <span className="mx-2">
              ·
            </span>

            {liquidacion.totalActuaciones}{" "}
            {liquidacion.totalActuaciones === 1
              ? "actuación"
              : "actuaciones"}
          </p>
        </div>

        {/* TOTAL INDIVIDUAL */}

        <div className="shrink-0 rounded-xl bg-surface-container-low px-4 py-3 sm:min-w-36 sm:text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Total del periodo
          </p>

          <p
            className={[
              "mt-1 text-2xl font-extrabold tabular-nums",

              importePendiente
                ? "text-error"
                : "text-primary",
            ].join(" ")}
          >
            {mostrarImporte(
              liquidacion.totalImporte,
            )}
          </p>
        </div>
      </header>

      {/* TABLA DE PARTIDOS */}

      <TablaActuaciones
        liquidacion={liquidacion}
      />

      {/* AVISO DE TARIFAS PENDIENTES */}

      {liquidacion.actuacionesSinTarifa > 0 && (
        <div className="flex items-center gap-2 border-t border-error/20 bg-error-container px-4 py-3 text-xs font-medium text-on-error-container sm:px-5">
          <Icono
            nombre="informacion"
            className="h-4 w-4 shrink-0"
          />

          <p>
            {liquidacion.actuacionesSinTarifa}{" "}
            {liquidacion.actuacionesSinTarifa === 1
              ? "actuación sin tarifa configurada."
              : "actuaciones sin tarifa configurada."}
          </p>
        </div>
      )}
    </article>
  );
}

// ======================================================
// ESTADO SIN LIQUIDACIONES
// ======================================================

function EstadoVacio() {
  return (
    <section className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-5 py-12 text-center sm:py-16">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-low text-on-surface-variant">
        <Icono
          nombre="vacio"
          className="h-8 w-8"
        />
      </span>

      <h3 className="mt-5 text-lg font-extrabold text-on-surface">
        No hay actuaciones para liquidar
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-on-surface-variant">
        No se han encontrado funciones realizadas
        durante el periodo seleccionado.
        Comprueba las fechas y las designaciones
        registradas.
      </p>
    </section>
  );
}

// ======================================================
// TOTAL GENERAL
// ======================================================

interface PropsTotalGeneral {
  resultado: ResultadoLiquidaciones;
}

function TotalGeneral({
  resultado,
}: PropsTotalGeneral) {
  const resumen =
    resultado.resumen;

  const importePendiente =
    resumen.totalImporte === null;

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary-container p-5 text-on-primary-container shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold">
            Total general de la liquidación
          </h3>

          <p className="mt-1 text-sm opacity-80">
            {formatearPeriodoLiquidacion(
              resultado.periodo,
            )}
          </p>

          <p className="mt-3 text-sm font-medium">
            {resumen.totalPersonas}{" "}
            {resumen.totalPersonas === 1
              ? "persona"
              : "personas"}

            <span className="mx-2">
              ·
            </span>

            {resumen.totalPartidos}{" "}
            {resumen.totalPartidos === 1
              ? "partido"
              : "partidos"}

            <span className="mx-2">
              ·
            </span>

            {resumen.totalActuaciones}{" "}
            {resumen.totalActuaciones === 1
              ? "actuación"
              : "actuaciones"}
          </p>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">
            Importe total
          </p>

          <p className="mt-1 break-words text-3xl font-extrabold tabular-nums sm:text-4xl">
            {mostrarImporte(
              resumen.totalImporte,
            )}
          </p>

          {importePendiente && (
            <p className="mt-1 text-xs font-medium">
              Revisa las incidencias indicadas.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function ResumenLiquidaciones({
  resultado,
}: Props) {
  const {
    periodo,
    resumen,
    liquidaciones,
    avisos,
  } = resultado;

  const hayLiquidaciones =
    liquidaciones.length > 0;

  return (
    <div className="space-y-6">
      {/* INDICADORES GENERALES */}

      <section
        aria-label="Resumen general del periodo"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <IndicadorResumen
          titulo="Personal"
          valor={resumen.totalPersonas}
          descripcion="Personas con actuaciones"
          icono="personal"
        />

        <IndicadorResumen
          titulo="Partidos"
          valor={resumen.totalPartidos}
          descripcion="Partidos únicos"
          icono="partidos"
        />

        <IndicadorResumen
          titulo="Actuaciones"
          valor={resumen.totalActuaciones}
          descripcion="Funciones realizadas"
          icono="actuaciones"
        />

        <IndicadorResumen
          titulo="Importe total"
          valor={mostrarImporte(
            resumen.totalImporte,
          )}
          descripcion="Total del periodo"
          icono="importe"
          principal
        />
      </section>

      {/* AVISOS */}

      <AvisosLiquidacion
        avisos={avisos}
      />

      {/* ENCABEZADO DEL LISTADO */}

      <section
        aria-label="Liquidaciones individuales"
        className="space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-on-surface">
              Liquidaciones individuales
            </h2>

            <p className="mt-1 text-sm text-on-surface-variant">
              Desglose de las funciones realizadas
              por cada persona.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3 py-2 text-xs font-bold tabular-nums text-on-surface-variant sm:text-sm">
            <Icono
              nombre="calendario"
              className="h-4 w-4 text-primary"
            />

            {formatearPeriodoLiquidacion(
              periodo,
            )}
          </div>
        </div>

        {/* LISTADO COMPLETO */}

        {hayLiquidaciones ? (
          <div className="space-y-4">
            {liquidaciones.map(
              (liquidacion) => (
                <LiquidacionIndividual
                  key={liquidacion.id}
                  liquidacion={liquidacion}
                />
              ),
            )}
          </div>
        ) : (
          <EstadoVacio />
        )}
      </section>

      {/* TOTAL FINAL */}

      {hayLiquidaciones && (
        <TotalGeneral
          resultado={resultado}
        />
      )}
    </div>
  );
}
