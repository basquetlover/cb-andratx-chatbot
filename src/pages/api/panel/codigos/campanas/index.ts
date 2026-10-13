
import type {
  APIRoute,
} from "astro";

import {
  randomUUID,
} from "node:crypto";

import {
  createClient,
} from "@supabase/supabase-js";

import type {
  CampanaCodigosPanel,
  EstadoCampanaCodigos,
} from "@tipos/CodigosPanel";

import {
  obtenerAccesoCodigos,
  PERMISOS_CODIGOS,
  respuestaCorrectaCodigos,
  respuestaErrorCodigos,
} from "@servicios/backend/codigos/seguridadCodigos";

import {
  validarCreacionCampanaCodigos,
} from "@servicios/backend/codigos/validarDatosCodigos";

/*
 * C.B. ANDRATX
 * API de campañas del sistema de códigos.
 *
 * GET:
 * Consultar campañas con filtros
 * y paginación.
 *
 * POST:
 * Crear una nueva campaña.
 *
 * Permisos:
 *
 * GET  -> codigos.ver
 * POST -> codigos.crear
 *
 * Las campañas comienzan en borrador.
 * La activación se implementará en
 * la API de detalle de campaña.
 */

export const prerender = false;

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_MAXIMO_SOLICITUD =
  16_384;

const PAGINA_PREDETERMINADA =
  1;

const LIMITE_PREDETERMINADO =
  20;

const LIMITE_MAXIMO =
  100;

const MAXIMO_PAGINA =
  10_000;

const ESTADOS_CAMPANA:
  readonly EstadoCampanaCodigos[] = [
    "borrador",
    "activa",
    "finalizada",
  ];

const COLUMNAS_CAMPANA = `
  id,
  nombre,
  descripcion,
  estado,
  estado_ventas,
  estado_canjes,
  fecha_inicio,
  fecha_fin,
  ventas_cerradas_at,
  ventas_cerradas_por,
  canjes_cerrados_at,
  canjes_cerrados_por,
  creado_por,
  created_at,
  updated_at
`;

// ================================================
// TIPOS INTERNOS
// ================================================

interface FilaCampana {
  id: string;

  nombre: string;
  descripcion: string | null;

  estado: string;
  estado_ventas: string;
  estado_canjes: string;

  fecha_inicio: string | null;
  fecha_fin: string | null;

  ventas_cerradas_at: string | null;
  ventas_cerradas_por: string | null;

  canjes_cerrados_at: string | null;
  canjes_cerrados_por: string | null;

  creado_por: string | null;

  created_at: string;
  updated_at: string | null;
}

interface FiltrosCampanas {
  estado:
    | EstadoCampanaCodigos
    | "todos";

  busqueda: string;

  pagina: number;
  limite: number;
}

interface ResultadoListadoCampanas {
  campanas: CampanaCodigosPanel[];

  total: number;

  pagina: number;
  limite: number;
  totalPaginas: number;
}

// ================================================
// ERRORES
// ================================================

class ErrorCampanasCodigos
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorCampanasCodigos";

    this.status = status;
  }
}

// ================================================
// CLIENTE PRIVADO DE SUPABASE
// ================================================

function obtenerClientePrivado() {
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
    throw new ErrorCampanasCodigos(
      "No se ha configurado el acceso privado a Supabase.",
      500,
    );
  }

  /*
   * Cliente exclusivo del servidor.
   *
   * Nunca se utiliza desde React
   * ni se envía su clave al navegador.
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

function convertirCampana(
  fila: FilaCampana,
): CampanaCodigosPanel {
  /*
   * No se sustituyen estados
   * desconocidos por valores por defecto.
   *
   * Si la base de datos contiene un
   * estado inesperado, la consulta
   * debe fallar para poder revisarlo.
   */

  if (
    !ESTADOS_CAMPANA.includes(
      fila.estado as EstadoCampanaCodigos,
    ) ||
    ![
      "abiertas",
      "cerradas",
    ].includes(fila.estado_ventas) ||
    ![
      "abiertos",
      "cerrados",
    ].includes(fila.estado_canjes)
  ) {
    throw new ErrorCampanasCodigos(
      "La campaña contiene estados que no son válidos.",
      500,
    );
  }

  return {
    id: fila.id,

    nombre:
      fila.nombre,

    descripcion:
      fila.descripcion,

    estado:
      fila.estado as
        CampanaCodigosPanel["estado"],

    estadoVentas:
      fila.estado_ventas as
        CampanaCodigosPanel["estadoVentas"],

    estadoCanjes:
      fila.estado_canjes as
        CampanaCodigosPanel["estadoCanjes"],

    fechaInicio:
      fila.fecha_inicio,

    fechaFin:
      fila.fecha_fin,

    ventasCerradasAt:
      fila.ventas_cerradas_at,

    ventasCerradasPor:
      fila.ventas_cerradas_por,

    canjesCerradosAt:
      fila.canjes_cerrados_at,

    canjesCerradosPor:
      fila.canjes_cerrados_por,

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
// OBTENER PARÁMETRO ÚNICO
// ================================================

function obtenerParametro(
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
    throw new ErrorCampanasCodigos(
      `El parámetro ${nombre} está repetido.`,
      400,
    );
  }

  return valores[0] ?? null;
}

// ================================================
// VALIDAR NÚMEROS DE PAGINACIÓN
// ================================================

function convertirEnteroPositivo(
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
    throw new ErrorCampanasCodigos(
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
    throw new ErrorCampanasCodigos(
      `El parámetro ${campo} debe estar entre 1 y ${maximo}.`,
      400,
    );
  }

  return numero;
}

// ================================================
// VALIDAR FILTROS DE CAMPAÑAS
// ================================================

function validarFiltrosCampanas(
  parametros: URLSearchParams,
): FiltrosCampanas {
  const estadoTexto =
    obtenerParametro(
      parametros,
      "estado",
    ) ?? "todos";

  if (
    estadoTexto !== "todos" &&
    !ESTADOS_CAMPANA.includes(
      estadoTexto as EstadoCampanaCodigos,
    )
  ) {
    throw new ErrorCampanasCodigos(
      "El estado seleccionado no es válido.",
      400,
    );
  }

  const busqueda =
    (
      obtenerParametro(
        parametros,
        "busqueda",
      ) ?? ""
    ).trim();

  if (
    busqueda.length > 120
  ) {
    throw new ErrorCampanasCodigos(
      "La búsqueda no puede superar los 120 caracteres.",
      400,
    );
  }

  /*
   * Evitamos caracteres que alteren
   * el funcionamiento de ILIKE.
   *
   * Las consultas se realizan
   * mediante el cliente Supabase,
   * sin concatenar sentencias SQL.
   */

  if (
    /[%_\\\u0000-\u001F\u007F]/.test(
      busqueda,
    )
  ) {
    throw new ErrorCampanasCodigos(
      "La búsqueda contiene caracteres no permitidos.",
      400,
    );
  }

  const pagina =
    convertirEnteroPositivo(
      obtenerParametro(
        parametros,
        "pagina",
      ),
      PAGINA_PREDETERMINADA,
      MAXIMO_PAGINA,
      "pagina",
    );

  const limite =
    convertirEnteroPositivo(
      obtenerParametro(
        parametros,
        "limite",
      ),
      LIMITE_PREDETERMINADO,
      LIMITE_MAXIMO,
      "limite",
    );

  return {
    estado:
      estadoTexto as
        FiltrosCampanas["estado"],

    busqueda,

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
    throw new ErrorCampanasCodigos(
      "El contenido debe enviarse en formato JSON.",
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
      throw new ErrorCampanasCodigos(
        "El tamaño de la solicitud no es válido.",
        400,
      );
    }

    if (
      longitud >
      TAMANO_MAXIMO_SOLICITUD
    ) {
      throw new ErrorCampanasCodigos(
        "La solicitud es demasiado grande.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ErrorCampanasCodigos(
      "Debes enviar los datos de la campaña.",
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

        throw new ErrorCampanasCodigos(
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
      ErrorCampanasCodigos
    ) {
      throw error;
    }

    throw new ErrorCampanasCodigos(
      "No se ha podido leer la solicitud.",
      400,
    );
  } finally {
    lector.releaseLock();
  }

  if (!contenido.trim()) {
    throw new ErrorCampanasCodigos(
      "Debes indicar los datos de la campaña.",
      400,
    );
  }

  try {
    return JSON.parse(
      contenido,
    ) as unknown;
  } catch {
    throw new ErrorCampanasCodigos(
      "El contenido JSON no es válido.",
      400,
    );
  }
}

// ================================================
// CONSULTAR LISTADO DE CAMPAÑAS
// ================================================

async function obtenerListadoCampanas(
  filtros: FiltrosCampanas,
): Promise<ResultadoListadoCampanas> {
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
      .from("codigos_campanas")
      .select(
        COLUMNAS_CAMPANA,
        {
          count: "exact",
        },
      );

  if (
    filtros.estado !== "todos"
  ) {
    consulta = consulta.eq(
      "estado",
      filtros.estado,
    );
  }

  if (
    filtros.busqueda
  ) {
    consulta = consulta.ilike(
      "nombre",
      `%${filtros.busqueda}%`,
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
      "Error consultando campañas de códigos:",
      {
        codigoError:
          error.code,
      },
    );

    throw new ErrorCampanasCodigos(
      "No se ha podido obtener el listado de campañas.",
      500,
    );
  }

  const filas =
    (data ?? []) as FilaCampana[];

  const campanas =
    filas.map(
      convertirCampana,
    );

  const total =
    count ?? 0;

  return {
    campanas,

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
// REGISTRAR CREACIÓN EN AUDITORÍA
// ================================================

async function registrarCreacionCampana(
  campanaId: string,
  usuarioId: string,
): Promise<boolean> {
  /*
   * Esta escritura se realiza después
   * de crear la campaña.
   *
   * Al no utilizar procedimientos SQL,
   * ambas operaciones no son atómicas.
   *
   * Si falla la auditoría, se devuelve
   * la campaña creada sin pedir al
   * usuario que repita el POST.
   */

  try {
    const cliente =
      obtenerClientePrivado();

    const {
      error,
    } = await cliente
      .from("codigos_movimientos")
      .insert({
        codigo_id: null,

        campana_id:
          campanaId,

        operacion_id:
          randomUUID(),

        accion:
          "campana_creada",

        usuario_id:
          usuarioId,

        detalles: {
          campanaId,
          estadoInicial:
            "borrador",
        },
      });

    if (error) {
      console.error(
        "No se ha podido registrar la creación de la campaña:",
        {
          campanaId,
          codigoError:
            error.code,
        },
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Error registrando auditoría de campaña:",
      {
        campanaId,
        error,
      },
    );

    return false;
  }
}

// ================================================
// GET - LISTAR CAMPAÑAS
// ================================================

export const GET: APIRoute =
  async (contexto) => {
    /*
     * Primero comprobar que el
     * usuario dispone del permiso
     * para consultar campañas.
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
        validarFiltrosCampanas(
          contexto.url.searchParams,
        );

      const resultado =
        await obtenerListadoCampanas(
          filtros,
        );

      return respuestaCorrectaCodigos(
        resultado,
        200,
      );
    } catch (error) {
      if (
        error instanceof
        ErrorCampanasCodigos
      ) {
        if (
          error.status >= 500
        ) {
          console.error(
            "Error en GET /api/panel/codigos/campanas:",
            error,
          );
        }

        return respuestaErrorCodigos(
          error.status >= 500
            ? "No se han podido consultar las campañas."
            : error.message,
          error.status,
        );
      }

      console.error(
        "Error inesperado consultando campañas:",
        error,
      );

      return respuestaErrorCodigos(
        "No se han podido obtener las campañas.",
        500,
      );
    }
  };

// ================================================
// POST - CREAR CAMPAÑA
// ================================================

export const POST: APIRoute =
  async (contexto) => {
    /*
     * Permiso independiente.
     *
     * Tener codigos.ver no permite
     * crear campañas.
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
        ErrorCampanasCodigos
      ) {
        return respuestaErrorCodigos(
          error.message,
          error.status,
        );
      }

      console.error(
        "Error leyendo los datos de campaña:",
        error,
      );

      return respuestaErrorCodigos(
        "No se ha podido procesar la solicitud.",
        500,
      );
    }

    // Validar los datos.

    const validacion =
      validarCreacionCampanaCodigos(
        contenido,
      );

    if (
      !validacion.valido ||
      !validacion.datos
    ) {
      return respuestaErrorCodigos(
        "Revisa los datos de la campaña.",
        400,
        validacion.errores,
      );
    }

    const datos =
      validacion.datos;

    const usuarioId =
      acceso.sesion.usuario.id;

    /*
     * La campaña empieza en borrador.
     *
     * Estado de ventas:
     * "abiertas" permite preparar
     * lotes desde el borrador.
     *
     * No permite vender realmente:
     * el servicio de ventas también
     * exige que estado === "activa".
     *
     * Los canjes comienzan cerrados.
     */

    try {
      const cliente =
        obtenerClientePrivado();

      const {
        data: campanaCreada,
        error,
      } = await cliente
        .from("codigos_campanas")
        .insert({
          nombre:
            datos.nombre,

          descripcion:
            datos.descripcion ?? null,

          estado:
            "borrador",

          estado_ventas:
            "abiertas",

          estado_canjes:
            "cerrados",

          fecha_inicio:
            datos.fechaInicio ?? null,

          fecha_fin:
            datos.fechaFin ?? null,

          ventas_cerradas_at:
            null,

          ventas_cerradas_por:
            null,

          canjes_cerrados_at:
            null,

          canjes_cerrados_por:
            null,

          creado_por:
            usuarioId,
        })
        .select(
          COLUMNAS_CAMPANA,
        )
        .single();

      if (error) {
        console.error(
          "Error de Supabase creando campaña:",
          {
            codigoError:
              error.code,
          },
        );

        if (
          error.code === "23505"
        ) {
          return respuestaErrorCodigos(
            "Ya existe una campaña con estos datos.",
            409,
          );
        }

        return respuestaErrorCodigos(
          "No se ha podido crear la campaña.",
          500,
        );
      }

      if (!campanaCreada) {
        return respuestaErrorCodigos(
          "No se ha podido confirmar la creación de la campaña. Comprueba el listado antes de repetir la operación.",
          500,
        );
      }

      const campana =
        convertirCampana(
          campanaCreada as FilaCampana,
        );

      /*
       * La auditoría se registra
       * después de obtener la campaña.
       */

      const auditoriaRegistrada =
        await registrarCreacionCampana(
          campana.id,
          usuarioId,
        );

      return respuestaCorrectaCodigos(
        {
          campana,

          auditoriaRegistrada,

          aviso:
            auditoriaRegistrada
              ? null
              : "La campaña se ha creado, pero no se ha podido registrar el movimiento de auditoría. No repitas la creación.",
        },
        201,
      );
    } catch (error) {
      console.error(
        "Error en POST /api/panel/codigos/campanas:",
        error,
      );

      return respuestaErrorCodigos(
        "No se ha podido completar la creación de la campaña. Comprueba el listado antes de repetirla.",
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
