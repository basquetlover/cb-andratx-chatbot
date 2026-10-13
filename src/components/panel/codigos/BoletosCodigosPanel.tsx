
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/*
 * C.B. ANDRATX
 * Archivo 21/27
 *
 * Gestión de boletos y códigos.
 *
 * Funcionalidades:
 * - Listado paginado.
 * - Filtros desde el servidor.
 * - Búsqueda de códigos.
 * - Selección individual.
 * - Selección de página.
 * - Acciones masivas.
 * - Confirmación de operaciones.
 * - Motivos de anulación/eliminación.
 * - Resultados y errores parciales.
 *
 * No consulta premios individuales.
 * No descarga tokens QR.
 * No descifra información protegida.
 */

export interface BoletosCodigosPanelProps {
  campanaInicial?: string;

  onActualizado?: () => void;

  permisos?: {
    editar?: boolean;
    eliminar?: boolean;
  };
}

// ================================================
// TIPOS
// ================================================

type EstadoVenta =
  | "pendiente"
  | "vendido"
  | "no_vendido";

type EstadoRegistro =
  | "activo"
  | "anulado"
  | "eliminado";

type FiltroVenta =
  | EstadoVenta
  | "todos";

type FiltroRegistro =
  | EstadoRegistro
  | "todos";

type AccionMasiva =
  | "marcar_vendido"
  | "marcar_no_vendido"
  | "volver_pendiente"
  | "anular"
  | "eliminar";

type NombreIcono =
  | "ticket"
  | "buscar"
  | "filtro"
  | "actualizar"
  | "check"
  | "alerta"
  | "cerrar"
  | "ventas"
  | "prohibido"
  | "deshacer"
  | "eliminar"
  | "calendario"
  | "lista"
  | "escudo"
  | "flecha"
  | "reloj";

interface CodigoListado {
  id: string;
  loteId: string | null;

  tipo: string;
  formato: string;
  acceso: string;

  codigoVisible: string;

  estadoVenta: EstadoVenta;
  estadoRegistro: EstadoRegistro;

  estadoVentaAt: string | null;

  createdAt: string;
  updatedAt: string;
}

interface Campana {
  id: string;
  nombre: string;
  estado: string;
  estadoVentas: string;
}

interface RespuestaListadoCodigos {
  codigos: CodigoListado[];

  total: number;

  pagina: number;
  limite: number;
  totalPaginas: number;
}

interface RespuestaCampanas {
  campanas: Campana[];

  total: number;
  totalPaginas: number;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaApi<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  errores?: ErrorCampo[];
}

interface ResultadoAccionMasiva {
  operacion?: string;
  accion: AccionMasiva;
  operacionId: string;

  solicitados: number;
  actualizados: number;
  omitidos: number;

  parcial: boolean;
  errores: unknown[];

  mensaje?: string;
}

interface MensajePanel {
  tipo: "exito" | "error" | "aviso";
  texto: string;
}

interface ConfiguracionAccion {
  titulo: string;
  descripcion: string;
  etiqueta: string;
  icono: NombreIcono;
  peligrosa: boolean;
  requiereMotivo: boolean;
}

// ================================================
// CONFIGURACIÓN
// ================================================

const API_CODIGOS =
  "/api/panel/codigos";

const API_CAMPANAS =
  "/api/panel/codigos/campanas";

const MAXIMO_CAMPANAS_PAGINAS = 20;

const OPCIONES_LIMITE = [
  10,
  25,
  50,
  100,
] as const;

const ACCIONES: Record<
  AccionMasiva,
  ConfiguracionAccion
> = {
  marcar_vendido: {
    titulo: "Marcar como vendidos",

    descripcion:
      "Los boletos seleccionados que cumplan las condiciones de venta pasarán al estado vendido. Los boletos ya entregados, anulados o que no permitan esta transición no deben modificarse.",

    etiqueta: "Marcar vendidos",

    icono: "ventas",

    peligrosa: false,

    requiereMotivo: false,
  },

  marcar_no_vendido: {
    titulo: "Marcar como no vendidos",

    descripcion:
      "Los boletos pendientes seleccionados pasarán al estado no vendido. Podrán reactivarse más adelante si la campaña y las reglas del servidor lo permiten.",

    etiqueta: "No vendidos",

    icono: "prohibido",

    peligrosa: false,

    requiereMotivo: false,
  },

  volver_pendiente: {
    titulo: "Volver a pendientes",

    descripcion:
      "Se intentará devolver al estado pendiente los boletos seleccionados que estén marcados como no vendidos. Esta operación no debe revertir ventas confirmadas ni canjes.",

    etiqueta: "Volver a pendiente",

    icono: "deshacer",

    peligrosa: false,

    requiereMotivo: false,
  },

  anular: {
    titulo: "Anular boletos",

    descripcion:
      "Los boletos seleccionados quedarán anulados cuando el servidor permita la operación. Una anulación impide utilizar el boleto normalmente, pero conserva su registro e historial.",

    etiqueta: "Anular",

    icono: "prohibido",

    peligrosa: true,

    requiereMotivo: true,
  },

  eliminar: {
    titulo: "Eliminar boletos",

    descripcion:
      "Se realizará una eliminación lógica. Los registros históricos se conservarán y los boletos con canjes registrados no deben eliminarse. Esta operación requiere el permiso específico de eliminación.",

    etiqueta: "Eliminar",

    icono: "eliminar",

    peligrosa: true,

    requiereMotivo: true,
  },
};

// ================================================
// ERRORES DE API
// ================================================

class ErrorPeticion extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name = "ErrorPeticion";
    this.status = status;
  }
}

// ================================================
// AYUDAS
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
  numero: number,
): string {
  return new Intl.NumberFormat(
    "es-ES",
  ).format(numero);
}

function formatearFecha(
  valor: string | null | undefined,
): string {
  if (!valor) {
    return "Sin fecha";
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
      month: "short",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(fecha);
}

function obtenerTextoErrorMasivo(
  error: unknown,
): string {
  if (typeof error === "string") {
    return error.slice(0, 300);
  }

  if (!esObjeto(error)) {
    return "No se ha podido actualizar uno de los boletos.";
  }

  const partes: string[] = [];

  if (
    typeof error.codigoVisible === "string"
  ) {
    partes.push(
      error.codigoVisible,
    );
  } else if (
    typeof error.codigoId === "string"
  ) {
    partes.push(
      error.codigoId,
    );
  }

  const descripcion =
    typeof error.mensaje === "string"
      ? error.mensaje
      : typeof error.error === "string"
        ? error.error
        : typeof error.motivo === "string"
          ? error.motivo
          : "Operación omitida.";

  partes.push(
    descripcion,
  );

  return partes
    .join(" · ")
    .slice(0, 300);
}

// ================================================
// CLIENTE DE API
// ================================================

async function solicitarApi<T>(
  ruta: string,
  opciones: {
    metodo?: "GET" | "POST";
    datos?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const metodo =
    opciones.metodo ?? "GET";

  const tieneDatos =
    opciones.datos !== undefined;

  let respuesta: Response;

  try {
    respuesta = await fetch(
      ruta,
      {
        method: metodo,

        credentials: "same-origin",
        cache: "no-store",

        signal: opciones.signal,

        headers: {
          Accept: "application/json",

          ...(tieneDatos
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
        },

        ...(tieneDatos
          ? {
              body: JSON.stringify(
                opciones.datos,
              ),
            }
          : {}),
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new ErrorPeticion(
      "No se ha podido conectar con el servidor. Comprueba tu conexión.",
      0,
    );
  }

  let contenido: unknown;

  try {
    contenido =
      await respuesta.json();
  } catch {
    throw new ErrorPeticion(
      "El servidor no ha devuelto una respuesta JSON válida.",
      respuesta.status,
    );
  }

  if (!esObjeto(contenido)) {
    throw new ErrorPeticion(
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
    throw new ErrorPeticion(
      typeof contenido.error === "string"
        ? contenido.error
        : "No se ha podido completar la operación.",
      respuesta.status,
    );
  }

  return contenido.data as T;
}

// ================================================
// CONSULTAR CAMPAÑAS
// ================================================

async function consultarCampanas(
  signal: AbortSignal,
): Promise<Campana[]> {
  const campanas: Campana[] = [];

  let pagina = 1;
  let totalPaginas = 1;

  do {
    const parametros =
      new URLSearchParams({
        pagina: String(pagina),
        limite: "100",
      });

    const resultado =
      await solicitarApi<RespuestaCampanas>(
        `${API_CAMPANAS}?${parametros.toString()}`,
        {
          signal,
        },
      );

    campanas.push(
      ...resultado.campanas,
    );

    totalPaginas =
      resultado.totalPaginas;

    pagina++;
  } while (
    pagina <= totalPaginas &&
    pagina <= MAXIMO_CAMPANAS_PAGINAS
  );

  if (
    pagina <= totalPaginas
  ) {
    throw new Error(
      "Hay más campañas de las que permite cargar este selector. Es necesario ampliar la paginación.",
    );
  }

  return campanas.sort(
    (a, b) =>
      a.nombre.localeCompare(
        b.nombre,
        "es",
      ),
  );
}

// ================================================
// ICONOS
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
    case "ticket":
      contenido = (
        <>
          <path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4V5Z" />
          <path d="M12 5v3m0 3v2m0 3v3" />
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

    case "filtro":
      contenido = (
        <path d="M4 6h16M7 12h10M10 18h4" />
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

    case "check":
      contenido = (
        <path d="m5 12 4 4L19 6" />
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

    case "cerrar":
      contenido = (
        <path d="M5 5l14 14M19 5 5 19" />
      );
      break;

    case "ventas":
      contenido = (
        <>
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="2"
          />
          <path d="M3 9h18M7 15h4M15 15h2" />
        </>
      );
      break;

    case "prohibido":
      contenido = (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="m5.5 5.5 13 13" />
        </>
      );
      break;

    case "deshacer":
      contenido = (
        <>
          <path d="M3 8h12a6 6 0 0 1 0 12h-2" />
          <path d="m8 3-5 5 5 5" />
        </>
      );
      break;

    case "eliminar":
      contenido = (
        <>
          <path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7" />
        </>
      );
      break;

    case "calendario":
      contenido = (
        <>
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
          />
          <path d="M7 3v4M17 3v4M3 10h18" />
        </>
      );
      break;

    case "lista":
      contenido = (
        <>
          <path d="M9 6h12M9 12h12M9 18h12" />
          <path d="M4 6h.01M4 12h.01M4 18h.01" />
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

    case "flecha":
      contenido = (
        <path d="M5 12h14M13 6l6 6-6 6" />
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
// ETIQUETAS DE ESTADO
// ================================================

function EtiquetaEstado({
  estado,
}: {
  estado: string;
}) {
  const configuraciones:
    Record<
      string,
      {
        texto: string;
        clases: string;
      }
    > = {
      pendiente: {
        texto: "Pendiente",
        clases:
          "bg-amber-50 text-amber-800 ring-amber-200",
      },

      vendido: {
        texto: "Vendido",
        clases:
          "bg-emerald-50 text-emerald-700 ring-emerald-200",
      },

      no_vendido: {
        texto: "No vendido",
        clases:
          "bg-slate-100 text-slate-600 ring-slate-200",
      },

      activo: {
        texto: "Activo",
        clases:
          "bg-sky-50 text-sky-700 ring-sky-200",
      },

      anulado: {
        texto: "Anulado",
        clases:
          "bg-red-50 text-red-700 ring-red-200",
      },

      eliminado: {
        texto: "Eliminado",
        clases:
          "bg-red-50 text-red-700 ring-red-200",
      },
    };

  const config =
    configuraciones[estado] ?? {
      texto:
        estado.replaceAll("_", " "),

      clases:
        "bg-slate-100 text-slate-600 ring-slate-200",
    };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${config.clases}`}
    >
      {config.texto}
    </span>
  );
}

// ================================================
// TARJETA INDICADORA
// ================================================

function Indicador({
  titulo,
  valor,
  detalle,
  icono,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  icono: NombreIcono;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          {titulo}
        </p>

        <p className="mt-2 text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-3xl">
          {valor}
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          {detalle}
        </p>
      </div>

      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#245F91]">
        <Icono
          nombre={icono}
          size={22}
        />
      </span>
    </div>
  );
}

// ================================================
// COMPONENTE PRINCIPAL
// ================================================

export default function BoletosCodigosPanel({
  campanaInicial,
  onActualizado,
  permisos,
}: BoletosCodigosPanelProps) {
  const puedeEditar =
    permisos?.editar !== false;

  const puedeEliminar =
    permisos?.eliminar !== false;

  // ============================================
  // DATOS
  // ============================================

  const [campanas, setCampanas] =
    useState<Campana[]>([]);

  const [codigos, setCodigos] =
    useState<CodigoListado[]>([]);

  const [cargandoCampanas, setCargandoCampanas] =
    useState(true);

  const [cargandoCodigos, setCargandoCodigos] =
    useState(true);

  const [errorCampanas, setErrorCampanas] =
    useState<string | null>(null);

  const [errorCodigos, setErrorCodigos] =
    useState<string | null>(null);

  // ============================================
  // FILTROS
  // ============================================

  const [campanaId, setCampanaId] =
    useState(campanaInicial ?? "");

  const [filtroVenta, setFiltroVenta] =
    useState<FiltroVenta>("todos");

  const [filtroRegistro, setFiltroRegistro] =
    useState<FiltroRegistro>("todos");

  const [busqueda, setBusqueda] =
    useState("");

  const [busquedaAplicada, setBusquedaAplicada] =
    useState("");

  const [pagina, setPagina] =
    useState(1);

  const [limite, setLimite] =
    useState<number>(25);

  const [total, setTotal] =
    useState(0);

  const [totalPaginas, setTotalPaginas] =
    useState(0);

  const [revision, setRevision] =
    useState(0);

  // ============================================
  // SELECCIÓN
  // ============================================

  const [seleccionados, setSeleccionados] =
    useState<Set<string>>(
      () => new Set<string>(),
    );

  // ============================================
  // ACCIONES
  // ============================================

  const [accionAbierta, setAccionAbierta] =
    useState<AccionMasiva | null>(null);

  const [motivo, setMotivo] =
    useState("");

  const [confirmado, setConfirmado] =
    useState(false);

  const [procesando, setProcesando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState<MensajePanel | null>(null);

  const [errorAccion, setErrorAccion] =
    useState<string | null>(null);

  const [ultimoResultado, setUltimoResultado] =
    useState<ResultadoAccionMasiva | null>(
      null,
    );

  // ============================================
  // SINCRONIZAR CAMPAÑA INICIAL
  // ============================================

  useEffect(() => {
    setCampanaId(
      campanaInicial ?? "",
    );

    setPagina(1);

    setSeleccionados(
      new Set<string>(),
    );
  }, [campanaInicial]);

  // ============================================
  // CONSULTAR CAMPAÑAS
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setCargandoCampanas(true);
    setErrorCampanas(null);

    consultarCampanas(
      controlador.signal,
    )
      .then((resultado) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setCampanas(resultado);
      })
      .catch((error: unknown) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setErrorCampanas(
          obtenerMensajeError(error),
        );
      })
      .finally(() => {
        if (
          !controlador.signal.aborted
        ) {
          setCargandoCampanas(false);
        }
      });

    return () => {
      controlador.abort();
    };
  }, []);

  // ============================================
  // RETARDO DE BÚSQUEDA
  // ============================================

  useEffect(() => {
    const temporizador =
      window.setTimeout(
        () => {
          setBusquedaAplicada(
            busqueda.trim(),
          );
        },
        350,
      );

    return () => {
      window.clearTimeout(
        temporizador,
      );
    };
  }, [busqueda]);

  // ============================================
  // LIMPIAR SELECCIÓN AL CAMBIAR FILTROS
  // ============================================

  useEffect(() => {
    setSeleccionados(
      new Set<string>(),
    );

    setUltimoResultado(null);
  }, [
    campanaId,
    filtroVenta,
    filtroRegistro,
    busquedaAplicada,
    pagina,
    limite,
  ]);

  // ============================================
  // CARGAR BOLETOS
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setCargandoCodigos(true);
    setErrorCodigos(null);

    const parametros =
      new URLSearchParams({
        vista: "codigos",

        pagina:
          String(pagina),

        limite:
          String(limite),
      });

    if (campanaId) {
      parametros.set(
        "campanaId",
        campanaId,
      );
    }

    if (
      filtroVenta !== "todos"
    ) {
      parametros.set(
        "estadoVenta",
        filtroVenta,
      );
    }

    if (
      filtroRegistro !== "todos"
    ) {
      parametros.set(
        "estadoRegistro",
        filtroRegistro,
      );
    }

    if (
      busquedaAplicada
    ) {
      parametros.set(
        "busqueda",
        busquedaAplicada,
      );
    }

    solicitarApi<RespuestaListadoCodigos>(
      `${API_CODIGOS}?${parametros.toString()}`,
      {
        signal:
          controlador.signal,
      },
    )
      .then((resultado) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setCodigos(
          resultado.codigos,
        );

        setTotal(
          resultado.total,
        );

        setTotalPaginas(
          resultado.totalPaginas,
        );

        if (
          resultado.totalPaginas > 0 &&
          pagina > resultado.totalPaginas
        ) {
          setPagina(
            resultado.totalPaginas,
          );
        }
      })
      .catch((error: unknown) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setCodigos([]);
        setTotal(0);
        setTotalPaginas(0);

        setErrorCodigos(
          obtenerMensajeError(error),
        );
      })
      .finally(() => {
        if (
          !controlador.signal.aborted
        ) {
          setCargandoCodigos(false);
        }
      });

    return () => {
      controlador.abort();
    };
  }, [
    campanaId,
    filtroVenta,
    filtroRegistro,
    busquedaAplicada,
    pagina,
    limite,
    revision,
  ]);

  // ============================================
  // CERRAR DIÁLOGO CON ESCAPE
  // ============================================

  useEffect(() => {
    if (!accionAbierta) {
      return;
    }

    function pulsarTecla(
      evento: KeyboardEvent,
    ) {
      if (
        evento.key === "Escape" &&
        !procesando
      ) {
        cerrarDialogo();
      }
    }

    window.addEventListener(
      "keydown",
      pulsarTecla,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        pulsarTecla,
      );
    };
  }, [
    accionAbierta,
    procesando,
  ]);

  // ============================================
  // CAMPAÑA SELECCIONADA
  // ============================================

  const campanaSeleccionada =
    useMemo(
      () =>
        campanas.find(
          (campana) =>
            campana.id ===
            campanaId,
        ) ?? null,
      [
        campanas,
        campanaId,
      ],
    );

  // ============================================
  // SELECCIÓN ACTUAL VÁLIDA
  // ============================================

  const idsVisibles =
    useMemo(
      () =>
        codigos.map(
          (codigo) =>
            codigo.id,
        ),
      [codigos],
    );

  const seleccionActual =
    useMemo(
      () =>
        idsVisibles.filter(
          (id) =>
            seleccionados.has(id),
        ),
      [
        idsVisibles,
        seleccionados,
      ],
    );

  const cantidadSeleccionada =
    seleccionActual.length;

  const todosSeleccionados =
    codigos.length > 0 &&
    cantidadSeleccionada ===
      codigos.length;

  // ============================================
  // INDICADORES DE LA PÁGINA
  // ============================================

  const indicadores =
    useMemo(
      () => ({
        vendidos:
          codigos.filter(
            (codigo) =>
              codigo.estadoVenta ===
              "vendido",
          ).length,

        pendientes:
          codigos.filter(
            (codigo) =>
              codigo.estadoVenta ===
              "pendiente",
          ).length,

        noVendidos:
          codigos.filter(
            (codigo) =>
              codigo.estadoVenta ===
              "no_vendido",
          ).length,
      }),
      [codigos],
    );

  // ============================================
  // ACCIONES DISPONIBLES
  // ============================================

  const accionesPermitidas =
    useMemo(
      () => {
        const disponibles:
          AccionMasiva[] = [];

        if (puedeEditar) {
          disponibles.push(
            "marcar_vendido",
            "marcar_no_vendido",
            "volver_pendiente",
            "anular",
          );
        }

        if (puedeEliminar) {
          disponibles.push(
            "eliminar",
          );
        }

        return disponibles;
      },
      [
        puedeEditar,
        puedeEliminar,
      ],
    );

  // ============================================
  // NAVEGACIÓN Y RECARGA
  // ============================================

  function recargar() {
    setSeleccionados(
      new Set<string>(),
    );

    setRevision(
      (anterior) =>
        anterior + 1,
    );
  }

  function cambiarPagina(
    nuevaPagina: number,
  ) {
    setSeleccionados(
      new Set<string>(),
    );

    setPagina(
      nuevaPagina,
    );
  }

  function limpiarFiltros() {
    if (procesando) {
      return;
    }

    setCampanaId("");
    setFiltroVenta("todos");
    setFiltroRegistro("todos");
    setBusqueda("");
    setBusquedaAplicada("");
    setPagina(1);

    setSeleccionados(
      new Set<string>(),
    );
  }

  // ============================================
  // SELECCIÓN INDIVIDUAL
  // ============================================

  function seleccionarCodigo(
    codigoId: string,
    marcado: boolean,
  ) {
    if (
      procesando ||
      cargandoCodigos
    ) {
      return;
    }

    setSeleccionados(
      (anteriores) => {
        const siguientes =
          new Set(
            anteriores,
          );

        if (marcado) {
          siguientes.add(
            codigoId,
          );
        } else {
          siguientes.delete(
            codigoId,
          );
        }

        return siguientes;
      },
    );
  }

  // ============================================
  // SELECCIONAR PÁGINA COMPLETA
  // ============================================

  function seleccionarPagina(
    marcado: boolean,
  ) {
    if (
      procesando ||
      cargandoCodigos
    ) {
      return;
    }

    setSeleccionados(
      marcado
        ? new Set(
            idsVisibles,
          )
        : new Set<string>(),
    );
  }

  // ============================================
  // ABRIR CONFIRMACIÓN
  // ============================================

  function abrirAccion(
    accion: AccionMasiva,
  ) {
    if (
      procesando ||
      cargandoCodigos ||
      errorCodigos ||
      cantidadSeleccionada === 0 ||
      !campanaId ||
      !accionesPermitidas.includes(
        accion,
      )
    ) {
      return;
    }

    setMotivo("");
    setConfirmado(false);
    setErrorAccion(null);
    setMensaje(null);

    setAccionAbierta(
      accion,
    );
  }

  function cerrarDialogo() {
    if (procesando) {
      return;
    }

    setAccionAbierta(null);
    setMotivo("");
    setConfirmado(false);
    setErrorAccion(null);
  }

  // ============================================
  // VALIDAR ACCIÓN
  // ============================================

  const motivoValido =
    accionAbierta !== null &&
    (
      !ACCIONES[
        accionAbierta
      ].requiereMotivo ||
      (
        motivo.trim().length >= 10 &&
        motivo.trim().length <= 300
      )
    );

  // ============================================
  // EJECUTAR ACCIÓN MASIVA
  // ============================================

  async function confirmarAccion() {
    if (
      !accionAbierta ||
      !confirmado ||
      !motivoValido ||
      !campanaId ||
      procesando ||
      cargandoCodigos ||
      errorCodigos ||
      cantidadSeleccionada === 0
    ) {
      return;
    }

    const accion =
      accionAbierta;

    const ids =
      [...seleccionActual];

    /*
     * La selección nunca incluye
     * boletos de otras páginas.
     *
     * Todas las operaciones se limitan
     * a una campaña explícita.
     */

    setProcesando(true);
    setErrorAccion(null);

    try {
      const resultado =
        await solicitarApi<ResultadoAccionMasiva>(
          API_CODIGOS,
          {
            metodo: "POST",

            datos: {
              campanaId,

              accion,

              codigosIds:
                ids,

              motivo:
                motivo.trim() ||
                null,
            },
          },
        );

      if (
        !resultado ||
        typeof resultado.actualizados !==
          "number" ||
        typeof resultado.omitidos !==
          "number" ||
        typeof resultado.solicitados !==
          "number"
      ) {
        throw new Error(
          "La operación ha respondido, pero no se han podido comprobar sus resultados. Actualiza el listado antes de repetirla.",
        );
      }

      const parcial =
        resultado.parcial ||
        resultado.omitidos > 0;

      setUltimoResultado(
        resultado,
      );

      setMensaje({
        tipo:
          parcial
            ? "aviso"
            : "exito",

        texto: parcial
          ? `Operación parcialmente completada: ${formatearNumero(resultado.actualizados)} actualizados y ${formatearNumero(resultado.omitidos)} omitidos. Revisa los detalles.`
          : `Operación completada: ${formatearNumero(resultado.actualizados)} boletos actualizados.`,
      });

      setSeleccionados(
        new Set<string>(),
      );

      setAccionAbierta(null);
      setConfirmado(false);
      setMotivo("");

      recargar();

      onActualizado?.();
    } catch (error) {
      /*
       * El servicio puede haber
       * aplicado algunos cambios
       * antes de producirse un error.
       *
       * No reintentamos automáticamente.
       */

      setErrorAccion(
        `${obtenerMensajeError(error)} Comprueba el estado de los boletos antes de repetir esta acción.`,
      );

      setSeleccionados(
        new Set<string>(),
      );

      recargar();
    } finally {
      setProcesando(false);
    }
  }

  // ============================================
  // MOSTRAR FILA EN ESCRITORIO
  // ============================================

  function mostrarFila(
    codigo: CodigoListado,
  ) {
    const seleccionado =
      seleccionados.has(
        codigo.id,
      );

    return (
      <tr
        key={codigo.id}
        className={`border-b border-slate-100 transition-colors last:border-0 ${
          seleccionado
            ? "bg-[#EFF5FA]"
            : "hover:bg-slate-50"
        }`}
      >
        <td className="px-4 py-4">
          <input
            type="checkbox"
            aria-label={`Seleccionar boleto ${codigo.codigoVisible}`}
            checked={seleccionado}
            disabled={
              cargandoCodigos ||
              procesando
            }
            onChange={(evento) =>
              seleccionarCodigo(
                codigo.id,
                evento.target.checked,
              )
            }
            className="h-4 w-4 cursor-pointer accent-[#0B1C30] disabled:cursor-not-allowed"
          />
        </td>

        <td className="px-4 py-4">
          <span className="font-mono text-xs font-semibold text-[#0B1C30]">
            {codigo.codigoVisible}
          </span>
        </td>

        <td className="px-4 py-4">
          <span className="text-xs capitalize text-slate-600">
            {codigo.tipo.replaceAll("_", " ")}
          </span>
        </td>

        <td className="px-4 py-4">
          <EtiquetaEstado
            estado={codigo.estadoVenta}
          />
        </td>

        <td className="px-4 py-4">
          <EtiquetaEstado
            estado={codigo.estadoRegistro}
          />
        </td>

        <td className="px-4 py-4 text-xs text-slate-500">
          {formatearFecha(
            codigo.createdAt,
          )}
        </td>
      </tr>
    );
  }

  // ============================================
  // MOSTRAR TARJETA EN MÓVIL
  // ============================================

  function mostrarTarjetaMovil(
    codigo: CodigoListado,
  ) {
    const seleccionado =
      seleccionados.has(
        codigo.id,
      );

    return (
      <article
        key={codigo.id}
        className={`rounded-xl border p-4 ${
          seleccionado
            ? "border-[#92B6D5] bg-[#EFF5FA]"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            aria-label={`Seleccionar boleto ${codigo.codigoVisible}`}
            checked={seleccionado}
            disabled={
              cargandoCodigos ||
              procesando
            }
            onChange={(evento) =>
              seleccionarCodigo(
                codigo.id,
                evento.target.checked,
              )
            }
            className="mt-1 h-4 w-4 shrink-0 accent-[#0B1C30]"
          />

          <div className="min-w-0 flex-1">
            <p className="break-all font-mono text-xs font-bold text-[#0B1C30]">
              {codigo.codigoVisible}
            </p>

            <p className="mt-1 text-xs capitalize text-slate-500">
              {codigo.tipo.replaceAll("_", " ")}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <EtiquetaEstado
            estado={codigo.estadoVenta}
          />

          <EtiquetaEstado
            estado={codigo.estadoRegistro}
          />
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-200/70 pt-3 text-xs text-slate-500">
          <Icono
            nombre="reloj"
            size={15}
          />

          {formatearFecha(
            codigo.createdAt,
          )}
        </div>
      </article>
    );
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  const desde =
    total === 0
      ? 0
      : (pagina - 1) *
          limite +
        1;

  const hasta =
    Math.min(
      total,
      pagina * limite,
    );

  return (
    <div className="space-y-6 text-[#0B1C30]">
      {/* CABECERA */}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#0B1C30] text-[#F2C94C]">
            <Icono
              nombre="ticket"
              size={27}
            />
          </span>

          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">
              Gestión de boletos
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Consulta códigos, controla
              su estado de venta y realiza
              operaciones sobre varios
              boletos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={recargar}
          disabled={
            cargandoCodigos ||
            procesando
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <Icono
            nombre="actualizar"
            size={17}
            className={
              cargandoCodigos
                ? "animate-spin"
                : ""
            }
          />

          Actualizar
        </button>
      </section>

      {/* INDICADORES */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          titulo="Total del filtro"
          valor={
            cargandoCodigos
              ? "—"
              : formatearNumero(
                  total,
                )
          }
          detalle="Total de resultados"
          icono="ticket"
        />

        <Indicador
          titulo="Vendidos"
          valor={
            cargandoCodigos
              ? "—"
              : formatearNumero(
                  indicadores.vendidos,
                )
          }
          detalle="En la página actual"
          icono="ventas"
        />

        <Indicador
          titulo="Pendientes"
          valor={
            cargandoCodigos
              ? "—"
              : formatearNumero(
                  indicadores.pendientes,
                )
          }
          detalle="En la página actual"
          icono="reloj"
        />

        <Indicador
          titulo="No vendidos"
          valor={
            cargandoCodigos
              ? "—"
              : formatearNumero(
                  indicadores.noVendidos,
                )
          }
          detalle="En la página actual"
          icono="prohibido"
        />
      </div>

      {/* MENSAJES */}

      {mensaje && (
        <div
          role={
            mensaje.tipo === "error"
              ? "alert"
              : "status"
          }
          className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${
            mensaje.tipo === "exito"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : mensaje.tipo === "aviso"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-start gap-3">
            <Icono
              nombre={
                mensaje.tipo === "exito"
                  ? "check"
                  : "alerta"
              }
              size={20}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm leading-6">
              {mensaje.texto}
            </p>
          </div>

          <button
            type="button"
            aria-label="Cerrar mensaje"
            onClick={() =>
              setMensaje(null)
            }
            className="shrink-0 rounded-lg p-1 hover:bg-black/5"
          >
            <Icono
              nombre="cerrar"
              size={17}
            />
          </button>
        </div>
      )}

      {/* RESULTADO DE ÚLTIMA OPERACIÓN */}

      {ultimoResultado && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">
                Resultado de la última operación
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {ACCIONES[
                  ultimoResultado.accion
                ]?.titulo ??
                  ultimoResultado.accion}
              </p>
            </div>

            <button
              type="button"
              aria-label="Ocultar resultado"
              onClick={() =>
                setUltimoResultado(null)
              }
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <Icono
                nombre="cerrar"
                size={17}
              />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xl font-bold">
                {formatearNumero(
                  ultimoResultado.solicitados,
                )}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Solicitados
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="text-xl font-bold text-emerald-700">
                {formatearNumero(
                  ultimoResultado.actualizados,
                )}
              </p>

              <p className="mt-1 text-[11px] text-emerald-700">
                Actualizados
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-center">
              <p className="text-xl font-bold text-amber-800">
                {formatearNumero(
                  ultimoResultado.omitidos,
                )}
              </p>

              <p className="mt-1 text-[11px] text-amber-800">
                Omitidos
              </p>
            </div>
          </div>

          {Array.isArray(
            ultimoResultado.errores,
          ) &&
            ultimoResultado.errores.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-900">
                  Detalles de los boletos omitidos
                </p>

                <ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-800">
                  {ultimoResultado.errores
                    .slice(0, 8)
                    .map(
                      (
                        error,
                        indice,
                      ) => (
                        <li key={indice}>
                          {obtenerTextoErrorMasivo(
                            error,
                          )}
                        </li>
                      ),
                    )}
                </ul>

                {ultimoResultado.errores.length >
                  8 && (
                  <p className="mt-2 text-xs font-semibold text-amber-900">
                    Hay más errores que no se
                    muestran en este resumen.
                  </p>
                )}
              </div>
            )}
        </section>
      )}

      {/* FILTROS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#245F91]">
            <Icono
              nombre="filtro"
              size={19}
            />
          </span>

          <div>
            <h3 className="text-sm font-bold">
              Filtros de búsqueda
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Los filtros se aplican
              a todos los boletos desde
              el servidor.
            </p>
          </div>
        </div>

        {errorCampanas && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
          >
            No se han podido cargar las campañas:
            {" "}
            {errorCampanas}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* CAMPAÑA */}

          <div className="space-y-2">
            <label
              htmlFor="boletos-campana"
              className="block text-xs font-semibold text-slate-600"
            >
              Campaña
            </label>

            <select
              id="boletos-campana"
              value={campanaId}
              disabled={
                cargandoCampanas ||
                procesando
              }
              onChange={(evento) => {
                setCampanaId(
                  evento.target.value,
                );

                setPagina(1);

                setSeleccionados(
                  new Set<string>(),
                );
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition-colors focus:border-[#245F91] focus:bg-white disabled:opacity-50"
            >
              <option value="">
                Todas las campañas
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
          </div>

          {/* VENTA */}

          <div className="space-y-2">
            <label
              htmlFor="boletos-estado-venta"
              className="block text-xs font-semibold text-slate-600"
            >
              Estado de venta
            </label>

            <select
              id="boletos-estado-venta"
              value={filtroVenta}
              disabled={procesando}
              onChange={(evento) => {
                setFiltroVenta(
                  evento.target.value as
                    FiltroVenta,
                );

                setPagina(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition-colors focus:border-[#245F91] focus:bg-white"
            >
              <option value="todos">
                Todos
              </option>

              <option value="pendiente">
                Pendiente
              </option>

              <option value="vendido">
                Vendido
              </option>

              <option value="no_vendido">
                No vendido
              </option>
            </select>
          </div>

          {/* REGISTRO */}

          <div className="space-y-2">
            <label
              htmlFor="boletos-estado-registro"
              className="block text-xs font-semibold text-slate-600"
            >
              Estado del boleto
            </label>

            <select
              id="boletos-estado-registro"
              value={filtroRegistro}
              disabled={procesando}
              onChange={(evento) => {
                setFiltroRegistro(
                  evento.target.value as
                    FiltroRegistro,
                );

                setPagina(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition-colors focus:border-[#245F91] focus:bg-white"
            >
              <option value="todos">
                Todos
              </option>

              <option value="activo">
                Activos
              </option>

              <option value="anulado">
                Anulados
              </option>

              <option value="eliminado">
                Eliminados
              </option>
            </select>
          </div>

          {/* ELEMENTOS POR PÁGINA */}

          <div className="space-y-2">
            <label
              htmlFor="boletos-limite"
              className="block text-xs font-semibold text-slate-600"
            >
              Boletos por página
            </label>

            <select
              id="boletos-limite"
              value={limite}
              disabled={procesando}
              onChange={(evento) => {
                setLimite(
                  Number(
                    evento.target.value,
                  ),
                );

                setPagina(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition-colors focus:border-[#245F91] focus:bg-white"
            >
              {OPCIONES_LIMITE.map(
                (opcion) => (
                  <option
                    key={opcion}
                    value={opcion}
                  >
                    {opcion} boletos
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {/* BÚSQUEDA */}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Icono
              nombre="buscar"
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={busqueda}
              disabled={procesando}
              maxLength={120}
              onChange={(evento) => {
                setBusqueda(
                  evento.target.value,
                );

                setPagina(1);

                setSeleccionados(
                  new Set<string>(),
                );
              }}
              placeholder="Buscar por código visible..."
              aria-label="Buscar boletos"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[#245F91] focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={limpiarFiltros}
            disabled={procesando}
            className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            Limpiar filtros
          </button>
        </div>

        {/* CAMPAÑA SELECCIONADA */}

        {campanaSeleccionada && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#D7E7F4] bg-[#EFF5FA] p-3">
            <Icono
              nombre="calendario"
              size={18}
              className="text-[#245F91]"
            />

            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#174C78]">
                {campanaSeleccionada.nombre}
              </p>

              <p className="mt-1 text-[11px] text-[#456B89]">
                Campaña:{" "}
                {campanaSeleccionada.estado.replaceAll(
                  "_",
                  " ",
                )}
                {" · "}
                Ventas:{" "}
                {campanaSeleccionada.estadoVentas}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ERRORES DE LISTADO */}

      {errorCodigos && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <div className="flex items-start gap-3 text-red-700">
            <Icono
              nombre="alerta"
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="text-sm font-bold">
                No se han podido consultar los boletos
              </p>

              <p className="mt-1 text-xs leading-6">
                {errorCodigos}
              </p>

              <button
                type="button"
                onClick={recargar}
                className="mt-2 text-xs font-bold underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE SELECCIÓN Y ACCIONES */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">
              Selección de boletos
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {formatearNumero(
                cantidadSeleccionada,
              )}
              {" "}
              seleccionados de{" "}
              {formatearNumero(
                codigos.length,
              )}
              {" "}
              en esta página.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={todosSeleccionados}
                disabled={
                  codigos.length === 0 ||
                  cargandoCodigos ||
                  procesando ||
                  Boolean(errorCodigos)
                }
                onChange={(evento) =>
                  seleccionarPagina(
                    evento.target.checked,
                  )
                }
                className="h-4 w-4 accent-[#0B1C30]"
              />

              Toda la página
            </label>

            <button
              type="button"
              disabled={
                cantidadSeleccionada === 0 ||
                procesando
              }
              onClick={() =>
                setSeleccionados(
                  new Set<string>(),
                )
              }
              className="text-xs font-semibold text-[#245F91] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Deseleccionar
            </button>
          </div>
        </div>

        {/* ACCIONES MASIVAS */}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {accionesPermitidas.map(
            (accion) => {
              const config =
                ACCIONES[accion];

              const disponible =
                cantidadSeleccionada > 0 &&
                Boolean(campanaId) &&
                !procesando &&
                !cargandoCodigos &&
                !errorCodigos;

              return (
                <button
                  key={accion}
                  type="button"
                  disabled={!disponible}
                  onClick={() =>
                    abrirAccion(
                      accion,
                    )
                  }
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    config.peligrosa
                      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      : "border-slate-200 bg-slate-50 text-[#0B1C30] hover:bg-[#EFF5FA]"
                  }`}
                >
                  <Icono
                    nombre={config.icono}
                    size={16}
                  />

                  {config.etiqueta}
                </button>
              );
            },
          )}
        </div>

        {!campanaId &&
          cantidadSeleccionada > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
              Selecciona una campaña en los
              filtros para habilitar las
              operaciones masivas. No se
              mezclan boletos de campañas
              diferentes.
            </p>
          )}

        {cantidadSeleccionada === 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Selecciona uno o varios boletos
            para habilitar las acciones.
            Las operaciones se aplican
            únicamente a la selección actual.
          </p>
        )}
      </section>

      {/* LISTADO DE BOLETOS */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Icono
              nombre="lista"
              size={20}
              className="text-[#245F91]"
            />

            <div>
              <h3 className="text-sm font-bold">
                Listado de boletos
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {cargandoCodigos
                  ? "Cargando resultados..."
                  : `${formatearNumero(total)} boletos encontrados`}
              </p>
            </div>
          </div>

          <span className="rounded-full bg-[#EFF5FA] px-3 py-1.5 text-[11px] font-semibold text-[#174C78]">
            Solo datos administrativos
          </span>
        </div>

        {cargandoCodigos ? (
          <div
            role="status"
            className="space-y-3 p-5"
          >
            {[1, 2, 3, 4, 5].map(
              (numero) => (
                <div
                  key={numero}
                  className="h-14 animate-pulse rounded-xl bg-slate-100"
                />
              ),
            )}
          </div>
        ) : codigos.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF5FA] text-[#245F91]">
              <Icono
                nombre="ticket"
                size={29}
              />
            </span>

            <h4 className="mt-4 text-base font-bold">
              No hay boletos que mostrar
            </h4>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Comprueba los filtros o genera
              un lote desde el apartado
              correspondiente.
            </p>
          </div>
        ) : (
          <>
            {/* TABLA ESCRITORIO */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500">
                    <th className="w-12 px-4 py-3 font-semibold">
                      <span className="sr-only">
                        Selección
                      </span>
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Código
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Tipo
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Venta
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Registro
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Creación
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {codigos.map(
                    mostrarFila,
                  )}
                </tbody>
              </table>
            </div>

            {/* TARJETAS MÓVIL */}

            <div className="grid gap-3 p-3 md:hidden">
              {codigos.map(
                mostrarTarjetaMovil,
              )}
            </div>
          </>
        )}

        {/* PAGINACIÓN */}

        {!cargandoCodigos &&
          total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 sm:p-5">
              <p className="text-xs text-slate-500">
                Mostrando{" "}
                <strong>
                  {formatearNumero(desde)}
                  {" - "}
                  {formatearNumero(hasta)}
                </strong>
                {" "}
                de{" "}
                {formatearNumero(total)}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    pagina <= 1 ||
                    procesando
                  }
                  onClick={() =>
                    cambiarPagina(
                      pagina - 1,
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>

                <span className="px-2 text-xs font-medium text-slate-500">
                  {pagina}
                  {" / "}
                  {totalPaginas}
                </span>

                <button
                  type="button"
                  disabled={
                    pagina >= totalPaginas ||
                    procesando
                  }
                  onClick={() =>
                    cambiarPagina(
                      pagina + 1,
                    )
                  }
                  className="rounded-xl bg-[#0B1C30] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#18385D] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
      </section>

      {/* SEGURIDAD */}

      <div className="flex items-start gap-3 rounded-2xl border border-[#D7E7F4] bg-[#EFF5FA] p-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#245F91]">
          <Icono
            nombre="escudo"
            size={22}
          />
        </span>

        <div>
          <h3 className="text-sm font-semibold text-[#174C78]">
            Gestión protegida de boletos
          </h3>

          <p className="mt-1 text-xs leading-6 text-[#355A78] sm:text-sm">
            Esta sección no muestra
            el contenido cifrado ni permite
            descubrir qué premio corresponde
            a un boleto. Las acciones
            se comprueban nuevamente
            en el servidor y quedan sujetas
            a los permisos del usuario,
            los estados de campaña
            y el historial de canjes.
          </p>
        </div>
      </div>

      {/* ===================================== */}
      {/* DIÁLOGO DE ACCIONES MASIVAS */}
      {/* ===================================== */}

      {accionAbierta && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B1C30]/65 p-3 backdrop-blur-[3px] sm:p-6">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-accion-boletos"
            aria-describedby="descripcion-accion-boletos"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            {/* ICONO */}

            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                ACCIONES[accionAbierta].peligrosa
                  ? "bg-red-50 text-red-600"
                  : "bg-[#EFF5FA] text-[#245F91]"
              }`}
            >
              <Icono
                nombre={
                  ACCIONES[
                    accionAbierta
                  ].icono
                }
                size={27}
              />
            </div>

            {/* CABECERA */}

            <h2
              id="titulo-accion-boletos"
              className="mt-5 text-xl font-bold"
            >
              {ACCIONES[
                accionAbierta
              ].titulo}
            </h2>

            <p className="mt-2 text-sm font-semibold text-[#245F91]">
              {formatearNumero(
                cantidadSeleccionada,
              )}
              {" "}
              boletos seleccionados
            </p>

            <p
              id="descripcion-accion-boletos"
              className="mt-4 text-sm leading-7 text-slate-600"
            >
              {ACCIONES[
                accionAbierta
              ].descripcion}
            </p>

            {/* CAMPAÑA */}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Campaña
              </p>

              <p className="mt-1 text-sm font-bold">
                {campanaSeleccionada?.nombre ??
                  campanaId}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                La operación se limitará
                a los boletos seleccionados
                de esta campaña.
              </p>
            </div>

            {/* AVISO DE OPERACIÓN */}

            {ACCIONES[
              accionAbierta
            ].peligrosa && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                <Icono
                  nombre="alerta"
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <p className="text-xs leading-6">
                  Esta operación puede
                  impedir el uso posterior
                  de los boletos.
                  Verifica la selección
                  y el motivo antes
                  de continuar.
                </p>
              </div>
            )}

            {/* MOTIVO */}

            {ACCIONES[
              accionAbierta
            ].requiereMotivo && (
              <div className="mt-5 space-y-2">
                <label
                  htmlFor="boletos-motivo"
                  className="block text-sm font-semibold"
                >
                  Motivo de la operación *
                </label>

                <textarea
                  id="boletos-motivo"
                  rows={3}
                  maxLength={300}
                  value={motivo}
                  disabled={procesando}
                  onChange={(evento) => {
                    setMotivo(
                      evento.target.value,
                    );

                    setConfirmado(false);
                  }}
                  placeholder="Explica por qué se realiza esta operación..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-[#245F91] focus:bg-white"
                />

                <p className="text-xs text-slate-500">
                  Entre 10 y 300 caracteres.
                  {" "}
                  {motivo.trim().length}
                  {" / "}300
                </p>
              </div>
            )}

            {/* ERRORES */}

            {errorAccion && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <p className="text-xs leading-6 text-red-700">
                  {errorAccion}
                </p>
              </div>
            )}

            {/* CONFIRMACIÓN */}

            <label className="mt-5 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={confirmado}
                disabled={procesando}
                onChange={(evento) =>
                  setConfirmado(
                    evento.target.checked,
                  )
                }
                className="mt-1 h-4 w-4 shrink-0 accent-[#0B1C30]"
              />

              <span className="text-xs font-medium leading-6 text-slate-600">
                He revisado la campaña,
                la selección y las
                consecuencias de esta
                operación. Confirmo que
                quiero ejecutarla sobre
                los boletos seleccionados.
              </span>
            </label>

            {/* BOTONES */}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={procesando}
                onClick={cerrarDialogo}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  !confirmado ||
                  !motivoValido ||
                  procesando
                }
                onClick={() =>
                  void confirmarAccion()
                }
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  ACCIONES[
                    accionAbierta
                  ].peligrosa
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#0B1C30] hover:bg-[#18385D]"
                }`}
              >
                <Icono
                  nombre={
                    procesando
                      ? "actualizar"
                      : "check"
                  }
                  size={17}
                  className={
                    procesando
                      ? "animate-spin"
                      : ""
                  }
                />

                {procesando
                  ? "Procesando..."
                  : "Confirmar operación"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export {
  BoletosCodigosPanel,
};
