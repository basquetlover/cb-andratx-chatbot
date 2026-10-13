
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

/*
 * C.B. ANDRATX
 * Generador visual de lotes.
 *
 * Archivo 20/27.
 *
 * Funcionalidades:
 *
 * - Seleccionar campaña.
 * - Consultar artículos activos.
 * - Añadir diferentes premios.
 * - Configurar cantidades.
 * - Añadir boletos sin premio.
 * - Calcular totales y porcentajes.
 * - Comprobar límites.
 * - Generar lotes mediante API.
 * - Mantener clave de idempotencia.
 * - Consultar lotes recientes.
 *
 * No genera códigos en el navegador.
 * No descifra resultados.
 * No revela premios individuales.
 */

export interface GeneradorLotesCodigosPanelProps {
  onActualizado?: () => void;

  permisos?: {
    crear?: boolean;
  };
}

// ================================================
// TIPOS
// ================================================

interface Campana {
  id: string;
  nombre: string;
  estado: "borrador" | "activa" | "finalizada";
}

interface Articulo {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  activo: boolean;
}

interface Lote {
  id: string;
  campanaId: string;
  nombre: string;
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
}

interface LoteGenerado {
  id: string;
  nombre?: string;
  cantidadTotal?: number;
  estado?: string;
}

interface RespuestaGeneracion {
  lote: LoteGenerado;
  cantidadGenerada?: number;
  codigosVisibles?: string[];
}

interface RespuestaApi<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}

interface PremioSeleccionado {
  articuloId: string;
  cantidad: string;
}

interface LineaGeneracion {
  articuloId: string | null;
  tipoResultado: "premio" | "sin_premio";
  cantidad: number;
}

interface SolicitudGeneracion {
  campanaId: string;
  plantillaId: null;
  nombre: string;
  descripcion: string | null;
  claveOperacion: string;
  articulos: LineaGeneracion[];
}

interface Mensaje {
  tipo: "exito" | "error" | "aviso";
  texto: string;
}

type NombreIcono =
  | "caja"
  | "regalo"
  | "mas"
  | "menos"
  | "actualizar"
  | "check"
  | "alerta"
  | "calendario"
  | "flecha"
  | "reloj"
  | "info"
  | "copiar"
  | "escudo";

// ================================================
// CONFIGURACIÓN
// ================================================

const API_CAMPANAS =
  "/api/panel/codigos/campanas";

const API_ARTICULOS =
  "/api/panel/codigos/articulos";

const API_LOTES =
  "/api/panel/codigos/lotes";

const MAXIMO_BOLETOS = 500;

const MAXIMO_PAGINAS_CAMPANAS = 30;

const LIMITE_LOTES_RECIENTES = 8;

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

function obtenerMensajeError(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : "Se ha producido un error inesperado.";
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
    respuesta = await fetch(ruta, {
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
    });
  } catch {
    throw new ErrorApi(
      "No se ha podido establecer la conexión con el servidor.",
      0,
    );
  }

  let contenido: RespuestaApi<T>;

  try {
    contenido =
      (await respuesta.json()) as
        RespuestaApi<T>;
  } catch {
    throw new ErrorApi(
      "El servidor no ha devuelto una respuesta válida.",
      respuesta.status,
    );
  }

  if (
    !respuesta.ok ||
    contenido?.ok !== true ||
    contenido.data === null ||
    contenido.data === undefined
  ) {
    throw new ErrorApi(
      contenido?.error ??
        "No se ha podido completar la operación.",
      respuesta.status,
    );
  }

  return contenido.data;
}

// ================================================
// CONSULTAR TODAS LAS CAMPAÑAS
// ================================================

async function cargarCampanas(
  signal: AbortSignal,
): Promise<{
  campanas: Campana[];
  incompleto: boolean;
}> {
  const todas: Campana[] = [];

  let pagina = 1;
  let totalPaginas = 1;

  while (
    pagina <= totalPaginas &&
    pagina <= MAXIMO_PAGINAS_CAMPANAS
  ) {
    const parametros =
      new URLSearchParams({
        pagina: String(pagina),
        limite: "100",
      });

    const resultado =
      await solicitarApi<RespuestaCampanas>(
        `${API_CAMPANAS}?${parametros}`,
        { signal },
      );

    todas.push(
      ...resultado.campanas,
    );

    totalPaginas =
      Math.max(
        1,
        resultado.totalPaginas,
      );

    pagina++;
  }

  return {
    campanas: todas,

    incompleto:
      totalPaginas >
      MAXIMO_PAGINAS_CAMPANAS,
  };
}

// ================================================
// AYUDAS
// ================================================

function convertirCantidad(
  valor: string,
): number {
  if (
    !/^(0|[1-9]\d*)$/.test(valor)
  ) {
    return Number.NaN;
  }

  const numero = Number(valor);

  return Number.isSafeInteger(numero)
    ? numero
    : Number.NaN;
}

function formatearNumero(
  numero: number,
): string {
  return new Intl.NumberFormat(
    "es-ES",
  ).format(numero);
}

function formatearPorcentaje(
  cantidad: number,
  total: number,
): string {
  if (
    total <= 0 ||
    !Number.isFinite(total)
  ) {
    return "0 %";
  }

  return new Intl.NumberFormat(
    "es-ES",
    {
      maximumFractionDigits: 1,
    },
  ).format(
    (cantidad / total) * 100,
  ) + " %";
}

function formatearFecha(
  valor: string | null,
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
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(fecha);
}

function obtenerEstadoLote(
  estado: string,
): {
  nombre: string;
  clase: string;
} {
  switch (estado) {
    case "generado":
      return {
        nombre: "Generado",
        clase:
          "bg-emerald-50 text-emerald-700 ring-emerald-200",
      };

    case "generando":
      return {
        nombre: "Generando",
        clase:
          "bg-sky-50 text-sky-700 ring-sky-200",
      };

    case "pendiente":
      return {
        nombre: "Pendiente",
        clase:
          "bg-amber-50 text-amber-800 ring-amber-200",
      };

    case "error":
      return {
        nombre: "Error",
        clase:
          "bg-red-50 text-red-700 ring-red-200",
      };

    default:
      return {
        nombre: estado,
        clase:
          "bg-slate-100 text-slate-600 ring-slate-200",
      };
  }
}

function generarClaveOperacion(): string {
  /*
   * Necesitamos una clave UUID
   * para identificar el intento.
   *
   * Si el servidor responde con
   * un error incierto, conservaremos
   * exactamente esta clave.
   */

  if (
    typeof crypto === "undefined" ||
    typeof crypto.randomUUID !== "function"
  ) {
    throw new Error(
      "Este navegador no permite generar una clave de operación segura.",
    );
  }

  return crypto.randomUUID();
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
    case "caja":
      contenido = (
        <>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="M3 8v9l9 5 9-5V8M12 13v9" />
        </>
      );
      break;

    case "regalo":
      contenido = (
        <>
          <rect
            x="3"
            y="8"
            width="18"
            height="13"
            rx="2"
          />
          <path d="M3 12h18M12 8v13" />
          <path d="M12 8C7 8 5 6 7 4s5 1 5 4ZM12 8c5 0 7-2 5-4s-5 1-5 4Z" />
        </>
      );
      break;

    case "mas":
      contenido = (
        <path d="M12 5v14M5 12h14" />
      );
      break;

    case "menos":
      contenido = (
        <path d="M5 12h14" />
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

    case "info":
      contenido = (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M12 11v6M12 7h.01" />
        </>
      );
      break;

    case "copiar":
      contenido = (
        <>
          <rect
            x="8"
            y="8"
            width="12"
            height="12"
            rx="2"
          />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
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
// TARJETA DE INDICADOR
// ================================================

function Indicador({
  titulo,
  valor,
  icono,
  amarillo = false,
}: {
  titulo: string;
  valor: string;
  icono: NombreIcono;
  amarillo?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <p className="text-xs font-medium text-slate-500">
          {titulo}
        </p>

        <p className="mt-2 text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-3xl">
          {valor}
        </p>
      </div>

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          amarillo
            ? "bg-[#FFF6D6] text-[#99700D]"
            : "bg-[#EFF5FA] text-[#245F91]"
        }`}
      >
        <Icono
          nombre={icono}
          size={22}
        />
      </div>
    </div>
  );
}

// ================================================
// COMPONENTE PRINCIPAL
// ================================================

export default function GeneradorLotesCodigosPanel({
  onActualizado,
  permisos,
}: GeneradorLotesCodigosPanelProps) {
  const puedeCrear =
    permisos?.crear !== false;

  // ============================================
  // DATOS DEL SERVIDOR
  // ============================================

  const [campanas, setCampanas] =
    useState<Campana[]>([]);

  const [articulos, setArticulos] =
    useState<Articulo[]>([]);

  const [lotes, setLotes] =
    useState<Lote[]>([]);

  const [cargandoCatalogos, setCargandoCatalogos] =
    useState(true);

  const [cargandoLotes, setCargandoLotes] =
    useState(true);

  const [errorCatalogos, setErrorCatalogos] =
    useState<string | null>(null);

  const [errorLotes, setErrorLotes] =
    useState<string | null>(null);

  const [catalogoIncompleto, setCatalogoIncompleto] =
    useState(false);

  const [revision, setRevision] =
    useState(0);

  // ============================================
  // DATOS DEL FORMULARIO
  // ============================================

  const [campanaId, setCampanaId] =
    useState("");

  const [nombre, setNombre] =
    useState("");

  const [descripcion, setDescripcion] =
    useState("");

  const [premios, setPremios] =
    useState<PremioSeleccionado[]>([]);

  const [cantidadSinPremio, setCantidadSinPremio] =
    useState("0");

  const [confirmado, setConfirmado] =
    useState(false);

  // ============================================
  // ESTADO DE GENERACIÓN
  // ============================================

  const [generando, setGenerando] =
    useState(false);

  const [intentoIncierto, setIntentoIncierto] =
    useState(false);

  const [generacionCompletada, setGeneracionCompletada] =
    useState<RespuestaGeneracion | null>(
      null,
    );

  const [mensaje, setMensaje] =
    useState<Mensaje | null>(null);

  const [copiado, setCopiado] =
    useState(false);

  /*
   * Esta referencia conserva una copia
   * exacta de la petición enviada.
   *
   * Si se pierde la respuesta, un
   * reintento reutilizará el mismo
   * contenido y la misma clave UUID.
   */

  const intentoRef =
    useRef<SolicitudGeneracion | null>(
      null,
    );

  const formularioBloqueado =
    generando ||
    intentoIncierto ||
    generacionCompletada !== null;

  // ============================================
  // CARGAR CAMPAÑAS Y ARTÍCULOS
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setCargandoCatalogos(true);
    setErrorCatalogos(null);

    async function cargar() {
      const resultados =
        await Promise.allSettled([
          cargarCampanas(
            controlador.signal,
          ),

          solicitarApi<RespuestaArticulos>(
            `${API_ARTICULOS}?soloActivos=true`,
            {
              signal:
                controlador.signal,
            },
          ),
        ]);

      if (
        controlador.signal.aborted
      ) {
        return;
      }

      const errores: string[] = [];

      const resultadoCampanas =
        resultados[0];

      const resultadoArticulos =
        resultados[1];

      if (
        resultadoCampanas.status ===
        "fulfilled"
      ) {
        setCampanas(
          resultadoCampanas.value.campanas,
        );

        setCatalogoIncompleto(
          resultadoCampanas.value.incompleto,
        );
      } else {
        errores.push(
          "No se han podido consultar las campañas.",
        );
      }

      if (
        resultadoArticulos.status ===
        "fulfilled"
      ) {
        setArticulos(
          resultadoArticulos.value.articulos.filter(
            (articulo) =>
              articulo.activo,
          ),
        );
      } else {
        errores.push(
          "No se ha podido consultar el catálogo de artículos.",
        );
      }

      setErrorCatalogos(
        errores.length
          ? errores.join(" ")
          : null,
      );

      setCargandoCatalogos(false);
    }

    void cargar();

    return () => {
      controlador.abort();
    };
  }, [revision]);

  // ============================================
  // CARGAR LOTES RECIENTES
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setCargandoLotes(true);
    setErrorLotes(null);

    const parametros =
      new URLSearchParams({
        pagina: "1",
        limite:
          String(
            LIMITE_LOTES_RECIENTES,
          ),
      });

    if (campanaId) {
      parametros.set(
        "campanaId",
        campanaId,
      );
    }

    solicitarApi<RespuestaLotes>(
      `${API_LOTES}?${parametros}`,
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

        setLotes(
          resultado.lotes,
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
    campanaId,
    revision,
  ]);

  // ============================================
  // CAMPAÑAS QUE ADMITEN PREPARACIÓN
  // ============================================

  const campanasDisponibles =
    useMemo(() => {
      /*
       * La preparación de lotes se
       * presenta únicamente durante
       * el estado borrador.
       *
       * Así evitamos añadir nuevos
       * premios a una campaña ya
       * puesta en circulación.
       */

      return campanas
        .filter(
          (campana) =>
            campana.estado ===
            "borrador",
        )
        .sort(
          (a, b) =>
            a.nombre.localeCompare(
              b.nombre,
              "es",
            ),
        );
    }, [campanas]);

  // ============================================
  // ARTÍCULOS DISPONIBLES
  // ============================================

  const articulosDisponibles =
    useMemo(() => {
      const seleccionados =
        new Set(
          premios.map(
            (premio) =>
              premio.articuloId,
          ),
        );

      return articulos
        .filter(
          (articulo) =>
            !seleccionados.has(
              articulo.id,
            ),
        )
        .sort(
          (a, b) =>
            a.nombre.localeCompare(
              b.nombre,
              "es",
            ),
        );
    }, [
      articulos,
      premios,
    ]);

  const mapaArticulos =
    useMemo(
      () =>
        new Map(
          articulos.map(
            (articulo) => [
              articulo.id,
              articulo,
            ],
          ),
        ),
      [articulos],
    );

  // ============================================
  // CANTIDADES Y DISTRIBUCIÓN
  // ============================================

  const calculos =
    useMemo(() => {
      let premiosTotal = 0;
      let cantidadInvalida = false;

      for (
        const premio of premios
      ) {
        const cantidad =
          convertirCantidad(
            premio.cantidad,
          );

        if (
          !Number.isSafeInteger(
            cantidad,
          ) ||
          cantidad <= 0
        ) {
          cantidadInvalida = true;
        } else {
          premiosTotal +=
            cantidad;
        }
      }

      const sinPremio =
        convertirCantidad(
          cantidadSinPremio,
        );

      if (
        !Number.isSafeInteger(
          sinPremio,
        ) ||
        sinPremio < 0
      ) {
        cantidadInvalida = true;
      }

      const total =
        premiosTotal +
        (
          Number.isSafeInteger(
            sinPremio,
          )
            ? sinPremio
            : 0
        );

      return {
        premiosTotal,

        sinPremio:
          Number.isSafeInteger(sinPremio)
            ? sinPremio
            : 0,

        total,

        cantidadInvalida,

        superaLimite:
          total > MAXIMO_BOLETOS,

        porcentajePremiados:
          total > 0
            ? (
                premiosTotal /
                total
              ) * 100
            : 0,

        porcentajeSinPremio:
          total > 0
            ? (
                (
                  Number.isSafeInteger(
                    sinPremio,
                  )
                    ? sinPremio
                    : 0
                ) /
                total
              ) * 100
            : 0,
      };
    }, [
      premios,
      cantidadSinPremio,
    ]);

  // ============================================
  // VALIDACIÓN DEL FORMULARIO
  // ============================================

  const erroresFormulario =
    useMemo(() => {
      const errores: string[] = [];

      if (!campanaId) {
        errores.push(
          "Selecciona una campaña en borrador.",
        );
      } else if (
        !campanasDisponibles.some(
          (campana) =>
            campana.id ===
            campanaId,
        )
      ) {
        errores.push(
          "La campaña seleccionada no está disponible para preparar lotes.",
        );
      }

      const nombreLimpio =
        nombre.trim();

      if (
        nombreLimpio.length < 2 ||
        nombreLimpio.length > 120
      ) {
        errores.push(
          "El nombre del lote debe tener entre 2 y 120 caracteres.",
        );
      }

      if (
        descripcion.length > 2000
      ) {
        errores.push(
          "La descripción del lote es demasiado larga.",
        );
      }

      const ids =
        premios.map(
          (premio) =>
            premio.articuloId,
        );

      if (
        new Set(ids).size !==
        ids.length
      ) {
        errores.push(
          "No puedes añadir el mismo artículo dos veces.",
        );
      }

      if (
        premios.some(
          (premio) =>
            !mapaArticulos.has(
              premio.articuloId,
            ),
        )
      ) {
        errores.push(
          "Uno de los artículos seleccionados ya no está disponible.",
        );
      }

      if (
        calculos.cantidadInvalida
      ) {
        errores.push(
          "Introduce cantidades enteras válidas. Cada premio seleccionado debe tener al menos una unidad.",
        );
      }

      if (
        calculos.total < 1
      ) {
        errores.push(
          "El lote debe contener al menos un boleto.",
        );
      }

      if (
        calculos.superaLimite
      ) {
        errores.push(
          `Cada generación puede contener como máximo ${MAXIMO_BOLETOS} boletos.`,
        );
      }

      return errores;
    }, [
      campanaId,
      campanasDisponibles,
      nombre,
      descripcion,
      premios,
      mapaArticulos,
      calculos,
    ]);

  const puedeGenerar =
    puedeCrear &&
    !cargandoCatalogos &&
    !formularioBloqueado &&
    confirmado &&
    erroresFormulario.length === 0;

  // ============================================
  // MODIFICACIONES DE FORMULARIO
  // ============================================

  function modificarFormulario() {
    setConfirmado(false);

    if (
      mensaje?.tipo === "error"
    ) {
      setMensaje(null);
    }
  }

  function agregarArticulo() {
    if (
      formularioBloqueado ||
      articulosDisponibles.length === 0
    ) {
      return;
    }

    const articulo =
      articulosDisponibles[0];

    setPremios(
      (anteriores) => [
        ...anteriores,
        {
          articuloId:
            articulo.id,

          cantidad:
            "1",
        },
      ],
    );

    modificarFormulario();
  }

  function cambiarArticulo(
    indice: number,
    articuloIdNuevo: string,
  ) {
    if (formularioBloqueado) {
      return;
    }

    if (
      premios.some(
        (premio, posicion) =>
          posicion !== indice &&
          premio.articuloId ===
            articuloIdNuevo,
      )
    ) {
      return;
    }

    setPremios(
      (anteriores) =>
        anteriores.map(
          (premio, posicion) =>
            posicion === indice
              ? {
                  ...premio,

                  articuloId:
                    articuloIdNuevo,
                }
              : premio,
        ),
    );

    modificarFormulario();
  }

  function cambiarCantidadPremio(
    indice: number,
    cantidad: string,
  ) {
    if (formularioBloqueado) {
      return;
    }

    setPremios(
      (anteriores) =>
        anteriores.map(
          (premio, posicion) =>
            posicion === indice
              ? {
                  ...premio,
                  cantidad,
                }
              : premio,
        ),
    );

    modificarFormulario();
  }

  function eliminarArticulo(
    indice: number,
  ) {
    if (formularioBloqueado) {
      return;
    }

    setPremios(
      (anteriores) =>
        anteriores.filter(
          (_, posicion) =>
            posicion !== indice,
        ),
    );

    modificarFormulario();
  }

  // ============================================
  // CONSTRUIR PETICIÓN DE GENERACIÓN
  // ============================================

  function construirSolicitud():
    SolicitudGeneracion {
    if (
      erroresFormulario.length > 0
    ) {
      throw new Error(
        erroresFormulario[0],
      );
    }

    const lineas:
      LineaGeneracion[] = [];

    /*
     * Cada artículo seleccionado
     * se transforma en una línea
     * de resultados premiados.
     */

    for (
      const premio of premios
    ) {
      lineas.push({
        articuloId:
          premio.articuloId,

        tipoResultado:
          "premio",

        cantidad:
          convertirCantidad(
            premio.cantidad,
          ),
      });
    }

    /*
     * Los boletos sin premio usan
     * articuloId = null.
     */

    if (
      calculos.sinPremio > 0
    ) {
      lineas.push({
        articuloId: null,

        tipoResultado:
          "sin_premio",

        cantidad:
          calculos.sinPremio,
      });
    }

    return {
      campanaId,

      /*
       * La gestión de plantillas
       * tendrá su propia interfaz.
       *
       * Hasta entonces utilizamos
       * el valor nulo previsto
       * en el contrato de la API.
       */

      plantillaId: null,

      nombre:
        nombre.trim(),

      descripcion:
        descripcion.trim() ||
        null,

      claveOperacion:
        generarClaveOperacion(),

      articulos:
        lineas,
    };
  }

  // ============================================
  // GENERAR LOTE
  // ============================================

  async function generarLote(
    evento?: FormEvent<HTMLFormElement>,
  ) {
    evento?.preventDefault();

    if (
      generando ||
      generacionCompletada
    ) {
      return;
    }

    /*
     * Si se está reintentando una
     * respuesta incierta utilizamos
     * exactamente la solicitud anterior.
     */

    if (
      !intentoIncierto &&
      !puedeGenerar
    ) {
      setMensaje({
        tipo: "error",
        texto:
          erroresFormulario[0] ??
          "Revisa y confirma la configuración del lote.",
      });

      return;
    }

    let solicitud:
      SolicitudGeneracion;

    try {
      if (
        intentoIncierto &&
        intentoRef.current
      ) {
        solicitud =
          intentoRef.current;
      } else {
        solicitud =
          construirSolicitud();

        intentoRef.current =
          solicitud;
      }
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          obtenerMensajeError(error),
      });

      return;
    }

    setGenerando(true);
    setMensaje(null);
    setCopiado(false);

    try {
      const resultado =
        await solicitarApi<RespuestaGeneracion>(
          API_LOTES,
          {
            metodo: "POST",
            datos: solicitud,
          },
        );

      /*
       * La API ha confirmado el
       * resultado de la generación.
       *
       * Dejamos el formulario bloqueado
       * para evitar otro envío mediante
       * doble clic o pulsando Intro.
       */

      setGeneracionCompletada(
        resultado,
      );

      setIntentoIncierto(false);
      intentoRef.current = null;

      setMensaje({
        tipo: "exito",

        texto:
          "La generación del lote ha sido confirmada. Comprueba su estado y continúa desde la gestión de boletos.",
      });

      setRevision(
        (anterior) =>
          anterior + 1,
      );

      onActualizado?.();
    } catch (error) {
      const status =
        error instanceof ErrorApi
          ? error.status
          : 0;

      /*
       * Si recibimos un error 500,
       * 409 o perdemos la conexión,
       * no sabemos con certeza si
       * la creación se ha completado.
       *
       * Bloqueamos las modificaciones
       * y conservamos el intento.
       */

      const incierto =
        status === 0 ||
        status === 409 ||
        status >= 500;

      setIntentoIncierto(
        incierto,
      );

      if (!incierto) {
        intentoRef.current = null;
      }

      setMensaje({
        tipo:
          incierto
            ? "aviso"
            : "error",

        texto:
          incierto
            ? "No se ha podido confirmar el resultado. Comprueba los lotes recientes antes de reintentar. La misma operación conservará su identificador para evitar duplicados."
            : obtenerMensajeError(
                error,
              ),
      });

      setRevision(
        (anterior) =>
          anterior + 1,
      );
    } finally {
      setGenerando(false);
    }
  }

  // ================================================
  // DESCARTAR UN INTENTO INCIERTO
  // ================================================

  function descartarIntento() {
    if (
      !intentoIncierto ||
      generando
    ) {
      return;
    }

    /*
     * Descartar una clave incierta
     * puede llevar a crear un lote
     * adicional si el anterior
     * realmente se había generado.
     *
     * Por ello requerimos una
     * confirmación explícita.
     */

    const confirmadoDescarte =
      window.confirm(
        "¿Has comprobado en el listado que el lote anterior no se generó? Descartar este intento permitirá crear otro con una clave nueva. Si el anterior existe, podrías duplicar los boletos.",
      );

    if (!confirmadoDescarte) {
      return;
    }

    intentoRef.current = null;

    setIntentoIncierto(false);
    setConfirmado(false);

    setMensaje({
      tipo: "aviso",
      texto:
        "El intento anterior se ha descartado en esta pantalla. Revisa nuevamente la configuración antes de generar otro lote.",
    });
  }

  // ================================================
  // NUEVA GENERACIÓN
  // ================================================

  function nuevaGeneracion() {
    if (generando) {
      return;
    }

    intentoRef.current = null;

    setNombre("");
    setDescripcion("");
    setPremios([]);
    setCantidadSinPremio("0");

    setConfirmado(false);
    setIntentoIncierto(false);
    setGeneracionCompletada(null);
    setMensaje(null);
    setCopiado(false);
  }

  // ================================================
  // COPIAR IDENTIFICADOR
  // ================================================

  async function copiarIdentificador() {
    const id =
      generacionCompletada?.lote?.id;

    if (!id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        id,
      );

      setCopiado(true);
    } catch {
      setMensaje({
        tipo: "error",
        texto:
          "No se ha podido copiar el identificador. Puedes seleccionarlo manualmente.",
      });
    }
  }

  // ================================================
  // RENDER PRINCIPAL
  // ================================================

  return (
    <div className="space-y-6 text-[#0B1C30]">
      {/* CABECERA */}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#0B1C30] text-[#F2C94C]">
            <Icono
              nombre="caja"
              size={28}
            />
          </div>

          <div>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">
              Generador de lotes
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Prepara y genera boletos
              para las campañas del club.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={
            cargandoCatalogos ||
            cargandoLotes
          }
          onClick={() =>
            setRevision(
              (anterior) =>
                anterior + 1,
            )
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <Icono
            nombre="actualizar"
            size={17}
            className={
              cargandoCatalogos ||
              cargandoLotes
                ? "animate-spin"
                : ""
            }
          />

          Actualizar
        </button>
      </section>

      {/* INDICADORES */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Indicador
          titulo="Boletos con premio"
          valor={formatearNumero(
            calculos.premiosTotal,
          )}
          icono="regalo"
          amarillo
        />

        <Indicador
          titulo="Boletos sin premio"
          valor={formatearNumero(
            calculos.sinPremio,
          )}
          icono="caja"
        />

        <Indicador
          titulo="Total del lote"
          valor={formatearNumero(
            calculos.total,
          )}
          icono="escudo"
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
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            mensaje.tipo === "exito"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : mensaje.tipo === "aviso"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <Icono
            nombre={
              mensaje.tipo === "exito"
                ? "check"
                : "alerta"
            }
            size={21}
            className="mt-0.5 shrink-0"
          />

          <p className="text-sm leading-6">
            {mensaje.texto}
          </p>
        </div>
      )}

      {errorCatalogos && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorCatalogos}
        </div>
      )}

      {catalogoIncompleto && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          El listado de campañas supera
          el máximo de páginas consultadas.
          Algunas campañas pueden no aparecer
          en este selector.
        </div>
      )}

      {/* GENERADOR Y RESUMEN */}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(310px,1fr)]">
        {/* FORMULARIO */}

        <form
          onSubmit={(evento) =>
            void generarLote(evento)
          }
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          {/* CAMPAÑA */}

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#245F91]">
                <Icono
                  nombre="calendario"
                  size={19}
                />
              </span>

              <div>
                <h3 className="text-base font-bold">
                  1. Campaña y lote
                </h3>

                <p className="text-xs text-slate-500">
                  Selecciona la campaña
                  y asigna un nombre.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="lote-campana"
                className="block text-sm font-semibold"
              >
                Campaña *
              </label>

              <select
                id="lote-campana"
                required
                value={campanaId}
                disabled={
                  formularioBloqueado ||
                  cargandoCatalogos
                }
                onChange={(evento) => {
                  setCampanaId(
                    evento.target.value,
                  );

                  modificarFormulario();
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white disabled:opacity-60"
              >
                <option value="">
                  Selecciona una campaña
                </option>

                {campanasDisponibles.map(
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

              {!cargandoCatalogos &&
                campanasDisponibles.length === 0 && (
                  <p className="text-xs text-amber-700">
                    No hay campañas en borrador.
                    Crea una campaña antes de
                    generar sus boletos.
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="lote-nombre"
                className="block text-sm font-semibold"
              >
                Nombre del lote *
              </label>

              <input
                id="lote-nombre"
                type="text"
                required
                maxLength={120}
                value={nombre}
                disabled={
                  formularioBloqueado
                }
                onChange={(evento) => {
                  setNombre(
                    evento.target.value,
                  );

                  modificarFormulario();
                }}
                placeholder="Ej. Rasca y gana - Lote 1"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white disabled:opacity-60"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="lote-descripcion"
                className="block text-sm font-semibold"
              >
                Descripción
              </label>

              <textarea
                id="lote-descripcion"
                rows={2}
                maxLength={2000}
                value={descripcion}
                disabled={
                  formularioBloqueado
                }
                onChange={(evento) => {
                  setDescripcion(
                    evento.target.value,
                  );

                  modificarFormulario();
                }}
                placeholder="Información adicional del lote..."
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white disabled:opacity-60"
              />
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* ARTÍCULOS */}

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF6D6] text-[#99700D]">
                  <Icono
                    nombre="regalo"
                    size={19}
                  />
                </span>

                <div>
                  <h3 className="text-base font-bold">
                    2. Boletos premiados
                  </h3>

                  <p className="text-xs text-slate-500">
                    Elige los premios y
                    la cantidad de cada uno.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  formularioBloqueado ||
                  articulosDisponibles.length === 0
                }
                onClick={agregarArticulo}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B1C30] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#18385D] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icono
                  nombre="mas"
                  size={16}
                />

                Añadir premio
              </button>
            </div>

            {premios.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
                <Icono
                  nombre="regalo"
                  size={28}
                  className="text-slate-400"
                />

                <p className="mt-3 text-sm font-semibold">
                  Ningún premio seleccionado
                </p>

                <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
                  Añade artículos del catálogo
                  para establecer cuántos
                  boletos resultarán premiados.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {premios.map(
                  (premio, indice) => {
                    const articulo =
                      mapaArticulos.get(
                        premio.articuloId,
                      );

                    const cantidad =
                      convertirCantidad(
                        premio.cantidad,
                      );

                    return (
                      <div
                        key={`${premio.articuloId}-${indice}`}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#245F91]">
                            {articulo?.imagenUrl &&
                            (
                              articulo.imagenUrl.startsWith("/") &&
                              !articulo.imagenUrl.startsWith("//")
                              ||
                              articulo.imagenUrl.startsWith("https://")
                            ) ? (
                              <img
                                src={articulo.imagenUrl}
                                alt=""
                                className="h-full w-full rounded-xl object-contain p-1"
                              />
                            ) : (
                              <Icono
                                nombre="regalo"
                                size={22}
                              />
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <label
                              htmlFor={`premio-articulo-${indice}`}
                              className="mb-1.5 block text-xs font-semibold text-slate-600"
                            >
                              Artículo
                            </label>

                            <select
                              id={`premio-articulo-${indice}`}
                              value={
                                premio.articuloId
                              }
                              disabled={
                                formularioBloqueado
                              }
                              onChange={(evento) =>
                                cambiarArticulo(
                                  indice,
                                  evento.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#245F91] disabled:opacity-60"
                            >
                              {articulo && (
                                <option
                                  value={articulo.id}
                                >
                                  {articulo.nombre}
                                </option>
                              )}

                              {articulosDisponibles.map(
                                (disponible) => (
                                  <option
                                    key={disponible.id}
                                    value={disponible.id}
                                  >
                                    {disponible.nombre}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>

                          <button
                            type="button"
                            disabled={
                              formularioBloqueado
                            }
                            aria-label={`Quitar premio ${articulo?.nombre ?? indice + 1}`}
                            onClick={() =>
                              eliminarArticulo(indice)
                            }
                            className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
                          >
                            <Icono
                              nombre="menos"
                              size={18}
                            />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <label
                            htmlFor={`premio-cantidad-${indice}`}
                            className="text-xs font-medium text-slate-600"
                          >
                            Cantidad de boletos
                          </label>

                          <input
                            id={`premio-cantidad-${indice}`}
                            type="number"
                            min="1"
                            max={MAXIMO_BOLETOS}
                            step="1"
                            inputMode="numeric"
                            value={premio.cantidad}
                            disabled={
                              formularioBloqueado
                            }
                            onChange={(evento) =>
                              cambiarCantidadPremio(
                                indice,
                                evento.target.value,
                              )
                            }
                            className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-sm font-semibold outline-none focus:border-[#245F91] disabled:opacity-60"
                          />
                        </div>

                        <p className="mt-2 text-right text-xs text-slate-500">
                          {Number.isFinite(
                            cantidad,
                          )
                            ? formatearPorcentaje(
                                cantidad,
                                calculos.total,
                              )
                            : "Cantidad no válida"}
                          {" "}
                          del lote
                        </p>
                      </div>
                    );
                  },
                )}
              </div>
            )}

            {!cargandoCatalogos &&
              articulos.length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                  No hay artículos activos
                  en el catálogo. Puedes
                  crear y activar premios
                  desde la sección Artículos.
                </div>
              )}
          </section>

          <div className="border-t border-slate-100" />

          {/* SIN PREMIO */}

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Icono
                  nombre="caja"
                  size={19}
                />
              </span>

              <div>
                <h3 className="text-base font-bold">
                  3. Boletos sin premio
                </h3>

                <p className="text-xs text-slate-500">
                  Indica cuántos boletos
                  no tendrán premio.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold">
                  Cantidad sin premio
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Se mezclarán aleatoriamente
                  con los boletos premiados.
                </p>
              </div>

              <input
                type="number"
                aria-label="Cantidad de boletos sin premio"
                min="0"
                max={MAXIMO_BOLETOS}
                step="1"
                inputMode="numeric"
                value={cantidadSinPremio}
                disabled={
                  formularioBloqueado
                }
                onChange={(evento) => {
                  setCantidadSinPremio(
                    evento.target.value,
                  );

                  modificarFormulario();
                }}
                className="w-32 rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-lg font-bold outline-none focus:border-[#245F91] disabled:opacity-60"
              />
            </div>
          </section>

          {/* VALIDACIONES */}

          {!formularioBloqueado &&
            erroresFormulario.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-amber-900">
                  <Icono
                    nombre="alerta"
                    size={19}
                  />

                  <p className="text-sm font-semibold">
                    Configuración pendiente
                  </p>
                </div>

                <ul className="mt-3 list-inside list-disc space-y-1.5 text-xs leading-5 text-amber-800">
                  {erroresFormulario.map(
                    (error) => (
                      <li key={error}>
                        {error}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

          {/* CONFIRMACIÓN */}

          {!generacionCompletada &&
            !intentoIncierto && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={confirmado}
                  disabled={
                    formularioBloqueado ||
                    !puedeCrear
                  }
                  onChange={(evento) =>
                    setConfirmado(
                      evento.target.checked,
                    )
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-[#0B1C30]"
                />

                <span className="text-xs leading-6 text-slate-600">
                  He revisado la campaña,
                  los artículos y todas
                  las cantidades. Confirmo
                  que quiero generar este
                  lote de boletos.
                </span>
              </label>
            )}

          {/* ACCIONES */}

          {!intentoIncierto &&
            !generacionCompletada && (
              <button
                type="submit"
                disabled={!puedeGenerar}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0B1C30] px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-[#18385D] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icono
                  nombre={
                    generando
                      ? "actualizar"
                      : "caja"
                  }
                  size={20}
                  className={
                    generando
                      ? "animate-spin"
                      : ""
                  }
                />

                {generando
                  ? "Generando boletos..."
                  : `Generar ${formatearNumero(calculos.total)} boletos`}
              </button>
            )}

          {intentoIncierto && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">
                Generación sin confirmar
              </p>

              <p className="text-xs leading-6 text-amber-800">
                Comprueba primero el
                listado de lotes. Si
                necesitas reintentar,
                se enviará exactamente
                la misma solicitud y
                la misma clave de operación.
              </p>

              <p className="break-all font-mono text-[11px] text-amber-800">
                {intentoRef.current?.claveOperacion}
              </p>

              <button
                type="button"
                disabled={generando}
                onClick={() =>
                  void generarLote()
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1C30] px-4 py-3 text-sm font-semibold text-white hover:bg-[#18385D] disabled:opacity-50"
              >
                <Icono
                  nombre="actualizar"
                  size={17}
                />

                Reintentar con la misma clave
              </button>

              <button
                type="button"
                disabled={generando}
                onClick={descartarIntento}
                className="w-full rounded-xl border border-amber-300 px-4 py-3 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                Descartar intento tras comprobar el lote
              </button>
            </div>
          )}

          {/* RESULTADO CONFIRMADO */}

          {generacionCompletada && (
            <div
              role="status"
              className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
            >
              <div className="flex items-center gap-3 text-emerald-800">
                <Icono
                  nombre="check"
                  size={26}
                />

                <h3 className="text-base font-bold">
                  Lote generado
                </h3>
              </div>

              <p className="text-sm text-emerald-900">
                {generacionCompletada.lote.nombre ||
                  nombre}
              </p>

              <p className="text-xs text-emerald-800">
                Cantidad confirmada:{" "}
                <strong>
                  {formatearNumero(
                    generacionCompletada.cantidadGenerada ??
                    calculos.total,
                  )}
                </strong>
              </p>

              <div className="rounded-lg bg-white p-3">
                <p className="text-[11px] font-semibold text-slate-500">
                  Identificador del lote
                </p>

                <div className="mt-2 flex items-start justify-between gap-2">
                  <p className="min-w-0 break-all font-mono text-xs text-[#0B1C30]">
                    {generacionCompletada.lote.id}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void copiarIdentificador()
                    }
                    aria-label="Copiar identificador del lote"
                    className="shrink-0 rounded-lg p-2 text-[#245F91] hover:bg-slate-100"
                  >
                    <Icono
                      nombre={
                        copiado
                          ? "check"
                          : "copiar"
                      }
                      size={17}
                    />
                  </button>
                </div>
              </div>

              <p className="text-xs leading-5 text-emerald-800">
                La impresión de QR y
                la distribución de los
                boletos se gestionarán
                desde sus apartados
                específicos.
              </p>

              <button
                type="button"
                onClick={nuevaGeneracion}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1C30] px-4 py-3 text-sm font-semibold text-white hover:bg-[#18385D]"
              >
                <Icono
                  nombre="mas"
                  size={18}
                />

                Preparar otro lote
              </button>
            </div>
          )}
        </form>

        {/* RESUMEN LATERAL */}

        <aside className="space-y-5 xl:sticky xl:top-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[#0B1C30] p-5 text-white">
              <div className="flex items-center gap-3">
                <Icono
                  nombre="regalo"
                  size={23}
                  className="text-[#F2C94C]"
                />

                <div>
                  <h3 className="font-bold">
                    Resumen del lote
                  </h3>

                  <p className="mt-1 text-xs text-slate-300">
                    Distribución prevista
                  </p>
                </div>
              </div>

              <p className="mt-5 text-4xl font-bold tracking-tight">
                {formatearNumero(
                  calculos.total,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-300">
                Boletos en total
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-[#F2C94C] transition-all"
                  style={{
                    width: `${
                      Math.min(
                        100,
                        (
                          calculos.total /
                          MAXIMO_BOLETOS
                        ) * 100,
                      )
                    }%`,
                  }}
                />
              </div>

              <p className="mt-2 text-right text-[11px] text-slate-300">
                Máximo{" "}
                {formatearNumero(
                  MAXIMO_BOLETOS,
                )}
                {" "}por generación
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">
                    Con premio
                  </span>

                  <strong className="text-sm">
                    {formatearNumero(
                      calculos.premiosTotal,
                    )}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">
                    Sin premio
                  </span>

                  <strong className="text-sm">
                    {formatearNumero(
                      calculos.sinPremio,
                    )}
                  </strong>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">
                      Total
                    </span>

                    <strong className="text-xl">
                      {formatearNumero(
                        calculos.total,
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {/* DISTRIBUCIÓN */}

              <div>
                <p className="mb-3 text-xs font-bold text-slate-600">
                  Porcentajes
                </p>

                <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-[#EAB308] transition-all"
                    style={{
                      width: `${
                        calculos.porcentajePremiados
                      }%`,
                    }}
                  />

                  <div
                    className="h-full bg-[#245F91] transition-all"
                    style={{
                      width: `${
                        calculos.porcentajeSinPremio
                      }%`,
                    }}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#EAB308]" />
                      Premiados
                    </span>

                    <strong>
                      {formatearPorcentaje(
                        calculos.premiosTotal,
                        calculos.total,
                      )}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#245F91]" />
                      Sin premio
                    </span>

                    <strong>
                      {formatearPorcentaje(
                        calculos.sinPremio,
                        calculos.total,
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {/* DESGLOSE */}

              {premios.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="mb-3 text-xs font-bold text-slate-600">
                    Desglose de premios
                  </p>

                  <div className="space-y-3">
                    {premios.map(
                      (premio) => {
                        const articulo =
                          mapaArticulos.get(
                            premio.articuloId,
                          );

                        return (
                          <div
                            key={premio.articuloId}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="min-w-0 truncate text-xs text-slate-600">
                              {articulo?.nombre ??
                                "Artículo no disponible"}
                            </span>

                            <strong className="shrink-0 text-xs">
                              {premio.cantidad || "—"}
                            </strong>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SEGURIDAD */}

          <section className="rounded-2xl border border-[#D7E7F4] bg-[#EFF5FA] p-5">
            <div className="flex items-center gap-3 text-[#174C78]">
              <Icono
                nombre="escudo"
                size={23}
              />

              <h3 className="text-sm font-bold">
                Generación protegida
              </h3>
            </div>

            <p className="mt-3 text-xs leading-6 text-[#355A78]">
              El servidor mezclará
              aleatoriamente los resultados
              y los almacenará cifrados.
              El código visible no indica
              si contiene un premio.
            </p>

            <p className="mt-3 text-xs leading-6 text-[#355A78]">
              El generador no muestra
              qué artículo corresponde
              a cada boleto individual.
            </p>
          </section>
        </aside>
      </div>

      {/* LOTES RECIENTES */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">
              Últimos lotes
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {campanaId
                ? "Lotes de la campaña seleccionada"
                : "Lotes recientes de todas las campañas"}
            </p>
          </div>

          <button
            type="button"
            disabled={cargandoLotes}
            onClick={() =>
              setRevision(
                (anterior) =>
                  anterior + 1,
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
          >
            <Icono
              nombre="actualizar"
              size={16}
              className={
                cargandoLotes
                  ? "animate-spin"
                  : ""
              }
            />

            Actualizar
          </button>
        </div>

        {errorLotes && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
          >
            {errorLotes}
          </p>
        )}

        {cargandoLotes ? (
          <div className="mt-5 space-y-3">
            {[1, 2, 3].map(
              (numero) => (
                <div
                  key={numero}
                  className="h-15 animate-pulse rounded-xl bg-slate-100"
                />
              ),
            )}
          </div>
        ) : lotes.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
            <Icono
              nombre="caja"
              size={27}
              className="mx-auto text-slate-400"
            />

            <p className="mt-3 text-sm font-semibold">
              No hay lotes para mostrar
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Los lotes generados
              aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {lotes.map((lote) => {
              const estado =
                obtenerEstadoLote(
                  lote.estado,
                );

              return (
                <div
                  key={lote.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#245F91]">
                      <Icono
                        nombre="caja"
                        size={19}
                      />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {lote.nombre}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatearNumero(
                          lote.cantidadTotal,
                        )}
                        {" "}boletos ·{" "}
                        {formatearFecha(
                          lote.createdAt,
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset ${estado.clase}`}
                  >
                    {estado.nombre}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* INFORMACIÓN FINAL */}

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#245F91]">
          <Icono
            nombre="info"
            size={20}
          />
        </span>

        <div>
          <p className="text-sm font-semibold">
            Antes de poner los boletos en circulación
          </p>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            Verifica la cantidad generada
            y el estado del lote. Los boletos
            solamente deben considerarse
            disponibles cuando el servidor
            confirme que el lote está
            generado. La impresión y
            distribución se gestionarán
            en sus apartados específicos.
          </p>
        </div>
      </div>
    </div>
  );
}

export {
  GeneradorLotesCodigosPanel,
};
