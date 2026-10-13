
import type {
  APIRoute,
} from "astro";

import {
  createClient,
} from "@supabase/supabase-js";

import type {
  ArticuloCodigosPanel,
} from "@tipos/CodigosPanel";

import {
  obtenerAccesoCodigos,
  PERMISOS_CODIGOS,
  respuestaCorrectaCodigos,
  respuestaErrorCodigos,
} from "@servicios/backend/codigos/seguridadCodigos";

import {
  validarCreacionArticuloCodigos,
} from "@servicios/backend/codigos/validarDatosCodigos";

import {
  obtenerArticulosCodigosPanel,
  ErrorConsultarCodigosPanel,
} from "@servicios/backend/codigos/consultarCodigosPanel";

/*
 * C.B. ANDRATX
 * API de artículos del sistema de códigos.
 *
 * GET:
 * Consultar el catálogo de artículos.
 *
 * POST:
 * Crear un artículo nuevo.
 *
 * Permisos:
 *
 * GET  -> codigos.ver
 * POST -> codigos.crear
 *
 * Esta API no consulta ni devuelve
 * los premios asignados a los boletos.
 */

export const prerender = false;

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_MAXIMO_SOLICITUD =
  16_384;

const COLUMNAS_ARTICULO = `
  id,
  nombre,
  descripcion,
  imagen_url,
  activo,
  creado_por,
  created_at,
  updated_at
`;

// ================================================
// TIPOS INTERNOS
// ================================================

interface FilaArticulo {
  id: string;

  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;

  activo: boolean;

  creado_por: string | null;

  created_at: string;
  updated_at: string | null;
}

// ================================================
// ERRORES DE SOLICITUD
// ================================================

class ErrorSolicitudArticulo
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorSolicitudArticulo";

    this.status = status;
  }
}

// ================================================
// CLIENTE PRIVADO DE SUPABASE
// ================================================

function obtenerClientePrivado() {
  /*
   * Se utiliza la clave privada porque
   * este módulo trabaja con tablas
   * protegidas mediante RLS.
   *
   * La clave nunca se devuelve al cliente.
   */

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
    throw new Error(
      "No se ha configurado correctamente el acceso privado a Supabase.",
    );
  }

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

function convertirArticulo(
  fila: FilaArticulo,
): ArticuloCodigosPanel {
  return {
    id: fila.id,

    nombre:
      fila.nombre,

    descripcion:
      fila.descripcion,

    imagenUrl:
      fila.imagen_url,

    activo:
      fila.activo === true,

    creadoPor:
      fila.creado_por,

    createdAt:
      fila.created_at,

    updatedAt:
      fila.updated_at ??
      fila.created_at,
  };
}

// ================================================
// LEER JSON CON LÍMITE DE TAMAÑO
// ================================================

async function leerContenidoJson(
  request: Request,
): Promise<unknown> {
  const tipoContenido =
    request.headers.get(
      "content-type",
    );

  const tipoNormalizado =
    tipoContenido
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();

  if (
    tipoNormalizado !==
    "application/json"
  ) {
    throw new ErrorSolicitudArticulo(
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
      throw new ErrorSolicitudArticulo(
        "El tamaño de la petición no es válido.",
        400,
      );
    }

    if (
      longitud >
      TAMANO_MAXIMO_SOLICITUD
    ) {
      throw new ErrorSolicitudArticulo(
        "La petición es demasiado grande.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ErrorSolicitudArticulo(
      "Debes enviar los datos del artículo.",
      400,
    );
  }

  /*
   * Controlamos el tamaño real del
   * contenido recibido, incluso si
   * no existe Content-Length.
   */

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

  try {
    while (true) {
      const {
        done,
        value,
      } = await lector.read();

      if (done) {
        break;
      }

      bytesRecibidos +=
        value.byteLength;

      if (
        bytesRecibidos >
        TAMANO_MAXIMO_SOLICITUD
      ) {
        await lector.cancel();

        throw new ErrorSolicitudArticulo(
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
      ErrorSolicitudArticulo
    ) {
      throw error;
    }

    throw new ErrorSolicitudArticulo(
      "No se ha podido leer el contenido de la petición.",
      400,
    );
  } finally {
    lector.releaseLock();
  }

  if (!contenido.trim()) {
    throw new ErrorSolicitudArticulo(
      "Debes proporcionar los datos del artículo.",
      400,
    );
  }

  try {
    return JSON.parse(
      contenido,
    ) as unknown;
  } catch {
    throw new ErrorSolicitudArticulo(
      "El contenido de la petición no contiene un JSON válido.",
      400,
    );
  }
}

// ================================================
// GET - LISTAR ARTÍCULOS
// ================================================

export const GET: APIRoute =
  async (contexto) => {
    /*
     * Comprobar sesión y permisos.
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

    /*
     * Filtro opcional:
     *
     * ?soloActivos=true
     *
     * Por defecto se incluyen
     * artículos activos e inactivos.
     */

    const valoresFiltro =
      contexto.url.searchParams
        .getAll("soloActivos");

    if (
      valoresFiltro.length > 1
    ) {
      return respuestaErrorCodigos(
        "El filtro de artículos está repetido.",
        400,
      );
    }

    const filtro =
      valoresFiltro[0] ?? null;

    if (
      filtro !== null &&
      filtro !== "true" &&
      filtro !== "false"
    ) {
      return respuestaErrorCodigos(
        "El filtro soloActivos debe ser true o false.",
        400,
      );
    }

    const soloActivos =
      filtro === "true";

    try {
      const articulos =
        await obtenerArticulosCodigosPanel(
          acceso.sesion,
          soloActivos,
        );

      return respuestaCorrectaCodigos(
        {
          articulos,
          total:
            articulos.length,
        },
        200,
      );
    } catch (error) {
      console.error(
        "Error en GET /api/panel/codigos/articulos:",
        error,
      );

      if (
        error instanceof
        ErrorConsultarCodigosPanel
      ) {
        return respuestaErrorCodigos(
          error.status >= 500
            ? "No se ha podido obtener el catálogo de artículos."
            : error.message,
          error.status,
        );
      }

      return respuestaErrorCodigos(
        "No se ha podido consultar el catálogo de artículos.",
        500,
      );
    }
  };

// ================================================
// POST - CREAR ARTÍCULO
// ================================================

export const POST: APIRoute =
  async (contexto) => {
    /*
     * Comprobar sesión y permiso
     * específico de creación.
     *
     * Tener codigos.ver no concede
     * automáticamente codigos.crear.
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

    // Leer la solicitud.

    let contenido: unknown;

    try {
      contenido =
        await leerContenidoJson(
          contexto.request,
        );
    } catch (error) {
      if (
        error instanceof
        ErrorSolicitudArticulo
      ) {
        return respuestaErrorCodigos(
          error.message,
          error.status,
        );
      }

      console.error(
        "Error leyendo la solicitud de creación de artículo:",
        error,
      );

      return respuestaErrorCodigos(
        "No se ha podido procesar la petición.",
        500,
      );
    }

    // Validar los datos recibidos.

    const validacion =
      validarCreacionArticuloCodigos(
        contenido,
      );

    if (
      !validacion.valido ||
      !validacion.datos
    ) {
      return respuestaErrorCodigos(
        "Revisa los datos del artículo.",
        400,
        validacion.errores,
      );
    }

    const datos =
      validacion.datos;

    /*
     * Los campos creado_por y las
     * fechas no se aceptan desde
     * el navegador.
     *
     * El servidor identifica al
     * usuario y Supabase genera
     * las fechas automáticamente.
     */

    try {
      const cliente =
        obtenerClientePrivado();

      const {
        data: articuloCreado,
        error,
      } = await cliente
        .from("codigos_articulos")
        .insert({
          nombre:
            datos.nombre,

          descripcion:
            datos.descripcion ??
            null,

          imagen_url:
            datos.imagenUrl ??
            null,

          activo:
            datos.activo ?? true,

          creado_por:
            acceso.sesion.usuario.id,
        })
        .select(
          COLUMNAS_ARTICULO,
        )
        .single();

      if (error) {
        console.error(
          "Error de Supabase creando artículo de códigos:",
          {
            codigoError:
              error.code,
          },
        );

        if (
          error.code === "23505"
        ) {
          return respuestaErrorCodigos(
            "Ya existe un artículo con estos datos.",
            409,
          );
        }

        return respuestaErrorCodigos(
          "No se ha podido guardar el artículo.",
          500,
        );
      }

      if (!articuloCreado) {
        return respuestaErrorCodigos(
          "El artículo se ha creado, pero no se ha podido recuperar su información.",
          500,
        );
      }

      const articulo =
        convertirArticulo(
          articuloCreado as FilaArticulo,
        );

      return respuestaCorrectaCodigos(
        {
          articulo,
        },
        201,
      );
    } catch (error) {
      console.error(
        "Error en POST /api/panel/codigos/articulos:",
        error,
      );

      return respuestaErrorCodigos(
        "No se ha podido crear el artículo.",
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
