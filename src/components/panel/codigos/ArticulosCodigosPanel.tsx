
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type {
  ArticuloCodigosPanel,
  ErrorCampoCodigos,
} from "@tipos/CodigosPanel";

/*
 * C.B. ANDRATX
 * Gestión de artículos y premios.
 *
 * Funcionalidades:
 *
 * - Listar artículos.
 * - Buscar por nombre y descripción.
 * - Filtrar activos e inactivos.
 * - Crear artículos.
 * - Editar artículos.
 * - Activar y desactivar.
 * - Eliminar lógicamente.
 * - Previsualizar imágenes.
 *
 * No consulta resultados de boletos
 * ni revela premios asignados.
 */

// ================================================
// TIPOS
// ================================================

type FiltroArticulos =
  | "todos"
  | "activos"
  | "inactivos";

type TipoMensaje =
  | "exito"
  | "error";

type NombreIcono =
  | "regalo"
  | "buscar"
  | "mas"
  | "editar"
  | "eliminar"
  | "activar"
  | "desactivar"
  | "cerrar"
  | "actualizar"
  | "check"
  | "alerta"
  | "imagen"
  | "caja";

interface MensajePanel {
  tipo: TipoMensaje;
  texto: string;
}

interface FormularioArticulo {
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  activo: boolean;
}

interface RespuestaListado {
  articulos: ArticuloCodigosPanel[];
  total: number;
}

interface RespuestaDetalle {
  articulo: ArticuloCodigosPanel;
  eliminado: boolean;
}

interface RespuestaArticulo {
  articulo: ArticuloCodigosPanel;
}

interface RespuestaEliminacion {
  id: string;
  eliminado: boolean;
  articulo: ArticuloCodigosPanel;
}

interface RespuestaApi<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
  errores?: ErrorCampoCodigos[];
}

type Dialogo =
  | {
      tipo: "formulario";
      modo: "crear" | "editar";
      articuloId: string | null;
    }
  | {
      tipo: "eliminar";
      articulo: ArticuloCodigosPanel;
    };

export interface ArticulosCodigosPanelProps {
  onActualizado?: () => void;

  /*
   * Los permisos son opcionales porque
   * el panel principal todavía no
   * recibe una matriz específica
   * del módulo de códigos.
   *
   * La autorización real siempre
   * se realiza en las API.
   */
  permisos?: {
    crear?: boolean;
    editar?: boolean;
    eliminar?: boolean;
  };
}

// ================================================
// CONFIGURACIÓN
// ================================================

const API_ARTICULOS =
  "/api/panel/codigos/articulos";

const FORMULARIO_VACIO: FormularioArticulo = {
  nombre: "",
  descripcion: "",
  imagenUrl: "",
  activo: true,
};

// ================================================
// ERRORES DE API
// ================================================

class ErrorPeticion
  extends Error {
  status: number;
  errores: ErrorCampoCodigos[];

  constructor(
    mensaje: string,
    status: number,
    errores: ErrorCampoCodigos[] = [],
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

function obtenerMensajeError(
  error: unknown,
): string {
  if (
    error instanceof ErrorPeticion
  ) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Se ha producido un error inesperado.";
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

  error.errores.forEach(
    (elemento) => {
      if (
        !resultado[elemento.campo]
      ) {
        resultado[elemento.campo] =
          elemento.mensaje;
      }
    },
  );

  return resultado;
}

function normalizarBusqueda(
  valor: string,
): string {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLocaleLowerCase("es")
    .trim();
}

function obtenerRutaImagenSegura(
  valor: string | null | undefined,
): string | null {
  if (
    !valor ||
    !valor.trim()
  ) {
    return null;
  }

  const ruta =
    valor.trim();

  /*
   * Permitimos rutas locales
   * absolutas, por ejemplo:
   *
   * /img/articulos/lanyard.png
   */

  if (
    ruta.startsWith("/") &&
    !ruta.startsWith("//") &&
    !ruta.startsWith("/\\")
  ) {
    return ruta;
  }

  /*
   * También imágenes alojadas
   * mediante HTTPS.
   *
   * Se rechazan esquemas como:
   *
   * javascript:
   * data:
   * file:
   */

  try {
    const url =
      new URL(ruta);

    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password
    ) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

// ================================================
// PETICIONES A LAS API
// ================================================

async function solicitarApi<T>(
  ruta: string,
  opciones: {
    metodo?: "GET" | "POST" | "PATCH" | "DELETE";
    datos?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const metodo =
    opciones.metodo ?? "GET";

  const tieneContenido =
    opciones.datos !== undefined;

  const respuesta =
    await fetch(ruta, {
      method: metodo,

      credentials: "same-origin",

      cache: "no-store",

      signal: opciones.signal,

      headers: {
        Accept: "application/json",

        ...(tieneContenido
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
      },

      ...(tieneContenido
        ? {
            body: JSON.stringify(
              opciones.datos,
            ),
          }
        : {}),
    });

  let contenido:
    RespuestaApi<T>;

  try {
    contenido =
      (await respuesta.json()) as
        RespuestaApi<T>;
  } catch {
    throw new ErrorPeticion(
      "El servidor no ha devuelto una respuesta válida.",
      respuesta.status,
    );
  }

  if (
    !contenido ||
    typeof contenido !== "object"
  ) {
    throw new ErrorPeticion(
      "La respuesta del servidor no es válida.",
      respuesta.status,
    );
  }

  if (
    !respuesta.ok ||
    contenido.ok !== true ||
    contenido.data === null
  ) {
    throw new ErrorPeticion(
      typeof contenido.error === "string"
        ? contenido.error
        : "No se ha podido completar la operación.",

      respuesta.status,

      Array.isArray(
        contenido.errores,
      )
        ? contenido.errores
        : [],
    );
  }

  return contenido.data;
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

    case "mas":
      contenido = (
        <path d="M12 5v14M5 12h14" />
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

    case "eliminar":
      contenido = (
        <>
          <path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7" />
        </>
      );
      break;

    case "activar":
      contenido = (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="m8 12 3 3 5-6" />
        </>
      );
      break;

    case "desactivar":
      contenido = (
        <>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M8 12h8" />
        </>
      );
      break;

    case "cerrar":
      contenido = (
        <path d="M5 5l14 14M19 5 5 19" />
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

    case "imagen":
      contenido = (
        <>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
          />
          <circle
            cx="8"
            cy="8"
            r="2"
          />
          <path d="m3 17 5-5 4 4 3-3 6 6" />
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
// IMAGEN DEL ARTÍCULO
// ================================================

function ImagenArticulo({
  url,
  nombre,
  grande = false,
}: {
  url: string | null;
  nombre: string;
  grande?: boolean;
}) {
  const [
    imagenRota,
    setImagenRota,
  ] = useState(false);

  const ruta =
    obtenerRutaImagenSegura(
      url,
    );

  useEffect(() => {
    setImagenRota(false);
  }, [ruta]);

  return (
    <div
      className={`
        flex shrink-0 items-center
        justify-center overflow-hidden
        rounded-xl bg-[#EFF5FA]
        text-[#245F91]
        ${
          grande
            ? "h-28 w-28"
            : "h-16 w-16"
        }
      `}
    >
      {ruta && !imagenRota ? (
        <img
          src={ruta}
          alt={nombre}
          loading="lazy"
          onError={() =>
            setImagenRota(
              true,
            )
          }
          className="h-full w-full object-contain p-2"
        />
      ) : (
        <Icono
          nombre="regalo"
          size={
            grande ? 36 : 25
          }
        />
      )}
    </div>
  );
}

// ================================================
// COMPONENTES VISUALES
// ================================================

function TarjetaResumen({
  titulo,
  valor,
  icono,
  color = "azul",
}: {
  titulo: string;
  valor: number | string;
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
        className={`
          flex h-11 w-11 shrink-0
          items-center justify-center
          rounded-xl
          ${
            color === "amarillo"
              ? "bg-[#FFF6D6] text-[#9C7011]"
              : "bg-[#EFF5FA] text-[#245F91]"
          }
        `}
      >
        <Icono
          nombre={icono}
          size={22}
        />
      </div>
    </div>
  );
}

function CampoFormulario({
  id,
  titulo,
  error,
  children,
  ayuda,
}: {
  id: string;
  titulo: string;
  error?: string;
  ayuda?: string;
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
        <p
          role="alert"
          className="text-xs font-medium text-red-600"
        >
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
        <Icono
          nombre="caja"
          size={30}
        />
      </div>

      <h3 className="mt-4 text-base font-bold text-[#0B1C30]">
        {titulo}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {descripcion}
      </p>

      {accion && (
        <div className="mt-5">
          {accion}
        </div>
      )}
    </div>
  );
}

// ================================================
// COMPONENTE PRINCIPAL
// ================================================

export default function ArticulosCodigosPanel({
  onActualizado,
  permisos,
}: ArticulosCodigosPanelProps) {
  const [
    articulos,
    setArticulos,
  ] = useState<ArticuloCodigosPanel[]>([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    revision,
    setRevision,
  ] = useState(0);

  const [
    errorListado,
    setErrorListado,
  ] = useState<string | null>(
    null,
  );

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtro,
    setFiltro,
  ] = useState<FiltroArticulos>(
    "todos",
  );

  const [
    mensaje,
    setMensaje,
  ] = useState<MensajePanel | null>(
    null,
  );

  const [
    dialogo,
    setDialogo,
  ] = useState<Dialogo | null>(
    null,
  );

  const [
    formulario,
    setFormulario,
  ] = useState<FormularioArticulo>(
    FORMULARIO_VACIO,
  );

  const [
    erroresCampos,
    setErroresCampos,
  ] = useState<Record<string, string>>(
    {},
  );

  const [
    errorFormulario,
    setErrorFormulario,
  ] = useState<string | null>(
    null,
  );

  const [
    enviando,
    setEnviando,
  ] = useState(false);

  const [
    procesandoId,
    setProcesandoId,
  ] = useState<string | null>(
    null,
  );

  const [
    confirmacionEliminacion,
    setConfirmacionEliminacion,
  ] = useState(false);

  /*
   * Guardamos los artículos que ya
   * sabemos que están eliminados.
   *
   * El listado devuelve activo,
   * pero no devuelve eliminado.
   *
   * El detalle sí permite conocer
   * el estado de eliminación lógica.
   */

  const [
    eliminados,
    setEliminados,
  ] = useState<Record<string, boolean>>(
    {},
  );

  const puedeCrear =
    permisos?.crear !== false;

  const puedeEditar =
    permisos?.editar !== false;

  const puedeEliminar =
    permisos?.eliminar !== false;

  // ============================================
  // CARGAR ARTÍCULOS
  // ============================================

  useEffect(() => {
    const controlador =
      new AbortController();

    setCargando(true);
    setErrorListado(null);

    solicitarApi<RespuestaListado>(
      API_ARTICULOS,
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

        setArticulos(
          resultado.articulos,
        );
      })
      .catch((error: unknown) => {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        setErrorListado(
          obtenerMensajeError(
            error,
          ),
        );
      })
      .finally(() => {
        if (
          !controlador.signal.aborted
        ) {
          setCargando(false);
        }
      });

    return () => {
      controlador.abort();
    };
  }, [revision]);

  // ============================================
  // CERRAR DIÁLOGOS CON ESCAPE
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
        setErroresCampos({});
        setErrorFormulario(null);
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
  // ESTADÍSTICAS GENERALES
  // ============================================

  const resumen =
    useMemo(() => {
      const activos =
        articulos.filter(
          (articulo) =>
            articulo.activo &&
            !eliminados[articulo.id],
        ).length;

      return {
        total:
          articulos.length,

        activos,

        inactivos:
          articulos.length -
          activos,
      };
    }, [
      articulos,
      eliminados,
    ]);

  // ============================================
  // BUSCADOR Y FILTROS
  // ============================================

  const articulosVisibles =
    useMemo(() => {
      const texto =
        normalizarBusqueda(
          busqueda,
        );

      return articulos
        .filter((articulo) => {
          const activo =
            articulo.activo &&
            !eliminados[articulo.id];

          if (
            filtro === "activos" &&
            !activo
          ) {
            return false;
          }

          if (
            filtro === "inactivos" &&
            activo
          ) {
            return false;
          }

          if (!texto) {
            return true;
          }

          const contenido =
            normalizarBusqueda(
              [
                articulo.nombre,
                articulo.descripcion ?? "",
              ].join(" "),
            );

          return contenido.includes(
            texto,
          );
        })
        .sort(
          (primero, segundo) =>
            primero.nombre.localeCompare(
              segundo.nombre,
              "es",
              {
                sensitivity: "base",
              },
            ),
        );
    }, [
      articulos,
      filtro,
      busqueda,
      eliminados,
    ]);

  // ============================================
  // ACTUALIZAR LISTADO
  // ============================================

  function recargar() {
    setRevision(
      (anterior) =>
        anterior + 1,
    );
  }

  function informarActualizacion() {
    recargar();

    onActualizado?.();
  }

  // ============================================
  // ABRIR NUEVO ARTÍCULO
  // ============================================

  function abrirCreacion() {
    if (!puedeCrear) {
      return;
    }

    setFormulario({
      ...FORMULARIO_VACIO,
    });

    setErroresCampos({});
    setErrorFormulario(null);
    setMensaje(null);

    setDialogo({
      tipo: "formulario",
      modo: "crear",
      articuloId: null,
    });
  }

  // ============================================
  // CONSULTAR DETALLE PROTEGIDO
  // ============================================

  async function consultarDetalle(
    articuloId: string,
  ): Promise<RespuestaDetalle> {
    const detalle =
      await solicitarApi<RespuestaDetalle>(
        `${API_ARTICULOS}/${encodeURIComponent(articuloId)}`,
      );

    setEliminados(
      (anteriores) => ({
        ...anteriores,
        [articuloId]:
          detalle.eliminado,
      }),
    );

    return detalle;
  }

  // ============================================
  // ABRIR EDICIÓN
  // ============================================

  async function abrirEdicion(
    articuloId: string,
  ) {
    if (
      !puedeEditar ||
      procesandoId
    ) {
      return;
    }

    setProcesandoId(
      articuloId,
    );

    setMensaje(null);

    try {
      const detalle =
        await consultarDetalle(
          articuloId,
        );

      if (
        detalle.eliminado
      ) {
        setMensaje({
          tipo: "error",
          texto:
            "Este artículo fue eliminado lógicamente y no se puede editar ni reactivar.",
        });

        return;
      }

      const articulo =
        detalle.articulo;

      setFormulario({
        nombre:
          articulo.nombre,

        descripcion:
          articulo.descripcion ?? "",

        imagenUrl:
          articulo.imagenUrl ?? "",

        activo:
          articulo.activo,
      });

      setErroresCampos({});
      setErrorFormulario(null);

      setDialogo({
        tipo: "formulario",
        modo: "editar",
        articuloId:
          articulo.id,
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          obtenerMensajeError(
            error,
          ),
      });
    } finally {
      setProcesandoId(null);
    }
  }

  // ============================================
  // ACTIVAR O DESACTIVAR
  // ============================================

  async function cambiarActividad(
    articuloId: string,
  ) {
    if (
      !puedeEditar ||
      procesandoId
    ) {
      return;
    }

    setProcesandoId(
      articuloId,
    );

    setMensaje(null);

    try {
      const detalle =
        await consultarDetalle(
          articuloId,
        );

      if (
        detalle.eliminado
      ) {
        throw new Error(
          "Este artículo fue eliminado y no se puede reactivar.",
        );
      }

      const nuevoEstado =
        !detalle.articulo.activo;

      await solicitarApi<RespuestaArticulo>(
        `${API_ARTICULOS}/${encodeURIComponent(articuloId)}`,
        {
          metodo: "PATCH",

          datos: {
            activo:
              nuevoEstado,
          },
        },
      );

      setMensaje({
        tipo: "exito",

        texto:
          nuevoEstado
            ? "Artículo activado correctamente."
            : "Artículo desactivado correctamente.",
      });

      informarActualizacion();
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          obtenerMensajeError(
            error,
          ),
      });

      /*
       * Si la respuesta es incierta,
       * recuperamos el estado real.
       */
      recargar();
    } finally {
      setProcesandoId(null);
    }
  }

  // ============================================
  // ABRIR CONFIRMACIÓN DE ELIMINACIÓN
  // ============================================

  async function abrirEliminacion(
    articuloId: string,
  ) {
    if (
      !puedeEliminar ||
      procesandoId
    ) {
      return;
    }

    setProcesandoId(
      articuloId,
    );

    setMensaje(null);

    try {
      const detalle =
        await consultarDetalle(
          articuloId,
        );

      if (
        detalle.eliminado
      ) {
        setMensaje({
          tipo: "error",
          texto:
            "Este artículo ya se había eliminado anteriormente.",
        });

        return;
      }

      setConfirmacionEliminacion(false);

      setDialogo({
        tipo: "eliminar",
        articulo:
          detalle.articulo,
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          obtenerMensajeError(
            error,
          ),
      });
    } finally {
      setProcesandoId(null);
    }
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
        "El nombre debe contener entre 2 y 120 caracteres.";
    }

    if (
      formulario.descripcion.length >
      2000
    ) {
      errores.descripcion =
        "La descripción es demasiado larga.";
    }

    const url =
      formulario.imagenUrl.trim();

    if (
      url &&
      !obtenerRutaImagenSegura(url)
    ) {
      errores.imagenUrl =
        "Introduce una ruta local que empiece por / o una URL HTTPS válida.";
    }

    return errores;
  }

  // ============================================
  // GUARDAR FORMULARIO
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

    setErroresCampos(
      errores,
    );

    if (
      Object.keys(errores).length > 0
    ) {
      return;
    }

    setEnviando(true);
    setErrorFormulario(null);

    const datos = {
      nombre:
        formulario.nombre.trim(),

      descripcion:
        formulario.descripcion.trim() ||
        null,

      imagenUrl:
        formulario.imagenUrl.trim() ||
        null,

      activo:
        formulario.activo,
    };

    try {
      if (
        dialogo.modo === "crear"
      ) {
        await solicitarApi<RespuestaArticulo>(
          API_ARTICULOS,
          {
            metodo: "POST",
            datos,
          },
        );

        setMensaje({
          tipo: "exito",
          texto:
            "El artículo se ha creado correctamente.",
        });
      } else {
        if (
          !dialogo.articuloId
        ) {
          throw new Error(
            "No se ha podido identificar el artículo.",
          );
        }

        /*
         * Volvemos a comprobar que no
         * haya sido eliminado mientras
         * el formulario estaba abierto.
         */

        const detalle =
          await consultarDetalle(
            dialogo.articuloId,
          );

        if (
          detalle.eliminado
        ) {
          throw new Error(
            "Este artículo ha sido eliminado y ya no puede modificarse.",
          );
        }

        await solicitarApi<RespuestaArticulo>(
          `${API_ARTICULOS}/${encodeURIComponent(dialogo.articuloId)}`,
          {
            metodo: "PATCH",
            datos,
          },
        );

        setMensaje({
          tipo: "exito",
          texto:
            "Los cambios del artículo se han guardado.",
        });
      }

      setDialogo(null);
      informarActualizacion();
    } catch (error) {
      setErrorFormulario(
        obtenerMensajeError(
          error,
        ),
      );

      setErroresCampos(
        obtenerErroresCampos(
          error,
        ),
      );
    } finally {
      setEnviando(false);
    }
  }

  // ============================================
  // CONFIRMAR ELIMINACIÓN
  // ============================================

  async function confirmarEliminacion() {
    if (
      !dialogo ||
      dialogo.tipo !== "eliminar" ||
      !confirmacionEliminacion ||
      enviando
    ) {
      return;
    }

    const articulo =
      dialogo.articulo;

    setEnviando(true);
    setErrorFormulario(null);

    try {
      await solicitarApi<RespuestaEliminacion>(
        `${API_ARTICULOS}/${encodeURIComponent(articulo.id)}`,
        {
          metodo: "DELETE",
        },
      );

      setEliminados(
        (anteriores) => ({
          ...anteriores,
          [articulo.id]: true,
        }),
      );

      setDialogo(null);

      setMensaje({
        tipo: "exito",
        texto:
          `El artículo "${articulo.nombre}" se ha eliminado lógicamente. Los premios ya generados se conservan.`,
      });

      informarActualizacion();
    } catch (error) {
      setErrorFormulario(
        obtenerMensajeError(
          error,
        ),
      );

      /*
       * La API modifica el artículo
       * y registra la auditoría en
       * operaciones separadas.
       *
       * Si hubo un fallo parcial,
       * se debe comprobar su estado.
       */

      recargar();
    } finally {
      setEnviando(false);
    }
  }

  // ============================================
  // CERRAR DIÁLOGO
  // ============================================

  function cerrarDialogo() {
    if (enviando) {
      return;
    }

    setDialogo(null);
    setErroresCampos({});
    setErrorFormulario(null);
    setConfirmacionEliminacion(false);
  }

  // ============================================
  // CAMBIAR CAMPO DEL FORMULARIO
  // ============================================

  function cambiarCampo<K extends keyof FormularioArticulo>(
    campo: K,
    valor: FormularioArticulo[K],
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
  // RENDER PRINCIPAL
  // ============================================

  return (
    <div className="space-y-6 text-[#0B1C30]">
      {/* CABECERA */}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-[#0B1C30] text-[#F2C94C]">
            <Icono
              nombre="regalo"
              size={27}
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight sm:text-xl">
              Artículos y premios
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              Gestiona los productos disponibles
              para las campañas de códigos y
              rasca y gana.
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

              Nuevo artículo
            </button>
          )}
        </div>
      </section>

      {/* INDICADORES */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TarjetaResumen
          titulo="Artículos totales"
          valor={
            cargando && articulos.length === 0
              ? "—"
              : resumen.total
          }
          icono="caja"
        />

        <TarjetaResumen
          titulo="Artículos activos"
          valor={
            cargando && articulos.length === 0
              ? "—"
              : resumen.activos
          }
          icono="activar"
        />

        <TarjetaResumen
          titulo="Inactivos o eliminados"
          valor={
            cargando && articulos.length === 0
              ? "—"
              : resumen.inactivos
          }
          icono="desactivar"
          color="amarillo"
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
          className={`
            flex items-start justify-between
            gap-3 rounded-xl border p-4
            ${
              mensaje.tipo === "exito"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }
          `}
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
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
        >
          <Icono
            nombre="alerta"
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="text-sm font-semibold">
              No se ha podido actualizar el catálogo
            </p>

            <p className="mt-1 text-xs leading-5">
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
        </div>
      )}

      {/* BUSCADOR Y FILTROS */}

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
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value,
                )
              }
              placeholder="Buscar artículos o premios..."
              aria-label="Buscar artículos"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-[#0B1C30] outline-none transition-colors placeholder:text-slate-400 focus:border-[#245F91] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                {
                  id: "todos",
                  nombre: "Todos",
                },
                {
                  id: "activos",
                  nombre: "Activos",
                },
                {
                  id: "inactivos",
                  nombre: "Inactivos",
                },
              ] as const
            ).map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                aria-pressed={
                  filtro === opcion.id
                }
                onClick={() =>
                  setFiltro(
                    opcion.id,
                  )
                }
                className={`
                  rounded-xl px-4 py-2.5
                  text-xs font-semibold
                  transition-colors
                  ${
                    filtro === opcion.id
                      ? "bg-[#0B1C30] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }
                `}
              >
                {opcion.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {articulosVisibles.length}{" "}
            artículos mostrados
          </p>

          <p className="text-xs text-slate-400">
            Catálogo de C.B. Andratx
          </p>
        </div>
      </section>

      {/* LISTADO */}

      {cargando && articulos.length === 0 ? (
        <div
          role="status"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {[1, 2, 3, 4, 5, 6].map(
            (numero) => (
              <div
                key={numero}
                className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="h-14 w-14 rounded-xl bg-slate-100" />
                <div className="mt-5 h-4 w-40 rounded bg-slate-100" />
                <div className="mt-3 h-3 w-56 max-w-full rounded bg-slate-100" />
                <div className="mt-5 h-8 w-full rounded-lg bg-slate-100" />
              </div>
            ),
          )}
        </div>
      ) : articulosVisibles.length === 0 ? (
        <EstadoVacio
          titulo={
            articulos.length === 0
              ? "Todavía no hay artículos"
              : "No hay coincidencias"
          }
          descripcion={
            articulos.length === 0
              ? "Añade tu primer artículo para preparar los premios de las campañas del club."
              : "No se han encontrado artículos con los filtros seleccionados."
          }
          accion={
            articulos.length === 0 &&
            puedeCrear ? (
              <button
                type="button"
                onClick={abrirCreacion}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B1C30] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#18385D]"
              >
                <Icono
                  nombre="mas"
                  size={18}
                />

                Crear artículo
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {articulosVisibles.map(
            (articulo) => {
              const eliminado =
                eliminados[
                  articulo.id
                ] === true;

              const activo =
                articulo.activo &&
                !eliminado;

              const procesando =
                procesandoId ===
                articulo.id;

              return (
                <article
                  key={articulo.id}
                  className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
                >
                  {/* IMAGEN Y ESTADO */}

                  <div className="flex items-start justify-between gap-3">
                    <ImagenArticulo
                      url={
                        articulo.imagenUrl
                      }
                      nombre={
                        articulo.nombre
                      }
                    />

                    <span
                      className={`
                        inline-flex shrink-0
                        items-center rounded-full
                        px-2.5 py-1 text-[11px]
                        font-semibold ring-1
                        ring-inset
                        ${
                          eliminado
                            ? "bg-red-50 text-red-700 ring-red-200"
                            : activo
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-slate-200"
                        }
                      `}
                    >
                      {eliminado
                        ? "Eliminado"
                        : activo
                          ? "Activo"
                          : "Inactivo"}
                    </span>
                  </div>

                  {/* INFORMACIÓN */}

                  <div className="mt-4 min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-base font-bold text-[#0B1C30]">
                      {articulo.nombre}
                    </h3>

                    <p className="mt-2 line-clamp-3 min-h-10 text-xs leading-5 text-slate-500">
                      {articulo.descripcion ||
                        "Sin descripción."}
                    </p>
                  </div>

                  {/* ACCIONES */}

                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex gap-2">
                      {puedeEditar && (
                        <button
                          type="button"
                          disabled={
                            procesando ||
                            Boolean(
                              procesandoId,
                            ) ||
                            eliminado
                          }
                          onClick={() =>
                            void abrirEdicion(
                              articulo.id,
                            )
                          }
                          className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-[#0B1C30] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Icono
                            nombre="editar"
                            size={16}
                          />

                          Editar
                        </button>
                      )}

                      {puedeEditar && (
                        <button
                          type="button"
                          disabled={
                            Boolean(
                              procesandoId,
                            ) ||
                            eliminado
                          }
                          onClick={() =>
                            void cambiarActividad(
                              articulo.id,
                            )
                          }
                          className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-[#0B1C30] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Icono
                            nombre={
                              activo
                                ? "desactivar"
                                : "activar"
                            }
                            size={16}
                          />

                          {procesando
                            ? "Espera..."
                            : activo
                              ? "Desactivar"
                              : "Activar"}
                        </button>
                      )}
                    </div>

                    {puedeEliminar &&
                      !eliminado && (
                        <button
                          type="button"
                          disabled={Boolean(
                            procesandoId,
                          )}
                          onClick={() =>
                            void abrirEliminacion(
                              articulo.id,
                            )
                          }
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Icono
                            nombre="eliminar"
                            size={16}
                          />

                          Eliminar artículo
                        </button>
                      )}

                    {eliminado && (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
                        Eliminado lógicamente
                      </p>
                    )}
                  </div>
                </article>
              );
            },
          )}
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
          Los artículos se utilizan para
          identificar premios de las campañas.
          Desactivar un artículo impide
          seleccionarlo para nuevas
          generaciones, pero no elimina los
          resultados de boletos anteriores.
          La eliminación lógica conserva
          también su historial.
        </p>
      </div>

      {/* ===================================== */}
      {/* DIÁLOGO DE CREACIÓN Y EDICIÓN */}
      {/* ===================================== */}

      {dialogo?.tipo ===
        "formulario" && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B1C30]/65 p-3 backdrop-blur-[3px] sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-formulario-articulo"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            {/* CABECERA */}

            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="titulo-formulario-articulo"
                  className="text-lg font-bold text-[#0B1C30]"
                >
                  {dialogo.modo ===
                  "crear"
                    ? "Nuevo artículo"
                    : "Editar artículo"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {dialogo.modo ===
                  "crear"
                    ? "Añade un premio al catálogo."
                    : "Modifica la información del artículo."}
                </p>
              </div>

              <button
                type="button"
                aria-label="Cerrar formulario"
                onClick={cerrarDialogo}
                disabled={enviando}
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
              {errorFormulario && (
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
                    {errorFormulario}
                  </span>
                </div>
              )}

              <CampoFormulario
                id="articulo-nombre"
                titulo="Nombre del artículo *"
                error={
                  erroresCampos.nombre
                }
              >
                <input
                  id="articulo-nombre"
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
                  placeholder="Ej. Lanyard C.B. Andratx"
                  aria-invalid={Boolean(
                    erroresCampos.nombre,
                  )}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#0B1C30] outline-none transition-colors focus:border-[#245F91] focus:bg-white"
                />
              </CampoFormulario>

              <CampoFormulario
                id="articulo-descripcion"
                titulo="Descripción"
                error={
                  erroresCampos.descripcion
                }
              >
                <textarea
                  id="articulo-descripcion"
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
                  placeholder="Información del premio o producto..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#0B1C30] outline-none transition-colors focus:border-[#245F91] focus:bg-white"
                />

                <p className="text-right text-[11px] text-slate-400">
                  {
                    formulario.descripcion
                      .length
                  }{" "}
                  / 2000
                </p>
              </CampoFormulario>

              <CampoFormulario
                id="articulo-imagen"
                titulo="Imagen del artículo"
                error={
                  erroresCampos.imagenUrl
                }
                ayuda="Utiliza una imagen HTTPS o una ruta de la carpeta public, por ejemplo /img/merchandising/lanyard.png."
              >
                <input
                  id="articulo-imagen"
                  type="text"
                  value={
                    formulario.imagenUrl
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "imagenUrl",
                      evento.target.value,
                    )
                  }
                  placeholder="/img/merchandising/articulo.png"
                  aria-invalid={Boolean(
                    erroresCampos.imagenUrl,
                  )}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#0B1C30] outline-none transition-colors focus:border-[#245F91] focus:bg-white"
                />
              </CampoFormulario>

              {/* PREVISUALIZACIÓN */}

              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold text-slate-600">
                  Vista previa
                </p>

                <div className="flex items-center gap-4">
                  <ImagenArticulo
                    url={
                      formulario.imagenUrl
                    }
                    nombre={
                      formulario.nombre ||
                      "Vista previa"
                    }
                    grande
                  />

                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-[#0B1C30]">
                      {formulario.nombre ||
                        "Nombre del artículo"}
                    </p>

                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                      {formulario.descripcion ||
                        "La descripción aparecerá aquí."}
                    </p>
                  </div>
                </div>
              </div>

              {/* ACTIVACIÓN */}

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-[#0B1C30]">
                    Artículo activo
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Disponible para generar
                    nuevos boletos premiados.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={
                    formulario.activo
                  }
                  onChange={(evento) =>
                    cambiarCampo(
                      "activo",
                      evento.target.checked,
                    )
                  }
                  className="h-5 w-5 shrink-0 accent-[#0B1C30]"
                />
              </label>

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
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0B1C30] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#18385D] disabled:cursor-wait disabled:opacity-60"
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
                    : dialogo.modo ===
                        "crear"
                      ? "Crear artículo"
                      : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ===================================== */}
      {/* CONFIRMACIÓN DE ELIMINACIÓN */}
      {/* ===================================== */}

      {dialogo?.tipo ===
        "eliminar" && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0B1C30]/65 p-3 backdrop-blur-[3px] sm:p-6">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-eliminar-articulo"
            aria-describedby="descripcion-eliminar-articulo"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Icono
                nombre="eliminar"
                size={26}
              />
            </div>

            <h2
              id="titulo-eliminar-articulo"
              className="mt-5 text-xl font-bold text-[#0B1C30]"
            >
              Eliminar artículo
            </h2>

            <p
              id="descripcion-eliminar-articulo"
              className="mt-3 text-sm leading-6 text-slate-600"
            >
              ¿Quieres eliminar lógicamente
              el artículo{" "}
              <strong>
                {dialogo.articulo.nombre}
              </strong>
              ?
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs leading-6 text-amber-900">
                El artículo dejará de estar
                disponible para nuevas
                generaciones de boletos.
                Los premios y registros
                anteriores se conservarán.
                No podrás reactivarlo desde
                la edición habitual.
              </p>
            </div>

            {errorFormulario && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-700"
              >
                {errorFormulario}
              </p>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={
                  confirmacionEliminacion
                }
                onChange={(evento) =>
                  setConfirmacionEliminacion(
                    evento.target.checked,
                  )
                }
                disabled={enviando}
                className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
              />

              <span className="text-xs leading-5 text-slate-600">
                Confirmo que quiero eliminar
                este artículo del catálogo
                de premios disponibles.
              </span>
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
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
                  void confirmarEliminacion()
                }
                disabled={
                  !confirmacionEliminacion ||
                  enviando
                }
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icono
                  nombre="eliminar"
                  size={17}
                />

                {enviando
                  ? "Eliminando..."
                  : "Confirmar eliminación"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export {
  ArticulosCodigosPanel,
};
