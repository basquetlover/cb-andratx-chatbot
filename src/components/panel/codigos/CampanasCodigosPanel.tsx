
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

/*
 * C.B. ANDRATX
 * Gestión visual de campañas.
 *
 * Funcionalidades:
 *
 * - Listado y búsqueda.
 * - Paginación.
 * - Filtros por estado.
 * - Creación de campañas.
 * - Edición de campañas.
 * - Activación.
 * - Finalización.
 * - Apertura y cierre de ventas.
 * - Apertura y cierre de canjes.
 * - Reactivación de no vendidos.
 *
 * Utiliza las API de los archivos:
 *
 * 11/27: /api/panel/codigos/campanas
 * 12/27: /api/panel/codigos/campanas/[id]
 *
 * No revela resultados de boletos.
 */

// ================================================
// TIPOS
// ================================================

type EstadoCampana =
  | "borrador"
  | "activa"
  | "finalizada";

type EstadoVentas =
  | "abiertas"
  | "cerradas";

type EstadoCanjes =
  | "abiertos"
  | "cerrados";

type FiltroEstado =
  | EstadoCampana
  | "todos";

type AccionCampana =
  | "activar"
  | "finalizar"
  | "cerrar_ventas"
  | "abrir_ventas"
  | "abrir_canjes"
  | "cerrar_canjes"
  | "reactivar_venta";

type NombreIcono =
  | "calendario"
  | "mas"
  | "buscar"
  | "actualizar"
  | "editar"
  | "ajustes"
  | "cerrar"
  | "check"
  | "alerta"
  | "reloj"
  | "flecha"
  | "ventas"
  | "regalo"
  | "play"
  | "bandera"
  | "pausa"
  | "deshacer";

interface CampanaPanel {
  id: string;

  nombre: string;
  descripcion: string | null;

  estado: EstadoCampana;

  estadoVentas: EstadoVentas;
  estadoCanjes: EstadoCanjes;

  fechaInicio: string | null;
  fechaFin: string | null;

  ventasCerradasAt: string | null;
  ventasCerradasPor: string | null;

  canjesCerradosAt: string | null;
  canjesCerradosPor: string | null;

  creadoPor: string | null;

  createdAt: string;
  updatedAt: string;
}

interface FormularioCampana {
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
}

interface RespuestaListado {
  campanas: CampanaPanel[];

  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

interface RespuestaCampana {
  campana: CampanaPanel;

  operacionId?: string;
  auditoriaRegistrada?: boolean;
  aviso?: string | null;

  boletosActualizados?: number;
  reactivados?: number;
}

interface ErrorCampoApi {
  campo: string;
  mensaje: string;
}

interface RespuestaApi<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  errores?: ErrorCampoApi[];
}

interface MensajePanel {
  tipo: "exito" | "error" | "aviso";
  texto: string;
}

type Dialogo =
  | {
      tipo: "formulario";
      modo: "crear" | "editar";
      campana: CampanaPanel | null;
    }
  | {
      tipo: "accion";
      campana: CampanaPanel;
      accion: AccionCampana;
    };

export interface CampanasCodigosPanelProps {
  onActualizado?: () => void;

  /*
   * Permisos visuales opcionales.
   *
   * La autorización real siempre
   * se comprueba en el servidor.
   */
  permisos?: {
    crear?: boolean;
    editar?: boolean;
  };
}

// ================================================
// CONFIGURACIÓN
// ================================================

const API_CAMPANAS =
  "/api/panel/codigos/campanas";

const LIMITE_PAGINA = 12;

const FORMULARIO_VACIO: FormularioCampana = {
  nombre: "",
  descripcion: "",
  fechaInicio: "",
  fechaFin: "",
};

const ACCIONES: Record<
  AccionCampana,
  {
    titulo: string;
    descripcion: string;
    confirmacion: string;
    boton: string;
    peligrosa: boolean;
  }
> = {
  activar: {
    titulo: "Activar campaña",
    descripcion:
      "La campaña dejará de ser un borrador y podrá utilizarse para las operaciones de venta permitidas.",
    confirmacion:
      "Confirmo que quiero activar esta campaña.",
    boton: "Activar campaña",
    peligrosa: false,
  },

  finalizar: {
    titulo: "Finalizar campaña",
    descripcion:
      "La campaña pasará a finalizada y no podrá volver al estado activo desde este panel. Las ventas deben estar cerradas y todos los boletos pendientes deben haberse clasificado. Los canjes podrán continuar si permanecen abiertos.",
    confirmacion:
      "Confirmo que quiero finalizar esta campaña.",
    boton: "Finalizar campaña",
    peligrosa: true,
  },

  cerrar_ventas: {
    titulo: "Cerrar ventas",
    descripcion:
      "Se cerrará la venta de nuevos boletos. Además, todos los boletos activos que todavía estén pendientes pasarán a vendidos. Los marcados expresamente como no vendidos conservarán su estado.",
    confirmacion:
      "Entiendo que todos los boletos pendientes pasarán a vendidos.",
    boton: "Cerrar ventas",
    peligrosa: true,
  },

  abrir_ventas: {
    titulo: "Reabrir ventas",
    descripcion:
      "La campaña volverá a admitir operaciones de venta. Los boletos ya vendidos no se restablecerán automáticamente.",
    confirmacion:
      "Confirmo que quiero reabrir las ventas.",
    boton: "Reabrir ventas",
    peligrosa: false,
  },

  abrir_canjes: {
    titulo: "Abrir canjes",
    descripcion:
      "Los operadores autorizados podrán consultar y entregar los premios correspondientes a los boletos vendidos. Es independiente del estado de las ventas.",
    confirmacion:
      "Confirmo que quiero habilitar la entrega de premios.",
    boton: "Abrir canjes",
    peligrosa: false,
  },

  cerrar_canjes: {
    titulo: "Cerrar canjes",
    descripcion:
      "No se admitirán nuevas entregas de premios mientras los canjes permanezcan cerrados. Los canjes anteriores se conservarán.",
    confirmacion:
      "Confirmo que quiero cerrar la entrega de premios.",
    boton: "Cerrar canjes",
    peligrosa: true,
  },

  reactivar_venta: {
    titulo: "Reactivar boletos no vendidos",
    descripcion:
      "Los boletos activos marcados como no vendidos volverán al estado pendiente y podrán registrarse de nuevo durante las ventas abiertas. Los vendidos y los boletos con historial de canje no deben modificarse.",
    confirmacion:
      "Confirmo que quiero reactivar los boletos no vendidos.",
    boton: "Reactivar boletos",
    peligrosa: true,
  },
};

// ================================================
// ERRORES
// ================================================

class ErrorPeticion
  extends Error {
  status: number;
  errores: ErrorCampoApi[];

  constructor(
    mensaje: string,
    status: number,
    errores: ErrorCampoApi[] = [],
  ) {
    super(mensaje);

    this.name = "ErrorPeticion";
    this.status = status;
    this.errores = errores;
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

function obtenerError(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : "Se ha producido un error inesperado.";
}

function obtenerErroresCampos(
  error: unknown,
): Record<string, string> {
  if (
    !(error instanceof ErrorPeticion)
  ) {
    return {};
  }

  const resultado:
    Record<string, string> = {};

  for (const elemento of error.errores) {
    if (!resultado[elemento.campo]) {
      resultado[elemento.campo] =
        elemento.mensaje;
    }
  }

  return resultado;
}

function formatearNumero(
  valor: number,
): string {
  return new Intl.NumberFormat(
    "es-ES",
  ).format(valor);
}

function formatearFecha(
  valor: string | null,
  incluirHora = false,
): string {
  if (!valor) {
    return "Sin configurar";
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

      ...(incluirHora
        ? {
            hour: "2-digit" as const,
            minute: "2-digit" as const,
          }
        : {}),
    },
  ).format(fecha);
}

function convertirFechaParaInput(
  valor: string | null,
): string {
  if (!valor) {
    return "";
  }

  const fecha = new Date(valor);

  if (
    Number.isNaN(fecha.getTime())
  ) {
    return "";
  }

  /*
   * datetime-local utiliza la zona
   * horaria local del navegador.
   *
   * No utilizamos toISOString()
   * para rellenar el input porque
   * desplazaría la hora visible.
   */

  const completar = (
    numero: number,
  ) => String(numero).padStart(2, "0");

  return [
    fecha.getFullYear(),
    "-",
    completar(fecha.getMonth() + 1),
    "-",
    completar(fecha.getDate()),
    "T",
    completar(fecha.getHours()),
    ":",
    completar(fecha.getMinutes()),
  ].join("");
}

function convertirFechaParaApi(
  valor: string,
): string | null {
  if (!valor) {
    return null;
  }

  const fecha = new Date(valor);

  if (
    Number.isNaN(fecha.getTime())
  ) {
    throw new Error(
      "Una de las fechas introducidas no es válida.",
    );
  }

  return fecha.toISOString();
}

function limpiarBusqueda(
  valor: string,
): string {
  /*
   * La API rechaza caracteres
   * especiales de ILIKE.
   */

  return valor
    .replace(
      /[%_\\\u0000-\u001F\u007F]/g,
      " ",
    )
    .trim()
    .slice(0, 120);
}

// ================================================
// PETICIONES API
// ================================================

async function solicitarApi<T>(
  ruta: string,
  opciones: {
    metodo?: "GET" | "POST" | "PATCH";
    datos?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const metodo =
    opciones.metodo ?? "GET";

  const tieneDatos =
    opciones.datos !== undefined;

  const respuesta = await fetch(
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
    const errores =
      Array.isArray(contenido.errores)
        ? contenido.errores.filter(
            (elemento): elemento is ErrorCampoApi =>
              esObjeto(elemento) &&
              typeof elemento.campo === "string" &&
              typeof elemento.mensaje === "string",
          )
        : [];

    throw new ErrorPeticion(
      typeof contenido.error === "string"
        ? contenido.error
        : "No se ha podido completar la operación.",
      respuesta.status,
      errores,
    );
  }

  return contenido.data as T;
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
    case "calendario":
      contenido = (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h7" />
        </>
      );
      break;

    case "mas":
      contenido = <path d="M12 5v14M5 12h14" />;
      break;

    case "buscar":
      contenido = (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 5 5" />
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

    case "editar":
      contenido = (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z" />
        </>
      );
      break;

    case "ajustes":
      contenido = (
        <>
          <path d="M4 7h16M4 17h16M8 4v6M16 14v6" />
          <circle cx="8" cy="7" r="2" />
          <circle cx="16" cy="17" r="2" />
        </>
      );
      break;

    case "cerrar":
      contenido = <path d="M5 5l14 14M19 5 5 19" />;
      break;

    case "check":
      contenido = <path d="m5 12 4 4L19 6" />;
      break;

    case "alerta":
      contenido = (
        <>
          <path d="m12 3 10 18H2L12 3Z" />
          <path d="M12 9v5M12 17h.01" />
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

    case "flecha":
      contenido = <path d="M5 12h14M13 6l6 6-6 6" />;
      break;

    case "ventas":
      contenido = (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M7 15h4M15 15h2" />
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

    case "play":
      contenido = <path d="m8 5 11 7-11 7V5Z" />;
      break;

    case "bandera":
      contenido = (
        <>
          <path d="M5 22V4M5 5c5-3 8 3 14 0v11c-6 3-9-3-14 0" />
        </>
      );
      break;

    case "pausa":
      contenido = <path d="M8 5v14M16 5v14" />;
      break;

    case "deshacer":
      contenido = (
        <>
          <path d="M3 8h12a6 6 0 0 1 0 12h-2" />
          <path d="m8 3-5 5 5 5" />
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
// COMPONENTES VISUALES
// ================================================

function Etiqueta({
  texto,
  color,
}: {
  texto: string;
  color:
    | "verde"
    | "amarillo"
    | "gris"
    | "azul";
}) {
  const colores = {
    verde:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",

    amarillo:
      "bg-amber-50 text-amber-800 ring-amber-200",

    gris:
      "bg-slate-100 text-slate-600 ring-slate-200",

    azul:
      "bg-sky-50 text-sky-700 ring-sky-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${colores[color]}`}
    >
      {texto}
    </span>
  );
}

function EtiquetaEstado({
  estado,
}: {
  estado: EstadoCampana;
}) {
  const configuracion = {
    borrador: {
      texto: "Borrador",
      color: "amarillo",
    },
    activa: {
      texto: "Activa",
      color: "verde",
    },
    finalizada: {
      texto: "Finalizada",
      color: "gris",
    },
  } as const;

  const datos =
    configuracion[estado];

  return (
    <Etiqueta
      texto={datos.texto}
      color={datos.color}
    />
  );
}

function Indicador({
  titulo,
  valor,
  icono,
  color = "azul",
}: {
  titulo: string;
  valor: string | number;
  icono: NombreIcono;
  color?: "azul" | "amarillo";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          {titulo}
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[#0B1C30] sm:text-3xl">
          {valor}
        </p>
      </div>

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          color === "amarillo"
            ? "bg-[#FFF6D6] text-[#96690D]"
            : "bg-[#EFF5FA] text-[#245F91]"
        }`}
      >
        <Icono nombre={icono} size={22} />
      </div>
    </div>
  );
}

function Campo({
  id,
  titulo,
  ayuda,
  error,
  children,
}: {
  id: string;
  titulo: string;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-[#0B1C30]"
      >
        {titulo}
      </label>

      {children}

      {ayuda && !error && (
        <p className="text-xs leading-5 text-slate-500">
          {ayuda}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function EstadoVacio({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF5FA] text-[#245F91]">
        <Icono nombre="calendario" size={30} />
      </div>

      <h3 className="mt-4 text-base font-bold text-[#0B1C30]">
        {titulo}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {descripcion}
      </p>

      {accion && (
        <div className="mt-5">{accion}</div>
      )}
    </div>
  );
}

// ================================================
// ACCIONES DISPONIBLES
// ================================================

function obtenerAccionesCampana(
  campana: CampanaPanel,
): AccionCampana[] {
  const acciones: AccionCampana[] = [];

  if (campana.estado === "borrador") {
    acciones.push("activar");
  }

  if (campana.estado === "activa") {
    if (
      campana.estadoVentas === "abiertas"
    ) {
      acciones.push(
        "cerrar_ventas",
        "reactivar_venta",
      );
    } else {
      acciones.push(
        "abrir_ventas",
        "finalizar",
      );
    }
  }

  if (campana.estado !== "borrador") {
    acciones.push(
      campana.estadoCanjes === "abiertos"
        ? "cerrar_canjes"
        : "abrir_canjes",
    );
  }

  return acciones;
}

function obtenerTextoAccion(
  accion: AccionCampana,
): string {
  return ACCIONES[accion].boton;
}

// ================================================
// COMPONENTE PRINCIPAL
// ================================================

export default function CampanasCodigosPanel({
  onActualizado,
  permisos,
}: CampanasCodigosPanelProps) {
  const puedeCrear =
    permisos?.crear !== false;

  const puedeEditar =
    permisos?.editar !== false;

  const [campanas, setCampanas] =
    useState<CampanaPanel[]>([]);

  const [total, setTotal] =
    useState(0);

  const [totalPaginas, setTotalPaginas] =
    useState(0);

  const [pagina, setPagina] =
    useState(1);

  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("todos");

  const [busqueda, setBusqueda] =
    useState("");

  const [busquedaAplicada, setBusquedaAplicada] =
    useState("");

  const [revision, setRevision] =
    useState(0);

  const [cargando, setCargando] =
    useState(true);

  const [errorListado, setErrorListado] =
    useState<string | null>(null);

  const [mensaje, setMensaje] =
    useState<MensajePanel | null>(null);

  const [dialogo, setDialogo] =
    useState<Dialogo | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioCampana>({
      ...FORMULARIO_VACIO,
    });

  const [erroresCampos, setErroresCampos] =
    useState<Record<string, string>>({});

  const [errorDialogo, setErrorDialogo] =
    useState<string | null>(null);

  const [enviando, setEnviando] =
    useState(false);

  const [confirmacion, setConfirmacion] =
    useState(false);

  const [expandidaId, setExpandidaId] =
    useState<string | null>(null);

  // ============================================
  // BÚSQUEDA CON RETARDO
  // ============================================

  useEffect(() => {
    const identificador =
      window.setTimeout(() => {
        setBusquedaAplicada(
          limpiarBusqueda(busqueda),
        );
      }, 350);

    return () => {
      window.clearTimeout(
        identificador,
      );
    };
  }, [busqueda]);

  // ============================================
  // CARGAR LISTADO
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setCargando(true);
    setErrorListado(null);

    const parametros =
      new URLSearchParams({
        pagina: String(pagina),
        limite: String(LIMITE_PAGINA),
      });

    if (
      filtroEstado !== "todos"
    ) {
      parametros.set(
        "estado",
        filtroEstado,
      );
    }

    if (busquedaAplicada) {
      parametros.set(
        "busqueda",
        busquedaAplicada,
      );
    }

    solicitarApi<RespuestaListado>(
      `${API_CAMPANAS}?${parametros.toString()}`,
      {
        signal: controlador.signal,
      },
    )
      .then((resultado) => {
        if (controlador.signal.aborted) {
          return;
        }

        setCampanas(resultado.campanas);
        setTotal(resultado.total);
        setTotalPaginas(
          resultado.totalPaginas,
        );

        /*
         * Si después de un cambio
         * la página ha quedado vacía,
         * volvemos a la última válida.
         */
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
        if (controlador.signal.aborted) {
          return;
        }

        setErrorListado(
          obtenerError(error),
        );
      })
      .finally(() => {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      });

    return () => {
      controlador.abort();
    };
  }, [
    pagina,
    filtroEstado,
    busquedaAplicada,
    revision,
  ]);

  // ============================================
  // CERRAR DIÁLOGO CON ESCAPE
  // ============================================

  useEffect(() => {
    if (!dialogo) {
      return;
    }

    function pulsarTecla(
      evento: KeyboardEvent,
    ) {
      if (
        evento.key === "Escape" &&
        !enviando
      ) {
        setDialogo(null);
        setErrorDialogo(null);
        setErroresCampos({});
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
  }, [dialogo, enviando]);

  // ============================================
  // INDICADORES DE LA PÁGINA ACTUAL
  // ============================================

  const resumen =
    useMemo(() => {
      return {
        borradores:
          campanas.filter(
            (campana) =>
              campana.estado === "borrador",
          ).length,

        activas:
          campanas.filter(
            (campana) =>
              campana.estado === "activa",
          ).length,

        finalizadas:
          campanas.filter(
            (campana) =>
              campana.estado === "finalizada",
          ).length,
      };
    }, [campanas]);

  // ============================================
  // RECARGAR
  // ============================================

  function recargar() {
    setRevision(
      (anterior) => anterior + 1,
    );
  }

  function informarActualizacion() {
    recargar();
    onActualizado?.();
  }

  function cambiarFiltro(
    siguiente: FiltroEstado,
  ) {
    setFiltroEstado(siguiente);
    setPagina(1);
    setExpandidaId(null);
  }

  // ============================================
  // MODALES
  // ============================================

  function abrirCreacion() {
    if (!puedeCrear || enviando) {
      return;
    }

    setFormulario({
      ...FORMULARIO_VACIO,
    });

    setErroresCampos({});
    setErrorDialogo(null);
    setMensaje(null);

    setDialogo({
      tipo: "formulario",
      modo: "crear",
      campana: null,
    });
  }

  async function abrirEdicion(
    campana: CampanaPanel,
  ) {
    if (
      !puedeEditar ||
      enviando ||
      campana.estado === "finalizada"
    ) {
      return;
    }

    setErrorDialogo(null);
    setErroresCampos({});

    /*
     * Obtenemos el detalle actualizado
     * para evitar editar utilizando
     * información antigua del listado.
     */

    try {
      const respuesta =
        await solicitarApi<RespuestaCampana>(
          `${API_CAMPANAS}/${encodeURIComponent(campana.id)}`,
        );

      const actual =
        respuesta.campana;

      if (actual.estado === "finalizada") {
        setMensaje({
          tipo: "error",
          texto:
            "Esta campaña ya se ha finalizado y no puede editarse.",
        });

        recargar();
        return;
      }

      setFormulario({
        nombre: actual.nombre,
        descripcion:
          actual.descripcion ?? "",
        fechaInicio:
          convertirFechaParaInput(
            actual.fechaInicio,
          ),
        fechaFin:
          convertirFechaParaInput(
            actual.fechaFin,
          ),
      });

      setDialogo({
        tipo: "formulario",
        modo: "editar",
        campana: actual,
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: obtenerError(error),
      });
    }
  }

  function abrirAccion(
    campana: CampanaPanel,
    accion: AccionCampana,
  ) {
    if (!puedeEditar || enviando) {
      return;
    }

    if (
      !obtenerAccionesCampana(campana)
        .includes(accion)
    ) {
      return;
    }

    setErrorDialogo(null);
    setConfirmacion(false);
    setMensaje(null);

    setDialogo({
      tipo: "accion",
      campana,
      accion,
    });
  }

  function cerrarDialogo() {
    if (enviando) {
      return;
    }

    setDialogo(null);
    setErrorDialogo(null);
    setErroresCampos({});
    setConfirmacion(false);
  }

  // ============================================
  // MODIFICAR FORMULARIO
  // ============================================

  function cambiarCampo(
    campo: keyof FormularioCampana,
    valor: string,
  ) {
    setFormulario(
      (anterior) => ({
        ...anterior,
        [campo]: valor,
      }),
    );

    setErroresCampos(
      (anterior) => {
        const nuevos = {
          ...anterior,
        };

        delete nuevos[campo];

        return nuevos;
      },
    );
  }

  // ============================================
  // VALIDAR FORMULARIO
  // ============================================

  function validarFormulario():
    Record<string, string> {
    const errores:
      Record<string, string> = {};

    const nombre =
      formulario.nombre.trim();

    if (
      nombre.length < 2 ||
      nombre.length > 120
    ) {
      errores.nombre =
        "El nombre debe tener entre 2 y 120 caracteres.";
    }

    if (
      formulario.descripcion.length >
      2000
    ) {
      errores.descripcion =
        "La descripción no puede superar los 2000 caracteres.";
    }

    const inicio =
      formulario.fechaInicio
        ? new Date(formulario.fechaInicio)
        : null;

    const fin =
      formulario.fechaFin
        ? new Date(formulario.fechaFin)
        : null;

    if (
      inicio &&
      Number.isNaN(inicio.getTime())
    ) {
      errores.fechaInicio =
        "La fecha de inicio no es válida.";
    }

    if (
      fin &&
      Number.isNaN(fin.getTime())
    ) {
      errores.fechaFin =
        "La fecha de finalización no es válida.";
    }

    if (
      inicio &&
      fin &&
      !errores.fechaInicio &&
      !errores.fechaFin &&
      fin.getTime() <= inicio.getTime()
    ) {
      errores.fechaFin =
        "La fecha de finalización debe ser posterior al inicio.";
    }

    return errores;
  }

  // ============================================
  // GUARDAR CAMPAÑA
  // ============================================

  async function guardarFormulario(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (
      !dialogo ||
      dialogo.tipo !== "formulario" ||
      enviando
    ) {
      return;
    }

    const errores =
      validarFormulario();

    setErroresCampos(errores);

    if (
      Object.keys(errores).length > 0
    ) {
      return;
    }

    setEnviando(true);
    setErrorDialogo(null);

    try {
      const datos = {
        nombre:
          formulario.nombre.trim(),

        descripcion:
          formulario.descripcion.trim() ||
          null,

        fechaInicio:
          convertirFechaParaApi(
            formulario.fechaInicio,
          ),

        fechaFin:
          convertirFechaParaApi(
            formulario.fechaFin,
          ),
      };

      let respuesta: RespuestaCampana;

      if (
        dialogo.modo === "crear"
      ) {
        respuesta =
          await solicitarApi<RespuestaCampana>(
            API_CAMPANAS,
            {
              metodo: "POST",
              datos,
            },
          );
      } else {
        if (!dialogo.campana) {
          throw new Error(
            "No se ha podido identificar la campaña.",
          );
        }

        respuesta =
          await solicitarApi<RespuestaCampana>(
            `${API_CAMPANAS}/${encodeURIComponent(dialogo.campana.id)}`,
            {
              metodo: "PATCH",
              datos,
            },
          );
      }

      setDialogo(null);

      setMensaje({
        tipo: respuesta.aviso
          ? "aviso"
          : "exito",

        texto: respuesta.aviso ??
          (
            dialogo.modo === "crear"
              ? "La campaña se ha creado correctamente como borrador."
              : "Los cambios de la campaña se han guardado."
          ),
      });

      setPagina(1);
      informarActualizacion();
    } catch (error) {
      setErrorDialogo(
        obtenerError(error),
      );

      setErroresCampos(
        obtenerErroresCampos(error),
      );

      /*
       * Si la creación o edición tuvo
       * un fallo de respuesta después
       * de guardarse, actualizamos
       * el listado para comprobarlo.
       */
      recargar();
    } finally {
      setEnviando(false);
    }
  }

  // ============================================
  // CONFIRMAR ACCIÓN
  // ============================================

  async function confirmarAccion() {
    if (
      !dialogo ||
      dialogo.tipo !== "accion" ||
      !confirmacion ||
      enviando
    ) {
      return;
    }

    const {
      campana,
      accion,
    } = dialogo;

    setEnviando(true);
    setErrorDialogo(null);

    try {
      /*
       * La API realizará nuevamente
       * las comprobaciones de estado,
       * lotes, ventas y permisos.
       *
       * Ninguna operación se considera
       * autorizada solo por mostrar
       * el botón en el navegador.
       */

      const resultado =
        await solicitarApi<RespuestaCampana>(
          `${API_CAMPANAS}/${encodeURIComponent(campana.id)}`,
          {
            metodo: "POST",

            datos: {
              accion,
            },
          },
        );

      const detalles: string[] = [];

      if (
        typeof resultado.boletosActualizados ===
        "number"
      ) {
        detalles.push(
          `${formatearNumero(resultado.boletosActualizados)} boletos pendientes clasificados como vendidos.`,
        );
      }

      if (
        typeof resultado.reactivados ===
        "number"
      ) {
        detalles.push(
          `${formatearNumero(resultado.reactivados)} boletos reactivados.`,
        );
      }

      setDialogo(null);
      setExpandidaId(null);

      setMensaje({
        tipo: resultado.aviso
          ? "aviso"
          : "exito",

        texto: [
          resultado.aviso ??
            `Operación realizada: ${obtenerTextoAccion(accion)}.`,
          ...detalles,
        ].join(" "),
      });

      informarActualizacion();
    } catch (error) {
      setErrorDialogo(
        obtenerError(error),
      );

      /*
       * El cierre de ventas puede
       * haberse aplicado parcialmente.
       *
       * Refrescamos el listado aunque
       * la API haya devuelto error.
       */
      recargar();
    } finally {
      setEnviando(false);
    }
  }

  // ============================================
  // TARJETA DE CAMPAÑA
  // ============================================

  function mostrarCampana(
    campana: CampanaPanel,
  ) {
    const expandida =
      expandidaId === campana.id;

    const acciones =
      obtenerAccionesCampana(
        campana,
      );

    return (
      <article
        key={campana.id}
        className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="flex flex-1 flex-col p-5">
          {/* TÍTULO Y ESTADO */}

          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#245F91]">
              <Icono
                nombre="calendario"
                size={24}
              />
            </div>

            <EtiquetaEstado
              estado={campana.estado}
            />
          </div>

          <div className="mt-4">
            <h3 className="line-clamp-2 text-base font-bold leading-6 text-[#0B1C30]">
              {campana.nombre}
            </h3>

            <p className="mt-2 line-clamp-3 min-h-10 text-xs leading-5 text-slate-500">
              {campana.descripcion ||
                "Sin descripción."}
            </p>
          </div>

          {/* FECHAS */}

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">
                Fecha de inicio
              </p>

              <p className="mt-1 text-xs font-semibold text-[#0B1C30]">
                {formatearFecha(
                  campana.fechaInicio,
                )}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">
                Fecha de fin
              </p>

              <p className="mt-1 text-xs font-semibold text-[#0B1C30]">
                {formatearFecha(
                  campana.fechaFin,
                )}
              </p>
            </div>
          </div>

          {/* VENTAS Y CANJES */}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Icono
                  nombre="ventas"
                  size={16}
                />

                <span className="text-[11px] font-medium">
                  Ventas
                </span>
              </div>

              <div className="mt-2">
                <Etiqueta
                  texto={
                    campana.estadoVentas ===
                    "abiertas"
                      ? "Abiertas"
                      : "Cerradas"
                  }
                  color={
                    campana.estadoVentas ===
                    "abiertas"
                      ? "verde"
                      : "gris"
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Icono
                  nombre="regalo"
                  size={16}
                />

                <span className="text-[11px] font-medium">
                  Canjes
                </span>
              </div>

              <div className="mt-2">
                <Etiqueta
                  texto={
                    campana.estadoCanjes ===
                    "abiertos"
                      ? "Abiertos"
                      : "Cerrados"
                  }
                  color={
                    campana.estadoCanjes ===
                    "abiertos"
                      ? "verde"
                      : "gris"
                  }
                />
              </div>
            </div>
          </div>

          {/* ACCIONES PRINCIPALES */}

          <div className="mt-auto flex gap-2 border-t border-slate-100 pt-4">
            {puedeEditar &&
              campana.estado !==
                "finalizada" && (
                <button
                  type="button"
                  onClick={() =>
                    void abrirEdicion(campana)
                  }
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-[#0B1C30] transition-colors hover:bg-slate-50"
                >
                  <Icono
                    nombre="editar"
                    size={16}
                  />

                  Editar
                </button>
              )}

            <button
              type="button"
              aria-expanded={expandida}
              onClick={() =>
                setExpandidaId(
                  expandida
                    ? null
                    : campana.id,
                )
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0B1C30] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#18385D]"
            >
              <Icono
                nombre="ajustes"
                size={16}
              />

              {expandida
                ? "Ocultar"
                : "Gestionar"}
            </button>
          </div>
        </div>

        {/* PANEL DESPLEGABLE */}

        {expandida && (
          <div className="space-y-4 border-t border-slate-200 bg-[#F8FAFD] p-5">
            <div>
              <h4 className="text-sm font-bold text-[#0B1C30]">
                Gestión de campaña
              </h4>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Las operaciones requieren
                confirmación y se verifican
                nuevamente en el servidor.
              </p>
            </div>

            <div className="space-y-2">
              {acciones.map(
                (accion) => (
                  <button
                    key={accion}
                    type="button"
                    disabled={!puedeEditar}
                    onClick={() =>
                      abrirAccion(
                        campana,
                        accion,
                      )
                    }
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      ACCIONES[accion].peligrosa
                        ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        : "border-slate-200 bg-white text-[#0B1C30] hover:bg-slate-50"
                    }`}
                  >
                    <span>
                      {obtenerTextoAccion(
                        accion,
                      )}
                    </span>

                    <Icono
                      nombre="flecha"
                      size={15}
                    />
                  </button>
                ),
              )}
            </div>

            {acciones.length === 0 && (
              <p className="text-xs text-slate-500">
                No hay acciones disponibles
                para este estado.
              </p>
            )}

            {campana.estado ===
              "borrador" && (
              <p className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-500">
                Una campaña en borrador
                permite preparar los lotes,
                pero no realizar ventas
                ni entregar premios.
              </p>
            )}

            {campana.estado ===
              "finalizada" && (
              <p className="rounded-lg bg-white p-3 text-xs leading-5 text-slate-500">
                La campaña ya está
                finalizada. Solo pueden
                modificarse los canjes
                cuando el servidor
                lo permita.
              </p>
            )}
          </div>
        )}
      </article>
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
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#0B1C30] text-[#F2C94C]">
            <Icono
              nombre="calendario"
              size={27}
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">
              Gestión de campañas
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Organiza tus campañas de
              códigos y rasca y gana,
              sus ventas y la entrega
              de premios.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={recargar}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1C30] transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Icono
              nombre="actualizar"
              size={17}
              className={
                cargando
                  ? "animate-spin"
                  : ""
              }
            />

            Actualizar
          </button>

          {puedeCrear && (
            <button
              type="button"
              onClick={abrirCreacion}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B1C30] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#18385D]"
            >
              <Icono
                nombre="mas"
                size={18}
              />

              Nueva campaña
            </button>
          )}
        </div>
      </section>

      {/* INDICADORES */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          titulo={
            filtroEstado === "todos" &&
            !busquedaAplicada
              ? "Campañas totales"
              : "Resultados del filtro"
          }
          valor={
            cargando ? "—" : total
          }
          icono="calendario"
        />

        <Indicador
          titulo="Borradores en página"
          valor={
            cargando
              ? "—"
              : resumen.borradores
          }
          icono="editar"
          color="amarillo"
        />

        <Indicador
          titulo="Activas en página"
          valor={
            cargando
              ? "—"
              : resumen.activas
          }
          icono="play"
        />

        <Indicador
          titulo="Finalizadas en página"
          valor={
            cargando
              ? "—"
              : resumen.finalizadas
          }
          icono="bandera"
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
              size={19}
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

      {errorListado && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p className="font-semibold">
            No se ha podido actualizar
            el listado de campañas.
          </p>

          <p className="mt-1 text-xs">
            {errorListado}
          </p>

          <button
            type="button"
            onClick={recargar}
            className="mt-2 text-xs font-bold underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* BÚSQUEDA Y FILTROS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Icono
              nombre="buscar"
              size={19}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={busqueda}
              onChange={(evento) => {
                setBusqueda(
                  evento.target.value,
                );
                setPagina(1);
              }}
              placeholder="Buscar campañas por nombre..."
              aria-label="Buscar campañas"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[#245F91] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                {
                  id: "todos",
                  texto: "Todas",
                },
                {
                  id: "borrador",
                  texto: "Borradores",
                },
                {
                  id: "activa",
                  texto: "Activas",
                },
                {
                  id: "finalizada",
                  texto: "Finalizadas",
                },
              ] as const
            ).map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                aria-pressed={
                  filtroEstado ===
                  opcion.id
                }
                onClick={() =>
                  cambiarFiltro(
                    opcion.id,
                  )
                }
                className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors ${
                  filtroEstado ===
                  opcion.id
                    ? "bg-[#0B1C30] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opcion.texto}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {cargando
              ? "Cargando campañas..."
              : `${formatearNumero(total)} campañas encontradas`}
          </p>

          <p className="text-xs text-slate-400">
            Club Bàsquet Andratx
          </p>
        </div>
      </section>

      {/* LISTADO */}

      {cargando ? (
        <div
          role="status"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {[1, 2, 3, 4, 5, 6].map(
            (numero) => (
              <div
                key={numero}
                className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="h-12 w-12 rounded-xl bg-slate-100" />
                <div className="mt-5 h-4 w-40 rounded bg-slate-100" />
                <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                <div className="mt-6 h-16 rounded-xl bg-slate-100" />
                <div className="mt-4 h-12 rounded-xl bg-slate-100" />
              </div>
            ),
          )}
        </div>
      ) : campanas.length === 0 ? (
        <EstadoVacio
          titulo={
            total === 0 &&
            filtroEstado === "todos" &&
            !busquedaAplicada
              ? "Todavía no hay campañas"
              : "No hay coincidencias"
          }
          descripcion={
            filtroEstado === "todos" &&
            !busquedaAplicada
              ? "Crea tu primera campaña para empezar a preparar los lotes de boletos y premios del club."
              : "No se han encontrado campañas con los filtros seleccionados."
          }
          accion={
            puedeCrear &&
            filtroEstado === "todos" &&
            !busquedaAplicada ? (
              <button
                type="button"
                onClick={abrirCreacion}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B1C30] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#18385D]"
              >
                <Icono
                  nombre="mas"
                  size={18}
                />

                Crear campaña
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campanas.map(
            mostrarCampana,
          )}
        </div>
      )}

      {/* PAGINACIÓN */}

      {!cargando &&
        totalPaginas > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">
              Página {pagina} de{" "}
              {totalPaginas}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() =>
                  setPagina(
                    (anterior) =>
                      Math.max(
                        1,
                        anterior - 1,
                      ),
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-[#0B1C30] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={
                  pagina >= totalPaginas
                }
                onClick={() =>
                  setPagina(
                    (anterior) =>
                      Math.min(
                        totalPaginas,
                        anterior + 1,
                      ),
                  )
                }
                className="rounded-xl bg-[#0B1C30] px-4 py-2 text-xs font-semibold text-white hover:bg-[#18385D] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

      {/* NOTA INFORMATIVA */}

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFF5FA] text-[#245F91]">
          <Icono
            nombre="check"
            size={20}
          />
        </div>

        <p className="text-xs leading-6 text-slate-500 sm:text-sm">
          Las ventas y los canjes se
          controlan por separado.
          Una campaña puede tener las
          ventas cerradas y continuar
          entregando premios. La fecha
          configurada de una campaña
          no provoca por sí sola su
          activación automática.
        </p>
      </div>

      {/* ===================================== */}
      {/* MODAL CREACIÓN Y EDICIÓN */}
      {/* ===================================== */}

      {dialogo?.tipo ===
        "formulario" && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B1C30]/65 p-3 backdrop-blur-[3px] sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-formulario-campana"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            {/* CABECERA */}

            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="titulo-formulario-campana"
                  className="text-lg font-bold"
                >
                  {dialogo.modo === "crear"
                    ? "Nueva campaña"
                    : "Editar campaña"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {dialogo.modo === "crear"
                    ? "Configura una nueva campaña del club."
                    : "Modifica la información y las fechas."}
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar formulario"
                disabled={enviando}
                onClick={cerrarDialogo}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <Icono
                  nombre="cerrar"
                  size={21}
                />
              </button>
            </div>

            {/* FORMULARIO */}

            <form
              onSubmit={(evento) =>
                void guardarFormulario(
                  evento,
                )
              }
              className="space-y-5 p-5 sm:p-6"
            >
              {errorDialogo && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <Icono
                    nombre="alerta"
                    size={19}
                    className="shrink-0"
                  />

                  <span>
                    {errorDialogo}
                  </span>
                </div>
              )}

              <Campo
                id="campana-nombre"
                titulo="Nombre de la campaña *"
                error={
                  erroresCampos.nombre
                }
              >
                <input
                  id="campana-nombre"
                  type="text"
                  required
                  autoFocus
                  maxLength={120}
                  value={
                    formulario.nombre
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "nombre",
                      evento.target.value,
                    )
                  }
                  placeholder="Ej. Rasca y gana Navidad 2026"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white"
                />
              </Campo>

              <Campo
                id="campana-descripcion"
                titulo="Descripción"
                error={
                  erroresCampos.descripcion
                }
              >
                <textarea
                  id="campana-descripcion"
                  rows={3}
                  maxLength={2000}
                  value={
                    formulario.descripcion
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "descripcion",
                      evento.target.value,
                    )
                  }
                  placeholder="Descripción de la campaña..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white"
                />
              </Campo>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  id="campana-fecha-inicio"
                  titulo="Fecha de inicio"
                  error={
                    erroresCampos.fechaInicio
                  }
                >
                  <input
                    id="campana-fecha-inicio"
                    type="datetime-local"
                    value={
                      formulario.fechaInicio
                    }
                    onChange={(evento) =>
                      cambiarCampo(
                        "fechaInicio",
                        evento.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white"
                  />
                </Campo>

                <Campo
                  id="campana-fecha-fin"
                  titulo="Fecha de finalización"
                  error={
                    erroresCampos.fechaFin
                  }
                >
                  <input
                    id="campana-fecha-fin"
                    type="datetime-local"
                    value={
                      formulario.fechaFin
                    }
                    onChange={(evento) =>
                      cambiarCampo(
                        "fechaFin",
                        evento.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-[#245F91] focus:bg-white"
                  />
                </Campo>
              </div>

              {/* AVISO DE ESTADOS */}

              <div className="rounded-xl border border-[#D7E7F4] bg-[#EFF5FA] p-4">
                <p className="text-sm font-semibold text-[#174C78]">
                  {dialogo.modo === "crear"
                    ? "La campaña empezará en borrador"
                    : "Los estados se gestionan por separado"}
                </p>

                <p className="mt-2 text-xs leading-6 text-[#355A78]">
                  {dialogo.modo === "crear"
                    ? "Podrás preparar los lotes antes de activar la campaña. Las ventas reales y los canjes no se permitirán mientras siga en borrador."
                    : "Cambiar el nombre, la descripción o las fechas no abrirá ni cerrará las ventas o los canjes."}
                </p>
              </div>

              {/* BOTONES */}

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={cerrarDialogo}
                  disabled={enviando}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={enviando}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0B1C30] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#18385D] disabled:cursor-wait disabled:opacity-50"
                >
                  <Icono
                    nombre={
                      enviando
                        ? "actualizar"
                        : "check"
                    }
                    size={17}
                    className={
                      enviando
                        ? "animate-spin"
                        : ""
                    }
                  />

                  {enviando
                    ? "Guardando..."
                    : dialogo.modo === "crear"
                      ? "Crear campaña"
                      : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ===================================== */}
      {/* MODAL DE CONFIRMACIÓN DE ACCIÓN */}
      {/* ===================================== */}

      {dialogo?.tipo ===
        "accion" && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B1C30]/65 p-3 backdrop-blur-[3px] sm:p-6">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-accion-campana"
            aria-describedby="descripcion-accion-campana"
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                ACCIONES[dialogo.accion].peligrosa
                  ? "bg-amber-50 text-amber-700"
                  : "bg-[#EFF5FA] text-[#245F91]"
              }`}
            >
              <Icono
                nombre={
                  ACCIONES[dialogo.accion].peligrosa
                    ? "alerta"
                    : "ajustes"
                }
                size={27}
              />
            </div>

            <h2
              id="titulo-accion-campana"
              className="mt-5 text-xl font-bold"
            >
              {ACCIONES[dialogo.accion].titulo}
            </h2>

            <p className="mt-2 text-sm font-semibold text-[#245F91]">
              {dialogo.campana.nombre}
            </p>

            <p
              id="descripcion-accion-campana"
              className="mt-4 text-sm leading-7 text-slate-600"
            >
              {ACCIONES[dialogo.accion].descripcion}
            </p>

            {(
              dialogo.accion ===
                "cerrar_ventas" ||
              dialogo.accion ===
                "reactivar_venta"
            ) && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs leading-6 text-amber-900">
                  Esta operación puede
                  afectar a muchos boletos.
                  Si se interrumpe, será
                  necesario consultar el
                  estado real de la campaña
                  antes de repetirla.
                </p>
              </div>
            )}

            {errorDialogo && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3"
              >
                <p className="text-xs leading-6 text-red-700">
                  {errorDialogo}
                </p>

                <p className="mt-2 text-xs text-red-700">
                  Comprueba el estado de
                  la campaña antes de
                  reintentar la acción.
                </p>
              </div>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={confirmacion}
                onChange={(evento) =>
                  setConfirmacion(
                    evento.target.checked,
                  )
                }
                disabled={enviando}
                className="mt-1 h-4 w-4 shrink-0 accent-[#0B1C30]"
              />

              <span className="text-xs font-medium leading-6 text-slate-600">
                {ACCIONES[dialogo.accion].confirmacion}
              </span>
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={cerrarDialogo}
                disabled={enviando}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#0B1C30] hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void confirmarAccion()
                }
                disabled={
                  !confirmacion ||
                  enviando
                }
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${
                  ACCIONES[dialogo.accion].peligrosa
                    ? "bg-amber-700 hover:bg-amber-800"
                    : "bg-[#0B1C30] hover:bg-[#18385D]"
                }`}
              >
                <Icono
                  nombre={
                    enviando
                      ? "actualizar"
                      : "check"
                  }
                  size={17}
                  className={
                    enviando
                      ? "animate-spin"
                      : ""
                  }
                />

                {enviando
                  ? "Procesando..."
                  : ACCIONES[dialogo.accion].boton}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export {
  CampanasCodigosPanel,
};
