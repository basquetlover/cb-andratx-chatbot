
import type {
  APIRoute,
} from "astro";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  EstadoLoteCodigos,
  LoteCodigosPanel,
} from "@tipos/CodigosPanel";

import {
  obtenerAccesoCodigos,
  PERMISOS_CODIGOS,
  respuestaCorrectaCodigos,
  respuestaErrorCodigos,
} from "@servicios/backend/codigos/seguridadCodigos";

import {
  esUuidCodigos,
  validarCreacionLoteCodigos,
} from "@servicios/backend/codigos/validarDatosCodigos";

import {
  crearLoteCodigos,
  ErrorCrearLoteCodigos,
} from "@servicios/backend/codigos/crearLoteCodigos";

/*
 * C.B. ANDRATX
 * API de lotes del sistema de códigos.
 *
 * GET:
 * Obtener el listado de lotes,
 * con filtros y paginación.
 *
 * POST:
 * Generar un lote de códigos
 * y almacenar sus resultados
 * protegidos en Supabase.
 *
 * PERMISOS:
 *
 * GET  -> codigos.ver
 * POST -> codigos.crear
 *
 * Esta API nunca devuelve:
 *
 * - Premios individuales.
 * - Tokens QR en claro.
 * - Hashes de tokens.
 * - Datos cifrados.
 * - Índices HMAC de premios.
 */

export const prerender = false;

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_MAXIMO_SOLICITUD =
  32_768;

const PAGINA_PREDETERMINADA =
  1;

const LIMITE_PREDETERMINADO =
  20;

const LIMITE_MAXIMO =
  100;

const PAGINA_MAXIMA =
  10_000;

const ESTADOS_LOTE:
  readonly EstadoLoteCodigos[] = [
    "pendiente",
    "generando",
    "generado",
    "error",
  ];

const COLUMNAS_LOTE = `
  id,
  campana_id,
  plantilla_id,
  nombre,
  descripcion,
  cantidad_total,
  estado,
  clave_operacion,
  generado_por,
  generado_at,
  created_at,
  updated_at
`;

// ================================================
// TIPOS INTERNOS
// ================================================

interface FilaLote {
  id: string;

  campana_id: string;
  plantilla_id: string | null;

  nombre: string;
  descripcion: string | null;

  cantidad_total: number;
  estado: string;

  clave_operacion: string | null;

  generado_por: string | null;
  generado_at: string | null;

  created_at: string;
  updated_at: string | null;
}

interface FiltrosListadoLotes {
  campanaId: string | null;

  estado:
    | EstadoLoteCodigos
    | "todos";

  pagina: number;
  limite: number;
}

interface ResultadoListadoLotes {
  lotes: LoteCodigosPanel[];

  total: number;

  pagina: number;
  limite: number;
  totalPaginas: number;
}

// ================================================
// ERRORES DE LA API
// ================================================

class ErrorApiLotes
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorApiLotes";

    this.status = status;
  }
}

// ================================================
// CLIENTE PRIVADO DE SUPABASE
// ================================================

function obtenerClientePrivado():
  SupabaseClient {
  const supabaseUrl:
    string | undefined =
    import.meta.env.SUPABASE_URL;

  const clavePrivada:
    string | undefined =
    import.meta.env
      .SUPABASE_SERVICE_ROLE_KEY;

  const clavePublica:
    string | undefined =
    import.meta.env
      .SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !clavePrivada ||
    clavePrivada === clavePublica
  ) {
    throw new ErrorApiLotes(
      "No se ha configurado el acceso privado a Supabase.",
      500,
    );
  }

  /*
   * Este cliente solamente se
   * utiliza desde el backend.
   *
   * Los permisos se comprueban
   * antes de consultar o escribir.
   */

  return createClient(
    supabaseUrl,
    clavePrivada,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

// ================================================
// CONVERTIR FILA DE SUPABASE
// ================================================

function convertirFilaLote(
  fila: FilaLote,
): LoteCodigosPanel {
  /*
   * Rechazamos estados desconocidos.
   *
   * No los sustituimos por un
   * estado aparentemente válido.
   */

  if (
    !ESTADOS_LOTE.includes(
      fila.estado as EstadoLoteCodigos,
    )
  ) {
    throw new ErrorApiLotes(
      "Uno de los lotes contiene un estado no reconocido.",
      500,
    );
  }

  return {
    id: fila.id,

    campanaId:
      fila.campana_id,

    plantillaId:
      fila.plantilla_id,

    nombre:
      fila.nombre,

    descripcion:
      fila.descripcion,

    cantidadTotal:
      fila.cantidad_total,

    estado:
      fila.estado as EstadoLoteCodigos,

    claveOperacion:
      fila.clave_operacion,

    generadoPor:
      fila.generado_por,

    generadoAt:
      fila.generado_at,

    createdAt:
      fila.created_at,

    updatedAt:
      fila.updated_at ??
      fila.created_at,
  };
}

// ================================================
// OBTENER PARÁMETRO DE URL
// ================================================

function obtenerParametroUnico(
  parametros: URLSearchParams,
  nombre: string,
): string | null {
  const valores =
    parametros.getAll(
      nombre,
    );

  if (
    valores.length > 1
  ) {
    throw new ErrorApiLotes(
      `El parámetro ${nombre} no puede repetirse.`,
      400,
    );
  }

  return valores[0] ?? null;
}

// ================================================
// VALIDAR ENTERO POSITIVO
// ================================================

function validarEnteroPositivo(
  valor: string | null,
  predeterminado: number,
  maximo: number,
  campo: string,
): number {
  if (valor === null) {
    return predeterminado;
  }

  if (
    !/^[1-9][0-9]*$/.test(valor)
  ) {
    throw new ErrorApiLotes(
      `El parámetro ${campo} no es válido.`,
      400,
    );
  }

  const numero =
    Number(valor);

  if (
    !Number.isSafeInteger(numero) ||
    numero < 1 ||
    numero > maximo
  ) {
    throw new ErrorApiLotes(
      `El parámetro ${campo} debe estar entre 1 y ${maximo}.`,
      400,
    );
  }

  return numero;
}

// ================================================
// VALIDAR FILTROS DE LISTADO
// ================================================

function validarFiltrosLotes(
  parametros: URLSearchParams,
): FiltrosListadoLotes {
  const campanaIdTexto =
    obtenerParametroUnico(
      parametros,
      "campanaId",
    );

  const campanaId =
    campanaIdTexto
      ? campanaIdTexto.toLowerCase()
      : null;

  if (
    campanaId &&
    !esUuidCodigos(campanaId)
  ) {
    throw new ErrorApiLotes(
      "El identificador de la campaña no es válido.",
      400,
    );
  }

  const estadoTexto =
    obtenerParametroUnico(
      parametros,
      "estado",
    ) ?? "todos";

  if (
    estadoTexto !== "todos" &&
    !ESTADOS_LOTE.includes(
      estadoTexto as EstadoLoteCodigos,
    )
  ) {
    throw new ErrorApiLotes(
      "El estado seleccionado no es válido.",
      400,
    );
  }

  const pagina =
    validarEnteroPositivo(
      obtenerParametroUnico(
        parametros,
        "pagina",
      ),
      PAGINA_PREDETERMINADA,
      PAGINA_MAXIMA,
      "pagina",
    );

  const limite =
    validarEnteroPositivo(
      obtenerParametroUnico(
        parametros,
        "limite",
      ),
      LIMITE_PREDETERMINADO,
      LIMITE_MAXIMO,
      "limite",
    );

  return {
    campanaId,

    estado:
      estadoTexto as
        FiltrosListadoLotes["estado"],

    pagina,
    limite,
  };
}

// ================================================
// LEER JSON CON LÍMITE DE TAMAÑO
// ================================================

async function leerContenidoJson(
  request: Request,
): Promise<unknown> {
  const tipoContenido =
    request.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();

  if (
    tipoContenido !==
    "application/json"
  ) {
    throw new ErrorApiLotes(
      "El contenido de la petición debe enviarse en formato JSON.",
      415,
    );
  }

  const longitudDeclarada =
    request.headers.get(
      "content-length",
    );

  if (
    longitudDeclarada !== null
  ) {
    const longitud =
      Number(
        longitudDeclarada,
      );

    if (
      !Number.isSafeInteger(longitud) ||
      longitud < 0
    ) {
      throw new ErrorApiLotes(
        "El tamaño de la petición no es válido.",
        400,
      );
    }

    if (
      longitud >
      TAMANO_MAXIMO_SOLICITUD
    ) {
      throw new ErrorApiLotes(
        "La petición es demasiado grande.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ErrorApiLotes(
      "Debes enviar los datos del lote.",
      400,
    );
  }

  const lector =
    request.body.getReader();

  const decodificador =
    new TextDecoder(
      "utf-8",
      {
        fatal: true,
      },
    );

  let contenido = "";
  let bytesRecibidos = 0;

  let lecturaCompleta = false;

  try {
    while (true) {
      const {
        done,
        value,
      } = await lector.read();

      if (done) {
        lecturaCompleta = true;
        break;
      }

      bytesRecibidos +=
        value.byteLength;

      if (
        bytesRecibidos >
        TAMANO_MAXIMO_SOLICITUD
      ) {
        throw new ErrorApiLotes(
          "La petición supera el tamaño máximo permitido.",
          413,
        );
      }

      contenido +=
        decodificador.decode(
          value,
          {
            stream: true,
          },
        );
    }

    contenido +=
      decodificador.decode();
  } catch (error) {
    if (
      error instanceof
      ErrorApiLotes
    ) {
      throw error;
    }

    throw new ErrorApiLotes(
      "No se ha podido leer el contenido de la petición.",
      400,
    );
  } finally {
    if (!lecturaCompleta) {
      try {
        await lector.cancel();
      } catch {
        // No es necesario propagar
        // errores al cancelar la lectura.
      }
    }

    lector.releaseLock();
  }

  if (!contenido.trim()) {
    throw new ErrorApiLotes(
      "Debes proporcionar la configuración del lote.",
      400,
    );
  }

  try {
    return JSON.parse(
      contenido,
    ) as unknown;
  } catch {
    throw new ErrorApiLotes(
      "El contenido JSON no es válido.",
      400,
    );
  }
}

// ================================================
// CONSULTAR LISTADO DE LOTES
// ================================================

async function obtenerListadoLotes(
  filtros: FiltrosListadoLotes,
): Promise<ResultadoListadoLotes> {
  const cliente =
    obtenerClientePrivado();

  const desde =
    (filtros.pagina - 1) *
    filtros.limite;

  const hasta =
    desde +
    filtros.limite -
    1;

  let consulta =
    cliente
      .from("codigos_lotes")
      .select(
        COLUMNAS_LOTE,
        {
          count: "exact",
        },
      );

  if (filtros.campanaId) {
    consulta = consulta.eq(
      "campana_id",
      filtros.campanaId,
    );
  }

  if (
    filtros.estado !== "todos"
  ) {
    consulta = consulta.eq(
      "estado",
      filtros.estado,
    );
  }

  const {
    data,
    error,
    count,
  } = await consulta
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .order(
      "id",
      {
        ascending: false,
      },
    )
    .range(
      desde,
      hasta,
    );

  if (error) {
    console.error(
      "Error consultando lotes de códigos:",
      {
        codigoError:
          error.code,
      },
    );

    throw new ErrorApiLotes(
      "No se ha podido obtener el listado de lotes.",
      500,
    );
  }

  const filas =
    (data ?? []) as FilaLote[];

  const lotes =
    filas.map(
      convertirFilaLote,
    );

  const total =
    count ?? 0;

  return {
    lotes,

    total,

    pagina:
      filtros.pagina,

    limite:
      filtros.limite,

    totalPaginas:
      total === 0
        ? 0
        : Math.ceil(
            total /
            filtros.limite,
          ),
  };
}

// ================================================
// GET - LISTAR LOTES
// ================================================

export const GET: APIRoute =
  async (contexto) => {
    /*
     * El listado normal no muestra
     * qué premio corresponde a
     * cada código.
     *
     * Solo necesita codigos.ver.
     */

    const acceso =
      await obtenerAccesoCodigos(
        contexto,
        [
          PERMISOS_CODIGOS.ver,
        ],
      );

    if (!acceso.autorizado) {
      return acceso.respuesta;
    }

    try {
      const filtros =
        validarFiltrosLotes(
          contexto.url.searchParams,
        );

      const resultado =
        await obtenerListadoLotes(
          filtros,
        );

      return respuestaCorrectaCodigos(
        resultado,
        200,
      );
    } catch (error) {
      if (
        error instanceof
        ErrorApiLotes
      ) {
        if (
          error.status >= 500
        ) {
          console.error(
            "Error interno consultando lotes:",
            error,
          );
        }

        return respuestaErrorCodigos(
          error.status >= 500
            ? "No se ha podido consultar el listado de lotes."
            : error.message,
          error.status,
        );
      }

      console.error(
        "Error inesperado en GET /api/panel/codigos/lotes:",
        error,
      );

      return respuestaErrorCodigos(
        "No se ha podido obtener el listado de lotes.",
        500,
      );
    }
  };

// ================================================
// POST - GENERAR LOTE
// ================================================

export const POST: APIRoute =
  async (contexto) => {
    /*
     * La generación está reservada
     * a usuarios con codigos.crear.
     *
     * El acceso completo al panel
     * no sustituye la autorización
     * de este módulo, salvo para
     * usuarios con acceso_total.
     */

    const acceso =
      await obtenerAccesoCodigos(
        contexto,
        [
          PERMISOS_CODIGOS.crear,
        ],
      );

    if (!acceso.autorizado) {
      return acceso.respuesta;
    }

    // ============================================
    // 1. LEER LA PETICIÓN
    // ============================================

    let contenido: unknown;

    try {
      contenido =
        await leerContenidoJson(
          contexto.request,
        );
    } catch (error) {
      if (
        error instanceof
        ErrorApiLotes
      ) {
        return respuestaErrorCodigos(
          error.message,
          error.status,
        );
      }

      console.error(
        "Error leyendo solicitud de generación:",
        error,
      );

      return respuestaErrorCodigos(
        "No se ha podido procesar la solicitud.",
        500,
      );
    }

    // ============================================
    // 2. VALIDAR CONFIGURACIÓN
    // ============================================

    const validacion =
      validarCreacionLoteCodigos(
        contenido,
      );

    if (
      !validacion.valido ||
      !validacion.datos
    ) {
      return respuestaErrorCodigos(
        "Revisa la configuración del lote.",
        400,
        validacion.errores,
      );
    }

    /*
     * Solo se pasa al servicio
     * la información normalizada
     * por el validador.
     *
     * No se aceptan desde el
     * navegador datos como:
     *
     * - Código visible.
     * - Token QR.
     * - Hash del token.
     * - Resultado cifrado.
     * - Índice HMAC.
     * - Usuario creador.
     */

    const datos =
      validacion.datos;

    const usuarioId =
      acceso.sesion.usuario.id;

    // ============================================
    // 3. GENERAR Y GUARDAR
    // ============================================

    try {
      /*
       * El archivo 6/27 realiza:
       *
       * - Validación de campaña.
       * - Validación de plantilla.
       * - Comprobación de artículos.
       * - Mezcla aleatoria de premios.
       * - Generación de identificadores.
       * - Cifrado de tokens QR.
       * - Cifrado de premios.
       * - Almacenamiento en Supabase.
       * - Comprobación de cantidades.
       * - Finalización del lote.
       */

      const resultado =
        await crearLoteCodigos(
          datos,
          usuarioId,
        );

      /*
       * No devolvemos los secretos
       * de la generación.
       *
       * Los códigos visibles no
       * identifican los premios.
       *
       * Para imprimir el QR completo
       * se utilizará posteriormente
       * una API con el permiso
       * codigos.imprimir.
       */

      return respuestaCorrectaCodigos(
        {
          lote:
            resultado.lote,

          cantidadGenerada:
            resultado.cantidadGenerada,

          codigosVisibles:
            resultado.codigosVisibles,
        },
        201,
      );
    } catch (error) {
      // ==========================================
      // 4. ERRORES CONTROLADOS
      // ==========================================

      if (
        error instanceof
        ErrorCrearLoteCodigos
      ) {
        if (
          error.status >= 500
        ) {
          console.error(
            "Error interno generando lote:",
            {
              codigo:
                datos.claveOperacion,

              status:
                error.status,

              mensaje:
                error.message,
            },
          );
        }

        return respuestaErrorCodigos(
          error.status >= 500
            ? "No se ha podido completar la generación. Consulta el estado del lote antes de volver a intentarlo."
            : error.message,
          error.status,
          error.errores,
        );
      }

      // ==========================================
      // 5. ERRORES INESPERADOS
      // ==========================================

      console.error(
        "Error inesperado en POST /api/panel/codigos/lotes:",
        {
          claveOperacion:
            datos.claveOperacion,

          mensaje:
            error instanceof Error
              ? error.message
              : "Error desconocido",
        },
      );

      /*
       * No debemos pedir al usuario
       * que genere otra clave sin
       * revisar el lote anterior.
       *
       * La escritura puede haberse
       * completado aunque se haya
       * interrumpido la respuesta.
       */

      return respuestaErrorCodigos(
        "No se ha podido confirmar la generación. Consulta el listado de lotes antes de repetir la operación.",
        500,
      );
    }
  };

// ================================================
// MÉTODOS NO PERMITIDOS
// ================================================

export const ALL: APIRoute =
  async () => {
    return Response.json(
      {
        ok: false,

        data: null,

        error:
          "Método no permitido.",

        errores: [],
      },
      {
        status: 405,

        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",

          "Content-Type":
            "application/json; charset=utf-8",

          "X-Content-Type-Options":
            "nosniff",

          Allow:
            "GET, HEAD, POST",
        },
      },
    );
  };

// ================================================
// FIN DEL ARCHIVO
// ================================================
