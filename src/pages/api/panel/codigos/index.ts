
import type {
  APIRoute,
} from "astro";

import {
  obtenerAccesoCodigos,
  comprobarPermisosCodigos,
  PERMISOS_CODIGOS,
  respuestaCorrectaCodigos,
  respuestaErrorCodigos,
} from "@servicios/backend/codigos/seguridadCodigos";

import {
  esUuidCodigos,
  validarAccionMasivaCodigos,
} from "@servicios/backend/codigos/validarDatosCodigos";

import {
  obtenerListadoCodigosPanel,
  obtenerEstadisticasArticuloCodigos,
  obtenerEstadisticasCampanaCodigos,
  ErrorConsultarCodigosPanel,
} from "@servicios/backend/codigos/consultarCodigosPanel";

import {
  aplicarAccionMasivaCodigos,
  ErrorGestionCodigos,
} from "@servicios/backend/codigos/gestionarCodigosPanel";

/*
 * C.B. ANDRATX
 * API de códigos, acciones y estadísticas.
 *
 * GET:
 * - Listar códigos.
 * - Estadísticas de campaña.
 * - Estadísticas de artículo.
 *
 * POST:
 * - Acciones masivas sobre códigos.
 *
 * Este archivo reutiliza los servicios
 * backend creados en la fase 2.
 *
 * Nunca devuelve:
 *
 * - Tokens QR.
 * - Hashes de tokens.
 * - Resultados cifrados.
 * - Índices HMAC.
 *
 * Los datos que identifican premios
 * requieren codigos.premios.
 */

export const prerender = false;

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_MAXIMO_SOLICITUD =
  65_536;

const LIMITE_MAXIMO =
  100;

const PAGINA_MAXIMA =
  10_000;

const LONGITUD_MAXIMA_BUSQUEDA =
  120;

const VISTAS_DISPONIBLES = [
  "codigos",
  "estadisticas_campana",
  "estadisticas_articulo",
] as const;

type VistaCodigos =
  (typeof VISTAS_DISPONIBLES)[number];

const PARAMETROS_LISTADO =
  new Set([
    "vista",
    "campanaId",
    "articuloId",
    "busqueda",
    "estadoVenta",
    "estadoRegistro",
    "pagina",
    "limite",
  ]);

const PARAMETROS_ESTADISTICAS_CAMPANA =
  new Set([
    "vista",
    "campanaId",
  ]);

const PARAMETROS_ESTADISTICAS_ARTICULO =
  new Set([
    "vista",
    "articuloId",
    "campanaId",
  ]);

// ================================================
// ERRORES
// ================================================

class ErrorApiCodigos
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorApiCodigos";

    this.status = status;
  }
}

// ================================================
// PARÁMETROS DE URL
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
    throw new ErrorApiCodigos(
      `El parámetro ${nombre} no puede repetirse.`,
      400,
    );
  }

  return valores[0] ?? null;
}

function comprobarParametrosPermitidos(
  parametros: URLSearchParams,
  permitidos: Set<string>,
): void {
  for (
    const nombre of parametros.keys()
  ) {
    if (
      !permitidos.has(
        nombre,
      )
    ) {
      throw new ErrorApiCodigos(
        `El parámetro ${nombre} no está permitido para esta consulta.`,
        400,
      );
    }

    /*
     * Rechazamos parámetros duplicados
     * para impedir interpretaciones
     * diferentes entre validadores.
     */

    obtenerParametroUnico(
      parametros,
      nombre,
    );
  }
}

// ================================================
// DETERMINAR VISTA
// ================================================

function obtenerVista(
  parametros: URLSearchParams,
): VistaCodigos {
  const vista =
    obtenerParametroUnico(
      parametros,
      "vista",
    ) ?? "codigos";

  if (
    !(
      VISTAS_DISPONIBLES as
        readonly string[]
    ).includes(vista)
  ) {
    throw new ErrorApiCodigos(
      "La vista solicitada no es válida.",
      400,
    );
  }

  return vista as VistaCodigos;
}

// ================================================
// VALIDAR UUID
// ================================================

function validarIdentificador(
  valor: string | null,
  nombre: string,
  obligatorio: boolean,
): string | null {
  if (
    valor === null
  ) {
    if (obligatorio) {
      throw new ErrorApiCodigos(
        `Debes indicar el identificador de ${nombre}.`,
        400,
      );
    }

    return null;
  }

  const limpio =
    valor.trim().toLowerCase();

  if (
    !esUuidCodigos(
      limpio,
    )
  ) {
    throw new ErrorApiCodigos(
      `El identificador de ${nombre} no es válido.`,
      400,
    );
  }

  return limpio;
}

// ================================================
// VALIDAR PAGINACIÓN
// ================================================

function validarEntero(
  valor: string | null,
  nombre: string,
  maximo: number,
): number | undefined {
  if (valor === null) {
    return undefined;
  }

  if (
    !/^[1-9][0-9]*$/.test(
      valor,
    )
  ) {
    throw new ErrorApiCodigos(
      `El parámetro ${nombre} debe ser un entero positivo.`,
      400,
    );
  }

  const numero =
    Number(
      valor,
    );

  if (
    !Number.isSafeInteger(numero) ||
    numero > maximo
  ) {
    throw new ErrorApiCodigos(
      `El parámetro ${nombre} debe estar entre 1 y ${maximo}.`,
      400,
    );
  }

  return numero;
}

// ================================================
// PREPARAR FILTROS DEL LISTADO
// ================================================

function prepararFiltrosListado(
  parametros: URLSearchParams,
): Record<string, unknown> {
  comprobarParametrosPermitidos(
    parametros,
    PARAMETROS_LISTADO,
  );

  const filtros:
    Record<string, unknown> = {};

  const campanaId =
    validarIdentificador(
      obtenerParametroUnico(
        parametros,
        "campanaId",
      ),
      "campaña",
      false,
    );

  const articuloId =
    validarIdentificador(
      obtenerParametroUnico(
        parametros,
        "articuloId",
      ),
      "artículo",
      false,
    );

  if (campanaId) {
    filtros.campanaId =
      campanaId;
  }

  if (articuloId) {
    filtros.articuloId =
      articuloId;
  }

  const busqueda =
    obtenerParametroUnico(
      parametros,
      "busqueda",
    );

  if (
    busqueda !== null
  ) {
    if (
      busqueda.length >
      LONGITUD_MAXIMA_BUSQUEDA
    ) {
      throw new ErrorApiCodigos(
        "La búsqueda es demasiado larga.",
        400,
      );
    }

    if (busqueda.trim()) {
      filtros.busqueda =
        busqueda.trim();
    }
  }

  const estadoVenta =
    obtenerParametroUnico(
      parametros,
      "estadoVenta",
    );

  if (
    estadoVenta !== null
  ) {
    filtros.estadoVenta =
      estadoVenta;
  }

  const estadoRegistro =
    obtenerParametroUnico(
      parametros,
      "estadoRegistro",
    );

  if (
    estadoRegistro !== null
  ) {
    filtros.estadoRegistro =
      estadoRegistro;
  }

  const pagina =
    validarEntero(
      obtenerParametroUnico(
        parametros,
        "pagina",
      ),
      "pagina",
      PAGINA_MAXIMA,
    );

  const limite =
    validarEntero(
      obtenerParametroUnico(
        parametros,
        "limite",
      ),
      "limite",
      LIMITE_MAXIMO,
    );

  if (
    pagina !== undefined
  ) {
    filtros.pagina =
      pagina;
  }

  if (
    limite !== undefined
  ) {
    filtros.limite =
      limite;
  }

  /*
   * El servicio de consultas
   * realizará una segunda validación
   * mediante validarFiltrosCodigos.
   *
   * No se construyen filtros SQL
   * directamente desde esta API.
   */

  return filtros;
}

// ================================================
// LEER JSON CON TAMAÑO LIMITADO
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
    throw new ErrorApiCodigos(
      "La solicitud debe enviarse en formato JSON.",
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
      throw new ErrorApiCodigos(
        "El tamaño de la solicitud no es válido.",
        400,
      );
    }

    if (
      longitud >
      TAMANO_MAXIMO_SOLICITUD
    ) {
      throw new ErrorApiCodigos(
        "La solicitud es demasiado grande.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ErrorApiCodigos(
      "Debes enviar los datos de la operación.",
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
        throw new ErrorApiCodigos(
          "La solicitud supera el tamaño máximo permitido.",
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
      ErrorApiCodigos
    ) {
      throw error;
    }

    throw new ErrorApiCodigos(
      "No se ha podido leer la solicitud.",
      400,
    );
  } finally {
    if (!lecturaCompleta) {
      try {
        await lector.cancel();
      } catch {
        // Ignorar errores al cancelar.
      }
    }

    lector.releaseLock();
  }

  if (
    !contenido.trim()
  ) {
    throw new ErrorApiCodigos(
      "Debes indicar los datos de la operación.",
      400,
    );
  }

  try {
    return JSON.parse(
      contenido,
    ) as unknown;
  } catch {
    throw new ErrorApiCodigos(
      "El contenido JSON no es válido.",
      400,
    );
  }
}

// ================================================
// COMPROBAR PERMISO DE PREMIOS
// ================================================

async function exigirPermisoPremios(
  sesion: Parameters<
    typeof comprobarPermisosCodigos
  >[0],
): Promise<void> {
  const autorizado =
    await comprobarPermisosCodigos(
      sesion,
      [
        PERMISOS_CODIGOS.ver,
        PERMISOS_CODIGOS.premios,
      ],
    );

  if (!autorizado) {
    throw new ErrorApiCodigos(
      "No tienes permisos para consultar la información de premios.",
      403,
    );
  }
}

// ================================================
// GESTIONAR ERRORES
// ================================================

function gestionarError(
  error: unknown,
  operacion: string,
): Response {
  if (
    error instanceof ErrorApiCodigos ||
    error instanceof ErrorGestionCodigos ||
    error instanceof ErrorConsultarCodigosPanel
  ) {
    if (
      error.status >= 500
    ) {
      /*
       * No registrar contenidos QR,
       * identificadores secretos
       * ni resultados cifrados.
       */

      console.error(
        "Error interno en API de códigos:",
        {
          operacion,
          tipo: error.name,
          status: error.status,
        },
      );
    }

    return respuestaErrorCodigos(
      error.status >= 500
        ? "No se ha podido completar la operación. Consulta el estado de los boletos antes de repetirla."
        : error.message,
      error.status,
    );
  }

  console.error(
    "Error inesperado en API de códigos:",
    {
      operacion,
      tipo:
        error instanceof Error
          ? error.name
          : "desconocido",
    },
  );

  return respuestaErrorCodigos(
    "Se ha producido un error al procesar la solicitud.",
    500,
  );
}

// ================================================
// GET - CONSULTAS Y ESTADÍSTICAS
// ================================================

export const GET: APIRoute =
  async (contexto) => {
    /*
     * Primer control:
     * acceso al sistema de códigos.
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
      const parametros =
        contexto.url.searchParams;

      const vista =
        obtenerVista(
          parametros,
        );

      // ==========================================
      // 1. LISTADO DE CÓDIGOS
      // ==========================================

      if (
        vista === "codigos"
      ) {
        const filtros =
          prepararFiltrosListado(
            parametros,
          );

        /*
         * Buscar por artículo permite
         * averiguar qué códigos tienen
         * asignado ese premio.
         *
         * Por ello requiere el permiso
         * adicional codigos.premios.
         */

        if (
          filtros.articuloId
        ) {
          await exigirPermisoPremios(
            acceso.sesion,
          );
        }

        const resultado =
          await obtenerListadoCodigosPanel(
            acceso.sesion,
            filtros,
          );

        return respuestaCorrectaCodigos(
          {
            vista: "codigos",

            ...resultado,
          },
          200,
        );
      }

      // ==========================================
      // 2. ESTADÍSTICAS DE CAMPAÑA
      // ==========================================

      if (
        vista ===
        "estadisticas_campana"
      ) {
        comprobarParametrosPermitidos(
          parametros,
          PARAMETROS_ESTADISTICAS_CAMPANA,
        );

        const campanaId =
          validarIdentificador(
            obtenerParametroUnico(
              parametros,
              "campanaId",
            ),
            "campaña",
            true,
          );

        /*
         * Las estadísticas incluyen
         * cantidades de premios.
         *
         * No deben ser visibles
         * únicamente con codigos.ver.
         */

        await exigirPermisoPremios(
          acceso.sesion,
        );

        const estadisticas =
          await obtenerEstadisticasCampanaCodigos(
            acceso.sesion,
            campanaId!,
          );

        return respuestaCorrectaCodigos(
          {
            vista:
              "estadisticas_campana",

            campanaId,

            estadisticas,
          },
          200,
        );
      }

      // ==========================================
      // 3. ESTADÍSTICAS DE ARTÍCULO
      // ==========================================

      comprobarParametrosPermitidos(
        parametros,
        PARAMETROS_ESTADISTICAS_ARTICULO,
      );

      const articuloId =
        validarIdentificador(
          obtenerParametroUnico(
            parametros,
            "articuloId",
          ),
          "artículo",
          true,
        );

      const campanaId =
        validarIdentificador(
          obtenerParametroUnico(
            parametros,
            "campanaId",
          ),
          "campaña",
          false,
        );

      await exigirPermisoPremios(
        acceso.sesion,
      );

      const estadisticas =
        await obtenerEstadisticasArticuloCodigos(
          acceso.sesion,
          articuloId!,
          campanaId ?? undefined,
        );

      return respuestaCorrectaCodigos(
        {
          vista:
            "estadisticas_articulo",

          articuloId,

          campanaId,

          estadisticas,
        },
        200,
      );
    } catch (error) {
      return gestionarError(
        error,
        "GET /api/panel/codigos",
      );
    }
  };

// ================================================
// POST - ACCIONES MASIVAS
// ================================================

export const POST: APIRoute =
  async (contexto) => {
    /*
     * El permiso de lectura se
     * exige inicialmente porque
     * el servicio de acciones
     * masivas también lo requiere.
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
      // ==========================================
      // 1. LEER Y VALIDAR
      // ==========================================

      const contenido =
        await leerContenidoJson(
          contexto.request,
        );

      const validacion =
        validarAccionMasivaCodigos(
          contenido,
        );

      if (
        !validacion.valido ||
        !validacion.datos
      ) {
        return respuestaErrorCodigos(
          "Revisa los datos de la operación masiva.",
          400,
          validacion.errores,
        );
      }

      const datos =
        validacion.datos;

      // ==========================================
      // 2. PERMISOS SEGÚN ACCIÓN
      // ==========================================

      /*
       * Eliminar requiere
       * codigos.eliminar.
       *
       * El resto de operaciones
       * necesitan codigos.editar.
       *
       * Ninguna acción masiva
       * puede revelar premios.
       */

      const permisoAccion =
        datos.accion === "eliminar"
          ? PERMISOS_CODIGOS.eliminar
          : PERMISOS_CODIGOS.editar;

      const autorizado =
        await comprobarPermisosCodigos(
          acceso.sesion,
          [
            PERMISOS_CODIGOS.ver,
            permisoAccion,
          ],
        );

      if (!autorizado) {
        return respuestaErrorCodigos(
          "No tienes permisos para ejecutar esta acción sobre los boletos.",
          403,
        );
      }

      // ==========================================
      // 3. EJECUTAR OPERACIÓN
      // ==========================================

      /*
       * El archivo 8/27 se encarga de:
       *
       * - Comprobar la campaña.
       * - Comprobar los lotes.
       * - Verificar estados de venta.
       * - Comprobar canjes anteriores.
       * - Realizar cambios condicionados.
       * - Registrar auditoría.
       * - Informar de errores parciales.
       */

      const resultado =
        await aplicarAccionMasivaCodigos(
          acceso.sesion,
          datos,
        );

      // ==========================================
      // 4. DEVOLVER RESULTADO
      // ==========================================

      /*
       * Una operación puede actualizar
       * solo parte de los boletos.
       *
       * Se devuelve siempre el detalle
       * para que el panel no muestre
       * un éxito total incorrecto.
       */

      const parcial =
        resultado.omitidos > 0;

      return respuestaCorrectaCodigos(
        {
          operacion:
            "accion_masiva",

          accion:
            resultado.accion,

          operacionId:
            resultado.operacionId,

          solicitados:
            resultado.solicitados,

          actualizados:
            resultado.actualizados,

          omitidos:
            resultado.omitidos,

          parcial,

          errores:
            resultado.errores,

          mensaje:
            parcial
              ? "La operación ha terminado con algunos boletos sin actualizar. Revisa los detalles."
              : "La operación se ha completado para todos los boletos seleccionados.",
        },
        200,
      );
    } catch (error) {
      return gestionarError(
        error,
        "POST /api/panel/codigos",
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
