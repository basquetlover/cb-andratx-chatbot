
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

/*
 * C.B. ANDRATX
 * Archivo 22/27
 *
 * Escáner de códigos y boletos.
 *
 * Funcionalidades:
 *
 * - Lectura QR mediante cámara.
 * - Lectura de códigos de barras.
 * - Lectores USB/Bluetooth tipo teclado.
 * - Entrada manual.
 * - Selección de campaña.
 * - Consulta de boletos.
 * - Registro de vendidos.
 * - Registro de no vendidos.
 * - Consulta protegida de premios.
 * - Confirmación manual de canjes.
 * - Historial local de operaciones.
 *
 * Seguridad:
 *
 * - No almacena tokens QR.
 * - No utiliza localStorage.
 * - No revela premios en otros modos.
 * - No realiza canjes automáticos.
 * - Todas las acciones utilizan
 *   las API protegidas del servidor.
 *
 * APIs:
 *
 * POST /api/panel/codigos/escanear
 * POST /api/panel/codigos/canjes
 * GET  /api/panel/codigos/campanas
 */

export type ModoEscaner =
  | "consulta"
  | "venta"
  | "no_vendidos"
  | "premios";

type OrigenLectura =
  | "camara"
  | "entrada";

type FormatoDetectado =
  | "qr_code"
  | "code_128"
  | "code_39"
  | "ean_13"
  | "ean_8"
  | "itf"
  | string;

type MetodoCanje =
  | "qr"
  | "manual";

interface Campana {
  id: string;
  nombre: string;
  estado: string;
  estadoVentas: string;
  estadoCanjes: string;
}

interface CodigoEscaneado {
  id?: string;
  codigoVisible?: string;

  tipo?: string;

  estadoVenta?: string;
  estadoRegistro?: string;

  loteId?: string | null;
}

interface PremioEscaneado {
  tipoResultado:
    | "premio"
    | "sin_premio";

  articuloId?: string | null;

  nombreArticulo?: string | null;
  descripcionArticulo?: string | null;
}

interface ResultadoEscaneo {
  encontrado?: boolean;
  valido?: boolean;

  motivo?: string;
  mensaje?: string;

  codigo?: CodigoEscaneado | null;

  estadoAnterior?: string | null;
  estadoActual?: string | null;

  requiereConfirmacion?: boolean;

  premio?: PremioEscaneado | null;

  entregado?: boolean;
  tieneHistorialCanje?: boolean;
}

interface RespuestaEscaneo {
  modo: ModoEscaner;
  resultado: ResultadoEscaneo;
}

interface RespuestaCanje {
  entregado: boolean;

  codigo?: unknown;
  premio?: unknown;
  canje?: unknown;

  mensaje?: string;
}

interface RespuestaCampanas {
  campanas: Campana[];
  total: number;
  totalPaginas: number;
}

interface RespuestaApi<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

interface RegistroHistorial {
  id: number;
  codigoVisible: string;

  modo: ModoEscaner;
  valido: boolean;

  mensaje: string;
  fecha: Date;

  canjeConfirmado: boolean;
}

interface LecturaConfirmable {
  codigoVisible: string;
  metodo: MetodoCanje;

  /*
   * La lectura QR se conserva
   * únicamente en memoria y solo
   * mientras dure la operación.
   *
   * Nunca se añade al historial.
   */
  lecturaQr: string | null;
}

interface DetectorResultado {
  rawValue: string;
  format?: FormatoDetectado;
}

interface DetectorCodigos {
  detect(
    origen: HTMLVideoElement,
  ): Promise<DetectorResultado[]>;
}

interface ConstructorDetector {
  new (
    opciones?: {
      formats?: string[];
    },
  ): DetectorCodigos;

  getSupportedFormats?():
    Promise<string[]>;
}

interface NavegadorDetector {
  BarcodeDetector?:
    ConstructorDetector;
}

export interface EscanerCodigosPanelProps {
  campanaInicial?: string;

  modoInicial?: ModoEscaner;

  onActualizado?: () => void;

  permisos?: {
    ver?: boolean;
    escanear?: boolean;
    editar?: boolean;
    premios?: boolean;
    canjear?: boolean;
  };
}

// ================================================
// CONFIGURACIÓN
// ================================================

const API_ESCANEAR =
  "/api/panel/codigos/escanear";

const API_CANJES =
  "/api/panel/codigos/canjes";

const API_CAMPANAS =
  "/api/panel/codigos/campanas";

const MAXIMO_LONGITUD_LECTURA =
  2048;

const MAXIMO_HISTORIAL =
  12;

const MAXIMO_PAGINAS_CAMPANAS =
  20;

const INTERVALO_DETECCION_MS =
  350;

const FORMATOS_DETECTOR = [
  "qr_code",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "itf",
];

const MODOS: {
  id: ModoEscaner;
  nombre: string;
  descripcion: string;
  icono: NombreIcono;
}[] = [
  {
    id: "consulta",
    nombre: "Consultar",
    descripcion:
      "Consultar el estado sin mostrar premios.",
    icono: "search",
  },
  {
    id: "venta",
    nombre: "Vender",
    descripcion:
      "Registrar boletos como vendidos.",
    icono: "credit-card",
  },
  {
    id: "no_vendidos",
    nombre: "No vendidos",
    descripcion:
      "Marcar boletos como no vendidos.",
    icono: "ban",
  },
  {
    id: "premios",
    nombre: "Premios",
    descripcion:
      "Consultar y confirmar entregas.",
    icono: "gift",
  },
];

type NombreIcono =
  | "scan"
  | "camera"
  | "camera-off"
  | "keyboard"
  | "search"
  | "credit-card"
  | "ban"
  | "gift"
  | "check"
  | "alert"
  | "refresh"
  | "shield"
  | "clock"
  | "close"
  | "arrow"
  | "ticket"
  | "info"
  | "calendar";

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
    : "Ha ocurrido un error inesperado.";
}

function formatearNumero(
  valor: number,
): string {
  return new Intl.NumberFormat(
    "es-ES",
  ).format(valor);
}

function formatearHora(
  fecha: Date,
): string {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    },
  ).format(fecha);
}

function textoEstado(
  valor: string | null | undefined,
): string {
  if (!valor) {
    return "Sin información";
  }

  const nombres:
    Record<string, string> = {
      pendiente: "Pendiente",
      vendido: "Vendido",
      no_vendido: "No vendido",
      activo: "Activo",
      anulado: "Anulado",
      eliminado: "Eliminado",
    };

  return (
    nombres[valor] ??
    valor.replaceAll("_", " ")
  );
}

function esLecturaQr(
  valor: string,
  formato?: string,
): boolean {
  if (
    formato === "qr_code"
  ) {
    return true;
  }

  /*
   * Los QR del sistema incluyen
   * un token en la URL.
   *
   * El servidor será quien compruebe
   * el formato y la autenticidad.
   */

  return (
    /[#?&]t=/.test(valor)
  );
}

// ================================================
// PETICIONES API
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

        signal:
          opciones.signal,

        headers: {
          Accept:
            "application/json",

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
      "El servidor no ha devuelto una respuesta válida.",
      respuesta.status,
    );
  }

  if (!esObjeto(contenido)) {
    throw new ErrorApi(
      "La respuesta del servidor es incorrecta.",
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
  const acumuladas: Campana[] = [];

  let pagina = 1;
  let totalPaginas = 1;

  do {
    const parametros =
      new URLSearchParams({
        pagina:
          String(pagina),

        limite:
          "100",
      });

    const resultado =
      await solicitarApi<RespuestaCampanas>(
        `${API_CAMPANAS}?${parametros.toString()}`,
        {
          signal,
        },
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
      "El selector ha alcanzado su límite de campañas. Es necesario ampliar la paginación.",
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
    case "scan":
      contenido = (
        <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4M3 12h18" />
      );
      break;

    case "camera":
      contenido = (
        <>
          <path d="M4 7h4l2-3h4l2 3h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
          <circle cx="12" cy="14" r="4" />
        </>
      );
      break;

    case "camera-off":
      contenido = (
        <>
          <path d="m3 3 18 18M9 7l1-3h4l2 3h4a2 2 0 0 1 2 2v10M5 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h13" />
        </>
      );
      break;

    case "keyboard":
      contenido = (
        <>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
        </>
      );
      break;

    case "search":
      contenido = (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 5 5" />
        </>
      );
      break;

    case "credit-card":
      contenido = (
        <>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20M6 15h5" />
        </>
      );
      break;

    case "ban":
      contenido = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m5.5 5.5 13 13" />
        </>
      );
      break;

    case "gift":
      contenido = (
        <>
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <path d="M3 12h18M12 8v13" />
          <path d="M12 8C7 8 5 6 7 4s5 1 5 4ZM12 8c5 0 7-2 5-4s-5 1-5 4Z" />
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

    case "alert":
      contenido = (
        <>
          <path d="m12 3 10 18H2L12 3Z" />
          <path d="M12 9v5M12 17h.01" />
        </>
      );
      break;

    case "refresh":
      contenido = (
        <>
          <path d="M20 11a8 8 0 1 0-2.4 6" />
          <path d="M20 4v7h-7" />
        </>
      );
      break;

    case "shield":
      contenido = (
        <>
          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      );
      break;

    case "clock":
      contenido = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
      break;

    case "close":
      contenido = (
        <path d="M5 5l14 14M19 5 5 19" />
      );
      break;

    case "arrow":
      contenido = (
        <path d="M5 12h14M13 6l6 6-6 6" />
      );
      break;

    case "ticket":
      contenido = (
        <>
          <path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4V5Z" />
          <path d="M12 5v3m0 3v2m0 3v3" />
        </>
      );
      break;

    case "info":
      contenido = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7h.01" />
        </>
      );
      break;

    case "calendar":
      contenido = (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 10h18" />
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
// INDICADOR
// ================================================

function Indicador({
  titulo,
  valor,
  icono,
}: {
  titulo: string;
  valor: number;
  icono: NombreIcono;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <p className="text-xs font-medium text-slate-500">
          {titulo}
        </p>

        <p className="mt-2 text-2xl font-bold text-[#0B1C30] sm:text-3xl">
          {formatearNumero(valor)}
        </p>
      </div>

      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#245F91]">
        <Icono nombre={icono} size={22} />
      </span>
    </div>
  );
}

// ================================================
// COMPONENTE PRINCIPAL
// ================================================

export default function EscanerCodigosPanel({
  campanaInicial,
  modoInicial = "consulta",
  onActualizado,
  permisos,
}: EscanerCodigosPanelProps) {
  const [modo, setModo] =
    useState<ModoEscaner>(
      modoInicial,
    );

  const [campanaId, setCampanaId] =
    useState(
      campanaInicial ?? "",
    );

  const [campanas, setCampanas] =
    useState<Campana[]>([]);

  const [cargandoCampanas, setCargandoCampanas] =
    useState(true);

  const [errorCampanas, setErrorCampanas] =
    useState<string | null>(null);

  const [entrada, setEntrada] =
    useState("");

  const [procesando, setProcesando] =
    useState(false);

  const [errorLectura, setErrorLectura] =
    useState<string | null>(null);

  const [resultado, setResultado] =
    useState<ResultadoEscaneo | null>(
      null,
    );

  const [mensajeCanje, setMensajeCanje] =
    useState<string | null>(
      null,
    );

  const [historial, setHistorial] =
    useState<RegistroHistorial[]>([]);

  const [canjesSesion, setCanjesSesion] =
    useState(0);

  const [confirmacionAbierta, setConfirmacionAbierta] =
    useState(false);

  const [confirmado, setConfirmado] =
    useState(false);

  const [observaciones, setObservaciones] =
    useState("");

  const [confirmandoCanje, setConfirmandoCanje] =
    useState(false);

  const [errorCanje, setErrorCanje] =
    useState<string | null>(null);

  const [camaraActiva, setCamaraActiva] =
    useState(false);

  const [camaraPreparando, setCamaraPreparando] =
    useState(false);

  const [errorCamara, setErrorCamara] =
    useState<string | null>(null);

  const [camaraPreferida, setCamaraPreferida] =
    useState<"environment" | "user">(
      "environment",
    );

  // ============================================
  // REFERENCIAS
  // ============================================

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const entradaRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const streamRef =
    useRef<MediaStream | null>(
      null,
    );

  const frameRef =
    useRef<number | null>(
      null,
    );

  const sesionCamaraRef =
    useRef(0);

  const ultimaDeteccionRef =
    useRef(0);

  const procesandoRef =
    useRef(false);

  const versionLecturaRef =
    useRef(0);

  const consecutivoRef =
    useRef(0);

  const lecturaConfirmableRef =
    useRef<LecturaConfirmable | null>(
      null,
    );

  const procesarLecturaRef =
    useRef<
      | ((
          valor: string,
          origen: OrigenLectura,
          formato?: string,
        ) => Promise<void>)
      | null
    >(null);

  // ============================================
  // PERMISOS VISUALES
  // ============================================

  const puedeEscanear =
    permisos?.escanear !== false;

  const puedeVer =
    permisos?.ver !== false;

  const puedeEditar =
    permisos?.editar !== false;

  const puedePremios =
    permisos?.premios !== false;

  const puedeCanjear =
    permisos?.canjear !== false;

  const modosPermitidos =
    useMemo(
      () => ({
        consulta:
          puedeEscanear &&
          puedeVer,

        venta:
          puedeEscanear &&
          puedeEditar,

        no_vendidos:
          puedeEscanear &&
          puedeEditar,

        premios:
          puedeEscanear &&
          puedePremios,
      }),
      [
        puedeEscanear,
        puedeVer,
        puedeEditar,
        puedePremios,
      ],
    );

  // ============================================
  // DETENER CÁMARA
  // ============================================

  const detenerCamara =
    useCallback(() => {
      /*
       * Incrementar la sesión invalida
       * cualquier lectura de cámara
       * que todavía esté pendiente.
       */

      sesionCamaraRef.current++;

      if (
        frameRef.current !== null
      ) {
        cancelAnimationFrame(
          frameRef.current,
        );

        frameRef.current = null;
      }

      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach(
            (pista) =>
              pista.stop(),
          );

        streamRef.current = null;
      }

      if (
        videoRef.current
      ) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }

      setCamaraActiva(false);
      setCamaraPreparando(false);
    }, []);

  // ============================================
  // LIMPIEZA AL DESMONTAR
  // ============================================

  useEffect(() => {
    return () => {
      sesionCamaraRef.current++;
      versionLecturaRef.current++;

      if (
        frameRef.current !== null
      ) {
        cancelAnimationFrame(
          frameRef.current,
        );
      }

      streamRef.current
        ?.getTracks()
        .forEach(
          (pista) =>
            pista.stop(),
        );

      lecturaConfirmableRef.current =
        null;
    };
  }, []);

  // ============================================
  // CARGAR CAMPAÑAS
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setCargandoCampanas(true);

    consultarCampanas(
      controlador.signal,
    )
      .then(
        (lista) => {
          if (
            controlador.signal.aborted
          ) {
            return;
          }

          setCampanas(lista);
          setErrorCampanas(null);
        },
      )
      .catch(
        (error: unknown) => {
          if (
            controlador.signal.aborted
          ) {
            return;
          }

          setErrorCampanas(
            obtenerMensajeError(error),
          );
        },
      )
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
  // SINCRONIZAR PROPIEDADES
  // ============================================

  useEffect(() => {
    setCampanaId(
      campanaInicial ?? "",
    );
  }, [campanaInicial]);

  useEffect(() => {
    setModo(modoInicial);
  }, [modoInicial]);

  // ============================================
  // INVALIDAR RESULTADOS AL CAMBIAR CONTEXTO
  // ============================================

  useEffect(() => {
    /*
     * Al cambiar de campaña o modo:
     *
     * - Cerramos la cámara.
     * - Borramos el resultado anterior.
     * - Descartamos el QR temporal.
     * - Cancelamos una confirmación
     *   que todavía no se había enviado.
     *
     * No modificamos el historial.
     */

    versionLecturaRef.current++;

    lecturaConfirmableRef.current =
      null;

    setResultado(null);
    setErrorLectura(null);
    setMensajeCanje(null);

    setConfirmacionAbierta(false);
    setConfirmado(false);
    setErrorCanje(null);

    setEntrada("");

    detenerCamara();
  }, [
    modo,
    campanaId,
    detenerCamara,
  ]);

  // ============================================
  // RESUMEN DE LA SESIÓN
  // ============================================

  const resumen =
    useMemo(() => {
      return {
        lecturas:
          historial.length,

        correctas:
          historial.filter(
            (elemento) =>
              elemento.valido,
          ).length,

        incidencias:
          historial.filter(
            (elemento) =>
              !elemento.valido,
          ).length,
      };
    }, [historial]);

  const modoActual =
    MODOS.find(
      (elemento) =>
        elemento.id === modo,
    ) ?? MODOS[0];

  const campanaSeleccionada =
    campanas.find(
      (elemento) =>
        elemento.id === campanaId,
    ) ?? null;

  const requiereCampana =
    modo === "venta" ||
    modo === "no_vendidos" ||
    modo === "premios";

  const contextoValido =
    modosPermitidos[modo] &&
    (
      !requiereCampana ||
      Boolean(campanaId)
    );

  // ============================================
  // PROCESAR LECTURA
  // ============================================

  const procesarLectura =
    useCallback(
      async (
        valorOriginal: string,
        origen: OrigenLectura,
        formato?: string,
      ) => {
        const valor =
          valorOriginal.trim();

        if (
          procesandoRef.current ||
          confirmandoCanje
        ) {
          return;
        }

        if (
          !modosPermitidos[modo]
        ) {
          setErrorLectura(
            "No tienes acceso a este modo del escáner.",
          );

          return;
        }

        if (
          requiereCampana &&
          !campanaId
        ) {
          setErrorLectura(
            "Selecciona una campaña antes de escanear.",
          );

          return;
        }

        if (
          !valor ||
          valor.length >
            MAXIMO_LONGITUD_LECTURA
        ) {
          setErrorLectura(
            "Introduce una lectura válida de hasta 2048 caracteres.",
          );

          return;
        }

        /*
         * Nunca guardamos el QR
         * original en el historial.
         */

        lecturaConfirmableRef.current =
          null;

        setResultado(null);
        setMensajeCanje(null);
        setErrorLectura(null);

        setConfirmacionAbierta(false);
        setConfirmado(false);
        setErrorCanje(null);

        /*
         * Borramos el campo visible
         * para no mantener tokens QR
         * en el formulario.
         */

        setEntrada("");

        const version =
          ++versionLecturaRef.current;

        procesandoRef.current =
          true;

        setProcesando(true);

        try {
          const respuesta =
            await solicitarApi<RespuestaEscaneo>(
              API_ESCANEAR,
              {
                metodo: "POST",

                datos: {
                  modo,

                  ...(campanaId
                    ? {
                        campanaId,
                      }
                    : {}),

                  codigo:
                    valor,
                },
              },
            );

          if (
            version !==
            versionLecturaRef.current
          ) {
            return;
          }

         if (
            !respuesta ||
            !esObjeto(
                respuesta.resultado,
            )
            ) {
            throw new Error(
                "El resultado del escaneo no tiene el formato esperado.",
            );
            }

            const obtenido =
            respuesta.resultado as ResultadoEscaneo;

          setResultado(
            obtenido,
          );

          /*
           * Guardamos la lectura
           * original solo si existe
           * un premio confirmable.
           *
           * La información se mantiene
           * únicamente en una referencia
           * de memoria temporal.
           */

          const codigoVisible =
            obtenido.codigo
              ?.codigoVisible;

          if (
            modo === "premios" &&
            obtenido.valido === true &&
            obtenido.requiereConfirmacion ===
              true &&
            obtenido.premio
              ?.tipoResultado === "premio" &&
            typeof codigoVisible ===
              "string"
          ) {
            const qr =
              esLecturaQr(
                valor,
                formato,
              );

            lecturaConfirmableRef.current =
              {
                codigoVisible,

                metodo:
                  qr
                    ? "qr"
                    : "manual",

                lecturaQr:
                  qr
                    ? valor
                    : null,
              };
          }

          /*
           * El historial conserva
           * exclusivamente información
           * administrativa.
           */

          const registro:
            RegistroHistorial = {
              id:
                ++consecutivoRef.current,

              codigoVisible:
                obtenido.codigo
                  ?.codigoVisible ??
                "No identificado",

              modo,

              valido:
                obtenido.valido ===
                true,

              mensaje:
                obtenido.mensaje ??
                "Escaneo procesado.",

              fecha:
                new Date(),

              canjeConfirmado:
                false,
            };

          setHistorial(
            (anterior) => [
              registro,
              ...anterior,
            ].slice(
              0,
              MAXIMO_HISTORIAL,
            ),
          );

          if (
            origen === "entrada"
          ) {
            entradaRef.current
              ?.focus();
          }

          /*
           * Las acciones de venta
           * modifican el servidor.
           *
           * Las consultas y lecturas
           * de premios son de solo
           * lectura.
           */

          if (
            modo === "venta" ||
            modo === "no_vendidos"
          ) {
            onActualizado?.();
          }
        } catch (error) {
          if (
            version !==
            versionLecturaRef.current
          ) {
            return;
          }

          setErrorLectura(
            obtenerMensajeError(
              error,
            ),
          );
        } finally {
          procesandoRef.current =
            false;

          setProcesando(false);
        }
      },
      [
        modo,
        campanaId,
        requiereCampana,
        modosPermitidos,
        confirmandoCanje,
        onActualizado,
      ],
    );

  // ============================================
  // REFERENCIA ESTABLE PARA CÁMARA
  // ============================================

  useEffect(() => {
    procesarLecturaRef.current =
      procesarLectura;
  }, [procesarLectura]);

  // ============================================
  // ENTRADA MANUAL O LECTOR EXTERNO
  // ============================================

  function enviarLectura(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (
      procesando ||
      confirmandoCanje
    ) {
      return;
    }

    void procesarLectura(
      entrada,
      "entrada",
    );
  }

  // ============================================
  // INICIAR CÁMARA
  // ============================================

  async function iniciarCamara() {
    if (
      camaraActiva ||
      camaraPreparando ||
      procesando ||
      !contextoValido
    ) {
      return;
    }

    setErrorCamara(null);

    /*
     * BarcodeDetector es una API
     * nativa del navegador.
     *
     * No instalamos dependencias
     * ni enviamos imágenes a servidores.
     */

    const navegador =
      window as Window &
        NavegadorDetector;

    const Constructor =
      navegador.BarcodeDetector;

    if (!Constructor) {
      setErrorCamara(
        "Este navegador no dispone de detección nativa de QR y códigos de barras. Utiliza un lector USB/Bluetooth, introduce el código manualmente o abre la página en un navegador compatible.",
      );

      return;
    }

    if (
      !window.isSecureContext ||
      !navigator.mediaDevices
        ?.getUserMedia
    ) {
      setErrorCamara(
        "Para utilizar la cámara necesitas acceder mediante HTTPS y permitir su uso en el navegador.",
      );

      return;
    }

    detenerCamara();

    const sesion =
      ++sesionCamaraRef.current;

    setCamaraPreparando(true);

    try {
      let formatos =
        FORMATOS_DETECTOR;

      if (
        Constructor.getSupportedFormats
      ) {
        const soportados =
          await Constructor.getSupportedFormats();

        formatos =
          FORMATOS_DETECTOR.filter(
            (formato) =>
              soportados.includes(
                formato,
              ),
          );

        if (
          formatos.length === 0
        ) {
          throw new Error(
            "El navegador no admite ninguno de los formatos de lectura necesarios.",
          );
        }
      }

      if (
        sesion !==
        sesionCamaraRef.current
      ) {
        return;
      }

      const detector =
        new Constructor({
          formats:
            formatos,
        });

      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: false,

            video: {
              facingMode: {
                ideal:
                  camaraPreferida,
              },

              width: {
                ideal: 1280,
              },

              height: {
                ideal: 720,
              },
            },
          });

      if (
        sesion !==
        sesionCamaraRef.current
      ) {
        stream
          .getTracks()
          .forEach(
            (pista) =>
              pista.stop(),
          );

        return;
      }

      streamRef.current =
        stream;

      const video =
        videoRef.current;

      if (!video) {
        throw new Error(
          "No se ha encontrado el visor de la cámara.",
        );
      }

      video.srcObject =
        stream;

      await video.play();

      if (
        sesion !==
        sesionCamaraRef.current
      ) {
        return;
      }

      setCamaraActiva(true);
      setCamaraPreparando(false);

      ultimaDeteccionRef.current =
        0;

      /*
       * Analizamos un fotograma
       * cada cierto intervalo.
       *
       * Al detectar un código,
       * detenemos la cámara para
       * evitar escaneos duplicados.
       */

      const analizar =
        async () => {
          if (
            sesion !==
            sesionCamaraRef.current
          ) {
            return;
          }

          const elemento =
            videoRef.current;

          const ahora =
            performance.now();

          if (
            elemento &&
            elemento.readyState >= 2 &&
            ahora -
              ultimaDeteccionRef.current >=
              INTERVALO_DETECCION_MS
          ) {
            ultimaDeteccionRef.current =
              ahora;

            try {
              const detecciones =
                await detector.detect(
                  elemento,
                );

              if (
                sesion !==
                sesionCamaraRef.current
              ) {
                return;
              }

              const primera =
                detecciones.find(
                  (deteccion) =>
                    typeof deteccion.rawValue ===
                      "string" &&
                    deteccion.rawValue.trim()
                      .length > 0,
                );

              if (primera) {
                /*
                 * Un único boleto por
                 * sesión de cámara.
                 */

                const valor =
                  primera.rawValue;

                const formato =
                  primera.format;

                detenerCamara();

                void procesarLecturaRef
                  .current?.(
                    valor,
                    "camara",
                    formato,
                  );

                return;
              }
            } catch {
              detenerCamara();

              setErrorCamara(
                "No se ha podido procesar la imagen de la cámara. Puedes utilizar la entrada manual o un lector externo.",
              );

              return;
            }
          }

          if (
            sesion ===
            sesionCamaraRef.current
          ) {
            frameRef.current =
              requestAnimationFrame(
                () => {
                  void analizar();
                },
              );
          }
        };

      frameRef.current =
        requestAnimationFrame(
          () => {
            void analizar();
          },
        );
    } catch (error) {
      if (
        sesion !==
        sesionCamaraRef.current
      ) {
        return;
      }

      detenerCamara();

      const nombre =
        error instanceof Error
          ? error.name
          : "";

      if (
        nombre === "NotAllowedError" ||
        nombre === "PermissionDeniedError"
      ) {
        setErrorCamara(
          "Se ha denegado el acceso a la cámara. Permite su uso desde los ajustes del navegador.",
        );
      } else if (
        nombre === "NotFoundError"
      ) {
        setErrorCamara(
          "No se ha encontrado ninguna cámara disponible.",
        );
      } else {
        setErrorCamara(
          obtenerMensajeError(
            error,
          ),
        );
      }
    }
  }

  // ============================================
  // CAMBIAR MODO
  // ============================================

  function cambiarModo(
    siguiente: ModoEscaner,
  ) {
    if (
      procesando ||
      confirmandoCanje ||
      !modosPermitidos[siguiente]
    ) {
      return;
    }

    setModo(
      siguiente,
    );
  }

  // ============================================
  // PREPARAR CONFIRMACIÓN DE CANJE
  // ============================================

  const permiteConfirmarCanje =
    modo === "premios" &&
    puedeCanjear &&
    resultado?.valido === true &&
    resultado.requiereConfirmacion ===
      true &&
    resultado.premio
      ?.tipoResultado ===
      "premio" &&
    resultado.entregado !== true &&
    resultado.tieneHistorialCanje !==
      true &&
    lecturaConfirmableRef.current !==
      null;

  function abrirConfirmacionCanje() {
    if (
      !permiteConfirmarCanje ||
      procesando ||
      confirmandoCanje
    ) {
      return;
    }

    detenerCamara();

    setConfirmado(false);
    setObservaciones("");
    setErrorCanje(null);

    setConfirmacionAbierta(true);
  }

  function cerrarConfirmacionCanje() {
    if (confirmandoCanje) {
      return;
    }

    setConfirmacionAbierta(false);
    setConfirmado(false);
    setErrorCanje(null);
  }

  // ============================================
  // CONFIRMAR ENTREGA DE PREMIO
  // ============================================

  async function confirmarCanje() {
    const lectura =
      lecturaConfirmableRef.current;

    if (
      !confirmacionAbierta ||
      !confirmado ||
      !lectura ||
      !permiteConfirmarCanje ||
      confirmandoCanje
    ) {
      return;
    }

    if (
      observaciones.length > 500
    ) {
      setErrorCanje(
        "Las observaciones son demasiado largas.",
      );

      return;
    }

    setConfirmandoCanje(true);
    setErrorCanje(null);

    try {
      /*
       * El método QR necesita
       * la lectura original.
       *
       * En el método manual solo
       * se envía el código visible.
       */

      const respuesta =
        await solicitarApi<RespuestaCanje>(
          API_CANJES,
          {
            metodo: "POST",

            datos: {
              codigoVisible:
                lectura.codigoVisible,

              metodo:
                lectura.metodo,

              ...(lectura.metodo ===
                "qr"
                ? {
                    lecturaQr:
                      lectura.lecturaQr,
                  }
                : {}),

              observaciones:
                observaciones.trim() ||
                null,

              confirmado: true,
            },
          },
        );

      if (
        respuesta.entregado !==
        true
      ) {
        throw new Error(
          "El servidor no ha confirmado la entrega. Comprueba el historial antes de reintentar.",
        );
      }

      /*
       * Solamente después de recibir
       * confirmación del servidor
       * mostramos la entrega.
       */

      lecturaConfirmableRef.current =
        null;

      setResultado(
        (anterior) =>
          anterior
            ? {
                ...anterior,

                valido: false,

                motivo:
                  "ya_entregado",

                mensaje:
                  "Premio entregado y registrado correctamente.",

                entregado: true,

                tieneHistorialCanje:
                  true,

                requiereConfirmacion:
                  false,
              }
            : anterior,
      );

      setHistorial(
        (anterior) =>
          anterior.map(
            (registro) => {
              if (
                registro.codigoVisible !==
                lectura.codigoVisible ||
                registro.modo !==
                  "premios" ||
                registro.canjeConfirmado
              ) {
                return registro;
              }

              return {
                ...registro,

                canjeConfirmado:
                  true,

                mensaje:
                  "Premio entregado",
              };
            },
          ),
      );

      setCanjesSesion(
        (anterior) =>
          anterior + 1,
      );

      setMensajeCanje(
        respuesta.mensaje ??
          "La entrega del premio se ha registrado correctamente.",
      );

      setConfirmacionAbierta(false);
      setConfirmado(false);
      setObservaciones("");

      onActualizado?.();
    } catch (error) {
      /*
       * No se reintenta de forma
       * automática una entrega:
       * podría haberse aplicado
       * antes de perder la conexión.
       */

      setErrorCanje(
        `${obtenerMensajeError(error)} Comprueba el estado del boleto antes de repetir la entrega.`,
      );
    } finally {
      setConfirmandoCanje(false);
    }
  }

  // ============================================
  // LIMPIAR RESULTADO
  // ============================================

  function limpiarResultado() {
    if (
      procesando ||
      confirmandoCanje
    ) {
      return;
    }

    versionLecturaRef.current++;

    lecturaConfirmableRef.current =
      null;

    setResultado(null);
    setErrorLectura(null);
    setMensajeCanje(null);

    setEntrada("");

    entradaRef.current
      ?.focus();
  }

  // ============================================
  // COMPONENTES DE RESULTADO
  // ============================================

  function mostrarResultado() {
    if (procesando) {
      return (
        <div
          role="status"
          className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center"
        >
          <Icono
            nombre="refresh"
            size={34}
            className="animate-spin text-[#245F91]"
          />

          <h3 className="mt-4 text-base font-bold">
            Comprobando boleto
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Consultando la información
            protegida del servidor.
          </p>
        </div>
      );
    }

    if (mensajeCanje) {
      return (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6"
        >
          <Icono
            nombre="check"
            size={35}
            className="text-emerald-700"
          />

          <h3 className="mt-3 text-lg font-bold text-emerald-900">
            Premio entregado
          </h3>

          <p className="mt-2 text-sm leading-6 text-emerald-800">
            {mensajeCanje}
          </p>

          <p className="mt-3 font-mono text-xs text-emerald-800">
            {resultado?.codigo
              ?.codigoVisible}
          </p>

          <button
            type="button"
            onClick={limpiarResultado}
            className="mt-5 rounded-xl bg-[#0B1C30] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#18385D]"
          >
            Escanear otro boleto
          </button>
        </div>
      );
    }

    if (errorLectura) {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6"
        >
          <Icono
            nombre="alert"
            size={34}
            className="text-red-600"
          />

          <h3 className="mt-3 text-lg font-bold text-red-800">
            No se ha podido escanear
          </h3>

          <p className="mt-2 text-sm leading-6 text-red-700">
            {errorLectura}
          </p>

          <button
            type="button"
            onClick={limpiarResultado}
            className="mt-5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Volver a intentar
          </button>
        </div>
      );
    }

    if (!resultado) {
      return (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF5FA] text-[#245F91]">
            <Icono
              nombre="scan"
              size={31}
            />
          </span>

          <h3 className="mt-4 text-base font-bold">
            Esperando lectura
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Utiliza la cámara, un lector
            USB/Bluetooth o introduce
            el código manualmente.
          </p>
        </div>
      );
    }

    const correcto =
      resultado.valido === true;

    const premio =
      resultado.premio;

    const conPremio =
      modo === "premios" &&
      premio?.tipoResultado ===
        "premio";

    const sinPremio =
      modo === "premios" &&
      premio?.tipoResultado ===
        "sin_premio";

    return (
      <div
        role="status"
        className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
          correcto
            ? "border-emerald-200"
            : "border-amber-200"
        }`}
      >
        <div
          className={`flex items-start gap-3 p-5 ${
            correcto
              ? "bg-emerald-50"
              : "bg-amber-50"
          }`}
        >
          <Icono
            nombre={
              correcto
                ? "check"
                : "alert"
            }
            size={26}
            className={
              correcto
                ? "shrink-0 text-emerald-700"
                : "shrink-0 text-amber-700"
            }
          />

          <div className="min-w-0">
            <h3
              className={`text-base font-bold ${
                correcto
                  ? "text-emerald-900"
                  : "text-amber-900"
              }`}
            >
              {correcto
                ? "Lectura completada"
                : "Boleto no disponible"}
            </h3>

            <p
              className={`mt-1 text-sm leading-6 ${
                correcto
                  ? "text-emerald-800"
                  : "text-amber-800"
              }`}
            >
              {resultado.mensaje ??
                "Escaneo procesado."}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {resultado.codigo
            ?.codigoVisible && (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Código del boleto
              </p>

              <p className="mt-2 break-all font-mono text-sm font-bold text-[#0B1C30]">
                {
                  resultado.codigo
                    .codigoVisible
                }
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[11px] text-slate-500">
                Estado de venta
              </p>

              <p className="mt-1 text-sm font-semibold">
                {textoEstado(
                  resultado.estadoActual ??
                  resultado.codigo
                    ?.estadoVenta,
                )}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[11px] text-slate-500">
                Estado del boleto
              </p>

              <p className="mt-1 text-sm font-semibold">
                {textoEstado(
                  resultado.codigo
                    ?.estadoRegistro,
                )}
              </p>
            </div>
          </div>

          {conPremio && (
            <div className="rounded-xl border border-[#E8D68C] bg-[#FFF9DF] p-5">
              <div className="flex items-center gap-2 text-[#8B690B]">
                <Icono
                  nombre="gift"
                  size={23}
                />

                <h4 className="font-bold">
                  Boleto premiado
                </h4>
              </div>

              <p className="mt-3 text-lg font-bold text-[#0B1C30]">
                {premio.nombreArticulo ??
                  "Premio registrado"}
              </p>

              {premio.descripcionArticulo && (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {premio.descripcionArticulo}
                </p>
              )}

              {resultado.entregado ||
              resultado.tieneHistorialCanje ? (
                <p className="mt-4 rounded-lg bg-white/80 p-3 text-xs font-semibold text-amber-900">
                  Este boleto tiene un canje
                  anterior o requiere revisión.
                  No puede entregarse desde
                  esta pantalla.
                </p>
              ) : permiteConfirmarCanje ? (
                <button
                  type="button"
                  onClick={abrirConfirmacionCanje}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1C30] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#18385D]"
                >
                  <Icono
                    nombre="gift"
                    size={18}
                  />

                  Confirmar entrega
                </button>
              ) : correcto ? (
                <p className="mt-4 text-xs leading-5 text-slate-600">
                  No se puede confirmar
                  la entrega con esta lectura
                  o con los permisos actuales.
                </p>
              ) : null}
            </div>
          )}

          {sinPremio && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
              <Icono
                nombre="ticket"
                size={28}
                className="mx-auto text-slate-500"
              />

              <p className="mt-3 text-base font-bold">
                Boleto sin premio
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                No hay ningún artículo
                que entregar.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={limpiarResultado}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold transition-colors hover:bg-slate-50"
          >
            <Icono
              nombre="refresh"
              size={17}
            />

            Nueva lectura
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  return (
    <div className="space-y-6 text-[#0B1C30]">
      {/* CABECERA */}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#0B1C30] text-[#F2C94C]">
            <Icono
              nombre="scan"
              size={28}
            />
          </span>

          <div>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">
              Escáner de códigos
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Lee boletos, registra ventas
              y confirma entregas de premios.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-[#EFF5FA] px-3 py-2 text-xs font-semibold text-[#245F91]">
          <Icono
            nombre="shield"
            size={16}
          />

          Acceso protegido
        </div>
      </section>

      {/* INDICADORES DE SESIÓN */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          titulo="Lecturas recientes"
          valor={resumen.lecturas}
          icono="scan"
        />

        <Indicador
          titulo="Válidas"
          valor={resumen.correctas}
          icono="check"
        />

        <Indicador
          titulo="Incidencias"
          valor={resumen.incidencias}
          icono="alert"
        />

        <Indicador
          titulo="Premios entregados"
          valor={canjesSesion}
          icono="gift"
        />
      </div>

      {/* MODOS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-bold">
          Modo de escaneo
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Selecciona qué quieres hacer
          con cada boleto.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {MODOS.map(
            (elemento) => {
              const activo =
                elemento.id === modo;

              const autorizado =
                modosPermitidos[
                  elemento.id
                ];

              return (
                <button
                  key={elemento.id}
                  type="button"
                  disabled={
                    !autorizado ||
                    procesando ||
                    confirmandoCanje
                  }
                  aria-pressed={activo}
                  onClick={() =>
                    cambiarModo(
                      elemento.id,
                    )
                  }
                  className={`flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    activo
                      ? "border-[#0B1C30] bg-[#0B1C30] text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-[#EFF5FA]"
                  }`}
                >
                  <Icono
                    nombre={elemento.icono}
                    size={23}
                    className={
                      activo
                        ? "text-[#F2C94C]"
                        : "text-[#245F91]"
                    }
                  />

                  <span className="text-sm font-semibold">
                    {elemento.nombre}
                  </span>

                  <span
                    className={`text-[11px] leading-4 ${
                      activo
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    {elemento.descripcion}
                  </span>
                </button>
              );
            },
          )}
        </div>
      </section>

      {/* CAMPAÑA */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Icono
              nombre="calendar"
              size={21}
              className="text-[#245F91]"
            />

            <div>
              <h3 className="text-sm font-bold">
                Campaña
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {requiereCampana
                  ? "Obligatoria para este modo"
                  : "Opcional en el modo consulta"}
              </p>
            </div>
          </div>

          {campanaSeleccionada && (
            <span className="rounded-full bg-[#EFF5FA] px-3 py-1.5 text-xs font-semibold text-[#245F91]">
              {campanaSeleccionada.estado}
            </span>
          )}
        </div>

        <select
          aria-label="Seleccionar campaña"
          value={campanaId}
          disabled={
            cargandoCampanas ||
            procesando ||
            confirmandoCanje
          }
          onChange={(evento) =>
            setCampanaId(
              evento.target.value,
            )
          }
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-[#245F91] focus:bg-white disabled:opacity-50"
        >
          <option value="">
            {requiereCampana
              ? "Selecciona una campaña"
              : "Todas las campañas"}
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

        {errorCampanas && (
          <p
            role="alert"
            className="mt-3 text-xs text-red-700"
          >
            {errorCampanas}
          </p>
        )}

        {requiereCampana &&
          !campanaId && (
            <p className="mt-3 text-xs text-amber-700">
              Selecciona una campaña
              para habilitar la lectura.
            </p>
          )}
      </section>

      {/* ESCÁNER Y RESULTADO */}

      <div className="grid items-start gap-5 xl:grid-cols-2">
        {/* LECTURA */}

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div>
            <h3 className="text-base font-bold">
              Leer boleto
            </h3>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              {modoActual.descripcion}
            </p>
          </div>

          {/* CÁMARA */}

          <div className="overflow-hidden rounded-xl bg-[#0B1C30]">
            <div className="relative aspect-video overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${
                  camaraActiva ||
                  camaraPreparando
                    ? "block"
                    : "hidden"
                }`}
              />

              {!camaraActiva &&
                !camaraPreparando && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                    <Icono
                      nombre="camera"
                      size={39}
                      className="text-[#F2C94C]"
                    />

                    <p className="mt-4 text-sm font-semibold">
                      Cámara desactivada
                    </p>

                    <p className="mt-2 max-w-xs text-xs leading-5 text-slate-300">
                      Iníciala para detectar
                      códigos QR y de barras.
                    </p>
                  </div>
                )}

              {camaraPreparando && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0B1C30]/50">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Icono
                      nombre="refresh"
                      size={20}
                      className="animate-spin"
                    />

                    Preparando cámara...
                  </span>
                </div>
              )}

              {camaraActiva && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-10">
                  <div className="h-3/5 w-3/4 rounded-xl border-2 border-[#F2C94C] shadow-[0_0_0_999px_rgba(0,0,0,0.15)]" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-3 sm:p-4">
              <select
                aria-label="Cámara preferida"
                value={camaraPreferida}
                disabled={
                  camaraActiva ||
                  camaraPreparando
                }
                onChange={(evento) =>
                  setCamaraPreferida(
                    evento.target.value as
                      "environment" | "user",
                  )
                }
                className="rounded-lg border border-white/20 bg-[#18385D] px-3 py-2 text-xs text-white outline-none"
              >
                <option value="environment">
                  Cámara trasera
                </option>

                <option value="user">
                  Cámara frontal
                </option>
              </select>

              {camaraActiva ||
              camaraPreparando ? (
                <button
                  type="button"
                  onClick={detenerCamara}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <Icono
                    nombre="camera-off"
                    size={17}
                  />

                  Detener
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    !contextoValido ||
                    procesando ||
                    confirmandoCanje
                  }
                  onClick={() =>
                    void iniciarCamara()
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F2C94C] px-4 py-2.5 text-xs font-bold text-[#0B1C30] hover:bg-[#FFDA72] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icono
                    nombre="camera"
                    size={17}
                  />

                  Iniciar cámara
                </button>
              )}
            </div>
          </div>

          {errorCamara && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"
            >
              {errorCamara}
            </div>
          )}

          {camaraActiva && (
            <p className="text-xs text-slate-500">
              Coloca el código dentro
              del recuadro. La cámara
              se detendrá al detectar
              un boleto para evitar
              lecturas repetidas.
            </p>
          )}

          {/* ENTRADA MANUAL */}

          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center gap-3">
              <Icono
                nombre="keyboard"
                size={21}
                className="text-[#245F91]"
              />

              <div>
                <h4 className="text-sm font-bold">
                  Lector externo o entrada manual
                </h4>

                <p className="mt-1 text-xs text-slate-500">
                  Compatible con lectores
                  que introducen texto
                  y pulsan Intro.
                </p>
              </div>
            </div>

            <form
              onSubmit={enviarLectura}
              className="mt-4 space-y-3"
            >
              <input
                ref={entradaRef}
                type="text"
                value={entrada}
                maxLength={
                  MAXIMO_LONGITUD_LECTURA
                }
                disabled={
                  !contextoValido ||
                  procesando ||
                  confirmandoCanje
                }
                onChange={(evento) =>
                  setEntrada(
                    evento.target.value,
                  )
                }
                placeholder="Código visible o lectura QR..."
                aria-label="Código del boleto"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none transition-colors placeholder:font-sans placeholder:text-slate-400 focus:border-[#245F91] focus:bg-white disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={
                  !contextoValido ||
                  !entrada.trim() ||
                  procesando ||
                  confirmandoCanje
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1C30] px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#18385D] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icono
                  nombre={
                    procesando
                      ? "refresh"
                      : "scan"
                  }
                  size={19}
                  className={
                    procesando
                      ? "animate-spin"
                      : ""
                  }
                />

                {procesando
                  ? "Procesando..."
                  : "Procesar lectura"}
              </button>
            </form>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-[#EFF5FA] p-4">
            <Icono
              nombre="info"
              size={19}
              className="mt-0.5 shrink-0 text-[#245F91]"
            />

            <p className="text-xs leading-6 text-[#355A78]">
              Para usar la cámara es
              necesario HTTPS y un
              navegador compatible con
              detección nativa. Si no
              está disponible, podrás
              seguir utilizando el
              lector externo y la
              entrada manual.
            </p>
          </div>
        </section>

        {/* RESULTADO */}

        <section className="space-y-4">
          <div>
            <h3 className="text-base font-bold">
              Resultado
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Información del último
              boleto procesado.
            </p>
          </div>

          {mostrarResultado()}
        </section>
      </div>

      {/* HISTORIAL DE SESIÓN */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">
              Actividad reciente
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Últimos escaneos de esta
              sesión de pantalla.
            </p>
          </div>

          {historial.length > 0 && (
            <button
              type="button"
              disabled={procesando}
              onClick={() => {
                setHistorial([]);
                setCanjesSesion(0);
              }}
              className="text-xs font-semibold text-[#245F91] hover:underline disabled:opacity-40"
            >
              Limpiar actividad
            </button>
          )}
        </div>

        {historial.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
            <Icono
              nombre="clock"
              size={26}
              className="mx-auto text-slate-400"
            />

            <p className="mt-3 text-sm text-slate-500">
              Todavía no hay escaneos
              en esta sesión.
            </p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {historial.map(
              (registro) => (
                <div
                  key={registro.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        registro.canjeConfirmado ||
                        registro.valido
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      <Icono
                        nombre={
                          registro.canjeConfirmado ||
                          registro.valido
                            ? "check"
                            : "alert"
                        }
                        size={18}
                      />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold">
                        {registro.codigoVisible}
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {registro.mensaje}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold text-[#245F91]">
                      {MODOS.find(
                        (elemento) =>
                          elemento.id ===
                          registro.modo,
                      )?.nombre}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatearHora(
                        registro.fecha,
                      )}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-400">
          Este historial es temporal.
          No contiene tokens QR ni sustituye
          a los movimientos registrados
          en Supabase.
        </p>
      </section>

      {/* SEGURIDAD */}

      <div className="flex items-start gap-3 rounded-2xl border border-[#D7E7F4] bg-[#EFF5FA] p-4 sm:p-5">
        <Icono
          nombre="shield"
          size={23}
          className="mt-0.5 shrink-0 text-[#245F91]"
        />

        <p className="text-xs leading-6 text-[#355A78] sm:text-sm">
          Las consultas de premios requieren
          autorización específica.
          La entrega de un premio nunca
          se registra automáticamente
          al escanear. El operador debe
          confirmar el canje y el servidor
          debe comprobar nuevamente el
          boleto, la campaña y su historial.
        </p>
      </div>

      {/* ===================================== */}
      {/* MODAL DE CONFIRMACIÓN DE CANJE */}
      {/* ===================================== */}

      {confirmacionAbierta &&
        resultado?.premio && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0B1C30]/70 p-3 backdrop-blur-[3px] sm:p-6">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-canje"
            aria-describedby="descripcion-confirmar-canje"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF6D6] text-[#99700D]">
              <Icono
                nombre="gift"
                size={28}
              />
            </div>

            <h2
              id="titulo-confirmar-canje"
              className="mt-5 text-xl font-bold"
            >
              Confirmar entrega de premio
            </h2>

            <p
              id="descripcion-confirmar-canje"
              className="mt-3 text-sm leading-6 text-slate-600"
            >
              Comprueba que el boleto
              es correcto y que el
              artículo se ha entregado
              físicamente antes de
              confirmar esta operación.
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold text-slate-500">
                BOLETO
              </p>

              <p className="mt-2 break-all font-mono text-xs font-bold">
                {resultado.codigo
                  ?.codigoVisible}
              </p>

              <p className="mt-4 text-[11px] font-semibold text-slate-500">
                PREMIO
              </p>

              <p className="mt-2 text-base font-bold">
                {resultado.premio
                  .nombreArticulo ??
                  "Premio registrado"}
              </p>

              <p className="mt-3 text-xs text-slate-500">
                Método de comprobación:{" "}
                <strong>
                  {lecturaConfirmableRef
                    .current?.metodo ===
                    "qr"
                    ? "Código QR"
                    : "Código visible / manual"}
                </strong>
              </p>
            </div>

            <div className="mt-5 space-y-2">
              <label
                htmlFor="canje-observaciones"
                className="block text-sm font-semibold"
              >
                Observaciones (opcional)
              </label>

              <textarea
                id="canje-observaciones"
                rows={3}
                maxLength={500}
                value={observaciones}
                disabled={confirmandoCanje}
                onChange={(evento) =>
                  setObservaciones(
                    evento.target.value,
                  )
                }
                placeholder="Información adicional sobre la entrega..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white disabled:opacity-50"
              />
            </div>

            {errorCanje && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <p className="text-xs leading-6 text-red-700">
                  {errorCanje}
                </p>
              </div>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8D68C] bg-[#FFF9DF] p-4">
              <input
                type="checkbox"
                checked={confirmado}
                disabled={confirmandoCanje}
                onChange={(evento) =>
                  setConfirmado(
                    evento.target.checked,
                  )
                }
                className="mt-1 h-4 w-4 shrink-0 accent-[#0B1C30]"
              />

              <span className="text-xs font-medium leading-6 text-[#765F18]">
                Confirmo que he comprobado
                el boleto y entregado
                físicamente el premio
                indicado. Quiero registrar
                esta entrega en el sistema.
              </span>
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
              <button
                type="button"
                disabled={confirmandoCanje}
                onClick={cerrarConfirmacionCanje}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  !confirmado ||
                  confirmandoCanje
                }
                onClick={() =>
                  void confirmarCanje()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B1C30] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#18385D] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icono
                  nombre={
                    confirmandoCanje
                      ? "refresh"
                      : "check"
                  }
                  size={18}
                  className={
                    confirmandoCanje
                      ? "animate-spin"
                      : ""
                  }
                />

                {confirmandoCanje
                  ? "Registrando..."
                  : "Confirmar entrega"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export {
  EscanerCodigosPanel,
};
