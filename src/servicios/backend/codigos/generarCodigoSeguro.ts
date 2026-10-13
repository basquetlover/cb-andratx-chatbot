
import type {
  TipoCodigoPanel,
} from "@tipos/CodigosPanel";

import {
  calcularHashToken,
} from "../usuarios/calcularHashToken";

/*
 * C.B. ANDRATX
 * Generación segura de códigos y tokens QR.
 *
 * Cada código dispone de:
 *
 * 1. Un identificador visible aleatorio.
 * 2. Un token QR secreto independiente.
 * 3. Un hash SHA-256 del token.
 * 4. Una URL que se imprimirá como QR.
 *
 * No se incluye información del premio
 * en ninguno de estos identificadores.
 *
 * Este servicio debe ejecutarse únicamente
 * en el backend del club.
 */

// ================================================
// CONFIGURACIÓN
// ================================================

const DOMINIO_CBA =
  "https://cbandratx.es";

const RUTA_QR_PROTEGIDO =
  "/codigos/bloqueado";

const ALFABETO_CODIGO =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/*
 * Se excluyen los caracteres visualmente
 * ambiguos I, O, 0 y 1.
 *
 * El alfabeto contiene 32 caracteres,
 * por lo que cada carácter representa
 * 5 bits de aleatoriedad.
 */

const LONGITUD_CODIGO_ALEATORIO =
  16;

const LONGITUD_TOKEN_BYTES =
  32;

const EXPRESION_TOKEN_QR =
  /^[A-Za-z0-9_-]{43}$/;

const EXPRESION_CODIGO_VISIBLE =
  /^CBA-(?:RG|COD)-(?:[A-HJ-NP-Z2-9]{4}-){3}[A-HJ-NP-Z2-9]{4}$/;

// ================================================
// TIPOS
// ================================================

export interface CodigoSeguroGenerado {
  /*
   * Identificador impreso bajo el QR.
   *
   * Ejemplo:
   * CBA-RG-K7M2-Q9RP-V4X8-B6TN
   */
  codigoVisible: string;

  /*
   * Token secreto del QR.
   *
   * Solo debe utilizarse temporalmente
   * durante la generación y el cifrado.
   *
   * Nunca debe almacenarse en claro.
   */
  tokenQr: string;

  /*
   * Hash SHA-256 del token.
   *
   * Se guardará en:
   * codigos.qr_token_hash
   */
  tokenQrHash: string;

  /*
   * Contenido que se convertirá en QR.
   *
   * No contiene el premio.
   */
  contenidoQr: string;
}

// ================================================
// FUNCIONES AUXILIARES
// ================================================

function obtenerPrefijoCodigo(
  tipo: TipoCodigoPanel,
): string {
  switch (tipo) {
    case "rasca_gana":
      return "CBA-RG";

    case "general":
      return "CBA-COD";

    default:
      throw new Error(
        "El tipo de código solicitado no es válido.",
      );
  }
}

function generarBytesAleatorios(
  cantidad: number,
): Uint8Array {
  if (
    !Number.isSafeInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > 65536
  ) {
    throw new Error(
      "La cantidad de bytes aleatorios no es válida.",
    );
  }

  /*
   * Crypto utiliza un generador
   * criptográficamente seguro.
   *
   * No utilizamos Math.random().
   */

  const bytes =
    new Uint8Array(cantidad);

  crypto.getRandomValues(bytes);

  return bytes;
}

function convertirBase64Url(
  bytes: Uint8Array,
): string {
  let contenidoBinario = "";

  bytes.forEach((byte) => {
    contenidoBinario +=
      String.fromCharCode(byte);
  });

  return btoa(contenidoBinario)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function separarCodigoEnBloques(
  codigo: string,
): string {
  return codigo
    .match(/.{1,4}/g)
    ?.join("-") ?? codigo;
}

// ================================================
// GENERACIÓN DEL CÓDIGO VISIBLE
// ================================================

export function generarCodigoVisible(
  tipo: TipoCodigoPanel = "rasca_gana",
): string {
  const prefijo =
    obtenerPrefijoCodigo(tipo);

  /*
   * Se generan 16 bytes aleatorios.
   *
   * Cada byte aporta sus 5 bits menos
   * significativos para seleccionar
   * un carácter del alfabeto.
   *
   * Resultado:
   *
   * 16 caracteres x 5 bits = 80 bits.
   *
   * La distribución es uniforme porque
   * el alfabeto tiene 32 caracteres.
   */

  const bytes =
    generarBytesAleatorios(
      LONGITUD_CODIGO_ALEATORIO,
    );

  let codigoAleatorio = "";

  bytes.forEach((byte) => {
    const indice =
      byte & 31;

    codigoAleatorio +=
      ALFABETO_CODIGO.charAt(indice);
  });

  const codigoFormateado =
    separarCodigoEnBloques(
      codigoAleatorio,
    );

  return (
    `${prefijo}-${codigoFormateado}`
  );
}

// ================================================
// NORMALIZACIÓN DEL CÓDIGO VISIBLE
// ================================================

export function normalizarCodigoVisible(
  codigo: string,
): string {
  return codigo
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function esCodigoVisibleValido(
  codigo: string,
): boolean {
  const codigoNormalizado =
    normalizarCodigoVisible(
      codigo,
    );

  return EXPRESION_CODIGO_VISIBLE.test(
    codigoNormalizado,
  );
}

// ================================================
// GENERACIÓN DEL TOKEN QR
// ================================================

export function generarTokenQr(): string {
  /*
   * Token aleatorio de 32 bytes.
   *
   * 32 bytes = 256 bits de entropía.
   *
   * La conversión Base64URL produce
   * una cadena de 43 caracteres.
   */

  const bytesToken =
    generarBytesAleatorios(
      LONGITUD_TOKEN_BYTES,
    );

  return convertirBase64Url(
    bytesToken,
  );
}

export function esTokenQrValido(
  token: unknown,
): token is string {
  return (
    typeof token === "string" &&
    EXPRESION_TOKEN_QR.test(token)
  );
}

// ================================================
// HASH DEL TOKEN QR
// ================================================

export async function calcularHashTokenQr(
  token: string,
): Promise<string> {
  if (!esTokenQrValido(token)) {
    throw new Error(
      "El token QR no tiene un formato válido.",
    );
  }

  /*
   * Reutilizamos la función SHA-256
   * que ya existe en el repositorio
   * para las sesiones de usuarios.
   *
   * Devuelve 64 caracteres hexadecimales.
   */

  return calcularHashToken(
    token,
  );
}

// ================================================
// CONSTRUIR CONTENIDO DEL QR
// ================================================

export function construirContenidoQr(
  token: string,
): string {
  if (!esTokenQrValido(token)) {
    throw new Error(
      "No se puede generar un QR con un token inválido.",
    );
  }

  /*
   * El QR abre una página del club.
   *
   * El token va en el fragmento de URL:
   *
   * #t=TOKEN
   *
   * Los fragmentos no se envían al
   * servidor en la petición HTTP.
   *
   * Por tanto, al abrir la URL con
   * una cámara externa se cargará
   * solamente la página de bloqueo.
   *
   * El lector oficial podrá extraer
   * el token y enviarlo a una API
   * privada mediante POST.
   */

  const url =
    new URL(
      RUTA_QR_PROTEGIDO,
      DOMINIO_CBA,
    );

  const parametros =
    new URLSearchParams();

  parametros.set(
    "t",
    token,
  );

  url.hash =
    parametros.toString();

  return url.toString();
}

// ================================================
// EXTRAER TOKEN DESDE UNA LECTURA
// ================================================

export function extraerTokenQr(
  contenidoLeido: string,
): string | null {
  if (
    typeof contenidoLeido !== "string" ||
    contenidoLeido.length > 2048
  ) {
    return null;
  }

  const contenido =
    contenidoLeido.trim();

  if (!contenido) {
    return null;
  }

  /*
   * Se admite el token directamente.
   *
   * Esto facilita utilizar lectores
   * internos que ya lo hayan extraído.
   */

  if (esTokenQrValido(contenido)) {
    return contenido;
  }

  /*
   * Se admite la URL oficial del club,
   * pero no direcciones de terceros.
   */

  let url: URL;

  try {
    url = new URL(contenido);
  } catch {
    return null;
  }

  const origenPermitido =
    new URL(DOMINIO_CBA).origin;

  if (
    url.origin !== origenPermitido ||
    url.pathname !== RUTA_QR_PROTEGIDO ||
    url.search.length > 0
  ) {
    return null;
  }

  const parametros =
    new URLSearchParams(
      url.hash.slice(1),
    );

  /*
   * Solo admitimos un parámetro t.
   * No aceptamos tokens duplicados
   * ni parámetros adicionales.
   */

  if (
    Array.from(
      parametros.keys(),
    ).length !== 1 ||
    parametros.getAll("t").length !== 1
  ) {
    return null;
  }

  const token =
    parametros.get("t");

  if (!esTokenQrValido(token)) {
    return null;
  }

  return token;
}

// ================================================
// GENERACIÓN COMPLETA DE IDENTIFICADORES
// ================================================

export async function generarCodigoSeguro(
  tipo: TipoCodigoPanel = "rasca_gana",
): Promise<CodigoSeguroGenerado> {
  /*
   * El identificador visible y el token
   * se generan de manera independiente.
   *
   * Ninguno depende del artículo,
   * premio, posición ni número de lote.
   */

  const codigoVisible =
    generarCodigoVisible(tipo);

  const tokenQr =
    generarTokenQr();

  const tokenQrHash =
    await calcularHashTokenQr(
      tokenQr,
    );

  const contenidoQr =
    construirContenidoQr(
      tokenQr,
    );

  return {
    codigoVisible,

    tokenQr,

    tokenQrHash,

    contenidoQr,
  };
}

// ================================================
// FIN DEL ARCHIVO
// ================================================
