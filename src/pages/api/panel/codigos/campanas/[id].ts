
import type {
  APIRoute,
} from "astro";

import {
  randomUUID,
} from "node:crypto";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  CampanaCodigosPanel,
  EstadoCampanaCodigos,
  EstadoVentasCampana,
  EstadoCanjesCampana,
} from "@tipos/CodigosPanel";

import {
  obtenerAccesoCodigos,
  PERMISOS_CODIGOS,
  respuestaCorrectaCodigos,
  respuestaErrorCodigos,
} from "@servicios/backend/codigos/seguridadCodigos";

import {
  esUuidCodigos,
  validarCreacionCampanaCodigos,
} from "@servicios/backend/codigos/validarDatosCodigos";

import {
  cerrarVentasCampanaCodigos,
  abrirVentasCampanaCodigos,
  reactivarVentaCodigos,
  ErrorGestionCodigos,
} from "@servicios/backend/codigos/gestionarCodigosPanel";

/*
 * C.B. ANDRATX
 * API de detalle y gestión de campañas.
 *
 * GET:
 * Consultar una campaña.
 *
 * PATCH:
 * Editar información de la campaña.
 *
 * POST:
 * Ejecutar acciones de administración.
 *
 * Las ventas y los canjes se gestionan
 * de manera independiente.
 *
 * No se devuelven datos cifrados,
 * tokens QR ni premios.
 */

export const prerender = false;

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_MAXIMO_SOLICITUD =
  16_384;

const TAMANO_BLOQUE_LOTES =
  400;

const CAMPOS_EDITABLES = [
  "nombre",
  "descripcion",
  "fechaInicio",
  "fechaFin",
] as const;

const ACCIONES_CAMPANA = [
  "activar",
  "finalizar",
  "cerrar_ventas",
  "abrir_ventas",
  "abrir_canjes",
  "cerrar_canjes",
  "reactivar_venta",
] as const;

type AccionCampana =
  (typeof ACCIONES_CAMPANA)[number];

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

  estado: EstadoCampanaCodigos;

  estado_ventas: EstadoVentasCampana;
  estado_canjes: EstadoCanjesCampana;

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

interface FilaLoteCampana {
  id: string;
  estado: string;
}

interface SolicitudAccionCampana {
  accion: AccionCampana;
}

interface ResultadoMovimientoCampana {
  campana: CampanaCodigosPanel;
  operacionId: string;
  auditoriaRegistrada: boolean;
}

type CambiosCampana =
  Record<string, unknown>;

// ================================================
// ERRORES
// ================================================

class ErrorApiCampana
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorApiCampana";

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
    throw new ErrorApiCampana(
      "No se ha configurado correctamente el acceso privado a Supabase.",
      500,
    );
  }

  /*
   * Este cliente utiliza una clave
   * privada y solo puede ejecutarse
   * desde el servidor.
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
// VALIDAR IDENTIFICADOR
// ================================================

function obtenerCampanaId(
  id: string | undefined,
): string {
  if (
    !id ||
    !esUuidCodigos(id)
  ) {
    throw new ErrorApiCampana(
      "El identificador de la campaña no es válido.",
      400,
    );
  }

  return id.toLowerCase();
}

// ================================================
// VALIDAR ESTADOS DE LA CAMPAÑA
// ================================================

function comprobarEstadosCampana(
  fila: FilaCampana,
): void {
  if (
    ![
      "borrador",
      "activa",
      "finalizada",
    ].includes(fila.estado) ||
    ![
      "abiertas",
      "cerradas",
    ].includes(fila.estado_ventas) ||
    ![
      "abiertos",
      "cerrados",
    ].includes(fila.estado_canjes)
  ) {
    throw new ErrorApiCampana(
      "La campaña contiene estados no reconocidos.",
      500,
    );
  }
}

// ================================================
// CONVERTIR FILA DE SUPABASE
// ================================================

function convertirCampana(
  fila: FilaCampana,
): CampanaCodigosPanel {
  comprobarEstadosCampana(
    fila,
  );

  return {
    id: fila.id,

    nombre:
      fila.nombre,

    descripcion:
      fila.descripcion,

    estado:
      fila.estado,

    estadoVentas:
      fila.estado_ventas,

    estadoCanjes:
      fila.estado_canjes,

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
// OBTENER CAMPAÑA
// ================================================

async function obtenerCampana(
  cliente: SupabaseClient,
  campanaId: string,
): Promise<FilaCampana> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos_campanas")
    .select(
      COLUMNAS_CAMPANA,
    )
    .eq(
      "id",
      campanaId,
    )
    .maybeSingle();

  if (error) {
    throw new ErrorApiCampana(
      "No se ha podido consultar la campaña.",
      500,
    );
  }

  if (!data) {
    throw new ErrorApiCampana(
      "La campaña solicitada no existe.",
      404,
    );
  }

  const campana =
    data as FilaCampana;

  comprobarEstadosCampana(
    campana,
  );

  return campana;
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
    throw new ErrorApiCampana(
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
      throw new ErrorApiCampana(
        "El tamaño de la solicitud no es válido.",
        400,
      );
    }

    if (
      longitud >
      TAMANO_MAXIMO_SOLICITUD
    ) {
      throw new ErrorApiCampana(
        "La solicitud es demasiado grande.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ErrorApiCampana(
      "No se han enviado datos.",
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

        throw new ErrorApiCampana(
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
      ErrorApiCampana
    ) {
      throw error;
    }

    throw new ErrorApiCampana(
      "No se ha podido leer la solicitud.",
      400,
    );
  } finally {
    lector.releaseLock();
  }

  if (!contenido.trim()) {
    throw new ErrorApiCampana(
      "Debes indicar los datos de la operación.",
      400,
    );
  }

  try {
    return JSON.parse(
      contenido,
    ) as unknown;
  } catch {
    throw new ErrorApiCampana(
      "El contenido JSON no es válido.",
      400,
    );
  }
}

// ================================================
// VALIDAR EDICIÓN DE CAMPAÑA
// ================================================

function prepararEdicionCampana(
  contenido: unknown,
  actual: FilaCampana,
): CambiosCampana {
  if (
    typeof contenido !== "object" ||
    contenido === null ||
    Array.isArray(contenido)
  ) {
    throw new ErrorApiCampana(
      "Los datos de la campaña no son válidos.",
      400,
    );
  }

  const entrada =
    contenido as Record<string, unknown>;

  const campos =
    Object.keys(
      entrada,
    );

  if (
    campos.length === 0
  ) {
    throw new ErrorApiCampana(
      "No se han indicado cambios para la campaña.",
      400,
    );
  }

  /*
   * No se permite actualizar los
   * estados directamente con PATCH.
   *
   * Para ello existen acciones
   * específicas mediante POST.
   */

  const hayCamposNoPermitidos =
    campos.some(
      (campo) =>
        !(
          CAMPOS_EDITABLES as
            readonly string[]
        ).includes(campo),
    );

  if (
    hayCamposNoPermitidos
  ) {
    throw new ErrorApiCampana(
      "La solicitud contiene campos que no pueden editarse.",
      400,
    );
  }

  /*
   * Reutilizamos la validación de
   * campañas del archivo 3/27.
   *
   * Para permitir edición parcial
   * combinamos los campos recibidos
   * con los valores actuales.
   */

  const validacion =
    validarCreacionCampanaCodigos({
      nombre:
        entrada.nombre !== undefined
          ? entrada.nombre
          : actual.nombre,

      descripcion:
        entrada.descripcion !==
        undefined
          ? entrada.descripcion
          : actual.descripcion,

      fechaInicio:
        entrada.fechaInicio !==
        undefined
          ? entrada.fechaInicio
          : actual.fecha_inicio,

      fechaFin:
        entrada.fechaFin !==
        undefined
          ? entrada.fechaFin
          : actual.fecha_fin,
    });

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorApiCampana(
      validacion.errores[0]
        ?.mensaje ??
        "La configuración de la campaña no es válida.",
      400,
    );
  }

  const datos =
    validacion.datos;

  const cambios:
    CambiosCampana = {};

  if (
    Object.hasOwn(
      entrada,
      "nombre",
    )
  ) {
    cambios.nombre =
      datos.nombre;
  }

  if (
    Object.hasOwn(
      entrada,
      "descripcion",
    )
  ) {
    cambios.descripcion =
      datos.descripcion ?? null;
  }

  if (
    Object.hasOwn(
      entrada,
      "fechaInicio",
    )
  ) {
    cambios.fecha_inicio =
      datos.fechaInicio ?? null;
  }

  if (
    Object.hasOwn(
      entrada,
      "fechaFin",
    )
  ) {
    cambios.fecha_fin =
      datos.fechaFin ?? null;
  }

  return cambios;
}

// ================================================
// VALIDAR ACCIÓN
// ================================================

function validarAccionCampana(
  contenido: unknown,
): SolicitudAccionCampana {
  if (
    typeof contenido !== "object" ||
    contenido === null ||
    Array.isArray(contenido)
  ) {
    throw new ErrorApiCampana(
      "Los datos de la operación no son válidos.",
      400,
    );
  }

  const datos =
    contenido as Record<string, unknown>;

  if (
    Object.keys(datos).length !== 1 ||
    typeof datos.accion !== "string"
  ) {
    throw new ErrorApiCampana(
      "Debes indicar una única acción válida.",
      400,
    );
  }

  if (
    !(
      ACCIONES_CAMPANA as
        readonly string[]
    ).includes(
      datos.accion,
    )
  ) {
    throw new ErrorApiCampana(
      "La acción solicitada no está permitida.",
      400,
    );
  }

  return {
    accion:
      datos.accion as AccionCampana,
  };
}

// ================================================
// ACTUALIZACIÓN CONDICIONADA
// ================================================

async function actualizarCampana(
  cliente: SupabaseClient,
  actual: FilaCampana,
  cambios: CambiosCampana,
): Promise<FilaCampana> {
  /*
   * Comprobación optimista:
   *
   * - Identificador.
   * - Estado de campaña.
   * - Estado de ventas.
   * - Estado de canjes.
   * - Fecha de última modificación.
   *
   * La operación solo se aplica si
   * los valores siguen coincidiendo.
   */

  let consulta =
    cliente
      .from("codigos_campanas")
      .update({
        ...cambios,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        actual.id,
      )
      .eq(
        "estado",
        actual.estado,
      )
      .eq(
        "estado_ventas",
        actual.estado_ventas,
      )
      .eq(
        "estado_canjes",
        actual.estado_canjes,
      );

  if (
    actual.updated_at === null
  ) {
    consulta =
      consulta.is(
        "updated_at",
        null,
      );
  } else {
    consulta =
      consulta.eq(
        "updated_at",
        actual.updated_at,
      );
  }

  const {
    data,
    error,
  } = await consulta
    .select(
      COLUMNAS_CAMPANA,
    )
    .maybeSingle();

  if (error) {
    throw new ErrorApiCampana(
      "No se han podido guardar los cambios de la campaña.",
      500,
    );
  }

  if (!data) {
    throw new ErrorApiCampana(
      "La campaña ha cambiado durante la operación. Actualiza la página y vuelve a intentarlo.",
      409,
    );
  }

  return data as FilaCampana;
}

// ================================================
// AUDITORÍA DE CAMPAÑA
// ================================================

async function registrarMovimientoCampana(
  cliente: SupabaseClient,
  datos: {
    campanaId: string;
    operacionId: string;
    usuarioId: string;
    accion: string;
    detalles?: Record<string, unknown>;
  },
): Promise<boolean> {
  /*
   * No almacenamos tokens ni premios
   * en los movimientos de campaña.
   *
   * La auditoría se realiza después
   * de modificar la campaña.
   *
   * Si falla, se informa al cliente
   * sin ocultar que la operación
   * principal ya se ha aplicado.
   */

  try {
    const {
      error,
    } = await cliente
      .from("codigos_movimientos")
      .insert({
        codigo_id:
          null,

        campana_id:
          datos.campanaId,

        operacion_id:
          datos.operacionId,

        accion:
          datos.accion,

        usuario_id:
          datos.usuarioId,

        detalles:
          datos.detalles ?? {},
      });

    if (error) {
      console.error(
        "Error registrando movimiento de campaña:",
        {
          campanaId:
            datos.campanaId,

          operacionId:
            datos.operacionId,

          codigoError:
            error.code,
        },
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Error inesperado registrando auditoría de campaña:",
      {
        campanaId:
          datos.campanaId,

        operacionId:
          datos.operacionId,

        error,
      },
    );

    return false;
  }
}

// ================================================
// CONSULTAR LOTES DE LA CAMPAÑA
// ================================================

async function obtenerLotesCampana(
  cliente: SupabaseClient,
  campanaId: string,
): Promise<FilaLoteCampana[]> {
  const lotes:
    FilaLoteCampana[] = [];

  let desde = 0;

  while (true) {
    const {
      data,
      error,
    } = await cliente
      .from("codigos_lotes")
      .select(
        "id, estado",
      )
      .eq(
        "campana_id",
        campanaId,
      )
      .order(
        "id",
        {
          ascending: true,
        },
      )
      .range(
        desde,
        desde +
          TAMANO_BLOQUE_LOTES -
          1,
      );

    if (error) {
      throw new ErrorApiCampana(
        "No se han podido comprobar los lotes de la campaña.",
        500,
      );
    }

    const filas =
      (data ?? []) as
        FilaLoteCampana[];

    lotes.push(
      ...filas,
    );

    if (
      filas.length <
      TAMANO_BLOQUE_LOTES
    ) {
      break;
    }

    desde +=
      TAMANO_BLOQUE_LOTES;
  }

  return lotes;
}

// ================================================
// VALIDAR FINALIZACIÓN
// ================================================

async function comprobarFinalizacion(
  cliente: SupabaseClient,
  campana: FilaCampana,
): Promise<void> {
  if (
    campana.estado !==
    "activa"
  ) {
    throw new ErrorApiCampana(
      "Solo se puede finalizar una campaña activa.",
      409,
    );
  }

  if (
    campana.estado_ventas !==
    "cerradas"
  ) {
    throw new ErrorApiCampana(
      "Debes cerrar las ventas antes de finalizar la campaña.",
      409,
    );
  }

  const lotes =
    await obtenerLotesCampana(
      cliente,
      campana.id,
    );

  /*
   * No se finaliza una campaña
   * mientras se esté generando
   * algún lote.
   */

  const generando =
    lotes.some(
      (lote) =>
        lote.estado ===
        "generando",
    );

  if (generando) {
    throw new ErrorApiCampana(
      "Hay lotes que todavía se están generando.",
      409,
    );
  }

  /*
   * El servicio de cierre de ventas
   * convierte los pendientes en
   * vendidos.
   *
   * Comprobamos que esa operación
   * se haya completado.
   */

  const generados =
    lotes.filter(
      (lote) =>
        lote.estado ===
        "generado",
    );

  for (const lote of generados) {
    const {
      count,
      error,
    } = await cliente
      .from("codigos")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        },
      )
      .eq(
        "lote_id",
        lote.id,
      )
      .eq(
        "estado_registro",
        "activo",
      )
      .eq(
        "estado_venta",
        "pendiente",
      );

    if (error) {
      throw new ErrorApiCampana(
        "No se ha podido comprobar el cierre de ventas.",
        500,
      );
    }

    if (
      (count ?? 0) > 0
    ) {
      throw new ErrorApiCampana(
        "Quedan boletos pendientes de clasificar. Completa el cierre de ventas antes de finalizar.",
        409,
      );
    }
  }

  /*
   * Los canjes pueden continuar
   * abiertos tras la finalización.
   *
   * Su cierre se realiza mediante
   * una acción independiente.
   */
}

// ================================================
// REALIZAR ACCIÓN DE CAMPAÑA
// ================================================

async function ejecutarAccionCampana(
  cliente: SupabaseClient,
  campana: FilaCampana,
  accion: AccionCampana,
  usuarioId: string,
): Promise<ResultadoMovimientoCampana> {
  const ahora =
    new Date().toISOString();

  const operacionId =
    randomUUID();

  let cambios:
    CambiosCampana;

  switch (accion) {
    // ============================================
    // ACTIVAR
    // ============================================

    case "activar":
      if (
        campana.estado !==
        "borrador"
      ) {
        throw new ErrorApiCampana(
          "Solo se pueden activar campañas en borrador.",
          409,
        );
      }

      cambios = {
        estado:
          "activa",
      };

      break;

    // ============================================
    // FINALIZAR
    // ============================================

    case "finalizar":
      await comprobarFinalizacion(
        cliente,
        campana,
      );

      cambios = {
        estado:
          "finalizada",
      };

      break;

    // ============================================
    // ABRIR CANJES
    // ============================================

    case "abrir_canjes":
      if (
        campana.estado ===
        "borrador"
      ) {
        throw new ErrorApiCampana(
          "Debes activar la campaña antes de abrir los canjes.",
          409,
        );
      }

      if (
        campana.estado_canjes ===
        "abiertos"
      ) {
        throw new ErrorApiCampana(
          "Los canjes ya están abiertos.",
          409,
        );
      }

      cambios = {
        estado_canjes:
          "abiertos",

        canjes_cerrados_at:
          null,

        canjes_cerrados_por:
          null,
      };

      break;

    // ============================================
    // CERRAR CANJES
    // ============================================

    case "cerrar_canjes":
      if (
        campana.estado_canjes !==
        "abiertos"
      ) {
        throw new ErrorApiCampana(
          "Los canjes ya están cerrados.",
          409,
        );
      }

      cambios = {
        estado_canjes:
          "cerrados",

        canjes_cerrados_at:
          ahora,

        canjes_cerrados_por:
          usuarioId,
      };

      break;

    default:
      throw new ErrorApiCampana(
        "La acción no puede ejecutarse mediante este procedimiento.",
        400,
      );
  }

  const actualizada =
    await actualizarCampana(
      cliente,
      campana,
      cambios,
    );

  const auditoriaRegistrada =
    await registrarMovimientoCampana(
      cliente,
      {
        campanaId:
          campana.id,

        operacionId,

        usuarioId,

        accion:
          `campana_${accion}`,

        detalles: {
          estadoAnterior:
            campana.estado,

          estadoActual:
            actualizada.estado,

          ventasAnteriores:
            campana.estado_ventas,

          ventasActuales:
            actualizada.estado_ventas,

          canjesAnteriores:
            campana.estado_canjes,

          canjesActuales:
            actualizada.estado_canjes,
        },
      },
    );

  return {
    campana:
      convertirCampana(
        actualizada,
      ),

    operacionId,

    auditoriaRegistrada,
  };
}

// ================================================
// GESTIÓN DE ERRORES
// ================================================

function gestionarError(
  error: unknown,
  operacion: string,
): Response {
  if (
    error instanceof
    ErrorApiCampana ||
    error instanceof
    ErrorGestionCodigos
  ) {
    if (
      error.status >= 500
    ) {
      console.error(
        `Error interno en ${operacion}:`,
        error,
      );
    }

    return respuestaErrorCodigos(
      error.status >= 500
        ? "No se ha podido completar la operación. Consulta el estado de la campaña antes de reintentarla."
        : error.message,
      error.status,
    );
  }

  console.error(
    `Error inesperado en ${operacion}:`,
    error,
  );

  return respuestaErrorCodigos(
    "Se ha producido un error al gestionar la campaña. Comprueba su estado antes de repetir la operación.",
    500,
  );
}

// ================================================
// GET - DETALLE DE CAMPAÑA
// ================================================

export const GET: APIRoute =
  async (contexto) => {
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
      const campanaId =
        obtenerCampanaId(
          contexto.params.id,
        );

      const cliente =
        obtenerClientePrivado();

      const fila =
        await obtenerCampana(
          cliente,
          campanaId,
        );

      return respuestaCorrectaCodigos(
        {
          campana:
            convertirCampana(
              fila,
            ),
        },
        200,
      );
    } catch (error) {
      return gestionarError(
        error,
        "GET /api/panel/codigos/campanas/[id]",
      );
    }
  };

// ================================================
// PATCH - EDITAR CAMPAÑA
// ================================================

export const PATCH: APIRoute =
  async (contexto) => {
    const acceso =
      await obtenerAccesoCodigos(
        contexto,
        [
          PERMISOS_CODIGOS.editar,
        ],
      );

    if (!acceso.autorizado) {
      return acceso.respuesta;
    }

    try {
      const campanaId =
        obtenerCampanaId(
          contexto.params.id,
        );

      const contenido =
        await leerContenidoJson(
          contexto.request,
        );

      const cliente =
        obtenerClientePrivado();

      const actual =
        await obtenerCampana(
          cliente,
          campanaId,
        );

      /*
       * No permitimos editar una
       * campaña finalizada.
       *
       * Su historial y los canjes
       * realizados se conservan.
       */

      if (
        actual.estado ===
        "finalizada"
      ) {
        return respuestaErrorCodigos(
          "No se puede editar una campaña finalizada.",
          409,
        );
      }

      const cambios =
        prepararEdicionCampana(
          contenido,
          actual,
        );

      const actualizada =
        await actualizarCampana(
          cliente,
          actual,
          cambios,
        );

      const operacionId =
        randomUUID();

      const auditoriaRegistrada =
        await registrarMovimientoCampana(
          cliente,
          {
            campanaId,

            operacionId,

            usuarioId:
              acceso.sesion.usuario.id,

            accion:
              "campana_actualizada",

            detalles: {
              camposModificados:
                Object.keys(
                  cambios,
                ),
            },
          },
        );

      return respuestaCorrectaCodigos(
        {
          campana:
            convertirCampana(
              actualizada,
            ),

          operacionId,

          auditoriaRegistrada,

          aviso:
            auditoriaRegistrada
              ? null
              : "Los cambios se han guardado, pero no se ha podido registrar el movimiento de auditoría.",
        },
        200,
      );
    } catch (error) {
      return gestionarError(
        error,
        "PATCH /api/panel/codigos/campanas/[id]",
      );
    }
  };

// ================================================
// POST - ACCIONES DE CAMPAÑA
// ================================================

export const POST: APIRoute =
  async (contexto) => {
    const acceso =
      await obtenerAccesoCodigos(
        contexto,
        [
          PERMISOS_CODIGOS.editar,
        ],
      );

    if (!acceso.autorizado) {
      return acceso.respuesta;
    }

    try {
      const campanaId =
        obtenerCampanaId(
          contexto.params.id,
        );

      const contenido =
        await leerContenidoJson(
          contexto.request,
        );

      const solicitud =
        validarAccionCampana(
          contenido,
        );

      const cliente =
        obtenerClientePrivado();

      const campanaActual =
        await obtenerCampana(
          cliente,
          campanaId,
        );

      const accion =
        solicitud.accion;

      /*
       * Las operaciones masivas de
       * venta utilizan el servicio
       * del archivo 8/27.
       *
       * Esto evita duplicar las
       * reglas de negocio.
       */

      if (
        accion ===
        "cerrar_ventas"
      ) {
        const resultado =
          await cerrarVentasCampanaCodigos(
            acceso.sesion,
            campanaId,
          );

        const actualizada =
          await obtenerCampana(
            cliente,
            campanaId,
          );

        return respuestaCorrectaCodigos(
          {
            accion,

            campana:
              convertirCampana(
                actualizada,
              ),

            operacionId:
              resultado.operacionId,

            boletosActualizados:
              resultado.boletosActualizados,
          },
          200,
        );
      }

      if (
        accion ===
        "abrir_ventas"
      ) {
        const resultado =
          await abrirVentasCampanaCodigos(
            acceso.sesion,
            campanaId,
          );

        const actualizada =
          await obtenerCampana(
            cliente,
            campanaId,
          );

        return respuestaCorrectaCodigos(
          {
            accion,

            campana:
              convertirCampana(
                actualizada,
              ),

            operacionId:
              resultado.operacionId,
          },
          200,
        );
      }

      if (
        accion ===
        "reactivar_venta"
      ) {
        const resultado =
          await reactivarVentaCodigos(
            acceso.sesion,
            {
              campanaId,
            },
          );

        const actualizada =
          await obtenerCampana(
            cliente,
            campanaId,
          );

        return respuestaCorrectaCodigos(
          {
            accion,

            campana:
              convertirCampana(
                actualizada,
              ),

            operacionId:
              resultado.operacionId,

            reactivados:
              resultado.reactivados,
          },
          200,
        );
      }

      /*
       * El resto de acciones modifica
       * directamente los estados
       * de la campaña.
       */

      const resultado =
        await ejecutarAccionCampana(
          cliente,
          campanaActual,
          accion,
          acceso.sesion.usuario.id,
        );

      return respuestaCorrectaCodigos(
        {
          accion,

          campana:
            resultado.campana,

          operacionId:
            resultado.operacionId,

          auditoriaRegistrada:
            resultado.auditoriaRegistrada,

          aviso:
            resultado.auditoriaRegistrada
              ? null
              : "La operación se ha realizado, pero no se ha podido registrar el movimiento de auditoría.",
        },
        200,
      );
    } catch (error) {
      return gestionarError(
        error,
        "POST /api/panel/codigos/campanas/[id]",
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
            "GET, HEAD, PATCH, POST",
        },
      },
    );
  };

// ================================================
// FIN DEL ARCHIVO
// ================================================
