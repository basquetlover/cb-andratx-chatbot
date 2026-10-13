
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

import {
  esTokenQrValido,
} from "./generarCodigoSeguro";

import type {
  TipoResultadoCodigo,
} from "@tipos/CodigosPanel";

/*
 * C.B. ANDRATX
 * Servicio de cifrado del sistema de códigos.
 *
 * Algoritmo:
 * AES-256-GCM
 *
 * Derivación de claves:
 * HKDF-SHA256
 *
 * Índice protegido de artículos:
 * HMAC-SHA256
 *
 * Este archivo es exclusivo del backend.
 *
 * Nunca devolver las claves, los tokens
 * ni los resultados descifrados a usuarios
 * que no tengan los permisos necesarios.
 */

// ================================================
// CONFIGURACIÓN
// ================================================

export const VERSION_CLAVE_CODIGOS = 1;

const LONGITUD_CLAVE = 32;
const LONGITUD_IV = 12;
const LONGITUD_ETIQUETA = 16;

const MAXIMO_BYTES_CIFRADOS = 16384;
const MAXIMO_BYTES_TEXTO = 8192;

const SALT_DERIVACION =
  "cba-codigos-hkdf-v1";

const EXPRESION_CLAVE =
  /^[A-Za-z0-9_-]{43}$/;

const EXPRESION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FinalidadCifrado =
  | "token_qr"
  | "resultado";

// ================================================
// TIPOS
// ================================================

export interface ResultadoProtegidoCodigo {
  tipoResultado: TipoResultadoCodigo;

  articuloId: string | null;

  nombreArticulo: string | null;

  descripcionArticulo: string | null;
}

/*
 * Los campos BYTEA de Supabase se
 * representan como cadenas hexadecimales
 * con el prefijo \x.
 *
 * También se admite Uint8Array al leer
 * datos obtenidos por otros servicios.
 */

export type ContenidoCifradoCodigos =
  | string
  | Uint8Array;

// ================================================
// FUNCIONES AUXILIARES
// ================================================

function validarCodigoId(
  codigoId: string,
): string {
  if (
    typeof codigoId !== "string" ||
    !EXPRESION_UUID.test(codigoId)
  ) {
    throw new Error(
      "El identificador del código no es válido.",
    );
  }

  return codigoId.toLowerCase();
}

function obtenerClaveMaestra(): Buffer {
  /*
   * Esta variable solo debe existir
   * en el servidor.
   *
   * Debe contener 32 bytes aleatorios
   * codificados en Base64URL.
   *
   * Nunca utilizar una contraseña
   * escrita manualmente.
   */

  const valor =
    import.meta.env
      .CBA_CODIGOS_CLAVE_CIFRADO_V1;

  if (
    typeof valor !== "string" ||
    !EXPRESION_CLAVE.test(valor)
  ) {
    throw new Error(
      "No se ha configurado correctamente CBA_CODIGOS_CLAVE_CIFRADO_V1.",
    );
  }

  const clave =
    Buffer.from(
      valor,
      "base64url",
    );

  if (
    clave.length !== LONGITUD_CLAVE ||
    clave.toString("base64url") !== valor
  ) {
    throw new Error(
      "La clave de cifrado de códigos no tiene un formato válido.",
    );
  }

  return clave;
}

function derivarClave(
  finalidad:
    | FinalidadCifrado
    | "indice_articulo",
): Buffer {
  /*
   * Se deriva una clave independiente
   * para cada finalidad.
   *
   * De este modo, la clave utilizada
   * para cifrar tokens no es la misma
   * que protege los premios.
   *
   * El índice HMAC también utiliza
   * su propia clave derivada.
   */

  const claveMaestra =
    obtenerClaveMaestra();

  const claveDerivada =
    hkdfSync(
      "sha256",
      claveMaestra,
      Buffer.from(
        SALT_DERIVACION,
        "utf8",
      ),
      Buffer.from(
        `cba-codigos/${finalidad}/v1`,
        "utf8",
      ),
      LONGITUD_CLAVE,
    );

  return Buffer.from(
    claveDerivada,
  );
}

function construirDatosAutenticados(
  codigoId: string,
  finalidad: FinalidadCifrado,
  version: number,
): Buffer {
  /*
   * Los datos autenticados (AAD)
   * vinculan el cifrado al código
   * concreto y a su finalidad.
   *
   * Si se copia el contenido cifrado
   * de otro boleto, el descifrado
   * fallará.
   */

  return Buffer.from(
    [
      "cba",
      "codigos",
      `v${version}`,
      finalidad,
      validarCodigoId(codigoId),
    ].join(":"),
    "utf8",
  );
}

function convertirBytea(
  contenido: ContenidoCifradoCodigos,
): Buffer {
  if (contenido instanceof Uint8Array) {
    if (
      contenido.length === 0 ||
      contenido.length >
        MAXIMO_BYTES_CIFRADOS
    ) {
      throw new Error(
        "El contenido cifrado no tiene un tamaño válido.",
      );
    }

    return Buffer.from(contenido);
  }

  if (typeof contenido !== "string") {
    throw new Error(
      "El contenido cifrado no es válido.",
    );
  }

  /*
   * PostgreSQL BYTEA utiliza
   * representación hexadecimal.
   */

  if (
    !/^\\x(?:[0-9a-f]{2})+$/i.test(
      contenido,
    )
  ) {
    throw new Error(
      "El formato del contenido cifrado no es válido.",
    );
  }

  const longitudBytes =
    (contenido.length - 2) / 2;

  if (
    longitudBytes < 1 ||
    longitudBytes >
      MAXIMO_BYTES_CIFRADOS
  ) {
    throw new Error(
      "El contenido cifrado no tiene un tamaño válido.",
    );
  }

  return Buffer.from(
    contenido.slice(2),
    "hex",
  );
}

function convertirParaSupabase(
  contenido: Buffer,
): string {
  /*
   * Formato compatible con campos
   * BYTEA de PostgreSQL.
   */

  return (
    "\\x" +
    contenido.toString("hex")
  );
}

// ================================================
// CIFRADO GENERAL AES-256-GCM
// ================================================

async function cifrarContenido(
  codigoId: string,
  contenido: string,
  finalidad: FinalidadCifrado,
): Promise<string> {
  const identificador =
    validarCodigoId(codigoId);

  const contenidoBytes =
    Buffer.from(
      contenido,
      "utf8",
    );

  if (
    contenidoBytes.length === 0 ||
    contenidoBytes.length >
      MAXIMO_BYTES_TEXTO
  ) {
    throw new Error(
      "El contenido a cifrar no tiene un tamaño válido.",
    );
  }

  const clave =
    derivarClave(finalidad);

  /*
   * IV aleatorio de 96 bits.
   *
   * Se genera uno nuevo en cada
   * operación de cifrado.
   */

  const iv =
    randomBytes(
      LONGITUD_IV,
    );

  const cifrador =
    createCipheriv(
      "aes-256-gcm",
      clave,
      iv,
      {
        authTagLength:
          LONGITUD_ETIQUETA,
      },
    );

  cifrador.setAAD(
    construirDatosAutenticados(
      identificador,
      finalidad,
      VERSION_CLAVE_CODIGOS,
    ),
  );

  const contenidoCifrado =
    Buffer.concat([
      cifrador.update(
        contenidoBytes,
      ),
      cifrador.final(),
    ]);

  const etiqueta =
    cifrador.getAuthTag();

  /*
   * Estructura almacenada:
   *
   * [1 byte]  Versión de clave
   * [12 bytes] IV
   * [16 bytes] Etiqueta GCM
   * [resto]    Datos cifrados
   *
   * Todo se guarda en un único BYTEA.
   */

  const resultado =
    Buffer.concat([
      Buffer.from([
        VERSION_CLAVE_CODIGOS,
      ]),
      iv,
      etiqueta,
      contenidoCifrado,
    ]);

  return convertirParaSupabase(
    resultado,
  );
}

// ================================================
// DESCIFRADO GENERAL AES-256-GCM
// ================================================

async function descifrarContenido(
  codigoId: string,
  contenido: ContenidoCifradoCodigos,
  finalidad: FinalidadCifrado,
): Promise<string> {
  const identificador =
    validarCodigoId(codigoId);

  const bytes =
    convertirBytea(contenido);

  const longitudCabecera =
    1 +
    LONGITUD_IV +
    LONGITUD_ETIQUETA;

  if (
    bytes.length <=
    longitudCabecera
  ) {
    throw new Error(
      "El contenido cifrado está incompleto.",
    );
  }

  const version =
    bytes[0];

  if (
    version !==
    VERSION_CLAVE_CODIGOS
  ) {
    throw new Error(
      "La versión de la clave de cifrado no está disponible.",
    );
  }

  const inicioIv = 1;

  const finIv =
    inicioIv +
    LONGITUD_IV;

  const finEtiqueta =
    finIv +
    LONGITUD_ETIQUETA;

  const iv =
    bytes.subarray(
      inicioIv,
      finIv,
    );

  const etiqueta =
    bytes.subarray(
      finIv,
      finEtiqueta,
    );

  const datosCifrados =
    bytes.subarray(
      finEtiqueta,
    );

  const clave =
    derivarClave(finalidad);

  try {
    const descifrador =
      createDecipheriv(
        "aes-256-gcm",
        clave,
        iv,
        {
          authTagLength:
            LONGITUD_ETIQUETA,
        },
      );

    descifrador.setAAD(
      construirDatosAutenticados(
        identificador,
        finalidad,
        version,
      ),
    );

    descifrador.setAuthTag(
      etiqueta,
    );

    const resultado =
      Buffer.concat([
        descifrador.update(
          datosCifrados,
        ),
        descifrador.final(),
      ]);

    if (
      resultado.length >
      MAXIMO_BYTES_TEXTO
    ) {
      throw new Error(
        "Contenido demasiado grande.",
      );
    }

    return resultado.toString(
      "utf8",
    );
  } catch {
    /*
     * No se revela si el error procede
     * de una clave incorrecta, de una
     * modificación de los datos o de
     * un identificador diferente.
     */

    throw new Error(
      "No se ha podido descifrar el contenido protegido.",
    );
  }
}

// ================================================
// CIFRAR TOKEN QR
// ================================================

export async function cifrarTokenQr(
  codigoId: string,
  tokenQr: string,
): Promise<string> {
  if (!esTokenQrValido(tokenQr)) {
    throw new Error(
      "El token QR no tiene un formato válido.",
    );
  }

  return cifrarContenido(
    codigoId,
    tokenQr,
    "token_qr",
  );
}

// ================================================
// DESCIFRAR TOKEN QR
// ================================================

export async function descifrarTokenQr(
  codigoId: string,
  tokenCifrado: ContenidoCifradoCodigos,
): Promise<string> {
  const tokenQr =
    await descifrarContenido(
      codigoId,
      tokenCifrado,
      "token_qr",
    );

  if (!esTokenQrValido(tokenQr)) {
    throw new Error(
      "El token QR recuperado no es válido.",
    );
  }

  return tokenQr;
}

// ================================================
// VALIDAR RESULTADO PROTEGIDO
// ================================================

function validarResultadoProtegido(
  valor: unknown,
): ResultadoProtegidoCodigo {
  if (
    typeof valor !== "object" ||
    valor === null ||
    Array.isArray(valor)
  ) {
    throw new Error(
      "Los datos del resultado protegido no son válidos.",
    );
  }

  const datos =
    valor as Record<string, unknown>;

  if (
    datos.tipoResultado !==
      "premio" &&
    datos.tipoResultado !==
      "sin_premio"
  ) {
    throw new Error(
      "El tipo de resultado no es válido.",
    );
  }

  /*
   * Los boletos sin premio no tienen
   * artículo asociado.
   */

  if (
    datos.tipoResultado ===
    "sin_premio"
  ) {
    if (
      datos.articuloId != null ||
      datos.nombreArticulo != null ||
      datos.descripcionArticulo != null
    ) {
      throw new Error(
        "Un boleto sin premio no puede tener un artículo asociado.",
      );
    }

    return {
      tipoResultado:
        "sin_premio",

      articuloId: null,

      nombreArticulo: null,

      descripcionArticulo: null,
    };
  }

  /*
   * Los boletos premiados contienen
   * una copia protegida del nombre
   * y descripción del artículo.
   *
   * Así, modificar posteriormente
   * el catálogo no altera el premio
   * originalmente asignado.
   */

  const articuloId =
    datos.articuloId;

  const nombreArticulo =
    datos.nombreArticulo;

  const descripcionArticulo =
    datos.descripcionArticulo;

  if (
    typeof articuloId !== "string" ||
    !EXPRESION_UUID.test(articuloId)
  ) {
    throw new Error(
      "El identificador del artículo premiado no es válido.",
    );
  }

  if (
    typeof nombreArticulo !==
      "string" ||
    nombreArticulo.trim().length === 0 ||
    nombreArticulo.trim().length > 120
  ) {
    throw new Error(
      "El nombre del artículo premiado no es válido.",
    );
  }

  if (
    descripcionArticulo != null &&
    (
      typeof descripcionArticulo !==
        "string" ||
      descripcionArticulo.length > 2000
    )
  ) {
    throw new Error(
      "La descripción del artículo premiado no es válida.",
    );
  }

  return {
    tipoResultado: "premio",

    articuloId:
      articuloId.toLowerCase(),

    nombreArticulo:
      nombreArticulo.trim(),

    descripcionArticulo:
      typeof descripcionArticulo === "string"
        ? descripcionArticulo
        : null,
  };
}

// ================================================
// CIFRAR RESULTADO O PREMIO
// ================================================

export async function cifrarResultadoCodigo(
  codigoId: string,
  resultado: ResultadoProtegidoCodigo,
): Promise<string> {
  const datosValidados =
    validarResultadoProtegido(
      resultado,
    );

  const contenido =
    JSON.stringify(
      datosValidados,
    );

  return cifrarContenido(
    codigoId,
    contenido,
    "resultado",
  );
}

// ================================================
// DESCIFRAR RESULTADO O PREMIO
// ================================================

export async function descifrarResultadoCodigo(
  codigoId: string,
  resultadoCifrado: ContenidoCifradoCodigos,
): Promise<ResultadoProtegidoCodigo> {
  const contenido =
    await descifrarContenido(
      codigoId,
      resultadoCifrado,
      "resultado",
    );

  let datos: unknown;

  try {
    datos =
      JSON.parse(
        contenido,
      );
  } catch {
    throw new Error(
      "El contenido del resultado protegido no es válido.",
    );
  }

  return validarResultadoProtegido(
    datos,
  );
}

// ================================================
// ÍNDICE PROTEGIDO DE ARTÍCULOS
// ================================================

export function generarIndiceArticuloSeguro(
  articuloId: string,
): string {
  const identificador =
    validarCodigoId(
      articuloId,
    );

  /*
   * Este índice permite localizar
   * los boletos de un artículo sin
   * guardar su UUID directamente
   * en codigos_resultados.
   *
   * No es un SHA-256 ordinario:
   * se utiliza HMAC con una clave
   * derivada exclusiva.
   */

  const clave =
    derivarClave(
      "indice_articulo",
    );

  return createHmac(
    "sha256",
    clave,
  )
    .update(
      `cba-articulo:${identificador}`,
      "utf8",
    )
    .digest(
      "hex",
    );
}

// ================================================
// FIN DEL ARCHIVO
// ================================================
