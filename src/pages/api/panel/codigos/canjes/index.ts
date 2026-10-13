
import type {
  APIRoute,
} from "astro";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  obtenerAccesoCodigos,
  PERMISOS_CODIGOS,
  respuestaCorrectaCodigos,
  respuestaErrorCodigos,
} from "@servicios/backend/codigos/seguridadCodigos";

import {
  validarRegistroCanjeCodigo,
} from "@servicios/backend/codigos/validarDatosCodigos";

import {
  calcularHashTokenQr,
  esCodigoVisibleValido,
  extraerTokenQr,
  normalizarCodigoVisible,
} from "@servicios/backend/codigos/generarCodigoSeguro";

import {
  registrarCanjeCodigo,
  ErrorGestionCodigos,
} from "@servicios/backend/codigos/gestionarCodigosPanel";

/*
 * C.B. ANDRATX
 *
 * API de confirmación de canjes.
 *
 * POST:
 * Registrar la entrega de un premio.
 *
 * Permisos:
 *
 * - codigos.canjear
 * - codigos.premios
 *
 * La operación requiere confirmación
 * expresa del usuario autorizado.
 *
 * Un escaneo de consulta NO registra
 * automáticamente la entrega.
 *
 * Los tokens QR nunca se incluyen
 * en las respuestas ni en los logs.
 */

export const prerender = false;

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_MAXIMO_SOLICITUD =
  8192;

const CAMPOS_PERMITIDOS =
  new Set([
    "codigoVisible",
    "metodo",
    "observaciones",
    "lecturaQr",
    "confirmado",
  ]);

// ================================================
// TIPOS INTERNOS
// ================================================

interface SolicitudCanjeConfirmado {
  codigoVisible: string;

  metodo:
    | "qr"
    | "manual";

  observaciones: string | null;

  lecturaQr: string | null;

  confirmado: true;
}

interface FilaCodigo {
  id: string;
  lote_id: string | null;

  codigo_visible: string;

  estado_venta: string;
  estado_registro: string;
}

interface FilaLote {
  id: string;
  campana_id: string;
  estado: string;
}

interface FilaCampana {
  id: string;
  estado: string;
  estado_canjes: string;
}

interface FilaCanjeExistente {
  id: string;
}

// ================================================
// ERRORES
// ================================================

class ErrorApiCanjes
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorApiCanjes";

    this.status = status;
  }
}

// ================================================
// CLIENTE PRIVADO DE SUPABASE
// ================================================

function obtenerClientePrivado():
  SupabaseClient {
  const url:
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
    !url ||
    !clavePrivada ||
    clavePrivada === clavePublica
  ) {
    throw new ErrorApiCanjes(
      "No se ha configurado el acceso privado a Supabase.",
      500,
    );
  }

  /*
   * Este cliente solo se utiliza
   * después de autenticar al usuario.
   *
   * La clave privada nunca debe
   * exponerse en el navegador.
   */

  return createClient(
    url,
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
    throw new ErrorApiCanjes(
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
      throw new ErrorApiCanjes(
        "El tamaño de la solicitud no es válido.",
        400,
      );
    }

    if (
      longitud >
      TAMANO_MAXIMO_SOLICITUD
    ) {
      throw new ErrorApiCanjes(
        "La solicitud es demasiado grande.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ErrorApiCanjes(
      "No se han enviado los datos de la entrega.",
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
        throw new ErrorApiCanjes(
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
      ErrorApiCanjes
    ) {
      throw error;
    }

    throw new ErrorApiCanjes(
      "No se ha podido leer la solicitud.",
      400,
    );
  } finally {
    if (!lecturaCompleta) {
      try {
        await lector.cancel();
      } catch {
        // Ignorar errores de cancelación.
      }
    }

    lector.releaseLock();
  }

  if (!contenido.trim()) {
    throw new ErrorApiCanjes(
      "Debes indicar los datos de la entrega.",
      400,
    );
  }

  try {
    return JSON.parse(
      contenido,
    ) as unknown;
  } catch {
    throw new ErrorApiCanjes(
      "El contenido JSON no es válido.",
      400,
    );
  }
}

// ================================================
// VALIDAR CONFIRMACIÓN DE CANJE
// ================================================

function validarConfirmacionCanje(
  contenido: unknown,
): SolicitudCanjeConfirmado {
  if (
    typeof contenido !== "object" ||
    contenido === null ||
    Array.isArray(contenido)
  ) {
    throw new ErrorApiCanjes(
      "Los datos del canje no son válidos.",
      400,
    );
  }

  const entrada =
    contenido as Record<string, unknown>;

  /*
   * No aceptamos campos adicionales
   * como:
   *
   * - articuloId
   * - nombrePremio
   * - resultado
   * - entregadoPor
   *
   * El premio real se obtiene
   * exclusivamente del servidor.
   */

  const camposInvalidos =
    Object.keys(entrada).filter(
      (campo) =>
        !CAMPOS_PERMITIDOS.has(
          campo,
        ),
    );

  if (
    camposInvalidos.length > 0
  ) {
    throw new ErrorApiCanjes(
      "La solicitud contiene campos no permitidos.",
      400,
    );
  }

  /*
   * El botón de confirmación
   * del panel debe enviar:
   *
   * confirmado: true
   *
   * Una simple lectura del QR
   * nunca debe provocar un canje.
   */

  if (
    entrada.confirmado !== true
  ) {
    throw new ErrorApiCanjes(
      "Debes confirmar expresamente la entrega del premio.",
      400,
    );
  }

  /*
   * Reutilizamos la validación
   * del archivo 3/27.
   */

  const validacion =
    validarRegistroCanjeCodigo({
      codigoVisible:
        entrada.codigoVisible,

      metodo:
        entrada.metodo,

      observaciones:
        entrada.observaciones,
    });

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorApiCanjes(
      validacion.errores[0]
        ?.mensaje ??
        "Los datos del canje no son válidos.",
      400,
    );
  }

  const datos =
    validacion.datos;

  const codigoVisible =
    normalizarCodigoVisible(
      datos.codigoVisible,
    );

  if (
    !esCodigoVisibleValido(
      codigoVisible,
    )
  ) {
    throw new ErrorApiCanjes(
      "El código visible del boleto no es válido.",
      400,
    );
  }

  let lecturaQr:
    string | null = null;

  if (
    datos.metodo === "qr"
  ) {
    /*
     * En canjes mediante QR se exige
     * aportar también la lectura
     * original del código.
     *
     * No basta con indicar
     * metodo: "qr".
     */

    if (
      typeof entrada.lecturaQr !==
      "string" ||
      entrada.lecturaQr.length === 0 ||
      entrada.lecturaQr.length > 2048
    ) {
      throw new ErrorApiCanjes(
        "Para confirmar un canje mediante QR debes aportar la lectura original del boleto.",
        400,
      );
    }

    lecturaQr =
      entrada.lecturaQr;

    if (
      !extraerTokenQr(
        lecturaQr,
      )
    ) {
      throw new ErrorApiCanjes(
        "La lectura QR no tiene un formato válido.",
        400,
      );
    }
  } else {
    /*
     * El método manual utiliza
     * solamente el código impreso.
     *
     * No permitimos combinarlo con
     * una lectura QR.
     */

    if (
      entrada.lecturaQr !== undefined &&
      entrada.lecturaQr !== null
    ) {
      throw new ErrorApiCanjes(
        "El método manual no debe incluir una lectura QR.",
        400,
      );
    }
  }

  return {
    codigoVisible,

    metodo:
      datos.metodo,

    observaciones:
      datos.observaciones ?? null,

    lecturaQr,

    confirmado: true,
  };
}

// ================================================
// BUSCAR BOLETO Y VALIDAR QR
// ================================================

async function obtenerCodigoConfirmado(
  cliente: SupabaseClient,
  solicitud: SolicitudCanjeConfirmado,
): Promise<FilaCodigo> {
  let consulta =
    cliente
      .from("codigos")
      .select(`
        id,
        lote_id,
        codigo_visible,
        estado_venta,
        estado_registro
      `)
      .eq(
        "codigo_visible",
        solicitud.codigoVisible,
      );

  if (
    solicitud.metodo === "qr"
  ) {
    /*
     * El código visible y el token
     * QR deben identificar el MISMO
     * registro de Supabase.
     *
     * Un token QR de otro boleto
     * nunca autoriza esta entrega.
     */

    const token =
      extraerTokenQr(
        solicitud.lecturaQr ?? "",
      );

    if (!token) {
      throw new ErrorApiCanjes(
        "No se ha podido validar la lectura QR.",
        400,
      );
    }

    const tokenHash =
      await calcularHashTokenQr(
        token,
      );

    consulta = consulta.eq(
      "qr_token_hash",
      tokenHash,
    );
  }

  const {
    data,
    error,
  } = await consulta
    .maybeSingle();

  if (error) {
    throw new ErrorApiCanjes(
      "No se ha podido comprobar el boleto.",
      500,
    );
  }

  if (!data) {
    /*
     * No distinguimos entre:
     *
     * - QR incorrecto.
     * - Código inexistente.
     * - QR de otro boleto.
     *
     * Esto evita revelar detalles
     * de la verificación.
     */

    throw new ErrorApiCanjes(
      "No se ha podido verificar la identidad del boleto.",
      404,
    );
  }

  return data as FilaCodigo;
}

// ================================================
// COMPROBAR ESTADO DEL BOLETO
// ================================================

function comprobarEstadoCodigo(
  codigo: FilaCodigo,
): void {
  /*
   * La venta debe haberse
   * registrado ANTES del canje.
   *
   * La API no convierte boletos
   * pendientes en vendidos.
   */

  if (
    codigo.estado_registro !==
    "activo"
  ) {
    throw new ErrorApiCanjes(
      "No se puede entregar un premio de un boleto anulado o eliminado.",
      409,
    );
  }

  if (
    codigo.estado_venta !==
    "vendido"
  ) {
    throw new ErrorApiCanjes(
      "El boleto debe constar como vendido antes de entregar su premio.",
      409,
    );
  }

  if (!codigo.lote_id) {
    throw new ErrorApiCanjes(
      "El boleto no pertenece a un lote válido.",
      409,
    );
  }
}

// ================================================
// COMPROBAR LOTE
// ================================================

async function obtenerLote(
  cliente: SupabaseClient,
  loteId: string,
): Promise<FilaLote> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos_lotes")
    .select(
      "id, campana_id, estado",
    )
    .eq(
      "id",
      loteId,
    )
    .maybeSingle();

  if (error) {
    throw new ErrorApiCanjes(
      "No se ha podido comprobar el lote del boleto.",
      500,
    );
  }

  if (!data) {
    throw new ErrorApiCanjes(
      "El lote del boleto no existe.",
      404,
    );
  }

  const lote =
    data as FilaLote;

  if (
    lote.estado !==
    "generado"
  ) {
    throw new ErrorApiCanjes(
      "Este lote todavía no está disponible para canjes.",
      409,
    );
  }

  return lote;
}

// ================================================
// COMPROBAR CAMPAÑA
// ================================================

async function comprobarCampanaCanje(
  cliente: SupabaseClient,
  campanaId: string,
): Promise<void> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos_campanas")
    .select(
      "id, estado, estado_canjes",
    )
    .eq(
      "id",
      campanaId,
    )
    .maybeSingle();

  if (error) {
    throw new ErrorApiCanjes(
      "No se ha podido comprobar la campaña.",
      500,
    );
  }

  const campana =
    data as FilaCampana | null;

  if (!campana) {
    throw new ErrorApiCanjes(
      "La campaña del boleto no existe.",
      404,
    );
  }

  /*
   * Se admiten campañas:
   *
   * - activas
   * - finalizadas
   *
   * Los canjes pueden continuar
   * después de cerrar las ventas.
   *
   * Nunca se canjea un premio
   * de una campaña en borrador.
   */

  if (
    campana.estado !== "activa" &&
    campana.estado !== "finalizada"
  ) {
    throw new ErrorApiCanjes(
      "La campaña no permite entregar premios.",
      409,
    );
  }

  if (
    campana.estado_canjes !==
    "abiertos"
  ) {
    throw new ErrorApiCanjes(
      "La entrega de premios de esta campaña está cerrada.",
      409,
    );
  }
}

// ================================================
// COMPROBAR CANJE ANTERIOR
// ================================================

async function comprobarCanjeExistente(
  cliente: SupabaseClient,
  codigoId: string,
): Promise<void> {
  /*
   * Se considera bloqueante cualquier
   * canje anterior, incluso revocado.
   *
   * La revocación requiere una
   * revisión administrativa.
   */

  const {
    data,
    error,
  } = await cliente
    .from("codigos_canjes")
    .select("id")
    .eq(
      "codigo_id",
      codigoId,
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ErrorApiCanjes(
      "No se ha podido comprobar el historial de canjes.",
      500,
    );
  }

  const existente =
    data as FilaCanjeExistente | null;

  if (existente) {
    throw new ErrorApiCanjes(
      "Este boleto ya tiene una entrega registrada. No puede canjearse nuevamente mediante esta operación.",
      409,
    );
  }
}

// ================================================
// COMPROBACIÓN PREVIA COMPLETA
// ================================================

async function comprobarCanjePermitido(
  cliente: SupabaseClient,
  solicitud: SolicitudCanjeConfirmado,
): Promise<void> {
  /*
   * Paso 1:
   * verificar la identidad del boleto.
   *
   * En método QR se comprueba
   * también su token secreto.
   */

  const codigo =
    await obtenerCodigoConfirmado(
      cliente,
      solicitud,
    );

  /*
   * Paso 2:
   * comprobar el estado del boleto.
   */

  comprobarEstadoCodigo(
    codigo,
  );

  /*
   * Paso 3:
   * comprobar que el lote
   * está completamente generado.
   */

  const lote =
    await obtenerLote(
      cliente,
      codigo.lote_id!,
    );

  /*
   * Paso 4:
   * comprobar que los canjes
   * están habilitados.
   */

  await comprobarCampanaCanje(
    cliente,
    lote.campana_id,
  );

  /*
   * Paso 5:
   * comprobar que no existe
   * una entrega anterior.
   */

  await comprobarCanjeExistente(
    cliente,
    codigo.id,
  );

  /*
   * El premio NO se descifra
   * durante esta comprobación.
   *
   * El servicio de canjes del
   * archivo 8/27 realizará esa
   * operación antes de insertar
   * la entrega.
   */
}

// ================================================
// GESTIONAR ERRORES
// ================================================

function gestionarError(
  error: unknown,
): Response {
  if (
    error instanceof
    ErrorApiCanjes ||
    error instanceof
    ErrorGestionCodigos
  ) {
    if (
      error.status >= 500
    ) {
      /*
       * No registramos el contenido
       * del QR ni datos del premio.
       */

      console.error(
        "Error interno en la API de canjes:",
        {
          tipo:
            error.name,

          status:
            error.status,
        },
      );
    }

    return respuestaErrorCodigos(
      error.status >= 500
        ? "No se ha podido confirmar el canje. Comprueba el historial del boleto antes de repetir la operación."
        : error.message,
      error.status,
    );
  }

  console.error(
    "Error inesperado en la API de canjes.",
  );

  return respuestaErrorCodigos(
    "No se ha podido confirmar la entrega. Comprueba su estado antes de repetirla.",
    500,
  );
}

// ================================================
// POST - CONFIRMAR ENTREGA
// ================================================

export const POST: APIRoute =
  async (contexto) => {
    /*
     * PRIMER CONTROL
     *
     * La entrega requiere ambos:
     *
     * - codigos.canjear
     * - codigos.premios
     *
     * No basta con poder escanear
     * o consultar boletos.
     */

    const acceso =
      await obtenerAccesoCodigos(
        contexto,
        [
          PERMISOS_CODIGOS.canjear,
          PERMISOS_CODIGOS.premios,
        ],
      );

    if (!acceso.autorizado) {
      return acceso.respuesta;
    }

    try {
      // ==========================================
      // 1. LEER JSON
      // ==========================================

      const contenido =
        await leerContenidoJson(
          contexto.request,
        );

      // ==========================================
      // 2. VALIDAR CONFIRMACIÓN
      // ==========================================

      const solicitud =
        validarConfirmacionCanje(
          contenido,
        );

      // ==========================================
      // 3. COMPROBAR BOLETO
      // ==========================================

      const cliente =
        obtenerClientePrivado();

      await comprobarCanjePermitido(
        cliente,
        solicitud,
      );

      // ==========================================
      // 4. REGISTRAR CANJE
      // ==========================================

      /*
       * Reutilizamos el servicio
       * del archivo 8/27.
       *
       * No enviamos al servicio:
       *
       * - lecturaQr
       * - confirmado
       * - premio
       * - articuloId
       *
       * Solo recibe los datos
       * válidos para el registro.
       */

      const resultado =
        await registrarCanjeCodigo(
          acceso.sesion,
          {
            codigoVisible:
              solicitud.codigoVisible,

            metodo:
              solicitud.metodo,

            observaciones:
              solicitud.observaciones,
          },
        );

      // ==========================================
      // 5. CONFIRMAR RESPUESTA
      // ==========================================

      /*
       * Se devuelve únicamente la
       * información administrativa
       * de la entrega.
       *
       * El premio aparece porque
       * el usuario ya ha superado
       * la autorización requerida.
       *
       * Nunca se devuelve
       * el token QR.
       */

      return respuestaCorrectaCodigos(
        {
          entregado: true,

          codigo:
            resultado.codigo,

          premio:
            resultado.premio,

          canje:
            resultado.canje,

          mensaje:
            "La entrega del premio se ha registrado correctamente.",
        },
        201,
      );
    } catch (error) {
      return gestionarError(
        error,
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
            "POST",
        },
      },
    );
  };

// ================================================
// FIN DEL ARCHIVO
// ================================================
