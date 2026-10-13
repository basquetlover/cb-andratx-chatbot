
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/*
 * C.B. ANDRATX
 *
 * Archivo 23/27
 *
 * Estadísticas e impresión de boletos.
 *
 * Funcionalidades:
 *
 * - Estadísticas por campaña.
 * - Estadísticas por artículo.
 * - Indicadores y distribución.
 * - Consulta de lotes.
 * - Selección de lote.
 * - Preparación de impresión.
 * - Hoja de control administrativa A4.
 *
 * IMPORTANTE:
 *
 * No existe todavía un endpoint
 * autorizado para recuperar los
 * contenidos QR completos.
 *
 * Por tanto, este componente NO
 * imprime boletos canjeables.
 *
 * Solo permite imprimir una hoja
 * de control claramente identificada.
 *
 * Los resultados cifrados,
 * tokens QR y hashes nunca se
 * recuperan en este componente.
 */

// ================================================
// TIPOS PÚBLICOS
// ================================================

export type VistaEstadisticasImpresion =
  | "estadisticas"
  | "impresion";

export interface EstadisticasImpresionCodigosPanelProps {
  vistaInicial?: VistaEstadisticasImpresion;

  onActualizado?: () => void;

  permisos?: {
    ver?: boolean;
    premios?: boolean;
    imprimir?: boolean;
  };
}

// ================================================
// TIPOS INTERNOS
// ================================================

interface Campana {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  estadoVentas: string;
  estadoCanjes: string;
}

interface Articulo {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

interface Lote {
  id: string;
  campanaId: string;
  nombre: string;
  descripcion: string | null;
  cantidadTotal: number;
  estado: string;
  generadoAt: string | null;
  createdAt: string;
}

interface RespuestaCampanas {
  campanas: Campana[];
  total: number;
  totalPaginas: number;
}

interface RespuestaArticulos {
  articulos: Articulo[];
  total: number;
}

interface RespuestaLotes {
  lotes: Lote[];
  total: number;
  totalPaginas: number;
}

interface RespuestaEstadisticas {
  vista: string;
  estadisticas: unknown;
  campanaId?: string;
  articuloId?: string;
}

interface RespuestaApi<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

type NombreIcono =
  | "grafico"
  | "impresora"
  | "calendario"
  | "regalo"
  | "caja"
  | "actualizar"
  | "alerta"
  | "check"
  | "escudo"
  | "reloj"
  | "archivo"
  | "informacion"
  | "flecha";

interface ConfiguracionMetrica {
  id: string;
  titulo: string;
  descripcion: string;
  aliases: string[];
  grupo:
    | "general"
    | "ventas"
    | "premios"
    | "canjes";
}

interface MetricaVisible {
  id: string;
  titulo: string;
  descripcion: string;
  valor: number;
  grupo: ConfiguracionMetrica["grupo"];
}

interface SegmentoDistribucion {
  id: string;
  nombre: string;
  valor: number;
  color: string;
}

// ================================================
// CONFIGURACIÓN
// ================================================

const API_CAMPANAS =
  "/api/panel/codigos/campanas";

const API_ARTICULOS =
  "/api/panel/codigos/articulos";

const API_CODIGOS =
  "/api/panel/codigos";

const API_LOTES =
  "/api/panel/codigos/lotes";

const MAXIMO_PAGINAS_CAMPANAS =
  20;

const LIMITE_LOTES =
  100;

const METRICAS: ConfiguracionMetrica[] = [
  {
    id: "total",
    titulo: "Boletos registrados",
    descripcion: "Total comunicado por el servidor",
    aliases: [
      "totalCodigos",
      "totalBoletos",
      "codigosGenerados",
      "boletosGenerados",
      "cantidadTotal",
      "total",
    ],
    grupo: "general",
  },
  {
    id: "lotes",
    titulo: "Lotes",
    descripcion: "Lotes registrados",
    aliases: [
      "totalLotes",
      "cantidadLotes",
      "lotesGenerados",
      "lotes",
    ],
    grupo: "general",
  },
  {
    id: "vendidos",
    titulo: "Vendidos",
    descripcion: "Boletos registrados como vendidos",
    aliases: [
      "totalVendidos",
      "codigosVendidos",
      "boletosVendidos",
      "vendidos",
    ],
    grupo: "ventas",
  },
  {
    id: "pendientes",
    titulo: "Pendientes",
    descripcion: "Boletos pendientes de venta",
    aliases: [
      "totalPendientes",
      "codigosPendientes",
      "boletosPendientes",
      "pendientes",
    ],
    grupo: "ventas",
  },
  {
    id: "noVendidos",
    titulo: "No vendidos",
    descripcion: "Boletos marcados como no vendidos",
    aliases: [
      "totalNoVendidos",
      "codigosNoVendidos",
      "boletosNoVendidos",
      "noVendidos",
    ],
    grupo: "ventas",
  },
  {
    id: "anulados",
    titulo: "Anulados",
    descripcion: "Boletos anulados",
    aliases: [
      "totalAnulados",
      "codigosAnulados",
      "anulados",
    ],
    grupo: "general",
  },
  {
    id: "eliminados",
    titulo: "Eliminados",
    descripcion: "Registros eliminados lógicamente",
    aliases: [
      "totalEliminados",
      "codigosEliminados",
      "eliminados",
    ],
    grupo: "general",
  },
  {
    id: "premiados",
    titulo: "Con premio",
    descripcion: "Boletos con resultado premiado",
    aliases: [
      "totalPremiados",
      "codigosPremiados",
      "boletosPremiados",
      "premiosAsignados",
      "conPremio",
      "premiados",
    ],
    grupo: "premios",
  },
  {
    id: "sinPremio",
    titulo: "Sin premio",
    descripcion: "Boletos sin artículo asignado",
    aliases: [
      "totalSinPremio",
      "codigosSinPremio",
      "boletosSinPremio",
      "sinPremio",
      "sinPremios",
    ],
    grupo: "premios",
  },
  {
    id: "canjeados",
    titulo: "Premios entregados",
    descripcion: "Entregas o canjes comunicados",
    aliases: [
      "premiosEntregados",
      "totalCanjeados",
      "totalCanjes",
      "canjeados",
      "entregados",
    ],
    grupo: "canjes",
  },
  {
    id: "porEntregar",
    titulo: "Pendientes de entrega",
    descripcion: "Premios pendientes de canjear",
    aliases: [
      "premiosPendientes",
      "pendientesCanje",
      "totalPorEntregar",
      "porEntregar",
    ],
    grupo: "canjes",
  },
];

// ================================================
// ERRORES
// ================================================

class ErrorApi extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);
    this.name = "ErrorApi";
    this.status = status;
  }
}

// ================================================
// AYUDAS GENERALES
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

function obtenerMensajeError(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : "Se ha producido un error inesperado.";
}

function formatearNumero(
  valor: number,
): string {
  return new Intl.NumberFormat(
    "es-ES",
  ).format(valor);
}

function formatearPorcentaje(
  valor: number,
  total: number,
): string {
  if (
    total <= 0 ||
    !Number.isFinite(valor)
  ) {
    return "0 %";
  }

  return (
    new Intl.NumberFormat(
      "es-ES",
      {
        maximumFractionDigits: 1,
      },
    ).format(
      (valor / total) * 100,
    ) + " %"
  );
}

function formatearFecha(
  valor: string | null | undefined,
): string {
  if (!valor) {
    return "Sin registrar";
  }

  const fecha = new Date(valor);

  if (
    Number.isNaN(fecha.getTime())
  ) {
    return "Fecha no válida";
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(fecha);
}

function normalizarNombreCampo(
  valor: string,
): string {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[_\s-]/g,
      "",
    )
    .toLowerCase();
}

// ================================================
// PETICIONES A LAS API
// ================================================

async function solicitarApi<T>(
  ruta: string,
  signal?: AbortSignal,
): Promise<T> {
  let respuesta: Response;

  try {
    respuesta = await fetch(
      ruta,
      {
        method: "GET",

        credentials:
          "same-origin",

        cache: "no-store",

        signal,

        headers: {
          Accept:
            "application/json",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new ErrorApi(
      "No se ha podido conectar con el servidor.",
      0,
    );
  }

  let contenido: unknown;

  try {
    contenido =
      await respuesta.json();
  } catch {
    throw new ErrorApi(
      "El servidor no ha devuelto una respuesta JSON válida.",
      respuesta.status,
    );
  }

  if (!esObjeto(contenido)) {
    throw new ErrorApi(
      "La respuesta del servidor no es válida.",
      respuesta.status,
    );
  }

  if (
    !respuesta.ok ||
    contenido.ok !== true ||
    contenido.data === null ||
    contenido.data === undefined
  ) {
    throw new ErrorApi(
      typeof contenido.error ===
        "string"
        ? contenido.error
        : "No se ha podido completar la consulta.",
      respuesta.status,
    );
  }

  return contenido.data as T;
}

// ================================================
// CONSULTAR CAMPAÑAS
// ================================================

async function cargarCampanas(
  signal: AbortSignal,
): Promise<Campana[]> {
  const acumuladas:
    Campana[] = [];

  let pagina = 1;
  let totalPaginas = 1;

  do {
    const parametros =
      new URLSearchParams({
        pagina:
          String(pagina),

        limite: "100",
      });

    const resultado =
      await solicitarApi<RespuestaCampanas>(
        `${API_CAMPANAS}?${parametros.toString()}`,
        signal,
      );

    acumuladas.push(
      ...resultado.campanas,
    );

    totalPaginas =
      resultado.totalPaginas;

    pagina++;
  } while (
    pagina <= totalPaginas &&
    pagina <= MAXIMO_PAGINAS_CAMPANAS
  );

  if (
    pagina <= totalPaginas
  ) {
    throw new Error(
      "El selector de campañas ha alcanzado su límite de páginas.",
    );
  }

  return acumuladas.sort(
    (a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        "es",
      ),
  );
}

// ================================================
// INTERPRETAR ESTADÍSTICAS
// ================================================

/*
 * Los servicios backend producen
 * objetos con estadísticas agregadas.
 *
 * No tenemos que inventar cifras
 * cuando alguna métrica no existe.
 *
 * Esta función busca únicamente
 * nombres de campos reconocidos.
 *
 * Se ignoran arrays, identificadores,
 * textos y cualquier contenido que
 * no sea un número válido.
 */

function buscarValorNumerico(
  fuente: unknown,
  aliases: string[],
): number | null {
  const nombres =
    aliases.map(
      normalizarNombreCampo,
    );

  const visitados =
    new Set<object>();

  function visitar(
    actual: unknown,
    profundidad: number,
  ): number | null {
    if (
      !esObjeto(actual) ||
      profundidad > 4 ||
      visitados.has(actual)
    ) {
      return null;
    }

    visitados.add(actual);

    const entradas =
      Object.entries(actual);

    /*
     * Primero buscamos coincidencias
     * directas dentro de este nivel.
     */

    for (
      const alias of nombres
    ) {
      for (
        const [clave, valor] of entradas
      ) {
        if (
          normalizarNombreCampo(
            clave,
          ) !== alias
        ) {
          continue;
        }

        /*
         * El campo genérico "total"
         * solo se admite en la raíz.
         *
         * Así evitamos interpretar
         * el total de un subgrupo
         * como el total de boletos.
         */

        if (
          alias === "total" &&
          profundidad > 0
        ) {
          continue;
        }

        if (
          typeof valor === "number" &&
          Number.isFinite(valor) &&
          valor >= 0
        ) {
          return valor;
        }
      }
    }

    /*
     * Después examinamos objetos
     * anidados, sin recorrer listas
     * de boletos ni resultados.
     */

    for (
      const [, valor] of entradas
    ) {
      if (
        esObjeto(valor)
      ) {
        const encontrado =
          visitar(
            valor,
            profundidad + 1,
          );

        if (
          encontrado !== null
        ) {
          return encontrado;
        }
      }
    }

    return null;
  }

  return visitar(
    fuente,
    0,
  );
}

function obtenerMetricas(
  estadisticas: unknown,
): MetricaVisible[] {
  return METRICAS.flatMap(
    (configuracion) => {
      const valor =
        buscarValorNumerico(
          estadisticas,
          configuracion.aliases,
        );

      if (
        valor === null
      ) {
        return [];
      }

      return [
        {
          id:
            configuracion.id,

          titulo:
            configuracion.titulo,

          descripcion:
            configuracion.descripcion,

          valor,

          grupo:
            configuracion.grupo,
        },
      ];
    },
  );
}

// ================================================
// SEGMENTOS PARA GRÁFICO DE VENTAS
// ================================================

function crearDistribucionVentas(
  metricas: MetricaVisible[],
): SegmentoDistribucion[] {
  const nombres = [
    {
      id: "vendidos",
      nombre: "Vendidos",
      color: "#0F766E",
    },
    {
      id: "pendientes",
      nombre: "Pendientes",
      color: "#EAB308",
    },
    {
      id: "noVendidos",
      nombre: "No vendidos",
      color: "#245F91",
    },
  ];

  return nombres.flatMap(
    (elemento) => {
      const metrica =
        metricas.find(
          (item) =>
            item.id ===
            elemento.id,
        );

      return metrica
        ? [
            {
              ...elemento,
              valor:
                metrica.valor,
            },
          ]
        : [];
    },
  );
}

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
    case "grafico":
      contenido = (
        <>
          <path d="M3 20h18M6 17v-6M12 17V5M18 17V9" />
          <rect x="4" y="11" width="4" height="6" rx="1" />
          <rect x="10" y="5" width="4" height="12" rx="1" />
          <rect x="16" y="9" width="4" height="8" rx="1" />
        </>
      );
      break;

    case "impresora":
      contenido = (
        <>
          <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" rx="1" />
          <path d="M18 12h.01" />
        </>
      );
      break;

    case "calendario":
      contenido = (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 10h18" />
        </>
      );
      break;

    case "regalo":
      contenido = (
        <>
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <path d="M3 12h18M12 8v13" />
          <path d="M12 8C7 8 5 6 7 4s5 1 5 4ZM12 8c5 0 7-2 5-4s-5 1-5 4Z" />
        </>
      );
      break;

    case "caja":
      contenido = (
        <>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="M3 8v9l9 5 9-5V8M12 13v9" />
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

    case "alerta":
      contenido = (
        <>
          <path d="m12 3 10 18H2L12 3Z" />
          <path d="M12 9v5M12 17h.01" />
        </>
      );
      break;

    case "check":
      contenido = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </>
      );
      break;

    case "escudo":
      contenido = (
        <>
          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      );
      break;

    case "reloj":
      contenido = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
      break;

    case "archivo":
      contenido = (
        <>
          <path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
          <path d="M14 2v6h5M8 13h8M8 17h8" />
        </>
      );
      break;

    case "informacion":
      contenido = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7h.01" />
        </>
      );
      break;

    case "flecha":
      contenido = (
        <path d="M5 12h14M13 6l6 6-6 6" />
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
// TARJETA DE ESTADÍSTICA
// ================================================

function TarjetaMetrica({
  metrica,
}: {
  metrica: MetricaVisible;
}) {
  const icono: NombreIcono =
    metrica.grupo === "premios" ||
    metrica.grupo === "canjes"
      ? "regalo"
      : metrica.grupo === "ventas"
        ? "grafico"
        : "caja";

  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          {metrica.titulo}
        </p>

        <p className="mt-2 text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-3xl">
          {formatearNumero(
            metrica.valor,
          )}
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          {metrica.descripcion}
        </p>
      </div>

      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#245F91]">
        <Icono
          nombre={icono}
          size={21}
        />
      </span>
    </div>
  );
}

// ================================================
// ESTADO DE CARGA
// ================================================

function EstadoCargando() {
  return (
    <div
      role="status"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {[1, 2, 3, 4].map(
        (numero) => (
          <div
            key={numero}
            className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="h-3 w-24 max-w-full rounded bg-slate-100" />
            <div className="mt-5 h-8 w-16 rounded bg-slate-100" />
            <div className="mt-3 h-2 w-28 max-w-full rounded bg-slate-100" />
          </div>
        ),
      )}
    </div>
  );
}

// ================================================
// AVISO
// ================================================

function Aviso({
  titulo,
  descripcion,
  tipo = "informacion",
}: {
  titulo: string;
  descripcion: string;
  tipo?:
    | "informacion"
    | "advertencia"
    | "error";
}) {
  const clases =
    tipo === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : tipo === "advertencia"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-[#D7E7F4] bg-[#EFF5FA] text-[#174C78]";

  return (
    <div
      role={
        tipo === "error"
          ? "alert"
          : "status"
      }
      className={`flex items-start gap-3 rounded-2xl border p-4 sm:p-5 ${clases}`}
    >
      <Icono
        nombre={
          tipo === "informacion"
            ? "informacion"
            : "alerta"
        }
        size={21}
        className="mt-0.5 shrink-0"
      />

      <div className="min-w-0">
        <p className="text-sm font-bold">
          {titulo}
        </p>

        <p className="mt-1 text-xs leading-6 sm:text-sm">
          {descripcion}
        </p>
      </div>
    </div>
  );
}

// ================================================
// COMPONENTE PRINCIPAL
// ================================================

export default function EstadisticasImpresionCodigosPanel({
  vistaInicial = "estadisticas",
  onActualizado,
  permisos,
}: EstadisticasImpresionCodigosPanelProps) {
  const puedeVer =
    permisos?.ver !== false;

  const puedeConsultarPremios =
    puedeVer &&
    permisos?.premios !== false;

  const puedePrepararImpresion =
    puedeVer &&
    permisos?.imprimir !== false;

  // ============================================
  // NAVEGACIÓN
  // ============================================

  const [vista, setVista] =
    useState<VistaEstadisticasImpresion>(
      vistaInicial,
    );

  // ============================================
  // CATÁLOGOS
  // ============================================

  const [campanas, setCampanas] =
    useState<Campana[]>([]);

  const [articulos, setArticulos] =
    useState<Articulo[]>([]);

  const [cargandoCatalogos, setCargandoCatalogos] =
    useState(true);

  const [errorCatalogos, setErrorCatalogos] =
    useState<string | null>(null);

  // ============================================
  // SELECCIÓN
  // ============================================

  const [campanaId, setCampanaId] =
    useState("");

  const [articuloId, setArticuloId] =
    useState("");

  const [loteId, setLoteId] =
    useState("");

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  const [estadisticasCampana, setEstadisticasCampana] =
    useState<unknown>(null);

  const [estadisticasArticulo, setEstadisticasArticulo] =
    useState<unknown>(null);

  const [cargandoEstadisticas, setCargandoEstadisticas] =
    useState(false);

  const [cargandoArticulo, setCargandoArticulo] =
    useState(false);

  const [errorEstadisticas, setErrorEstadisticas] =
    useState<string | null>(null);

  const [errorArticulo, setErrorArticulo] =
    useState<string | null>(null);

  // ============================================
  // LOTES
  // ============================================

  const [lotes, setLotes] =
    useState<Lote[]>([]);

  const [cargandoLotes, setCargandoLotes] =
    useState(false);

  const [errorLotes, setErrorLotes] =
    useState<string | null>(null);

  // ============================================
  // REVISIÓN
  // ============================================

  const [revision, setRevision] =
    useState(0);

  // ============================================
  // SINCRONIZAR VISTA
  // ============================================

  useEffect(() => {
    setVista(
      vistaInicial,
    );
  }, [vistaInicial]);

  // ============================================
  // CARGAR CATÁLOGOS
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setCargandoCatalogos(true);
    setErrorCatalogos(null);

    const tareas = [
      cargarCampanas(
        controlador.signal,
      ),

      solicitarApi<RespuestaArticulos>(
        API_ARTICULOS,
        controlador.signal,
      ),
    ] as const;

    Promise.allSettled(
      tareas,
    ).then((resultados) => {
      if (
        controlador.signal.aborted
      ) {
        return;
      }

      const errores: string[] = [];

      const campanasResultado =
        resultados[0];

      const articulosResultado =
        resultados[1];

      if (
        campanasResultado.status ===
        "fulfilled"
      ) {
        setCampanas(
          campanasResultado.value,
        );
      } else {
        errores.push(
          "No se han podido consultar las campañas.",
        );

        setCampanas([]);
      }

      if (
        articulosResultado.status ===
        "fulfilled"
      ) {
        setArticulos(
          articulosResultado.value.articulos,
        );
      } else {
        errores.push(
          "No se ha podido consultar el catálogo de artículos.",
        );

        setArticulos([]);
      }

      setErrorCatalogos(
        errores.length
          ? errores.join(" ")
          : null,
      );

      setCargandoCatalogos(false);
    });

    return () => {
      controlador.abort();
    };
  }, [revision]);

  // ============================================
  // ESTADÍSTICAS DE CAMPAÑA
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setEstadisticasCampana(null);
    setErrorEstadisticas(null);

    if (
      vista !== "estadisticas" ||
      !puedeConsultarPremios ||
      !campanaId
    ) {
      setCargandoEstadisticas(false);

      return () => {
        controlador.abort();
      };
    }

    setCargandoEstadisticas(true);

    const parametros =
      new URLSearchParams({
        vista:
          "estadisticas_campana",

        campanaId,
      });

    solicitarApi<RespuestaEstadisticas>(
      `${API_CODIGOS}?${parametros.toString()}`,
      controlador.signal,
    )
      .then((respuesta) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        if (
          !respuesta ||
          !esObjeto(
            respuesta.estadisticas,
          )
        ) {
          throw new Error(
            "El servidor no ha devuelto estadísticas compatibles.",
          );
        }

        setEstadisticasCampana(
          respuesta.estadisticas,
        );
      })
      .catch((error: unknown) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setErrorEstadisticas(
          obtenerMensajeError(error),
        );
      })
      .finally(() => {
        if (
          !controlador.signal.aborted
        ) {
          setCargandoEstadisticas(false);
        }
      });

    return () => {
      controlador.abort();
    };
  }, [
    vista,
    campanaId,
    puedeConsultarPremios,
    revision,
  ]);

  // ============================================
  // ESTADÍSTICAS DE ARTÍCULO
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setEstadisticasArticulo(null);
    setErrorArticulo(null);

    if (
      vista !== "estadisticas" ||
      !puedeConsultarPremios ||
      !articuloId
    ) {
      setCargandoArticulo(false);

      return () => {
        controlador.abort();
      };
    }

    setCargandoArticulo(true);

    const parametros =
      new URLSearchParams({
        vista:
          "estadisticas_articulo",

        articuloId,
      });

    if (campanaId) {
      parametros.set(
        "campanaId",
        campanaId,
      );
    }

    solicitarApi<RespuestaEstadisticas>(
      `${API_CODIGOS}?${parametros.toString()}`,
      controlador.signal,
    )
      .then((respuesta) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        if (
          !respuesta ||
          !esObjeto(
            respuesta.estadisticas,
          )
        ) {
          throw new Error(
            "El servidor no ha devuelto estadísticas del artículo compatibles.",
          );
        }

        setEstadisticasArticulo(
          respuesta.estadisticas,
        );
      })
      .catch((error: unknown) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setErrorArticulo(
          obtenerMensajeError(error),
        );
      })
      .finally(() => {
        if (
          !controlador.signal.aborted
        ) {
          setCargandoArticulo(false);
        }
      });

    return () => {
      controlador.abort();
    };
  }, [
    vista,
    articuloId,
    campanaId,
    puedeConsultarPremios,
    revision,
  ]);

  // ============================================
  // CONSULTAR LOTES PARA IMPRESIÓN
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setLotes([]);
    setLoteId("");
    setErrorLotes(null);

    if (
      vista !== "impresion" ||
      !puedePrepararImpresion ||
      !campanaId
    ) {
      setCargandoLotes(false);

      return () => {
        controlador.abort();
      };
    }

    setCargandoLotes(true);

    const parametros =
      new URLSearchParams({
        campanaId,
        pagina: "1",

        limite:
          String(LIMITE_LOTES),
      });

    solicitarApi<RespuestaLotes>(
      `${API_LOTES}?${parametros.toString()}`,
      controlador.signal,
    )
      .then((respuesta) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setLotes(
          respuesta.lotes,
        );
      })
      .catch((error: unknown) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setErrorLotes(
          obtenerMensajeError(error),
        );
      })
      .finally(() => {
        if (
          !controlador.signal.aborted
        ) {
          setCargandoLotes(false);
        }
      });

    return () => {
      controlador.abort();
    };
  }, [
    vista,
    campanaId,
    puedePrepararImpresion,
    revision,
  ]);

  // ============================================
  // ELEMENTOS SELECCIONADOS
  // ============================================

  const campanaSeleccionada =
    useMemo(
      () =>
        campanas.find(
          (campana) =>
            campana.id === campanaId,
        ) ?? null,
      [
        campanas,
        campanaId,
      ],
    );

  const articuloSeleccionado =
    useMemo(
      () =>
        articulos.find(
          (articulo) =>
            articulo.id === articuloId,
        ) ?? null,
      [
        articulos,
        articuloId,
      ],
    );

  const loteSeleccionado =
    useMemo(
      () =>
        lotes.find(
          (lote) =>
            lote.id === loteId,
        ) ?? null,
      [
        lotes,
        loteId,
      ],
    );

  // ============================================
  // CONVERTIR ESTADÍSTICAS EN MÉTRICAS
  // ============================================

  const metricasCampana =
    useMemo(
      () =>
        obtenerMetricas(
          estadisticasCampana,
        ),
      [estadisticasCampana],
    );

  const metricasArticulo =
    useMemo(
      () =>
        obtenerMetricas(
          estadisticasArticulo,
        ),
      [estadisticasArticulo],
    );

  const distribucionVentas =
    useMemo(
      () =>
        crearDistribucionVentas(
          metricasCampana,
        ),
      [metricasCampana],
    );

  const totalDistribucion =
    distribucionVentas.reduce(
      (total, elemento) =>
        total + elemento.valor,
      0,
    );

  // ============================================
  // RECARGAR
  // ============================================

  function actualizar() {
    setRevision(
      (anterior) =>
        anterior + 1,
    );

    onActualizado?.();
  }

  // ============================================
  // IMPRIMIR HOJA ADMINISTRATIVA
  // ============================================

  function imprimirHojaControl() {
    /*
     * No imprime boletos.
     *
     * La hoja de control contiene
     * únicamente metadatos del lote.
     *
     * No puede utilizarse para
     * escanear ni canjear premios.
     */

    if (
      !puedePrepararImpresion ||
      !loteSeleccionado ||
      loteSeleccionado.estado !==
        "generado" ||
      !campanaSeleccionada
    ) {
      return;
    }

    window.print();
  }

  // ============================================
  // MOSTRAR ESTADÍSTICAS
  // ============================================

  function mostrarEstadisticas() {
    if (!puedeConsultarPremios) {
      return (
        <Aviso
          titulo="Acceso restringido"
          descripcion="Para consultar las estadísticas protegidas necesitas los permisos codigos.ver y codigos.premios. Las estadísticas de premios no se mostrarán sin autorización."
          tipo="advertencia"
        />
      );
    }

    return (
      <div className="space-y-6">
        {/* ESTADÍSTICAS GENERALES */}

        <section className="space-y-4">
          <div>
            <h3 className="text-base font-bold sm:text-lg">
              Estadísticas de campaña
            </h3>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Información agregada
              proporcionada por el servidor.
            </p>
          </div>

          {!campanaId ? (
            <Aviso
              titulo="Selecciona una campaña"
              descripcion="Elige una campaña para consultar sus cifras de boletos, ventas y premios. No se muestran resultados individuales."
            />
          ) : errorEstadisticas ? (
            <Aviso
              titulo="No se han podido consultar las estadísticas"
              descripcion={errorEstadisticas}
              tipo="error"
            />
          ) : cargandoEstadisticas ? (
            <EstadoCargando />
          ) : metricasCampana.length === 0 ? (
            <Aviso
              titulo="Sin métricas compatibles"
              descripcion="No se han recibido campos numéricos reconocidos para esta campaña. Comprueba que el servicio de estadísticas utiliza los nombres previstos en el módulo."
              tipo="advertencia"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {metricasCampana.map(
                (metrica) => (
                  <TarjetaMetrica
                    key={metrica.id}
                    metrica={metrica}
                  />
                ),
              )}
            </div>
          )}
        </section>

        {/* DISTRIBUCIÓN DE VENTAS */}

        {distribucionVentas.length >= 2 &&
          totalDistribucion > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <Icono
                nombre="grafico"
                size={22}
                className="text-[#245F91]"
              />

              <div>
                <h3 className="text-base font-bold">
                  Distribución de estados de venta
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Proporción calculada sobre
                  los estados disponibles.
                </p>
              </div>
            </div>

            <div className="mt-6 flex h-5 overflow-hidden rounded-full bg-slate-100">
              {distribucionVentas.map(
                (segmento) => (
                  <div
                    key={segmento.id}
                    title={`${segmento.nombre}: ${formatearNumero(segmento.valor)}`}
                    style={{
                      width: `${
                        (
                          segmento.valor /
                          totalDistribucion
                        ) * 100
                      }%`,

                      backgroundColor:
                        segmento.color,
                    }}
                  />
                ),
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {distribucionVentas.map(
                (segmento) => (
                  <div
                    key={segmento.id}
                    className="rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{
                          backgroundColor:
                            segmento.color,
                        }}
                      />

                      <span className="text-xs text-slate-600">
                        {segmento.nombre}
                      </span>
                    </div>

                    <p className="mt-3 text-xl font-bold">
                      {formatearNumero(
                        segmento.valor,
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatearPorcentaje(
                        segmento.valor,
                        totalDistribucion,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-400">
              Los porcentajes solo incluyen
              los estados que el servidor
              ha comunicado. No se infieren
              categorías ausentes.
            </p>
          </section>
        )}

        {/* ESTADÍSTICAS POR ARTÍCULO */}

        <section className="space-y-4">
          <div>
            <h3 className="text-base font-bold sm:text-lg">
              Estadísticas por artículo
            </h3>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Consulta los totales de un
              premio concreto y, si has
              elegido campaña, limita los
              resultados a ella.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <label
              htmlFor="estadisticas-articulo"
              className="block text-sm font-semibold"
            >
              Artículo
            </label>

            <select
              id="estadisticas-articulo"
              value={articuloId}
              onChange={(evento) =>
                setArticuloId(
                  evento.target.value,
                )
              }
              disabled={cargandoCatalogos}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white disabled:opacity-50"
            >
              <option value="">
                Selecciona un artículo
              </option>

              {articulos.map(
                (articulo) => (
                  <option
                    key={articulo.id}
                    value={articulo.id}
                  >
                    {articulo.nombre}
                    {!articulo.activo
                      ? " (inactivo)"
                      : ""}
                  </option>
                ),
              )}
            </select>

            {articuloSeleccionado && (
              <p className="mt-3 text-xs text-slate-500">
                {articuloSeleccionado.nombre}
                {" · "}
                {articuloSeleccionado.activo
                  ? "Activo"
                  : "Inactivo"}
              </p>
            )}
          </div>

          {!articuloId ? (
            <Aviso
              titulo="Selecciona un premio"
              descripcion="Puedes consultar sus estadísticas históricas. No necesitas que el artículo continúe activo."
            />
          ) : errorArticulo ? (
            <Aviso
              titulo="Error consultando el artículo"
              descripcion={errorArticulo}
              tipo="error"
            />
          ) : cargandoArticulo ? (
            <EstadoCargando />
          ) : metricasArticulo.length === 0 ? (
            <Aviso
              titulo="Sin métricas disponibles"
              descripcion="El servidor no ha devuelto campos numéricos reconocidos para este artículo. No se muestran cifras estimadas."
              tipo="advertencia"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {metricasArticulo.map(
                (metrica) => (
                  <TarjetaMetrica
                    key={metrica.id}
                    metrica={metrica}
                  />
                ),
              )}
            </div>
          )}
        </section>

        <Aviso
          titulo="Resultados protegidos"
          descripcion="Estas estadísticas son agregadas. El componente no solicita el contenido cifrado de los boletos, el token QR ni la correspondencia individual entre un código y su premio."
        />
      </div>
    );
  }

  // ============================================
  // MOSTRAR PREPARACIÓN DE IMPRESIÓN
  // ============================================

  function mostrarImpresion() {
    if (!puedePrepararImpresion) {
      return (
        <Aviso
          titulo="Acceso restringido"
          descripcion="La preparación de impresión requiere los permisos correspondientes. El servidor deberá comprobar codigos.imprimir cuando se incorpore la descarga de boletos reales."
          tipo="advertencia"
        />
      );
    }

    return (
      <div className="space-y-6">
        {/* ADVERTENCIA PRINCIPAL */}

        <Aviso
          titulo="Impresión de boletos QR todavía no disponible"
          descripcion="El sistema actual no dispone de una API específica que recupere los QR completos de forma autorizada. No se generarán QR ficticios ni boletos aparentemente válidos. Desde aquí solo puedes preparar la información del lote e imprimir una hoja administrativa de control."
          tipo="advertencia"
        />

        {/* SELECCIÓN DE LOTE */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#245F91]">
              <Icono
                nombre="caja"
                size={22}
              />
            </span>

            <div>
              <h3 className="text-base font-bold">
                Seleccionar lote
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Consulta los lotes de
                la campaña seleccionada.
              </p>
            </div>
          </div>

          {!campanaId ? (
            <div className="mt-5">
              <Aviso
                titulo="Selecciona una campaña"
                descripcion="Elige primero una campaña en la parte superior para consultar sus lotes."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <label
                htmlFor="impresion-lote"
                className="block text-sm font-semibold"
              >
                Lote
              </label>

              <select
                id="impresion-lote"
                value={loteId}
                disabled={
                  cargandoLotes
                }
                onChange={(evento) =>
                  setLoteId(
                    evento.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white disabled:opacity-50"
              >
                <option value="">
                  Selecciona un lote
                </option>

                {lotes.map(
                  (lote) => (
                    <option
                      key={lote.id}
                      value={lote.id}
                    >
                      {lote.nombre}
                      {" · "}
                      {formatearNumero(
                        lote.cantidadTotal,
                      )}
                      {" boletos"}
                    </option>
                  ),
                )}
              </select>

              {errorLotes && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 p-3 text-xs text-red-700"
                >
                  {errorLotes}
                </p>
              )}

              {cargandoLotes && (
                <p className="text-xs text-slate-500">
                  Cargando lotes...
                </p>
              )}

              {!cargandoLotes &&
                !errorLotes &&
                lotes.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No hay lotes disponibles
                    para esta campaña.
                  </p>
                )}

              {lotes.length ===
                LIMITE_LOTES && (
                <p className="text-xs text-amber-800">
                  Se muestran hasta 100
                  lotes recientes. Si buscas
                  uno anterior, necesitarás
                  la gestión paginada de lotes.
                </p>
              )}
            </div>
          )}
        </section>

        {/* PREVISUALIZACIÓN */}

        {loteSeleccionado &&
          campanaSeleccionada && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
              <div>
                <h3 className="text-base font-bold">
                  Hoja de control
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Documento interno,
                  no válido como boleto.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                A4 vertical
              </span>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-xl border-2 border-slate-200 bg-white p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#0B1C30] pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#245F91]">
                      Club Bàsquet Andratx
                    </p>

                    <h4 className="mt-2 text-xl font-bold">
                      Control interno de lote
                    </h4>
                  </div>

                  <Icono
                    nombre="archivo"
                    size={35}
                    className="text-[#245F91]"
                  />
                </div>

                <div className="mt-6 space-y-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">
                      Campaña
                    </p>

                    <p className="mt-1 font-semibold">
                      {campanaSeleccionada.nombre}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Lote
                    </p>

                    <p className="mt-1 font-semibold">
                      {loteSeleccionado.nombre}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs text-slate-500">
                        Boletos registrados
                      </p>

                      <p className="mt-1 text-2xl font-bold">
                        {formatearNumero(
                          loteSeleccionado.cantidadTotal,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Estado
                      </p>

                      <p className="mt-1 font-semibold capitalize">
                        {loteSeleccionado.estado}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Generación
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatearFecha(
                        loteSeleccionado.generadoAt,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Identificador
                    </p>

                    <p className="mt-1 break-all font-mono text-xs">
                      {loteSeleccionado.id}
                    </p>
                  </div>
                </div>

                <div className="mt-7 border-2 border-dashed border-slate-300 p-4 text-center">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-600">
                    Documento interno
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    No es un boleto
                    · Sin QR
                    · Sin código de canje
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  disabled={
                    loteSeleccionado.estado !==
                      "generado"
                  }
                  onClick={
                    imprimirHojaControl
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0B1C30] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#18385D] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icono
                    nombre="impresora"
                    size={18}
                  />

                  Imprimir hoja de control
                </button>
              </div>

              {loteSeleccionado.estado !==
                "generado" && (
                <p className="mt-3 text-xs leading-5 text-amber-800">
                  El lote todavía no
                  está confirmado como
                  generado. No se habilita
                  la impresión de su
                  hoja de control.
                </p>
              )}
            </div>
          </section>
        )}

        {/* REQUISITOS DE IMPRESIÓN */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <Icono
              nombre="impresora"
              size={22}
              className="text-[#245F91]"
            />

            <h3 className="text-base font-bold">
              Impresión de boletos
            </h3>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Para habilitar la impresión
            real de boletos será necesario
            desarrollar una API de impresión
            protegida. No basta con el
            código visible, porque cada
            QR debe contener su token
            original asociado.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Comprobar codigos.imprimir en el servidor",
              "Recuperar y descifrar los tokens QR autorizados",
              "Generar QR y códigos de barras verificables",
              "Preparar las plantillas y páginas imprimibles",
              "Registrar quién imprime y cuándo",
              "No revelar los resultados premiados",
            ].map(
              (requisito) => (
                <div
                  key={requisito}
                  className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <Icono
                    nombre="escudo"
                    size={18}
                    className="mt-0.5 shrink-0 text-[#245F91]"
                  />

                  <p className="text-xs leading-5 text-slate-600">
                    {requisito}
                  </p>
                </div>
              ),
            )}
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-900">
              Estado: pendiente de desarrollo
            </p>

            <p className="mt-2 text-xs leading-6 text-amber-800">
              No se ofrece ningún botón
              para imprimir boletos reales
              hasta que estén disponibles
              y probadas estas funciones.
              La hoja de control no
              sustituye la impresión
              de boletos.
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  return (
    <div className="space-y-6 text-[#0B1C30]">
      {/* ESTILOS DE IMPRESIÓN */}

      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 15mm;
            }

            body * {
              visibility: hidden !important;
            }

            #cba-hoja-control-impresa,
            #cba-hoja-control-impresa * {
              visibility: visible !important;
            }

            #cba-hoja-control-impresa {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: #111827 !important;
              font-family: Arial, sans-serif !important;
              font-size: 12pt !important;
              line-height: 1.5 !important;
              box-shadow: none !important;
              border: 0 !important;
            }

            #cba-hoja-control-impresa h1 {
              font-size: 20pt;
              margin: 0 0 8mm;
            }

            #cba-hoja-control-impresa h2 {
              font-size: 13pt;
              margin: 7mm 0 2mm;
            }

            #cba-hoja-control-impresa p {
              margin: 0 0 3mm;
              overflow-wrap: anywhere;
            }

            #cba-hoja-control-impresa .aviso-no-boleto {
              margin-top: 15mm;
              border: 2px solid #111827;
              padding: 8mm;
              text-align: center;
              font-weight: bold;
            }
          }
        `}
      </style>

      {/* CABECERA */}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#0B1C30] text-[#F2C94C]">
            <Icono
              nombre={
                vista === "estadisticas"
                  ? "grafico"
                  : "impresora"
              }
              size={27}
            />
          </span>

          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">
              Estadísticas e impresión
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Analiza campañas y prepara
              el control documental
              de los lotes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={actualizar}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50"
        >
          <Icono
            nombre="actualizar"
            size={17}
          />

          Actualizar
        </button>
      </section>

      {/* NAVEGACIÓN */}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          aria-pressed={
            vista === "estadisticas"
          }
          onClick={() =>
            setVista(
              "estadisticas",
            )
          }
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-colors ${
            vista === "estadisticas"
              ? "border-[#0B1C30] bg-[#0B1C30] text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Icono
            nombre="grafico"
            size={19}
          />

          Estadísticas
        </button>

        <button
          type="button"
          aria-pressed={
            vista === "impresion"
          }
          onClick={() =>
            setVista(
              "impresion",
            )
          }
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-colors ${
            vista === "impresion"
              ? "border-[#0B1C30] bg-[#0B1C30] text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Icono
            nombre="impresora"
            size={19}
          />

          Impresión
        </button>
      </div>

      {/* SELECTOR DE CAMPAÑA */}

      {puedeVer && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <Icono
              nombre="calendario"
              size={21}
              className="text-[#245F91]"
            />

            <div>
              <h3 className="text-sm font-bold">
                Campaña seleccionada
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Elige la campaña
                que quieres consultar.
              </p>
            </div>
          </div>

          <select
            aria-label="Seleccionar campaña"
            value={campanaId}
            disabled={cargandoCatalogos}
            onChange={(evento) => {
              setCampanaId(
                evento.target.value,
              );

              setLoteId("");
            }}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white disabled:opacity-50"
          >
            <option value="">
              Selecciona una campaña
            </option>

            {campanas.map(
              (campana) => (
                <option
                  key={campana.id}
                  value={campana.id}
                >
                  {campana.nombre}
                </option>
              ),
            )}
          </select>

          {campanaSeleccionada && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#EFF5FA] px-3 py-1 text-xs font-semibold text-[#245F91]">
                {campanaSeleccionada.estado}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Ventas:{" "}
                {campanaSeleccionada.estadoVentas}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Canjes:{" "}
                {campanaSeleccionada.estadoCanjes}
              </span>
            </div>
          )}

          {errorCatalogos && (
            <div className="mt-4">
              <Aviso
                titulo="Algunos catálogos no están disponibles"
                descripcion={errorCatalogos}
                tipo="advertencia"
              />
            </div>
          )}
        </section>
      )}

      {/* CONTENIDO */}

      {vista === "estadisticas"
        ? mostrarEstadisticas()
        : mostrarImpresion()}

      {/* PIE INFORMATIVO */}

      <Aviso
        titulo="Cifras y operaciones verificadas en el servidor"
        descripcion="Las estadísticas y los estados de los lotes se consultan mediante las API autenticadas del panel. Ninguna vista de este componente permite descubrir el premio de un boleto individual o fabricar un QR canjeable."
      />

      {/* HOJA REAL PARA IMPRESIÓN A4 */}

      {vista === "impresion" &&
        puedePrepararImpresion &&
        campanaSeleccionada &&
        loteSeleccionado?.estado ===
          "generado" && (
        <div
          id="cba-hoja-control-impresa"
          className="hidden"
          aria-hidden="true"
        >
          <p>
            CLUB BÀSQUET ANDRATX
          </p>

          <h1>
            Hoja de control de lote
          </h1>

          <p>
            Documento administrativo
            para el control interno
            de los boletos generados.
          </p>

          <h2>Campaña</h2>

          <p>
            {campanaSeleccionada.nombre}
          </p>

          <h2>Lote</h2>

          <p>
            {loteSeleccionado.nombre}
          </p>

          <h2>Identificador</h2>

          <p>
            {loteSeleccionado.id}
          </p>

          <h2>Boletos del lote</h2>

          <p>
            {formatearNumero(
              loteSeleccionado.cantidadTotal,
            )}
          </p>

          <h2>Estado</h2>

          <p>
            Generado
          </p>

          <h2>Fecha de generación</h2>

          <p>
            {formatearFecha(
              loteSeleccionado.generadoAt,
            )}
          </p>

          <div className="aviso-no-boleto">
            DOCUMENTO INTERNO
            <p>
              NO ES UN BOLETO
            </p>
            <p>
              SIN QR NI CÓDIGO DE CANJE
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export {
  EstadisticasImpresionCodigosPanel,
};
