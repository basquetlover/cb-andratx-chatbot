
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/*
 * C.B. ANDRATX
 * Panel principal del sistema
 * de Códigos y boletos.
 *
 * Incluye:
 *
 * - Resumen general.
 * - Navegación del módulo.
 * - Campañas recientes.
 * - Lotes recientes.
 * - Artículos.
 * - Boletos recientes.
 * - Estados de carga y error.
 * - Integración de futuras secciones.
 *
 * No gestiona tokens QR ni descifra
 * premios en el navegador.
 */

// ================================================
// TIPOS PÚBLICOS
// ================================================

export type SeccionPanelCodigos =
  | "inicio"
  | "campanas"
  | "articulos"
  | "lotes"
  | "boletos"
  | "estadisticas"
  | "escaner"
  | "impresion";

export interface PanelCodigosProps {
  seccionInicial?: SeccionPanelCodigos;

  /*
   * La ruta principal podrá integrar
   * los próximos componentes mediante
   * esta función.
   *
   * Si devuelve null o undefined,
   * se mostrará la vista básica.
   */
  renderSeccion?: (
    seccion: SeccionPanelCodigos,
  ) => ReactNode;

  onSeccionChange?: (
    seccion: SeccionPanelCodigos,
  ) => void;
}

// ================================================
// TIPOS DE RESPUESTAS API
// ================================================

interface CampanaResumen {
  id: string;
  nombre: string;
  descripcion: string | null;

  estado: string;
  estadoVentas: string;
  estadoCanjes: string;

  fechaInicio: string | null;
  fechaFin: string | null;

  createdAt: string;
}

interface LoteResumen {
  id: string;
  campanaId: string;

  nombre: string;
  cantidadTotal: number;
  estado: string;

  generadoAt: string | null;
  createdAt: string;
}

interface ArticuloResumen {
  id: string;

  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;

  activo: boolean;
}

interface CodigoResumen {
  id: string;
  codigoVisible: string;

  estadoVenta: string;
  estadoRegistro: string;

  createdAt: string;
}

interface RespuestaCampanas {
  campanas: CampanaResumen[];
  total: number;
}

interface RespuestaLotes {
  lotes: LoteResumen[];
  total: number;
}

interface RespuestaArticulos {
  articulos: ArticuloResumen[];
  total: number;
}

interface RespuestaCodigos {
  codigos: CodigoResumen[];
  total: number;
}

interface DatosPanel {
  campanas: RespuestaCampanas | null;
  lotes: RespuestaLotes | null;
  articulos: RespuestaArticulos | null;
  codigos: RespuestaCodigos | null;
}

// ================================================
// TIPOS DE ICONOS
// ================================================

type NombreIcono =
  | "inicio"
  | "campanas"
  | "articulos"
  | "lotes"
  | "boletos"
  | "estadisticas"
  | "escaner"
  | "impresion"
  | "actualizar"
  | "flecha"
  | "alerta"
  | "buscar"
  | "reloj"
  | "check";

// ================================================
// CONFIGURACIÓN DE NAVEGACIÓN
// ================================================

const SECCIONES: {
  id: SeccionPanelCodigos;
  nombre: string;
  descripcion: string;
  icono: NombreIcono;
}[] = [
  {
    id: "inicio",
    nombre: "Resumen",
    descripcion:
      "Visión general del sistema",
    icono: "inicio",
  },
  {
    id: "campanas",
    nombre: "Campañas",
    descripcion:
      "Gestionar campañas",
    icono: "campanas",
  },
  {
    id: "articulos",
    nombre: "Artículos",
    descripcion:
      "Catálogo de premios",
    icono: "articulos",
  },
  {
    id: "lotes",
    nombre: "Lotes",
    descripcion:
      "Generar boletos",
    icono: "lotes",
  },
  {
    id: "boletos",
    nombre: "Boletos",
    descripcion:
      "Consultar y gestionar",
    icono: "boletos",
  },
  {
    id: "estadisticas",
    nombre: "Estadísticas",
    descripcion:
      "Consultar resultados",
    icono: "estadisticas",
  },
  {
    id: "escaner",
    nombre: "Escáner",
    descripcion:
      "Leer códigos QR",
    icono: "escaner",
  },
  {
    id: "impresion",
    nombre: "Impresión",
    descripcion:
      "Preparar boletos",
    icono: "impresion",
  },
];

// ================================================
// ICONOS SVG
// ================================================

function Icono({
  nombre,
  size = 20,
  className = "",
}: {
  nombre: NombreIcono;
  size?: number;
  className?: string;
}) {
  let contenido: ReactNode;

  switch (nombre) {
    case "inicio":
      contenido = (
        <>
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
        </>
      );
      break;

    case "campanas":
      contenido = (
        <>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
          />
          <path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6" />
        </>
      );
      break;

    case "articulos":
      contenido = (
        <>
          <rect
            x="3"
            y="8"
            width="18"
            height="13"
            rx="2"
          />
          <path d="M3 12h18M12 8v13M4 8h16" />
          <path d="M12 8c-5 0-7-2-5-4s5 1 5 4ZM12 8c5 0 7-2 5-4s-5 1-5 4Z" />
        </>
      );
      break;

    case "lotes":
      contenido = (
        <>
          <rect
            x="4"
            y="5"
            width="16"
            height="15"
            rx="2"
          />
          <path d="M8 5V3h8v2M8 10h8M8 14h8M8 18h4" />
        </>
      );
      break;

    case "boletos":
      contenido = (
        <>
          <path d="M3 7a2 2 0 0 0 2-2h14v4a2 2 0 0 0 0 4v4H5a2 2 0 0 0-2-2V7Z" />
          <path d="M12 5v2m0 3v2m0 3v2" />
        </>
      );
      break;

    case "estadisticas":
      contenido = (
        <>
          <path d="M3 20h18M6 17v-6M12 17V5M18 17V9" />
          <rect
            x="4"
            y="11"
            width="4"
            height="6"
            rx="1"
          />
          <rect
            x="10"
            y="5"
            width="4"
            height="12"
            rx="1"
          />
          <rect
            x="16"
            y="9"
            width="4"
            height="8"
            rx="1"
          />
        </>
      );
      break;

    case "escaner":
      contenido = (
        <>
          <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4M3 12h18" />
        </>
      );
      break;

    case "impresion":
      contenido = (
        <>
          <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect
            x="6"
            y="14"
            width="12"
            height="8"
            rx="1"
          />
          <path d="M18 12h.01" />
        </>
      );
      break;

    case "actualizar":
      contenido = (
        <>
          <path d="M20 11a8 8 0 1 0-2.4 6" />
          <path d="M20 4v7h-7" />
        </>
      );
      break;

    case "flecha":
      contenido = (
        <>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </>
      );
      break;

    case "alerta":
      contenido = (
        <>
          <path d="m12 3 10 18H2L12 3Z" />
          <path d="M12 9v5M12 17h.01" />
        </>
      );
      break;

    case "buscar":
      contenido = (
        <>
          <circle
            cx="11"
            cy="11"
            r="7"
          />
          <path d="m16 16 5 5" />
        </>
      );
      break;

    case "reloj":
      contenido = (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M12 7v5l3 2" />
        </>
      );
      break;

    case "check":
      contenido = (
        <path d="m5 12 4 4L19 6" />
      );
      break;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {contenido}
    </svg>
  );
}

// ================================================
// AYUDAS DE FORMATO
// ================================================

function formatearNumero(
  valor: number | null | undefined,
): string {
  if (
    typeof valor !== "number" ||
    !Number.isFinite(valor)
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "es-ES",
  ).format(valor);
}

function formatearFecha(
  valor: string | null | undefined,
): string {
  if (!valor) {
    return "Sin fecha";
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime(),
    )
  ) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(fecha);
}

function obtenerNombreEstado(
  estado: string,
): string {
  const nombres:
    Record<string, string> = {
      borrador: "Borrador",
      activa: "Activa",
      finalizada: "Finalizada",

      pendiente: "Pendiente",
      generando: "Generando",
      generado: "Generado",
      error: "Error",

      vendido: "Vendido",
      no_vendido: "No vendido",

      activo: "Activo",
      anulado: "Anulado",
      eliminado: "Eliminado",
    };

  return (
    nombres[estado] ??
    estado.replaceAll("_", " ")
  );
}

function obtenerColorEstado(
  estado: string,
): string {
  switch (estado) {
    case "activa":
    case "activo":
    case "generado":
    case "vendido":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "borrador":
    case "pendiente":
      return "bg-amber-50 text-amber-800 ring-amber-200";

    case "generando":
      return "bg-sky-50 text-sky-700 ring-sky-200";

    case "finalizada":
    case "no_vendido":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    case "error":
    case "anulado":
    case "eliminado":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

// ================================================
// COMPONENTES VISUALES PEQUEÑOS
// ================================================

function EtiquetaEstado({
  estado,
}: {
  estado: string;
}) {
  return (
    <span
      className={`
        inline-flex items-center
        rounded-full px-2.5 py-1
        text-[11px] font-semibold
        ring-1 ring-inset
        ${obtenerColorEstado(estado)}
      `}
    >
      {obtenerNombreEstado(estado)}
    </span>
  );
}

function CabeceraBloque({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-[#0B1C30] sm:text-lg">
          {titulo}
        </h2>

        {descripcion && (
          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            {descripcion}
          </p>
        )}
      </div>

      {accion}
    </div>
  );
}

function BotonSeccion({
  texto,
  onClick,
  variante = "claro",
}: {
  texto: string;
  onClick: () => void;
  variante?: "claro" | "oscuro";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        variante === "oscuro"
          ? "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B1C30] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#18385D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1C30]"
          : "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#0B1C30] transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1C30]"
      }
    >
      {texto}
      <Icono
        nombre="flecha"
        size={15}
      />
    </button>
  );
}

function TarjetaMetrica({
  titulo,
  valor,
  subtitulo,
  icono,
  cargando,
  onClick,
}: {
  titulo: string;
  valor: number | null;
  subtitulo: string;
  icono: NombreIcono;
  cargando: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1C30] sm:p-5"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-500 sm:text-sm">
          {titulo}
        </span>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF4FA] text-[#173A62]">
          <Icono
            nombre={icono}
            size={21}
          />
        </span>
      </div>

      <div className="mt-3">
        {cargando ? (
          <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <span className="text-3xl font-bold tracking-tight text-[#0B1C30]">
            {formatearNumero(valor)}
          </span>
        )}
      </div>

      <span className="mt-2 text-xs text-slate-500">
        {subtitulo}
      </span>

      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#1C5C93] group-hover:underline">
        Ver sección
        <Icono
          nombre="flecha"
          size={13}
        />
      </span>
    </button>
  );
}

function EstadoVacio({
  mensaje,
}: {
  mensaje: string;
}) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
      <Icono
        nombre="buscar"
        size={24}
        className="text-slate-400"
      />

      <p className="max-w-sm text-sm text-slate-500">
        {mensaje}
      </p>
    </div>
  );
}

function EstadoCargando() {
  return (
    <div
      className="space-y-3 py-2"
      role="status"
      aria-label="Cargando información"
    >
      {[1, 2, 3].map((numero) => (
        <div
          key={numero}
          className="flex animate-pulse items-center justify-between gap-4 rounded-xl border border-slate-100 p-4"
        >
          <div className="space-y-2">
            <div className="h-3 w-36 rounded bg-slate-100" />
            <div className="h-2 w-24 rounded bg-slate-100" />
          </div>

          <div className="h-6 w-20 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

// ================================================
// PETICIONES API
// ================================================

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

async function solicitarDatos<T>(
  ruta: string,
  signal: AbortSignal,
): Promise<T> {
  const respuesta =
    await fetch(ruta, {
      method: "GET",

      credentials: "same-origin",

      cache: "no-store",

      signal,

      headers: {
        Accept: "application/json",
      },
    });

  let contenido: unknown;

  try {
    contenido =
      await respuesta.json();
  } catch {
    throw new Error(
      "El servidor no ha devuelto una respuesta válida.",
    );
  }

  if (
    !esObjeto(contenido) ||
    !respuesta.ok ||
    contenido.ok !== true ||
    !esObjeto(contenido.data)
  ) {
    const mensaje =
      esObjeto(contenido) &&
      typeof contenido.error === "string"
        ? contenido.error
        : "No se ha podido completar la consulta.";

    throw new Error(mensaje);
  }

  return contenido.data as T;
}

// ================================================
// DATOS INICIALES
// ================================================

const DATOS_INICIALES: DatosPanel = {
  campanas: null,
  lotes: null,
  articulos: null,
  codigos: null,
};

// ================================================
// COMPONENTE PRINCIPAL
// ================================================

export default function PanelCodigos({
  seccionInicial = "inicio",
  renderSeccion,
  onSeccionChange,
}: PanelCodigosProps) {
  const [
    seccionActual,
    setSeccionActual,
  ] = useState<SeccionPanelCodigos>(
    seccionInicial,
  );

  const [
    datos,
    setDatos,
  ] = useState<DatosPanel>(
    DATOS_INICIALES,
  );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    errores,
    setErrores,
  ] = useState<string[]>([]);

  const [
    actualizacion,
    setActualizacion,
  ] = useState(0);

  const [
    busquedaLocal,
    setBusquedaLocal,
  ] = useState("");

  // ============================================
  // SINCRONIZAR SECCIÓN INICIAL
  // ============================================

  useEffect(() => {
    setSeccionActual(
      seccionInicial,
    );
  }, [seccionInicial]);

  // ============================================
  // CARGAR DATOS DESDE LAS API
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    let activo = true;

    setCargando(true);
    setErrores([]);

    /*
     * Las consultas son independientes.
     *
     * Si el usuario no dispone de
     * acceso a una de ellas, las
     * demás pueden seguir funcionando.
     */

    const tareas = [
      solicitarDatos<RespuestaCampanas>(
        "/api/panel/codigos/campanas?limite=6",
        controlador.signal,
      ),

      solicitarDatos<RespuestaLotes>(
        "/api/panel/codigos/lotes?limite=6",
        controlador.signal,
      ),

      solicitarDatos<RespuestaArticulos>(
        "/api/panel/codigos/articulos",
        controlador.signal,
      ),

      solicitarDatos<RespuestaCodigos>(
        "/api/panel/codigos?limite=6",
        controlador.signal,
      ),
    ] as const;

    Promise.allSettled(
      tareas,
    ).then((resultados) => {
      if (!activo) {
        return;
      }

      const [
        campanas,
        lotes,
        articulos,
        codigos,
      ] = resultados;

      setDatos({
        campanas:
          campanas.status === "fulfilled"
            ? campanas.value
            : null,

        lotes:
          lotes.status === "fulfilled"
            ? lotes.value
            : null,

        articulos:
          articulos.status === "fulfilled"
            ? articulos.value
            : null,

        codigos:
          codigos.status === "fulfilled"
            ? codigos.value
            : null,
      });

      const nombres = [
        "campañas",
        "lotes",
        "artículos",
        "boletos",
      ];

      const erroresEncontrados:
        string[] = [];

      resultados.forEach(
        (resultado, indice) => {
          if (
            resultado.status ===
            "rejected"
          ) {
            erroresEncontrados.push(
              `No se ha podido cargar ${nombres[indice]}.`,
            );
          }
        },
      );

      setErrores(
        erroresEncontrados,
      );

      setCargando(false);
    });

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [actualizacion]);

  // ============================================
  // CAMBIAR SECCIÓN
  // ============================================

  function cambiarSeccion(
    siguiente: SeccionPanelCodigos,
  ) {
    setSeccionActual(
      siguiente,
    );

    setBusquedaLocal("");

    onSeccionChange?.(
      siguiente,
    );
  }

  // ============================================
  // FILTROS LOCALES DE PREVISUALIZACIÓN
  // ============================================

  const campanasVisibles =
    useMemo(() => {
      const lista =
        datos.campanas?.campanas ?? [];

      const busqueda =
        busquedaLocal
          .trim()
          .toLocaleLowerCase("es");

      if (!busqueda) {
        return lista;
      }

      return lista.filter(
        (campana) =>
          campana.nombre
            .toLocaleLowerCase("es")
            .includes(busqueda),
      );
    }, [
      datos.campanas,
      busquedaLocal,
    ]);

  const articulosActivos =
    datos.articulos?.articulos.filter(
      (articulo) =>
        articulo.activo,
    ).length ?? null;

  // ============================================
  // LISTADO DE CAMPAÑAS
  // ============================================

  function mostrarCampanas(
    completo = false,
  ) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <CabeceraBloque
          titulo={
            completo
              ? "Campañas"
              : "Campañas recientes"
          }
          descripcion="Campañas de códigos y rasca y gana del club."
          accion={
            !completo ? (
              <BotonSeccion
                texto="Ver campañas"
                onClick={() =>
                  cambiarSeccion(
                    "campanas",
                  )
                }
              />
            ) : undefined
          }
        />

        {completo && (
          <div className="relative mt-5">
            <Icono
              nombre="buscar"
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={busquedaLocal}
              onChange={(evento) =>
                setBusquedaLocal(
                  evento.target.value,
                )
              }
              placeholder="Buscar entre las campañas recientes"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-[#0B1C30] outline-none transition-colors placeholder:text-slate-400 focus:border-[#2D74AB] focus:bg-white"
            />
          </div>
        )}

        <div className="mt-5 space-y-2">
          {cargando ? (
            <EstadoCargando />
          ) : campanasVisibles.length === 0 ? (
            <EstadoVacio
              mensaje={
                datos.campanas === null
                  ? "No se han podido consultar las campañas."
                  : "No hay campañas que mostrar."
              }
            />
          ) : (
            campanasVisibles.map(
              (campana) => (
                <div
                  key={campana.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3.5 transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#174C78]">
                      <Icono
                        nombre="campanas"
                        size={19}
                      />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0B1C30]">
                        {campana.nombre}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatearFecha(
                          campana.createdAt,
                        )}
                      </p>
                    </div>
                  </div>

                  <EtiquetaEstado
                    estado={campana.estado}
                  />
                </div>
              ),
            )
          )}
        </div>

        {completo &&
          datos.campanas !== null &&
          datos.campanas.total >
            campanasVisibles.length && (
            <p className="mt-4 text-xs text-slate-500">
              Mostrando las campañas más
              recientes. La gestión completa
              y los filtros por página se
              integrarán en el componente
              de campañas.
            </p>
          )}
      </section>
    );
  }

  // ============================================
  // LISTADO DE LOTES
  // ============================================

  function mostrarLotes(
    completo = false,
  ) {
    const lotes =
      datos.lotes?.lotes ?? [];

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <CabeceraBloque
          titulo={
            completo
              ? "Lotes de boletos"
              : "Últimos lotes"
          }
          descripcion="Generaciones y estado de sus boletos."
          accion={
            !completo ? (
              <BotonSeccion
                texto="Ver lotes"
                onClick={() =>
                  cambiarSeccion(
                    "lotes",
                  )
                }
              />
            ) : undefined
          }
        />

        <div className="mt-5 space-y-2">
          {cargando ? (
            <EstadoCargando />
          ) : lotes.length === 0 ? (
            <EstadoVacio
              mensaje={
                datos.lotes === null
                  ? "No se han podido consultar los lotes."
                  : "Todavía no hay lotes generados."
              }
            />
          ) : (
            lotes.map((lote) => (
              <div
                key={lote.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Icono
                      nombre="lotes"
                      size={19}
                    />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0B1C30]">
                      {lote.nombre}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatearNumero(
                        lote.cantidadTotal,
                      )}{" "}
                      boletos ·{" "}
                      {formatearFecha(
                        lote.createdAt,
                      )}
                    </p>
                  </div>
                </div>

                <EtiquetaEstado
                  estado={lote.estado}
                />
              </div>
            ))
          )}
        </div>

        {completo &&
          datos.lotes !== null &&
          datos.lotes.total >
            lotes.length && (
            <p className="mt-4 text-xs text-slate-500">
              Se muestran los últimos lotes.
              La generación, el detalle y
              la paginación se añadirán
              en el componente correspondiente.
            </p>
          )}
      </section>
    );
  }

  // ============================================
  // ARTÍCULOS
  // ============================================

  function mostrarArticulos() {
    const articulos =
      datos.articulos?.articulos ?? [];

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <CabeceraBloque
          titulo="Catálogo de artículos"
          descripcion="Premios y productos registrados para las campañas."
        />

        {cargando ? (
          <div className="mt-5">
            <EstadoCargando />
          </div>
        ) : articulos.length === 0 ? (
          <div className="mt-5">
            <EstadoVacio
              mensaje={
                datos.articulos === null
                  ? "No se ha podido consultar el catálogo."
                  : "Todavía no se han creado artículos."
              }
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {articulos.map((articulo) => (
              <article
                key={articulo.id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-[#174C78]">
                  {articulo.imagenUrl ? (
                    <img
                      src={articulo.imagenUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Icono
                      nombre="articulos"
                      size={24}
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#0B1C30]">
                    {articulo.nombre}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {articulo.activo
                      ? "Disponible"
                      : "Inactivo"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  // ============================================
  // BOLETOS RECIENTES
  // ============================================

  function mostrarBoletos() {
    const codigos =
      datos.codigos?.codigos ?? [];

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <CabeceraBloque
          titulo="Boletos recientes"
          descripcion="Consulta básica sin revelar los resultados de los premios."
        />

        {cargando ? (
          <div className="mt-5">
            <EstadoCargando />
          </div>
        ) : codigos.length === 0 ? (
          <div className="mt-5">
            <EstadoVacio
              mensaje={
                datos.codigos === null
                  ? "No se ha podido consultar el listado de boletos."
                  : "Todavía no hay boletos disponibles."
              }
            />
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="pb-3 pr-4 font-semibold">
                    Código
                  </th>
                  <th className="pb-3 pr-4 font-semibold">
                    Venta
                  </th>
                  <th className="pb-3 pr-4 font-semibold">
                    Registro
                  </th>
                  <th className="pb-3 text-right font-semibold">
                    Fecha
                  </th>
                </tr>
              </thead>

              <tbody>
                {codigos.map((codigo) => (
                  <tr
                    key={codigo.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-3 pr-4 font-mono text-xs font-medium text-[#0B1C30]">
                      {codigo.codigoVisible}
                    </td>

                    <td className="py-3 pr-4">
                      <EtiquetaEstado
                        estado={codigo.estadoVenta}
                      />
                    </td>

                    <td className="py-3 pr-4">
                      <EtiquetaEstado
                        estado={codigo.estadoRegistro}
                      />
                    </td>

                    <td className="py-3 text-right text-xs text-slate-500">
                      {formatearFecha(
                        codigo.createdAt,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  // ============================================
  // SECCIONES PENDIENTES
  // ============================================

  function mostrarSeccionPendiente(
    id: SeccionPanelCodigos,
  ) {
    const actual =
      SECCIONES.find(
        (item) => item.id === id,
      );

    return (
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm sm:px-8 sm:py-14">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF5FA] text-[#174C78]">
          <Icono
            nombre={actual?.icono ?? "inicio"}
            size={30}
          />
        </div>

        <h2 className="mt-5 text-xl font-bold text-[#0B1C30]">
          {actual?.nombre ?? "Sección"}
        </h2>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
          Esta sección se conectará con su
          componente específico en los
          próximos archivos. El panel
          principal ya dispone de la
          navegación y del espacio para
          integrarla.
        </p>

        <div className="mt-6">
          <BotonSeccion
            texto="Volver al resumen"
            onClick={() =>
              cambiarSeccion(
                "inicio",
              )
            }
            variante="oscuro"
          />
        </div>
      </section>
    );
  }

  // ============================================
  // RENDERIZAR VISTA SELECCIONADA
  // ============================================

  function mostrarContenido() {
    if (
      seccionActual !== "inicio"
    ) {
      /*
       * La ruta principal podrá
       * proporcionar los futuros
       * componentes del módulo.
       */

      const personalizado =
        renderSeccion?.(
          seccionActual,
        );

      if (
        personalizado !== null &&
        personalizado !== undefined
      ) {
        return personalizado;
      }

      switch (seccionActual) {
        case "campanas":
          return mostrarCampanas(
            true,
          );

        case "articulos":
          return mostrarArticulos();

        case "lotes":
          return mostrarLotes(
            true,
          );

        case "boletos":
          return mostrarBoletos();

        default:
          return mostrarSeccionPendiente(
            seccionActual,
          );
      }
    }

    return (
      <div className="space-y-6">
        {/* INDICADORES */}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <TarjetaMetrica
            titulo="Campañas"
            valor={
              datos.campanas?.total ?? null
            }
            subtitulo="Campañas registradas"
            icono="campanas"
            cargando={cargando}
            onClick={() =>
              cambiarSeccion("campanas")
            }
          />

          <TarjetaMetrica
            titulo="Lotes"
            valor={
              datos.lotes?.total ?? null
            }
            subtitulo="Lotes registrados"
            icono="lotes"
            cargando={cargando}
            onClick={() =>
              cambiarSeccion("lotes")
            }
          />

          <TarjetaMetrica
            titulo="Artículos activos"
            valor={articulosActivos}
            subtitulo="Productos disponibles"
            icono="articulos"
            cargando={cargando}
            onClick={() =>
              cambiarSeccion("articulos")
            }
          />

          <TarjetaMetrica
            titulo="Boletos"
            valor={
              datos.codigos?.total ?? null
            }
            subtitulo="Códigos consultables"
            icono="boletos"
            cargando={cargando}
            onClick={() =>
              cambiarSeccion("boletos")
            }
          />
        </div>

        {/* ACCESOS RÁPIDOS */}

        <section className="rounded-2xl bg-[#0B1C30] p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold sm:text-lg">
                Accesos rápidos
              </h2>

              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                Selecciona el área en la que
                quieres trabajar.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(
              [
                {
                  id: "escaner",
                  titulo: "Escanear boletos",
                  descripcion:
                    "Consulta y registro mediante QR.",
                  icono: "escaner",
                },
                {
                  id: "lotes",
                  titulo: "Generar un lote",
                  descripcion:
                    "Prepara nuevos boletos.",
                  icono: "lotes",
                },
                {
                  id: "articulos",
                  titulo: "Gestionar premios",
                  descripcion:
                    "Consulta el catálogo.",
                  icono: "articulos",
                },
              ] as const
            ).map((acceso) => (
              <button
                key={acceso.id}
                type="button"
                onClick={() =>
                  cambiarSeccion(
                    acceso.id,
                  )
                }
                className="group flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-left transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2C94C] text-[#0B1C30]">
                  <Icono
                    nombre={acceso.icono}
                    size={20}
                  />
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-bold">
                    {acceso.titulo}
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-slate-300">
                    {acceso.descripcion}
                  </span>

                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#F2C94C]">
                    Ir a sección
                    <Icono
                      nombre="flecha"
                      size={13}
                    />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ACTIVIDAD RECIENTE */}

        <div className="grid items-start gap-5 xl:grid-cols-2">
          {mostrarCampanas()}
          {mostrarLotes()}
        </div>

        {/* NOTA DE SEGURIDAD */}

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#174C78]">
            <Icono
              nombre="check"
              size={20}
            />
          </span>

          <div>
            <h3 className="text-sm font-semibold text-[#0B1C30]">
              Datos protegidos
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              El resumen no muestra qué
              premio corresponde a cada
              boleto. Las consultas de
              premios y los canjes se
              realizan desde las funciones
              autorizadas del servidor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  const seccionSeleccionada =
    SECCIONES.find(
      (item) =>
        item.id === seccionActual,
    );

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-3 py-5 text-[#0B1C30] sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* CABECERA */}

        <header className="relative overflow-hidden rounded-[24px] bg-[#0B1C30] text-white shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#1A5D95]/30 blur-3xl"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-36 right-20 h-64 w-64 rounded-full bg-[#F2C94C]/10 blur-3xl"
          />

          <div className="relative flex flex-wrap items-center justify-between gap-5 p-5 sm:p-8">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 p-2 sm:h-20 sm:w-20">
                <img
                  src="/favicon.png"
                  alt="Escudo del Club Bàsquet Andratx"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#F2C94C]/30 bg-[#F2C94C]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#F2C94C]">
                  Administración
                </div>

                <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
                  Códigos y boletos
                </h1>

                <p className="mt-1 text-xs leading-5 text-slate-300 sm:text-sm">
                  Gestión de campañas,
                  artículos, boletos y
                  premios del Club Bàsquet
                  Andratx.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={cargando}
              onClick={() =>
                setActualizacion(
                  (anterior) =>
                    anterior + 1,
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2C94C]"
            >
              <Icono
                nombre="actualizar"
                size={16}
                className={
                  cargando
                    ? "animate-spin"
                    : ""
                }
              />

              {cargando
                ? "Actualizando"
                : "Actualizar"}
            </button>
          </div>

          <div className="h-1 w-full bg-[#F2C94C]" />
        </header>

        {/* NAVEGACIÓN */}

        <nav
          aria-label="Secciones de Códigos y boletos"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8"
        >
          {SECCIONES.map(
            (item) => {
              const seleccionada =
                item.id ===
                seccionActual;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={
                    seleccionada
                      ? "page"
                      : undefined
                  }
                  onClick={() =>
                    cambiarSeccion(
                      item.id,
                    )
                  }
                  className={`
                    flex min-w-0 flex-col
                    items-center justify-center
                    gap-2 rounded-2xl border
                    px-2 py-4 text-center
                    transition-all
                    focus-visible:outline-2
                    focus-visible:outline-offset-2
                    focus-visible:outline-[#0B1C30]
                    ${
                      seleccionada
                        ? "border-[#0B1C30] bg-[#0B1C30] text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#A9C4DD] hover:bg-[#EFF5FA] hover:text-[#0B1C30]"
                    }
                  `}
                >
                  <span
                    className={
                      seleccionada
                        ? "text-[#F2C94C]"
                        : "text-[#245F91]"
                    }
                  >
                    <Icono
                      nombre={item.icono}
                      size={23}
                    />
                  </span>

                  <span className="text-xs font-semibold sm:text-[13px]">
                    {item.nombre}
                  </span>
                </button>
              );
            },
          )}
        </nav>

        {/* TÍTULO DE SECCIÓN */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#326B98]">
              Panel de administración
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-[#0B1C30] sm:text-2xl">
              {seccionActual === "inicio"
                ? "Resumen general"
                : seccionSeleccionada?.nombre}
            </h2>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {seccionSeleccionada?.descripcion ??
                "Gestión del sistema"}
            </p>
          </div>

          {seccionActual !== "inicio" && (
            <BotonSeccion
              texto="Volver al resumen"
              onClick={() =>
                cambiarSeccion(
                  "inicio",
                )
              }
            />
          )}
        </div>

        {/* ERRORES DE CARGA */}

        {errores.length > 0 && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
          >
            <Icono
              nombre="alerta"
              size={20}
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                Algunos datos no están disponibles
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-800">
                {errores.join(" ")}
                {" "}
                Comprueba tu sesión y los
                permisos o vuelve a actualizar.
              </p>
            </div>
          </div>
        )}

        {/* CONTENIDO */}

        {mostrarContenido()}
      </div>
    </main>
  );
}

export {
  PanelCodigos,
};
