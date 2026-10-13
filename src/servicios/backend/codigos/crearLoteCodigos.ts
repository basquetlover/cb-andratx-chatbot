
import {
  randomInt,
  randomUUID,
} from "node:crypto";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  CrearLoteCodigos,
  ErrorCampoCodigos,
  LoteCodigosPanel,
  ResultadoGeneracionLote,
  TipoResultadoCodigo,
} from "@tipos/CodigosPanel";

import {
  validarCreacionLoteCodigos,
} from "./validarDatosCodigos";

import {
  generarCodigoSeguro,
} from "./generarCodigoSeguro";

import {
  cifrarResultadoCodigo,
  cifrarTokenQr,
  generarIndiceArticuloSeguro,
  VERSION_CLAVE_CODIGOS,
} from "./cifradoCodigos";

/*
 * C.B. ANDRATX
 * Generación y almacenamiento de lotes.
 *
 * Este servicio es exclusivo del backend.
 *
 * La autenticación y los permisos deben
 * comprobarse antes de llamarlo desde
 * una ruta API.
 *
 * Los premios se mezclan aleatoriamente
 * y nunca se incluyen en el QR ni en
 * el código visible.
 */

// ================================================
// CONFIGURACIÓN
// ================================================

const TAMANO_BLOQUE = 100;

/*
 * Límite temporal para una generación
 * síncrona desde una función de Vercel.
 *
 * Los lotes mayores podrán gestionarse
 * mediante un proceso por trabajos en
 * una fase posterior.
 */

const MAXIMO_LOTE_SINCRONO = 500;

const EXPRESION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ================================================
// TIPOS INTERNOS
// ================================================

interface FilaCampana {
  id: string;
  estado: string | null;
  estado_ventas: string | null;
}

interface FilaArticulo {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean | null;
}

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
  updated_at: string;
}

interface FilaDetalleLote {
  articulo_id: string | null;
  tipo_resultado: TipoResultadoCodigo;
  cantidad: number;
}

interface ResultadoAsignado {
  tipoResultado: TipoResultadoCodigo;
  articuloId: string | null;
}

interface CodigoPreparado {
  id: string;

  codigoVisible: string;
  tokenQrHash: string;

  tokenQrCifrado: string;
  resultadoCifrado: string;

  indiceArticulo: string | null;
}

interface ErrorBaseDatos {
  code?: string;
  message?: string;
}

// ================================================
// ERRORES DEL SERVICIO
// ================================================

export class ErrorCrearLoteCodigos
  extends Error {
  status: number;
  errores: ErrorCampoCodigos[];

  constructor(
    mensaje: string,
    status = 400,
    errores: ErrorCampoCodigos[] = [],
  ) {
    super(mensaje);

    this.name =
      "ErrorCrearLoteCodigos";

    this.status = status;
    this.errores = errores;
  }
}

// ================================================
// CLIENTE PRIVADO DE SUPABASE
// ================================================

function obtenerSupabasePrivado():
  SupabaseClient {
  /*
   * El cliente habitual del repositorio
   * utiliza SUPABASE_ANON_KEY.
   *
   * Los premios cifrados y los tokens
   * requieren acceso exclusivo del
   * backend.
   *
   * Nunca utilizar esta clave desde
   * React ni desde código público.
   */

  const supabaseUrl:
    string | undefined =
    import.meta.env.SUPABASE_URL;

  const supabaseServiceKey:
    string | undefined =
    import.meta.env
      .SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAnonKey:
    string | undefined =
    import.meta.env
      .SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseServiceKey ||
    supabaseServiceKey === supabaseAnonKey
  ) {
    throw new ErrorCrearLoteCodigos(
      "No se ha configurado el acceso privado de Supabase para el sistema de códigos.",
      500,
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceKey,
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
  return {
    id: fila.id,

    campanaId:
      fila.campana_id,

    plantillaId:
      fila.plantilla_id,

    nombre: fila.nombre,

    descripcion:
      fila.descripcion,

    cantidadTotal:
      fila.cantidad_total,

    estado:
      fila.estado as LoteCodigosPanel["estado"],

    claveOperacion:
      fila.clave_operacion,

    generadoPor:
      fila.generado_por,

    generadoAt:
      fila.generado_at,

    createdAt:
      fila.created_at,

    updatedAt:
      fila.updated_at,
  };
}

// ================================================
// COMPROBAR CAMPAÑA
// ================================================

async function comprobarCampana(
  cliente: SupabaseClient,
  campanaId: string,
): Promise<void> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos_campanas")
    .select(
      "id, estado, estado_ventas",
    )
    .eq("id", campanaId)
    .maybeSingle();

  if (error) {
    throw new ErrorCrearLoteCodigos(
      "No se ha podido comprobar la campaña.",
      500,
    );
  }

  const campana =
    data as FilaCampana | null;

  if (!campana) {
    throw new ErrorCrearLoteCodigos(
      "La campaña seleccionada no existe.",
      404,
    );
  }

  /*
   * Se permite preparar boletos en
   * campañas en borrador.
   *
   * Una campaña finalizada o con
   * ventas cerradas no admite
   * nuevos lotes.
   */

  if (
    campana.estado !== "borrador" &&
    campana.estado !== "activa"
  ) {
    throw new ErrorCrearLoteCodigos(
      "La campaña no permite generar nuevos boletos.",
      409,
    );
  }

  if (
    campana.estado_ventas === "cerradas"
  ) {
    throw new ErrorCrearLoteCodigos(
      "Las ventas de esta campaña están cerradas.",
      409,
    );
  }
}

// ================================================
// COMPROBAR PLANTILLA
// ================================================

async function comprobarPlantilla(
  cliente: SupabaseClient,
  plantillaId: string | null | undefined,
): Promise<void> {
  if (!plantillaId) {
    return;
  }

  const {
    data,
    error,
  } = await cliente
    .from("codigos_plantillas")
    .select("id, activo")
    .eq("id", plantillaId)
    .maybeSingle();

  if (error) {
    throw new ErrorCrearLoteCodigos(
      "No se ha podido comprobar la plantilla.",
      500,
    );
  }

  if (!data || data.activo !== true) {
    throw new ErrorCrearLoteCodigos(
      "La plantilla seleccionada no está disponible.",
      400,
    );
  }
}

// ================================================
// OBTENER ARTÍCULOS DISPONIBLES
// ================================================

async function obtenerArticulosLote(
  cliente: SupabaseClient,
  datos: CrearLoteCodigos,
): Promise<Map<string, FilaArticulo>> {
  const articulosIds =
    datos.articulos
      .filter(
        (detalle) =>
          detalle.tipoResultado ===
          "premio",
      )
      .map(
        (detalle) =>
          detalle.articuloId,
      )
      .filter(
        (id): id is string =>
          typeof id === "string",
      );

  const articulos =
    new Map<string, FilaArticulo>();

  if (articulosIds.length === 0) {
    return articulos;
  }

  const {
    data,
    error,
  } = await cliente
    .from("codigos_articulos")
    .select(
      "id, nombre, descripcion, activo",
    )
    .in(
      "id",
      articulosIds,
    );

  if (error) {
    throw new ErrorCrearLoteCodigos(
      "No se han podido comprobar los artículos.",
      500,
    );
  }

  const filas =
    (data ?? []) as FilaArticulo[];

  filas.forEach((articulo) => {
    articulos.set(
      articulo.id,
      articulo,
    );
  });

  for (
    const articuloId of articulosIds
  ) {
    const articulo =
      articulos.get(
        articuloId,
      );

    if (!articulo) {
      throw new ErrorCrearLoteCodigos(
        "Uno de los artículos seleccionados no existe.",
        400,
      );
    }

    if (
      articulo.activo !== true
    ) {
      throw new ErrorCrearLoteCodigos(
        `El artículo "${articulo.nombre}" está desactivado.`,
        409,
      );
    }
  }

  return articulos;
}

// ================================================
// PREPARAR Y MEZCLAR LOS RESULTADOS
// ================================================

function prepararResultadosAleatorios(
  datos: CrearLoteCodigos,
): ResultadoAsignado[] {
  const resultados:
    ResultadoAsignado[] = [];

  /*
   * Primero se crean las posiciones
   * correspondientes a cada artículo.
   */

  datos.articulos.forEach(
    (detalle) => {
      for (
        let indice = 0;
        indice < detalle.cantidad;
        indice += 1
      ) {
        resultados.push({
          tipoResultado:
            detalle.tipoResultado,

          articuloId:
            detalle.tipoResultado ===
            "premio"
              ? detalle.articuloId
              : null,
        });
      }
    },
  );

  /*
   * Mezcla Fisher-Yates utilizando
   * randomInt de node:crypto.
   *
   * No utilizamos Math.random().
   *
   * La posición del boleto no
   * permitirá deducir su premio.
   */

  for (
    let indice =
      resultados.length - 1;

    indice > 0;

    indice -= 1
  ) {
    const destino =
      randomInt(
        indice + 1,
      );

    [
      resultados[indice],
      resultados[destino],
    ] = [
      resultados[destino],
      resultados[indice],
    ];
  }

  return resultados;
}

// ================================================
// PREPARAR CÓDIGOS CIFRADOS
// ================================================

async function prepararBloqueCodigos(
  resultados: ResultadoAsignado[],
  articulos: Map<string, FilaArticulo>,
  codigosVisibles: Set<string>,
  hashesUtilizados: Set<string>,
): Promise<CodigoPreparado[]> {
  const preparados:
    CodigoPreparado[] = [];

  for (
    const resultado of resultados
  ) {
    /*
     * El UUID se genera antes del
     * cifrado porque forma parte
     * de los datos autenticados
     * del algoritmo AES-256-GCM.
     */

    const codigoId =
      randomUUID();

    let identificadores:
      Awaited<
        ReturnType<
          typeof generarCodigoSeguro
        >
      > | null = null;

    /*
     * Evitar repeticiones dentro
     * de la misma generación.
     */

    for (
      let intento = 0;
      intento < 5;
      intento += 1
    ) {
      const generado =
        await generarCodigoSeguro(
          "rasca_gana",
        );

      if (
        codigosVisibles.has(
          generado.codigoVisible,
        ) ||
        hashesUtilizados.has(
          generado.tokenQrHash,
        )
      ) {
        continue;
      }

      identificadores =
        generado;

      break;
    }

    if (!identificadores) {
      throw new ErrorCrearLoteCodigos(
        "No se ha podido generar un identificador único.",
        500,
      );
    }

    codigosVisibles.add(
      identificadores.codigoVisible,
    );

    hashesUtilizados.add(
      identificadores.tokenQrHash,
    );

    /*
     * El token QR se cifra para
     * permitir futuras reimpresiones.
     */

    const tokenQrCifrado =
      await cifrarTokenQr(
        codigoId,
        identificadores.tokenQr,
      );

    let indiceArticulo:
      string | null = null;

    let resultadoCifrado: string;

    if (
      resultado.tipoResultado ===
      "sin_premio"
    ) {
      resultadoCifrado =
        await cifrarResultadoCodigo(
          codigoId,
          {
            tipoResultado:
              "sin_premio",

            articuloId: null,
            nombreArticulo: null,
            descripcionArticulo: null,
          },
        );
    } else {
      const articulo =
        resultado.articuloId
          ? articulos.get(
              resultado.articuloId,
            )
          : null;

      if (!articulo) {
        throw new ErrorCrearLoteCodigos(
          "No se ha encontrado el artículo correspondiente a un premio.",
          500,
        );
      }

      indiceArticulo =
        generarIndiceArticuloSeguro(
          articulo.id,
        );

      resultadoCifrado =
        await cifrarResultadoCodigo(
          codigoId,
          {
            tipoResultado:
              "premio",

            articuloId:
              articulo.id,

            nombreArticulo:
              articulo.nombre,

            descripcionArticulo:
              articulo.descripcion,
          },
        );
    }

    preparados.push({
      id: codigoId,

      codigoVisible:
        identificadores.codigoVisible,

      tokenQrHash:
        identificadores.tokenQrHash,

      tokenQrCifrado,

      resultadoCifrado,

      indiceArticulo,
    });
  }

  return preparados;
}

// ================================================
// COMPROBAR COLISIONES EN SUPABASE
// ================================================

async function comprobarColisionesCodigos(
  cliente: SupabaseClient,
  preparados: CodigoPreparado[],
): Promise<void> {
  const visibles =
    preparados.map(
      (codigo) =>
        codigo.codigoVisible,
    );

  const hashes =
    preparados.map(
      (codigo) =>
        codigo.tokenQrHash,
    );

  const [
    resultadoVisibles,
    resultadoHashes,
  ] = await Promise.all([
    cliente
      .from("codigos")
      .select("id")
      .in(
        "codigo_visible",
        visibles,
      )
      .limit(1),

    cliente
      .from("codigos")
      .select("id")
      .in(
        "qr_token_hash",
        hashes,
      )
      .limit(1),
  ]);

  if (
    resultadoVisibles.error ||
    resultadoHashes.error
  ) {
    throw new ErrorCrearLoteCodigos(
      "No se ha podido comprobar la unicidad de los códigos.",
      500,
    );
  }

  if (
    (resultadoVisibles.data?.length ?? 0) > 0 ||
    (resultadoHashes.data?.length ?? 0) > 0
  ) {
    throw new ErrorCrearLoteCodigos(
      "Se ha detectado un identificador duplicado. Genera un nuevo lote.",
      409,
    );
  }
}

// ================================================
// GUARDAR BLOQUE EN SUPABASE
// ================================================

async function guardarBloqueCodigos(
  cliente: SupabaseClient,
  loteId: string,
  usuarioId: string,
  preparados: CodigoPreparado[],
): Promise<void> {
  const fecha =
    new Date().toISOString();

  /*
   * Primera inserción:
   * identificadores y tokens cifrados.
   */

  const filasCodigos =
    preparados.map(
      (codigo) => ({
        id: codigo.id,

        lote_id: loteId,

        tipo:
          "rasca_gana",

        formato:
          "qr",

        acceso:
          "protegido",

        codigo_visible:
          codigo.codigoVisible,

        qr_token_hash:
          codigo.tokenQrHash,

        qr_token_cifrado:
          codigo.tokenQrCifrado,

        contenido_publico:
          null,

        estado_venta:
          "pendiente",

        estado_registro:
          "activo",

        creado_por:
          usuarioId,

        created_at:
          fecha,

        updated_at:
          fecha,
      }),
    );

  const {
    error: errorCodigos,
  } = await cliente
    .from("codigos")
    .insert(
      filasCodigos,
    );

  if (errorCodigos) {
    throw new ErrorCrearLoteCodigos(
      "No se han podido guardar los identificadores del lote.",
      errorCodigos.code ===
        "23505"
        ? 409
        : 500,
    );
  }

  /*
   * Segunda inserción:
   * resultados y premios cifrados.
   *
   * No almacenamos el UUID del
   * artículo en claro.
   */

  const filasResultados =
    preparados.map(
      (codigo) => ({
        codigo_id:
          codigo.id,

        tipo_contenido:
          "resultado",

        resultado_cifrado:
          codigo.resultadoCifrado,

        indice_articulo:
          codigo.indiceArticulo,

        version_clave:
          VERSION_CLAVE_CODIGOS,

        created_at:
          fecha,

        updated_at:
          fecha,
      }),
    );

  const {
    error: errorResultados,
  } = await cliente
    .from("codigos_resultados")
    .insert(
      filasResultados,
    );

  if (errorResultados) {
    throw new ErrorCrearLoteCodigos(
      "No se han podido guardar los resultados protegidos del lote.",
      500,
    );
  }
}

// ================================================
// COMPROBAR CONFIGURACIÓN DE REINTENTO
// ================================================

async function recuperarLoteExistente(
  cliente: SupabaseClient,
  datos: CrearLoteCodigos,
  usuarioId: string,
): Promise<ResultadoGeneracionLote | null> {
  const {
    data,
    error,
  } = await cliente
    .from("codigos_lotes")
    .select("*")
    .eq(
      "id",
      datos.claveOperacion,
    )
    .maybeSingle();

  if (error) {
    throw new ErrorCrearLoteCodigos(
      "No se ha podido comprobar si el lote ya existe.",
      500,
    );
  }

  const lote =
    data as FilaLote | null;

  if (!lote) {
    return null;
  }

  /*
   * Se utiliza claveOperacion como
   * identificador del lote.
   *
   * La clave primaria de PostgreSQL
   * impide duplicar el mismo lote
   * aunque lleguen dos solicitudes
   * simultáneamente.
   */

  const cantidadEsperada =
    datos.articulos.reduce(
      (total, detalle) =>
        total + detalle.cantidad,
      0,
    );

  if (
    lote.generado_por !== usuarioId ||
    lote.campana_id !== datos.campanaId ||
    lote.plantilla_id !==
      (datos.plantillaId ?? null) ||
    lote.nombre !== datos.nombre ||
    lote.descripcion !==
      (datos.descripcion ?? null) ||
    lote.cantidad_total !==
      cantidadEsperada
  ) {
    throw new ErrorCrearLoteCodigos(
      "La clave de operación ya está siendo utilizada por otro lote.",
      409,
    );
  }

  const {
    data: detalles,
    error: errorDetalles,
  } = await cliente
    .from("codigos_lotes_detalles")
    .select(
      "articulo_id, tipo_resultado, cantidad",
    )
    .eq(
      "lote_id",
      lote.id,
    );

  if (errorDetalles) {
    throw new ErrorCrearLoteCodigos(
      "No se ha podido comprobar el contenido del lote existente.",
      500,
    );
  }

  const convertirClaveDetalle = (
    articuloId: string | null,
    tipo: string,
  ): string => {
    return [
      tipo,
      articuloId ?? "",
    ].join(":");
  };

  const esperados =
    new Map<string, number>();

  datos.articulos.forEach(
    (detalle) => {
      esperados.set(
        convertirClaveDetalle(
          detalle.articuloId,
          detalle.tipoResultado,
        ),
        detalle.cantidad,
      );
    },
  );

  const existentes =
    (detalles ?? []) as FilaDetalleLote[];

  if (
    existentes.length !==
    esperados.size
  ) {
    throw new ErrorCrearLoteCodigos(
      "La configuración del lote existente no coincide con la solicitud.",
      409,
    );
  }

  for (
    const detalle of existentes
  ) {
    const clave =
      convertirClaveDetalle(
        detalle.articulo_id,
        detalle.tipo_resultado,
      );

    if (
      esperados.get(clave) !==
      detalle.cantidad
    ) {
      throw new ErrorCrearLoteCodigos(
        "Los artículos del lote existente no coinciden con la solicitud.",
        409,
      );
    }
  }

  if (
    lote.estado !== "generado"
  ) {
    throw new ErrorCrearLoteCodigos(
      lote.estado === "generando"
        ? "Este lote ya se está generando. Espera a que termine."
        : "El lote existe, pero no está completado y requiere revisión.",
      409,
    );
  }

  const {
    data: codigos,
    error: errorCodigos,
  } = await cliente
    .from("codigos")
    .select(
      "codigo_visible",
    )
    .eq(
      "lote_id",
      lote.id,
    )
    .order(
      "created_at",
      {
        ascending: true,
      },
    );

  if (errorCodigos) {
    throw new ErrorCrearLoteCodigos(
      "No se han podido recuperar los códigos del lote.",
      500,
    );
  }

  const codigosVisibles =
    (codigos ?? []).map(
      (codigo) =>
        String(
          codigo.codigo_visible,
        ),
    );

  if (
    codigosVisibles.length !==
    lote.cantidad_total
  ) {
    throw new ErrorCrearLoteCodigos(
      "El lote no contiene la cantidad esperada de códigos.",
      500,
    );
  }

  return {
    lote:
      convertirFilaLote(lote),

    cantidadGenerada:
      codigosVisibles.length,

    codigosVisibles,
  };
}

// ================================================
// MARCAR UN LOTE INCOMPLETO
// ================================================

async function marcarLoteConError(
  cliente: SupabaseClient,
  loteId: string,
): Promise<void> {
  const fecha =
    new Date().toISOString();

  /*
   * Si falla una generación, los
   * códigos parciales se invalidan.
   *
   * No se borran automáticamente:
   * se conservan para poder revisar
   * el problema sin perder el historial.
   */

  const {
    error: errorCodigos,
  } = await cliente
    .from("codigos")
    .update({
      estado_registro:
        "anulado",

      updated_at:
        fecha,
    })
    .eq(
      "lote_id",
      loteId,
    )
    .eq(
      "estado_registro",
      "activo",
    );

  if (errorCodigos) {
    console.error(
      "Error invalidando códigos de un lote incompleto:",
      {
        loteId,
        codigoError:
          errorCodigos.code,
      },
    );
  }

  const {
    error: errorLote,
  } = await cliente
    .from("codigos_lotes")
    .update({
      estado:
        "error",

      updated_at:
        fecha,
    })
    .eq(
      "id",
      loteId,
    )
    .eq(
      "estado",
      "generando",
    );

  if (errorLote) {
    console.error(
      "Error marcando un lote incompleto:",
      {
        loteId,
        codigoError:
          errorLote.code,
      },
    );
  }
}

// ================================================
// REGISTRAR MOVIMIENTO DEL LOTE
// ================================================

async function registrarMovimientoLote(
  cliente: SupabaseClient,
  loteId: string,
  campanaId: string,
  usuarioId: string,
  cantidad: number,
): Promise<void> {
  const {
    error,
  } = await cliente
    .from("codigos_movimientos")
    .insert({
      codigo_id:
        null,

      campana_id:
        campanaId,

      operacion_id:
        loteId,

      accion:
        "lote_generado",

      usuario_id:
        usuarioId,

      detalles: {
        loteId,
        cantidad,
      },
    });

  if (error) {
    /*
     * El lote ya está generado.
     * No lo marcamos como fallido
     * solo porque el registro de
     * auditoría no se haya podido
     * completar.
     *
     * Se deja constancia del error
     * para su investigación.
     */

    console.error(
      "No se ha podido registrar el movimiento del lote:",
      {
        loteId,
        codigoError:
          error.code,
      },
    );
  }
}

// ================================================
// CREAR LOTE COMPLETO
// ================================================

export async function crearLoteCodigos(
  contenido: unknown,
  usuarioId: string,
): Promise<ResultadoGeneracionLote> {
  /*
   * La API debe comprobar previamente:
   *
   * codigos.crear
   *
   * No debe permitirse llamar a este
   * servicio directamente desde
   * el navegador.
   */

  if (
    typeof usuarioId !== "string" ||
    !EXPRESION_UUID.test(
      usuarioId,
    )
  ) {
    throw new ErrorCrearLoteCodigos(
      "No se ha podido identificar al usuario.",
      401,
    );
  }

  const validacion =
    validarCreacionLoteCodigos(
      contenido,
    );

  if (
    !validacion.valido ||
    !validacion.datos
  ) {
    throw new ErrorCrearLoteCodigos(
      "Revisa la configuración del lote.",
      400,
      validacion.errores,
    );
  }

  const datos =
    validacion.datos;

  const cantidadTotal =
    datos.articulos.reduce(
      (total, detalle) =>
        total + detalle.cantidad,
      0,
    );

  if (
    cantidadTotal >
    MAXIMO_LOTE_SINCRONO
  ) {
    throw new ErrorCrearLoteCodigos(
      `La generación directa admite un máximo de ${MAXIMO_LOTE_SINCRONO} boletos por lote.`,
      400,
    );
  }

  const cliente =
    obtenerSupabasePrivado();

  /*
   * Comprobación de reintentos.
   *
   * Si el lote ya se generó con
   * esta clave, devolvemos el mismo
   * resultado sin duplicar boletos.
   */

  const loteExistente =
    await recuperarLoteExistente(
      cliente,
      datos,
      usuarioId,
    );

  if (loteExistente) {
    return loteExistente;
  }

  // Comprobaciones previas.

  await Promise.all([
    comprobarCampana(
      cliente,
      datos.campanaId,
    ),

    comprobarPlantilla(
      cliente,
      datos.plantillaId,
    ),
  ]);

  const articulos =
    await obtenerArticulosLote(
      cliente,
      datos,
    );

  /*
   * Se utiliza la clave de operación
   * como UUID del lote para impedir
   * duplicaciones por doble clic
   * o reintentos simultáneos.
   */

  const loteId =
    datos.claveOperacion;

  const fecha =
    new Date().toISOString();

  const {
    data: loteCreado,
    error: errorCreacion,
  } = await cliente
    .from("codigos_lotes")
    .insert({
      id: loteId,

      campana_id:
        datos.campanaId,

      plantilla_id:
        datos.plantillaId ?? null,

      nombre:
        datos.nombre,

      descripcion:
        datos.descripcion ?? null,

      cantidad_total:
        cantidadTotal,

      estado:
        "generando",

      clave_operacion:
        loteId,

      generado_por:
        usuarioId,

      generado_at:
        null,

      created_at:
        fecha,

      updated_at:
        fecha,
    })
    .select(
      "id",
    )
    .single();

  if (errorCreacion) {
    /*
     * Si dos solicitudes utilizan
     * la misma clave, la clave
     * primaria impide crear dos
     * registros.
     */

    if (
      errorCreacion.code ===
      "23505"
    ) {
      const existente =
        await recuperarLoteExistente(
          cliente,
          datos,
          usuarioId,
        );

      if (existente) {
        return existente;
      }
    }

    throw new ErrorCrearLoteCodigos(
      "No se ha podido crear el lote de códigos.",
      errorCreacion.code ===
        "23505"
        ? 409
        : 500,
    );
  }

  if (!loteCreado?.id) {
    throw new ErrorCrearLoteCodigos(
      "No se ha podido confirmar la creación del lote.",
      500,
    );
  }

  /*
   * A partir de este punto, cualquier
   * error deja el lote bloqueado
   * para evitar utilizar boletos
   * incompletos.
   */

  try {
    // Guardar la distribución prevista.

    const filasDetalles =
      datos.articulos.map(
        (detalle) => ({
          lote_id:
            loteId,

          articulo_id:
            detalle.articuloId,

          tipo_resultado:
            detalle.tipoResultado,

          cantidad:
            detalle.cantidad,
        }),
      );

    const {
      error: errorDetalles,
    } = await cliente
      .from("codigos_lotes_detalles")
      .insert(
        filasDetalles,
      );

    if (errorDetalles) {
      throw new ErrorCrearLoteCodigos(
        "No se han podido guardar los artículos del lote.",
        500,
      );
    }

    // Mezclar los premios.

    const resultados =
      prepararResultadosAleatorios(
        datos,
      );

    const codigosVisibles:
      string[] = [];

    const codigosUtilizados =
      new Set<string>();

    const hashesUtilizados =
      new Set<string>();

    /*
     * Generamos los boletos por
     * bloques para limitar el
     * tamaño de cada petición.
     */

    for (
      let indice = 0;
      indice < resultados.length;
      indice += TAMANO_BLOQUE
    ) {
      const bloqueResultados =
        resultados.slice(
          indice,
          indice + TAMANO_BLOQUE,
        );

      const preparados =
        await prepararBloqueCodigos(
          bloqueResultados,
          articulos,
          codigosUtilizados,
          hashesUtilizados,
        );

      await comprobarColisionesCodigos(
        cliente,
        preparados,
      );

      await guardarBloqueCodigos(
        cliente,
        loteId,
        usuarioId,
        preparados,
      );

      codigosVisibles.push(
        ...preparados.map(
          (codigo) =>
            codigo.codigoVisible,
        ),
      );
    }

    if (
      codigosVisibles.length !==
      cantidadTotal
    ) {
      throw new ErrorCrearLoteCodigos(
        "La generación del lote ha quedado incompleta.",
        500,
      );
    }

    /*
     * Comprobamos que la cantidad
     * de códigos guardados coincide
     * con la cantidad prevista.
     */

    const {
      count,
      error: errorConteo,
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
        loteId,
      );

    if (
      errorConteo ||
      count !== cantidadTotal
    ) {
      throw new ErrorCrearLoteCodigos(
        "El número de códigos almacenados no coincide con el lote.",
        500,
      );
    }

    /*
     * Volvemos a comprobar la
     * campaña antes de finalizar.
     */

    await comprobarCampana(
      cliente,
      datos.campanaId,
    );

    const fechaGeneracion =
      new Date().toISOString();

    /*
     * El lote solo se publica
     * como generado cuando todos
     * los códigos y resultados
     * se han guardado.
     */

    const {
      data: loteFinalizado,
      error: errorFinalizacion,
    } = await cliente
      .from("codigos_lotes")
      .update({
        estado:
          "generado",

        generado_at:
          fechaGeneracion,

        updated_at:
          fechaGeneracion,
      })
      .eq(
        "id",
        loteId,
      )
      .eq(
        "estado",
        "generando",
      )
      .select("*")
      .single();

    if (
      errorFinalizacion ||
      !loteFinalizado
    ) {
      throw new ErrorCrearLoteCodigos(
        "No se ha podido finalizar la generación del lote.",
        500,
      );
    }

    await registrarMovimientoLote(
      cliente,
      loteId,
      datos.campanaId,
      usuarioId,
      cantidadTotal,
    );

    return {
      lote:
        convertirFilaLote(
          loteFinalizado as FilaLote,
        ),

      cantidadGenerada:
        codigosVisibles.length,

      codigosVisibles,
    };
  } catch (error) {
    console.error(
      "Error generando el lote de códigos:",
      {
        loteId,
        mensaje:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
    );

    await marcarLoteConError(
      cliente,
      loteId,
    );

    if (
      error instanceof
      ErrorCrearLoteCodigos
    ) {
      throw error;
    }

    throw new ErrorCrearLoteCodigos(
      "No se ha podido completar la generación del lote.",
      500,
    );
  }
}

// ================================================
// FIN DEL ARCHIVO
// ================================================
