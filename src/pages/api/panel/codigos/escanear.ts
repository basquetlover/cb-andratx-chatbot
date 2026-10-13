
import type {
  APIRoute,
} from "astro";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  CodigoPanel,
  ModoEscanerCodigos,
  MotivoEscaneoCodigo,
  PremioCodigoPanel,
  ResultadoEscaneoCodigo,
} from "@tipos/CodigosPanel";

import {
  obtenerAccesoCodigos,
  comprobarPermisosCodigos,
  PERMISOS_CODIGOS,
  respuestaCorrectaCodigos,
  respuestaErrorCodigos,
  type PermisoCodigos,
} from "@servicios/backend/codigos/seguridadCodigos";

import {
  validarEscaneoCodigo,
} from "@servicios/backend/codigos/validarDatosCodigos";

import {
  extraerTokenQr,
  calcularHashTokenQr,
  esCodigoVisibleValido,
  normalizarCodigoVisible,
} from "@servicios/backend/codigos/generarCodigoSeguro";

import {
  descifrarResultadoCodigo,
} from "@servicios/backend/codigos/cifradoCodigos";

import {
  registrarEscaneoVentaCodigos,
  ErrorGestionCodigos,
} from "@servicios/backend/codigos/gestionarCodigosPanel";

/*
 * C.B. ANDRATX
 * API del escáner de códigos y boletos.
 *
 * POST /api/panel/codigos/escanear
 *
 * Modos disponibles:
 *
 * - consulta
 * - venta
 * - no_vendidos
 * - premios
 *
 * Los premios solo pueden consultarse
 * mediante el modo protegido "premios".
 *
 * Este endpoint no registra canjes.
 *
 * Los canjes requieren una confirmación
 * manual mediante su propia API.
 */

export const prerender = false;

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_MAXIMO_SOLICITUD =
  8_192;

const COLUMNAS_CODIGO = `
  id,
  lote_id,
  tipo,
  formato,
  acceso,
  codigo_visible,
  contenido_publico,
  estado_venta,
  estado_registro,
  estado_venta_at,
  actualizado_por,
  impreso_at,
  impreso_por,
  eliminado_at,
  eliminado_por,
  motivo_eliminacion,
  creado_por,
  created_at,
  updated_at
`;

// ================================================
// TIPOS INTERNOS
// ================================================

interface FilaCodigo {
  id: string;
  lote_id: string | null;

  tipo: string;
  formato: string;
  acceso: string;

  codigo_visible: string;
  contenido_publico: string | null;

  estado_venta: string;
  estado_registro: string;

  estado_venta_at: string | null;
  actualizado_por: string | null;

  impreso_at: string | null;
  impreso_por: string | null;

  eliminado_at: string | null;
  eliminado_por: string | null;

  motivo_eliminacion: string | null;

  creado_por: string | null;

  created_at: string;
  updated_at: string | null;
}

interface FilaLote {
  id: string;
  campana_id: string;
  estado: string;
}

interface FilaCampana {
  id: string;

  estado: string;
  estado_ventas: string;
  estado_canjes: string;
}

interface FilaResultadoProtegido {
  resultado_cifrado: string;
  version_clave: number;
}

interface FilaHistorialCanje {
  revocado_at: string | null;
}

interface EstadoHistorialCanje {
  entregado: boolean;
  tieneHistorial: boolean;
}

interface ResultadoEscaneoPremio
  extends ResultadoEscaneoCodigo {
  premio?: PremioCodigoPanel | null;

  entregado?: boolean;
  tieneHistorialCanje?: boolean;
}

// ================================================
// ERRORES
// ================================================

class ErrorApiEscaner
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status = 400,
  ) {
    super(mensaje);

    this.name =
      "ErrorApiEscaner";

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
    throw new ErrorApiEscaner(
      "No se ha configurado correctamente el acceso privado a Supabase.",
      500,
    );
  }

  /*
   * La clave privada solo se utiliza
   * desde el servidor.
   *
   * Nunca se devuelve ni se incluye
   * en componentes del navegador.
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
// PERMISOS SEGÚN MODO
// ================================================

function obtenerPermisosModo(
  modo: ModoEscanerCodigos,
): PermisoCodigos[] {
  switch (modo) {
    case "consulta":
      return [
        PERMISOS_CODIGOS.ver,
      ];

    case "venta":
    case "no_vendidos":
      return [
        PERMISOS_CODIGOS.editar,
      ];

    case "premios":
      return [
        PERMISOS_CODIGOS.premios,
      ];

    default:
      throw new ErrorApiEscaner(
        "El modo del escáner no es válido.",
        400,
      );
  }
}

// ================================================
// CONVERTIR CÓDIGO
// ================================================

function convertirCodigo(
  fila: FilaCodigo,
): CodigoPanel {
  /*
   * Convertimos únicamente campos
   * administrativos no secretos.
   *
   * No se incluyen:
   *
   * - qr_token_hash
   * - qr_token_cifrado
   * - resultado_cifrado
   * - indice_articulo
   */

  return {
    id: fila.id,

    loteId:
      fila.lote_id,

    tipo:
      fila.tipo as CodigoPanel["tipo"],

    formato:
      fila.formato as CodigoPanel["formato"],

    acceso:
      fila.acceso as CodigoPanel["acceso"],

    codigoVisible:
      fila.codigo_visible,

    /*
     * El contenido público no es
     * necesario durante el escaneo.
     * Lo omitimos para evitar mostrar
     * datos introducidos por error.
     */

    contenidoPublico: null,

    estadoVenta:
      fila.estado_venta as
        CodigoPanel["estadoVenta"],

    estadoRegistro:
      fila.estado_registro as
        CodigoPanel["estadoRegistro"],

    estadoVentaAt:
      fila.estado_venta_at,

    actualizadoPor:
      fila.actualizado_por,

    impresoAt:
      fila.impreso_at,

    impresoPor:
      fila.impreso_por,

    eliminadoAt:
      fila.eliminado_at,

    eliminadoPor:
      fila.eliminado_por,

    motivoEliminacion:
      fila.motivo_eliminacion,

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
// CREAR RESULTADO DEL ESCÁNER
// ================================================

function crearResultadoEscaneo(
  codigo: CodigoPanel | null,
  motivo: MotivoEscaneoCodigo,
  mensaje: string,
  valido: boolean,
  requiereConfirmacion = false,
): ResultadoEscaneoCodigo {
  return {
    encontrado:
      codigo !== null,

    valido,
    motivo,
    mensaje,

    codigo,

    estadoAnterior:
      codigo?.estadoVenta ?? null,

    estadoActual:
      codigo?.estadoVenta ?? null,

    requiereConfirmacion,
  };
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
    throw new ErrorApiEscaner(
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
      throw new ErrorApiEscaner(
        "El tamaño de la solicitud no es válido.",
        400,
      );
    }

    if (
      longitud >
      TAMANO_MAXIMO_SOLICITUD
    ) {
      throw new ErrorApiEscaner(
        "La solicitud es demasiado grande.",
        413,
      );
    }
  }

  if (!request.body) {
    throw new ErrorApiEscaner(
      "No se han enviado datos de escaneo.",
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
        throw new ErrorApiEscaner(
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
      ErrorApiEscaner
    ) {
      throw error;
    }

    throw new ErrorApiEscaner(
      "No se ha podido leer el código escaneado.",
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

  if (!contenido.trim()) {
    throw new ErrorApiEscaner(
      "Debes indicar un código para escanear.",
      400,
    );
  }

  try {
    return JSON.parse(
      contenido,
    ) as unknown;
  } catch {
    throw new ErrorApiEscaner(
      "El contenido JSON no es válido.",
      400,
    );
  }
}

// ================================================
// LOCALIZAR CÓDIGO POR QR O CÓDIGO VISIBLE
// ================================================

async function buscarCodigoEscaneado(
  cliente: SupabaseClient,
  codigoLeido: string,
): Promise<FilaCodigo | null> {
  /*
   * Si el lector recibe un QR,
   * extraemos su token.
   *
   * El token no se guarda en claro
   * ni se devuelve al navegador.
   */

  const tokenQr =
    extraerTokenQr(
      codigoLeido,
    );

  let consulta =
    cliente
      .from("codigos")
      .select(COLUMNAS_CODIGO);

  if (tokenQr) {
    const tokenHash =
      await calcularHashTokenQr(
        tokenQr,
      );

    consulta = consulta.eq(
      "qr_token_hash",
      tokenHash,
    );
  } else {
    /*
     * Si no contiene un token QR
     * válido, comprobamos el código
     * visible que está impreso
     * debajo de la imagen QR.
     */

    const codigoVisible =
      normalizarCodigoVisible(
        codigoLeido,
      );

    if (
      !esCodigoVisibleValido(
        codigoVisible,
      )
    ) {
      throw new ErrorApiEscaner(
        "El código escaneado no tiene un formato válido.",
        400,
      );
    }

    consulta = consulta.eq(
      "codigo_visible",
      codigoVisible,
    );
  }

  const {
    data,
    error,
  } = await consulta
    .maybeSingle();

  if (error) {
    throw new ErrorApiEscaner(
      "No se ha podido comprobar el código escaneado.",
      500,
    );
  }

  return data as FilaCodigo | null;
}

// ================================================
// CONSULTAR LOTE Y CAMPAÑA
// ================================================

async function obtenerCampanaCodigo(
  cliente: SupabaseClient,
  codigo: FilaCodigo,
): Promise<{
  lote: FilaLote;
  campana: FilaCampana;
} | null> {
  if (!codigo.lote_id) {
    return null;
  }

  const {
    data: datosLote,
    error: errorLote,
  } = await cliente
    .from("codigos_lotes")
    .select(
      "id, campana_id, estado",
    )
    .eq(
      "id",
      codigo.lote_id,
    )
    .maybeSingle();

  if (errorLote) {
    throw new ErrorApiEscaner(
      "No se ha podido comprobar el lote.",
      500,
    );
  }

  const lote =
    datosLote as FilaLote | null;

  /*
   * Los lotes incompletos o fallidos
   * nunca deben poder escanearse
   * como boletos válidos.
   */

  if (
    !lote ||
    lote.estado !== "generado"
  ) {
    return null;
  }

  const {
    data: datosCampana,
    error: errorCampana,
  } = await cliente
    .from("codigos_campanas")
    .select(
      "id, estado, estado_ventas, estado_canjes",
    )
    .eq(
      "id",
      lote.campana_id,
    )
    .maybeSingle();

  if (errorCampana) {
    throw new ErrorApiEscaner(
      "No se ha podido comprobar la campaña.",
      500,
    );
  }

  const campana =
    datosCampana as FilaCampana | null;

  if (!campana) {
    return null;
  }

  return {
    lote,
    campana,
  };
}

// ================================================
// COMPROBAR HISTORIAL DE CANJES
// ================================================

async function consultarHistorialCanje(
  cliente: SupabaseClient,
  codigoId: string,
): Promise<EstadoHistorialCanje> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos_canjes")
    .select(
      "revocado_at",
    )
    .eq(
      "codigo_id",
      codigoId,
    )
    .order(
      "entregado_at",
      {
        ascending: false,
      },
    )
    .limit(100);

  if (error) {
    throw new ErrorApiEscaner(
      "No se ha podido comprobar el historial de entregas.",
      500,
    );
  }

  const filas =
    (data ?? []) as FilaHistorialCanje[];

  return {
    entregado:
      filas.some(
        (fila) =>
          fila.revocado_at === null,
      ),

    tieneHistorial:
      filas.length > 0,
  };
}

// ================================================
// CONSULTA PROTEGIDA DE PREMIOS
// ================================================

async function consultarPremioCodigo(
  cliente: SupabaseClient,
  codigo: FilaCodigo,
  campana: FilaCampana,
): Promise<ResultadoEscaneoPremio> {
  const codigoSeguro =
    convertirCodigo(
      codigo,
    );

  /*
   * No permitimos consultar premios
   * de una campaña en borrador.
   */

  if (
    campana.estado ===
    "borrador"
  ) {
    return crearResultadoEscaneo(
      codigoSeguro,
      "sin_permiso",
      "Esta campaña todavía no está activa.",
      false,
    );
  }

  /*
   * Si se han cerrado los canjes,
   * el escáner de premios no revela
   * nuevos resultados.
   */

  if (
    campana.estado_canjes !==
    "abiertos"
  ) {
    return crearResultadoEscaneo(
      codigoSeguro,
      "canjes_cerrados",
      "La entrega de premios de esta campaña está cerrada.",
      false,
    );
  }

  if (
    codigo.estado_registro ===
    "eliminado"
  ) {
    return crearResultadoEscaneo(
      codigoSeguro,
      "eliminado",
      "Este boleto ha sido eliminado.",
      false,
    );
  }

  if (
    codigo.estado_registro !==
    "activo"
  ) {
    return crearResultadoEscaneo(
      codigoSeguro,
      "anulado",
      "Este boleto está anulado.",
      false,
    );
  }

  /*
   * No revelamos premios de boletos
   * que aún no constan como vendidos.
   *
   * Esto impide usar el escáner para
   * descubrir los premios de boletos
   * todavía disponibles para vender.
   */

  if (
    codigo.estado_venta !==
    "vendido"
  ) {
    return crearResultadoEscaneo(
      codigoSeguro,
      "no_vendido",
      "El boleto todavía no consta como vendido. No puede consultarse su premio.",
      false,
    );
  }

  /*
   * Los resultados están cifrados
   * mediante AES-256-GCM.
   *
   * Solo accedemos a ellos desde
   * este modo protegido.
   */

  const {
    data,
    error,
  } = await cliente
    .from("codigos_resultados")
    .select(
      "resultado_cifrado, version_clave",
    )
    .eq(
      "codigo_id",
      codigo.id,
    )
    .maybeSingle();

  if (error) {
    throw new ErrorApiEscaner(
      "No se ha podido consultar el resultado protegido.",
      500,
    );
  }

  const fila =
    data as FilaResultadoProtegido | null;

  if (
    !fila ||
    !fila.resultado_cifrado ||
    fila.version_clave !== 1
  ) {
    throw new ErrorApiEscaner(
      "El resultado protegido de este boleto no está disponible.",
      500,
    );
  }

  /*
   * El descifrado autentica también
   * el UUID del boleto.
   *
   * Un resultado copiado desde otro
   * boleto no debe descifrarse.
   */

  const premio =
    await descifrarResultadoCodigo(
      codigo.id,
      fila.resultado_cifrado,
    );

  /*
   * Consultamos si el boleto ya
   * tiene una entrega registrada.
   *
   * Incluso un canje revocado
   * requiere revisión administrativa
   * antes de permitir otra entrega.
   */

  const historial =
    await consultarHistorialCanje(
      cliente,
      codigo.id,
    );

  const premioSeguro:
    PremioCodigoPanel = {
      tipoResultado:
        premio.tipoResultado,

      articuloId:
        premio.articuloId,

      nombreArticulo:
        premio.nombreArticulo,

      descripcionArticulo:
        premio.descripcionArticulo,
    };

  // ============================================
  // BOLETO SIN PREMIO
  // ============================================

  if (
    premio.tipoResultado ===
    "sin_premio"
  ) {
    return {
      ...crearResultadoEscaneo(
        codigoSeguro,
        "valido",
        "El boleto no tiene premio.",
        true,
        false,
      ),

      premio:
        premioSeguro,

      entregado: false,

      tieneHistorialCanje:
        historial.tieneHistorial,
    };
  }

  // ============================================
  // PREMIO YA ENTREGADO
  // ============================================

  if (
    historial.tieneHistorial
  ) {
    return {
      ...crearResultadoEscaneo(
        codigoSeguro,
        "ya_entregado",
        historial.entregado
          ? "Este premio ya está entregado."
          : "Este boleto tiene un canje anterior revocado y requiere revisión administrativa.",
        false,
        false,
      ),

      premio:
        premioSeguro,

      entregado:
        historial.entregado,

      tieneHistorialCanje:
        true,
    };
  }

  // ============================================
  // PREMIO DISPONIBLE
  // ============================================

  return {
    ...crearResultadoEscaneo(
      codigoSeguro,
      "valido",
      "Premio encontrado. Confirma manualmente la entrega antes de registrar el canje.",
      true,
      true,
    ),

    premio:
      premioSeguro,

    entregado: false,

    tieneHistorialCanje:
      false,
  };
}

// ================================================
// CONSULTA DE CÓDIGOS SIN PREMIOS
// ================================================

async function consultarCodigo(
  cliente: SupabaseClient,
  codigoLeido: string,
  modo: ModoEscanerCodigos,
  campanaId?: string,
): Promise<ResultadoEscaneoPremio> {
  const codigo =
    await buscarCodigoEscaneado(
      cliente,
      codigoLeido,
    );

  if (!codigo) {
    return crearResultadoEscaneo(
      null,
      "no_encontrado",
      "No se ha encontrado el código escaneado.",
      false,
    );
  }

  const contexto =
    await obtenerCampanaCodigo(
      cliente,
      codigo,
    );

  /*
   * Si el lote no está generado,
   * el código se considera
   * todavía no disponible.
   */

  if (!contexto) {
    return crearResultadoEscaneo(
      null,
      "no_encontrado",
      "El código no está disponible.",
      false,
    );
  }

  if (
    campanaId &&
    contexto.campana.id !== campanaId
  ) {
    return crearResultadoEscaneo(
      null,
      "otra_campana",
      "Este boleto pertenece a otra campaña.",
      false,
    );
  }

  /*
   * El modo consulta solo devuelve
   * información administrativa.
   *
   * No accede a codigos_resultados
   * ni a codigos_canjes.
   */

  if (
    modo === "consulta"
  ) {
    const codigoSeguro =
      convertirCodigo(
        codigo,
      );

    if (
      codigo.estado_registro ===
      "eliminado"
    ) {
      return crearResultadoEscaneo(
        codigoSeguro,
        "eliminado",
        "Este código ha sido eliminado.",
        false,
      );
    }

    if (
      codigo.estado_registro ===
      "anulado"
    ) {
      return crearResultadoEscaneo(
        codigoSeguro,
        "anulado",
        "Este código está anulado.",
        false,
      );
    }

    if (
      codigo.estado_registro !==
      "activo"
    ) {
      return crearResultadoEscaneo(
        codigoSeguro,
        "ya_registrado",
        "El código no está disponible.",
        false,
      );
    }

    return crearResultadoEscaneo(
      codigoSeguro,
      "valido",
      "Código encontrado. Consulta realizada correctamente.",
      true,
    );
  }

  /*
   * Solo queda el modo "premios".
   *
   * Los permisos específicos
   * ya se han comprobado antes
   * de invocar esta función.
   */

  if (
    modo !== "premios"
  ) {
    throw new ErrorApiEscaner(
      "El modo de consulta no es válido.",
      400,
    );
  }

  if (
    codigo.tipo !==
    "rasca_gana"
  ) {
    return crearResultadoEscaneo(
      convertirCodigo(codigo),
      "formato_invalido",
      "Este código no corresponde a un boleto rasca y gana.",
      false,
    );
  }

  return consultarPremioCodigo(
    cliente,
    codigo,
    contexto.campana,
  );
}

// ================================================
// GESTIONAR ERRORES
// ================================================

function gestionarError(
  error: unknown,
): Response {
  if (
    error instanceof
      ErrorApiEscaner ||
    error instanceof
      ErrorGestionCodigos
  ) {
    if (
      error.status >= 500
    ) {
      console.error(
        "Error interno en el escáner de códigos:",
        {
          status:
            error.status,

          nombre:
            error.name,
        },
      );
    }

    return respuestaErrorCodigos(
      error.status >= 500
        ? "No se ha podido completar el escaneo. Comprueba el estado del boleto antes de repetir la operación."
        : error.message,
      error.status,
    );
  }

  /*
   * Evitamos registrar el contenido
   * del QR o los datos cifrados.
   *
   * No se devuelve información
   * sensible sobre el error.
   */

  console.error(
    "Error inesperado en el escáner de códigos.",
  );

  return respuestaErrorCodigos(
    "No se ha podido procesar el escaneo. Inténtalo de nuevo.",
    500,
  );
}

// ================================================
// POST - ESCANEAR CÓDIGO
// ================================================

export const POST: APIRoute =
  async (contexto) => {
    /*
     * PRIMER CONTROL DE SEGURIDAD
     *
     * Nadie puede utilizar el escáner
     * sin disponer del permiso general
     * codigos.escanear.
     */

    const acceso =
      await obtenerAccesoCodigos(
        contexto,
        [
          PERMISOS_CODIGOS.escanear,
        ],
      );

    if (!acceso.autorizado) {
      return acceso.respuesta;
    }

    // ============================================
    // 1. LEER LA SOLICITUD
    // ============================================

    let contenido: unknown;

    try {
      contenido =
        await leerContenidoJson(
          contexto.request,
        );
    } catch (error) {
      return gestionarError(
        error,
      );
    }

    // ============================================
    // 2. VALIDAR MODO Y CÓDIGO
    // ============================================

    const validacion =
      validarEscaneoCodigo(
        contenido,
      );

    if (
      !validacion.valido ||
      !validacion.datos
    ) {
      return respuestaErrorCodigos(
        "Revisa los datos del escaneo.",
        400,
        validacion.errores,
      );
    }

    const datos =
      validacion.datos;

    // ============================================
    // 3. COMPROBAR PERMISOS DEL MODO
    // ============================================

    try {
      const permisos =
        obtenerPermisosModo(
          datos.modo,
        );

      const autorizado =
        await comprobarPermisosCodigos(
          acceso.sesion,
          permisos,
        );

      if (!autorizado) {
        return respuestaErrorCodigos(
          "No tienes permisos suficientes para utilizar este modo del escáner.",
          403,
        );
      }

      // ==========================================
      // 4. ESCÁNERES RÁPIDOS DE VENTA
      // ==========================================

      if (
        datos.modo === "venta" ||
        datos.modo === "no_vendidos"
      ) {
        /*
         * Reutilizamos el servicio
         * del archivo 8/27.
         *
         * No duplicamos los cambios
         * de estado ni la auditoría.
         *
         * Este servicio no consulta
         * los premios cifrados.
         */

        const resultado =
          await registrarEscaneoVentaCodigos(
            acceso.sesion,
            datos,
          );

        return respuestaCorrectaCodigos(
          {
            modo:
              datos.modo,

            resultado,
          },
          200,
        );
      }

      // ==========================================
      // 5. CONSULTA O PREMIOS
      // ==========================================

      const cliente =
        obtenerClientePrivado();

      /*
       * Los modos de consulta no
       * modifican los boletos.
       *
       * El premio solo se descifra
       * cuando modo === "premios"
       * y el usuario tiene permiso.
       */

      const resultado =
        await consultarCodigo(
          cliente,
          datos.codigo,
          datos.modo,
          datos.campanaId,
        );

      return respuestaCorrectaCodigos(
        {
          modo:
            datos.modo,

          resultado,
        },
        200,
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
