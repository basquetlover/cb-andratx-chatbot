
import {
  useMemo,
  useState,
} from "react";

import type {
  EstadisticasPersona,
  FuncionDesignacion,
  ResultadoEstadisticasDesignaciones,
} from "@servicios/backend/designaciones/obtenerEstadisticasDesignaciones";

// ======================================================
// C.B. ANDRATX
// PANEL VISUAL DE ESTADÍSTICAS
//
// Árbitros y oficiales de mesa.
//
// - Resumen de temporada.
// - Evolución mensual.
// - Distribución de funciones.
// - Estadísticas individuales.
// - Búsqueda y filtros.
// - Sin dependencias gráficas externas.
// ======================================================

// ======================================================
// TIPOS
// ======================================================

interface Props {
  resultadoInicial: ResultadoEstadisticasDesignaciones;
}

type FiltroEstado =
  | "todos"
  | "activos"
  | "inactivos";

type FiltroHabilitacion =
  | "todos"
  | "pista"
  | "mesa"
  | "ambos";

type MetricaMensual =
  | "partidos"
  | "actuaciones"
  | "personas";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const FUNCIONES: {
  codigo: FuncionDesignacion;
  nombre: string;
  clase: string;
}[] = [
  {
    codigo: "AP",
    nombre: "Árbitro principal",
    clase: "bg-primary",
  },
  {
    codigo: "AX",
    nombre: "Árbitro auxiliar",
    clase: "bg-secondary",
  },
  {
    codigo: "AN",
    nombre: "Anotador",
    clase: "bg-tertiary",
  },
  {
    codigo: "CR",
    nombre: "Cronometrador",
    clase: "bg-primary/70",
  },
  {
    codigo: "OP",
    nombre: "Operador de RLL",
    clase: "bg-secondary/70",
  },
  {
    codigo: "AY",
    nombre: "Ayudante de anotador",
    clase: "bg-tertiary/70",
  },
];

const CLASE_CAMPO =
  "min-h-11 w-full rounded-xl border " +
  "border-outline-variant bg-surface-container-lowest " +
  "px-3 py-2 text-sm text-on-surface outline-none " +
  "focus:border-primary focus:ring-2 focus:ring-primary/15";

// ======================================================
// UTILIDADES
// ======================================================

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function formatoNumero(numero: number): string {
  return new Intl.NumberFormat("es-ES").format(
    numero,
  );
}

function nombreHabilitacion(
  habilitacion: string,
): string {
  switch (habilitacion) {
    case "pista":
      return "Árbitro de pista";

    case "mesa":
      return "Oficial de mesa";

    case "ambos":
      return "Pista y mesa";

    default:
      return "Sin definir";
  }
}

function etiquetaMes(mes: string): string {
  const coincidencia = mes.match(
    /^(\d{4})-(0[1-9]|1[0-2])$/,
  );

  if (!coincidencia) {
    return mes;
  }

  const fecha = new Date(
    Date.UTC(
      Number(coincidencia[1]),
      Number(coincidencia[2]) - 1,
      1,
    ),
  );

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    },
  ).format(fecha);
}

function porcentaje(
  cantidad: number,
  total: number,
): number {
  if (total <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, (cantidad / total) * 100),
  );
}

// ======================================================
// TARJETA RESUMEN
// ======================================================

function TarjetaResumen({
  titulo,
  valor,
  descripcion,
  destacada = false,
}: {
  titulo: string;
  valor: number;
  descripcion: string;
  destacada?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 shadow-sm sm:p-5",
        destacada
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant/60 bg-surface-container-lowest text-on-surface",
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-bold uppercase tracking-wide",
          destacada
            ? "text-on-primary/80"
            : "text-on-surface-variant",
        ].join(" ")}
      >
        {titulo}
      </p>

      <p className="mt-2 text-3xl font-extrabold tabular-nums">
        {formatoNumero(valor)}
      </p>

      <p
        className={[
          "mt-2 text-xs",
          destacada
            ? "text-on-primary/80"
            : "text-on-surface-variant",
        ].join(" ")}
      >
        {descripcion}
      </p>
    </div>
  );
}

// ======================================================
// GRÁFICO DE EVOLUCIÓN MENSUAL
// ======================================================

function GraficoMensual({
  datos,
  metrica,
}: {
  datos: ResultadoEstadisticasDesignaciones["porMes"];
  metrica: MetricaMensual;
}) {
  const maximo = Math.max(
    1,
    ...datos.map((mes) => mes[metrica]),
  );

  if (datos.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl bg-surface-container-low p-6 text-center">
        <p className="text-sm text-on-surface-variant">
          Todavía no hay actuaciones realizadas
          para representar la evolución mensual.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="flex min-h-72 items-end gap-3 border-b border-outline-variant/60 pb-2 pt-6"
        style={{
          minWidth: Math.max(
            360,
            datos.length * 62,
          ),
        }}
      >
        {datos.map((mes) => {
          const valor = mes[metrica];

          const altura = porcentaje(
            valor,
            maximo,
          );

          return (
            <div
              key={mes.mes}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <span className="text-xs font-extrabold tabular-nums text-on-surface">
                {valor}
              </span>

              <div className="flex h-48 w-full max-w-12 items-end justify-center rounded-t-lg bg-surface-container-low">
                <div
                  className="w-full rounded-t-lg bg-primary transition-all"
                  style={{
                    height:
                      valor > 0
                        ? `${Math.max(altura, 2)}%`
                        : "0%",
                  }}
                  title={`${etiquetaMes(mes.mes)}: ${valor}`}
                />
              </div>

              <span className="min-h-8 text-center text-[11px] font-semibold text-on-surface-variant">
                {etiquetaMes(mes.mes)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ======================================================
// GRÁFICO DE DISTRIBUCIÓN DE FUNCIONES
// ======================================================

function GraficoFunciones({
  funciones,
}: {
  funciones: ResultadoEstadisticasDesignaciones["porFuncion"];
}) {
  const total = FUNCIONES.reduce(
    (suma, funcion) =>
      suma + (funciones[funcion.codigo] ?? 0),
    0,
  );

  const maximo = Math.max(
    1,
    ...FUNCIONES.map(
      (funcion) =>
        funciones[funcion.codigo] ?? 0,
    ),
  );

  return (
    <div className="space-y-5">
      {FUNCIONES.map((funcion) => {
        const cantidad =
          funciones[funcion.codigo] ?? 0;

        return (
          <div
            key={funcion.codigo}
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-surface-container px-2 py-1 text-xs font-extrabold text-on-surface">
                  {funcion.codigo}
                </span>

                <span className="truncate text-sm font-semibold text-on-surface">
                  {funcion.nombre}
                </span>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-sm font-extrabold tabular-nums text-on-surface">
                  {cantidad}
                </span>

                <span className="ml-2 text-xs text-on-surface-variant">
                  {porcentaje(cantidad, total).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-surface-container">
              <div
                className={`h-full rounded-full ${funcion.clase}`}
                style={{
                  width: `${porcentaje(
                    cantidad,
                    maximo,
                  )}%`,
                }}
              />
            </div>
          </div>
        );
      })}

      <p className="border-t border-outline-variant/60 pt-4 text-xs text-on-surface-variant">
        Total de funciones realizadas:{" "}
        <strong className="text-on-surface">
          {formatoNumero(total)}
        </strong>
        . Se contabilizan según la función realizada,
        no únicamente la designada.
      </p>
    </div>
  );
}

// ======================================================
// ESTADÍSTICA DE UNA PERSONA
// ======================================================

function FichaEstadisticaPersona({
  persona,
  posicion,
}: {
  persona: EstadisticasPersona;
  posicion: number;
}) {
  const [detallesVisibles, setDetallesVisibles] =
    useState(false);

  const funcionesUtilizadas = FUNCIONES.filter(
    (funcion) =>
      persona.funciones[funcion.codigo] > 0,
  );

  return (
    <article className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-sm font-extrabold text-on-primary-fixed">
            {posicion}
          </span>

          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface-variant">
              {persona.codigo || "Sin código"}
            </p>

            <h4 className="mt-1 text-base font-extrabold text-on-surface">
              {persona.nombreCompleto}
            </h4>

            <p className="mt-1 text-xs text-on-surface-variant">
              {nombreHabilitacion(persona.habilitacion)}
            </p>
          </div>
        </div>

        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-bold",
            persona.activo
              ? "bg-primary-fixed text-on-primary-fixed"
              : "bg-surface-container-high text-on-surface-variant",
          ].join(" ")}
        >
          {persona.activo ? "Activo" : "Inactivo"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          {
            titulo: "Partidos",
            valor: persona.partidosRealizados,
          },
          {
            titulo: "Actuaciones",
            valor: persona.actuacionesRealizadas,
          },
          {
            titulo: "Pendientes",
            valor: persona.designacionesPendientes,
          },
        ].map((dato) => (
          <div
            key={dato.titulo}
            className="rounded-xl bg-surface-container-low p-3 text-center"
          >
            <p className="text-xl font-extrabold tabular-nums text-on-surface">
              {formatoNumero(dato.valor)}
            </p>

            <p className="mt-1 text-[11px] text-on-surface-variant">
              {dato.titulo}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {funcionesUtilizadas.length > 0 ? (
          funcionesUtilizadas.map((funcion) => (
            <span
              key={funcion.codigo}
              className="rounded-lg bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface"
              title={funcion.nombre}
            >
              {funcion.codigo}:{" "}
              {persona.funciones[funcion.codigo]}
            </span>
          ))
        ) : (
          <p className="text-xs text-on-surface-variant">
            Sin funciones realizadas.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          setDetallesVisibles((anterior) => !anterior)
        }
        aria-expanded={detallesVisibles}
        className="mt-4 min-h-10 w-full rounded-xl border border-outline-variant px-4 text-sm font-bold text-on-surface transition-colors hover:border-primary hover:text-primary"
      >
        {detallesVisibles
          ? "Ocultar desglose"
          : "Ver desglose completo"}
      </button>

      {detallesVisibles && (
        <div className="mt-4 space-y-4 border-t border-outline-variant/60 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-container-low p-3">
              <p className="text-xs text-on-surface-variant">
                Nivel de pista
              </p>

              <p className="mt-1 text-sm font-bold text-on-surface">
                {persona.nivelPista || "Sin asignar"}
              </p>
            </div>

            <div className="rounded-lg bg-surface-container-low p-3">
              <p className="text-xs text-on-surface-variant">
                Nivel de mesa
              </p>

              <p className="mt-1 text-sm font-bold text-on-surface">
                {persona.nivelMesa || "Sin asignar"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FUNCIONES.map((funcion) => (
              <div
                key={funcion.codigo}
                className="rounded-lg border border-outline-variant/60 p-3"
              >
                <p className="text-xs font-bold text-on-surface-variant">
                  {funcion.codigo}
                </p>

                <p className="mt-1 text-lg font-extrabold tabular-nums text-on-surface">
                  {persona.funciones[funcion.codigo]}
                </p>

                <p className="mt-1 text-[11px] text-on-surface-variant">
                  {funcion.nombre}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function EstadisticasDesignacionesPanel({
  resultadoInicial,
}: Props) {
  const {
    temporada,
    resumen,
    porPersona,
    porMes,
    porFuncion,
  } = resultadoInicial;

  const [metricaMensual, setMetricaMensual] =
    useState<MetricaMensual>("actuaciones");

  const [busqueda, setBusqueda] =
    useState("");

  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("todos");

  const [
    filtroHabilitacion,
    setFiltroHabilitacion,
  ] = useState<FiltroHabilitacion>("todos");

  const [soloConActuaciones, setSoloConActuaciones] =
    useState(false);

  // ====================================================
  // FILTRAR PERSONAL
  // ====================================================

  const personasFiltradas = useMemo(() => {
    const consulta = normalizar(
      busqueda.trim(),
    );

    return porPersona.filter((persona) => {
      if (
        filtroEstado === "activos" &&
        !persona.activo
      ) {
        return false;
      }

      if (
        filtroEstado === "inactivos" &&
        persona.activo
      ) {
        return false;
      }

      if (filtroHabilitacion !== "todos") {
        if (
          persona.habilitacion !==
            filtroHabilitacion &&
          persona.habilitacion !== "ambos"
        ) {
          return false;
        }
      }

      if (
        soloConActuaciones &&
        persona.actuacionesRealizadas === 0
      ) {
        return false;
      }

      if (!consulta) {
        return true;
      }

      const contenido = normalizar(
        [
          persona.codigo,
          persona.nombreCompleto,
          persona.habilitacion,
          persona.nivelPista ?? "",
          persona.nivelMesa ?? "",
        ].join(" "),
      );

      return contenido.includes(consulta);
    });
  }, [
    porPersona,
    busqueda,
    filtroEstado,
    filtroHabilitacion,
    soloConActuaciones,
  ]);

  // ====================================================
  // RESUMEN
  // ====================================================

  const tarjetas = [
    {
      titulo: "Personal",
      valor: resumen.totalPersonal,
      descripcion: `${resumen.personalActivo} activos`,
    },
    {
      titulo: "Partidos",
      valor: resumen.totalPartidos,
      descripcion: "Registrados en la temporada",
    },
    {
      titulo: "Con designaciones",
      valor: resumen.partidosConDesignaciones,
      descripcion: "Partidos con personal asignado",
    },
    {
      titulo: "Con actuaciones",
      valor: resumen.partidosConActuaciones,
      descripcion: "Partidos con funciones realizadas",
    },
    {
      titulo: "Actuaciones",
      valor: resumen.actuacionesRealizadas,
      descripcion: "Funciones realizadas",
      destacada: true,
    },
    {
      titulo: "Pendientes",
      valor: resumen.designacionesPendientes,
      descripcion: "Sin función realizada",
    },
  ];

  // ====================================================
  // INTERFAZ
  // ====================================================

  return (
    <div className="space-y-6">
      {/* TEMPORADA */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Temporada seleccionada
          </p>

          <h3 className="mt-1 text-xl font-extrabold text-on-surface">
            {temporada.nombre}
          </h3>
        </div>

        <span className="rounded-full bg-primary-fixed px-4 py-2 text-xs font-bold text-on-primary-fixed">
          {resumen.personasConActuaciones} personas con actuaciones
        </span>
      </div>

      {/* TARJETAS DE RESUMEN */}

      <section
        aria-label="Resumen estadístico"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
      >
        {tarjetas.map((tarjeta) => (
          <TarjetaResumen
            key={tarjeta.titulo}
            {...tarjeta}
          />
        ))}
      </section>

      {/* GRÁFICOS */}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* EVOLUCIÓN MENSUAL */}

        <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-on-surface">
                Evolución mensual
              </h3>

              <p className="mt-1 text-sm text-on-surface-variant">
                Actividad registrada a lo largo de la temporada.
              </p>
            </div>

            <label className="block">
              <span className="sr-only">
                Métrica del gráfico
              </span>

              <select
                value={metricaMensual}
                onChange={(evento) =>
                  setMetricaMensual(
                    evento.target.value as MetricaMensual,
                  )
                }
                className={CLASE_CAMPO}
              >
                <option value="actuaciones">
                  Actuaciones
                </option>

                <option value="partidos">
                  Partidos
                </option>

                <option value="personas">
                  Personas
                </option>
              </select>
            </label>
          </div>

          <div className="mt-5">
            <GraficoMensual
              datos={porMes}
              metrica={metricaMensual}
            />
          </div>

          <p className="mt-4 text-xs text-on-surface-variant">
            Cada mes se calcula según la fecha del partido
            y las funciones registradas como realizadas.
          </p>
        </section>

        {/* DISTRIBUCIÓN DE FUNCIONES */}

        <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-extrabold text-on-surface">
            Distribución de funciones
          </h3>

          <p className="mt-1 text-sm text-on-surface-variant">
            Actuaciones por cargo de arbitraje y mesa.
          </p>

          <div className="mt-6">
            <GraficoFunciones
              funciones={porFuncion}
            />
          </div>
        </section>
      </div>

      {/* ESTADÍSTICAS INDIVIDUALES */}

      <section className="space-y-5">
        <div>
          <h3 className="text-xl font-extrabold text-on-surface">
            Estadísticas individuales
          </h3>

          <p className="mt-2 text-sm text-on-surface-variant">
            Partidos únicos disputados, actuaciones reales
            y funciones desempeñadas por cada persona.
          </p>
        </div>

        {/* FILTROS */}

        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Buscar persona
              </span>

              <input
                type="search"
                value={busqueda}
                onChange={(evento) =>
                  setBusqueda(evento.target.value)
                }
                placeholder="Nombre o código..."
                className={CLASE_CAMPO}
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
                className={CLASE_CAMPO}
              >
                <option value="todos">
                  Todos
                </option>

                <option value="activos">
                  Activos
                </option>

                <option value="inactivos">
                  Inactivos
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Habilitación
              </span>

              <select
                value={filtroHabilitacion}
                onChange={(evento) =>
                  setFiltroHabilitacion(
                    evento.target.value as FiltroHabilitacion,
                  )
                }
                className={CLASE_CAMPO}
              >
                <option value="todos">
                  Todas
                </option>

                <option value="pista">
                  Pista
                </option>

                <option value="mesa">
                  Mesa
                </option>

                <option value="ambos">
                  Pista y mesa
                </option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/60 pt-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={soloConActuaciones}
                onChange={(evento) =>
                  setSoloConActuaciones(
                    evento.target.checked,
                  )
                }
                className="h-4 w-4 accent-primary"
              />

              Solo personas con actuaciones realizadas
            </label>

            <span className="text-xs font-semibold text-on-surface-variant">
              {personasFiltradas.length} personas
            </span>
          </div>
        </div>

        {/* LISTADO INDIVIDUAL */}

        {personasFiltradas.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {personasFiltradas.map((persona, indice) => (
              <FichaEstadisticaPersona
                key={persona.id}
                persona={persona}
                posicion={indice + 1}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest px-5 py-12 text-center">
            <h4 className="text-lg font-extrabold text-on-surface">
              No se han encontrado personas
            </h4>

            <p className="mt-2 text-sm text-on-surface-variant">
              Cambia los filtros para consultar otras estadísticas.
            </p>

            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setFiltroEstado("todos");
                setFiltroHabilitacion("todos");
                setSoloConActuaciones(false);
              }}
              className="mt-5 min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </section>

      {/* NOTA METODOLÓGICA */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5">
        <h4 className="text-sm font-extrabold text-on-surface">
          Cómo se calculan las estadísticas
        </h4>

        <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
          Un partido solo cuenta una vez por persona, aunque
          haya realizado varias funciones. Cada función
          realizada cuenta como una actuación independiente.
          Las designaciones sin función realizada se mantienen
          como pendientes. Las cifras corresponden únicamente
          a los datos registrados en la temporada seleccionada.
        </p>
      </section>
    </div>
  );
}
