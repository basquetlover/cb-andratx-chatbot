
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
 * FASE 1 — ARCHIVO 2/2
 *
 * Cada código dispone de:
 *
 * 1. Un identificador visible aleatorio.
 * 2. Un token QR secreto independiente.
 * 3. Un hash SHA-256 del token.
 * 4. Una URL que se imprimirá como QR.
 *
 * El premio NO se incluye:
 *
 * - En el código visible.
 * - En el token QR.
 * - En la URL.
 *
 * Este servicio debe ejecutarse
 * únicamente en el backend del club.
 *
 * Los QR nuevos utilizan la página
 * pública existente:
 *
 * /codigos/acceso-bloqueado
 *
 * Se mantiene la compatibilidad de
 * lectura con los QR anteriores.
 */

// ================================================
// CONFIGURACIÓN
// ================================================

const DOMINIO_CBA =
  "https://cbandratx.es";

/*
 * Ruta pública oficial.
 *
 * Esta página ya existe y utiliza
 * el layout público del proyecto.
 */

const RUTA_QR_PROTEGIDO =
  "/codigos/acceso-bloqueado";

/*
 * Ruta utilizada anteriormente.
 *
 * Se conserva exclusivamente
 * para reconocer QR ya generados
 * por el escáner autorizado.
 *
 * Los QR nuevos siempre utilizarán
 * RUTA_QR_PROTEGIDO.
 */

const RUTA_QR_ANTERIOR =
  "/codigos/bloqueado";

/*
 * El alfabeto excluye caracteres
 * visualmente ambiguos:
 *
 * I, O, 0 y 1.
 *
 * Contiene 32 caracteres.
 * Cada carácter representa 5 bits.
 */

const ALFABETO_CODIGO =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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
   * Identificador visible.
   *
   * Se imprimirá debajo del QR.
   *
   * Ejemplo:
   *
   * CBA-RG-K7M2-Q9RP-V4X8-B6TN
   *
   * No contiene información
   * sobre el premio.
   */

  codigoVisible: string;

  /*
   * Token secreto del QR.
   *
   * Se genera aleatoriamente.
   *
   * Durante la generación se
   * utiliza temporalmente en claro.
   *
   * El sistema debe almacenarlo
   * únicamente cifrado.
   */

  tokenQr: string;

  /*
   * Hash SHA-256 del token.
   *
   * Se guarda en:
   *
   * codigos.qr_token_hash
   */

  tokenQrHash: string;

  /*
   * Contenido completo del QR.
   *
   * Es una URL del club cuyo fragmento
   * contiene el token.
   *
   * Nunca incluye el premio.
   */

  contenidoQr: string;
}

// ================================================
// OBTENER PREFIJO
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

// ================================================
// GENERACIÓN ALEATORIA SEGURA
// ================================================

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
   * Utilizamos el generador
   * criptográfico de Web Crypto.
   *
   * No utilizamos Math.random().
   */

  const bytes =
    new Uint8Array(cantidad);

  crypto.getRandomValues(bytes);

  return bytes;
}

// ================================================
// CONVERSIÓN BASE64URL
// ================================================

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

// ================================================
// FORMATEAR CÓDIGO VISIBLE
// ================================================

function separarCodigoEnBloques(
  codigo: string,
): string {
  return (
    codigo.match(/.{1,4}/g)?.join("-") ??
    codigo
  );
}

// ================================================
// GENERAR CÓDIGO VISIBLE
// ================================================

export function generarCodigoVisible(
  tipo: TipoCodigoPanel = "rasca_gana",
): string {
  const prefijo =
    obtenerPrefijoCodigo(tipo);

  /*
   * Generamos 16 bytes aleatorios.
   *
   * De cada byte utilizamos sus
   * cinco bits menos significativos.
   *
   * Resultado:
   *
   * 16 caracteres de un alfabeto
   * de 32 símbolos.
   *
   * Entropía: 80 bits.
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

  return `${prefijo}-${codigoFormateado}`;
}

// ================================================
// NORMALIZAR CÓDIGO VISIBLE
// ================================================

export function normalizarCodigoVisible(
  codigo: string,
): string {
  return codigo
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

// ================================================
// VALIDAR CÓDIGO VISIBLE
// ================================================

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
// GENERAR TOKEN QR
// ================================================

export function generarTokenQr(): string {
  /*
   * Se generan 32 bytes aleatorios.
   *
   * 32 bytes = 256 bits.
   *
   * Base64URL sin relleno produce
   * una cadena de 43 caracteres.
   *
   * El token es independiente:
   *
   * - Del identificador visible.
   * - Del lote.
   * - De la campaña.
   * - Del resultado premiado.
   */

  const bytesToken =
    generarBytesAleatorios(
      LONGITUD_TOKEN_BYTES,
    );

  return convertirBase64Url(
    bytesToken,
  );
}

// ================================================
// VALIDAR TOKEN QR
// ================================================

export function esTokenQrValido(
  token: unknown,
): token is string {
  return (
    typeof token === "string" &&
    EXPRESION_TOKEN_QR.test(token)
  );
}

// ================================================
// CALCULAR HASH DEL TOKEN QR
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
   * Reutilizamos el servicio SHA-256
   * que ya existe en el proyecto.
   *
   * No creamos otro sistema de hash.
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
   * La URL pública utiliza:
   *
   * https://cbandratx.es
   *
   * Y la ruta:
   *
   * /codigos/acceso-bloqueado
   *
   * El token se añade al fragmento:
   *
   * #t=TOKEN
   *
   * El fragmento no forma parte
   * de la petición HTTP.
   *
   * Por tanto, el servidor recibe
   * una solicitud de la página
   * pública sin el token.
   *
   * El escáner oficial sí podrá
   * extraer el token desde el
   * contenido QR completo.
   *
   * La comprobación real del código
   * deberá realizarse desde
   * la API privada del club.
   *
   * No se añade ningún dato
   * del premio a esta URL.
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
// COMPROBAR RUTA QR PERMITIDA
// ================================================

function esRutaQrPermitida(
  ruta: string,
): boolean {
  /*
   * Los QR nuevos utilizan
   * acceso-bloqueado.
   *
   * Los QR generados anteriormente
   * pueden seguir utilizando
   * bloqueado.
   *
   * Ambas rutas son reconocidas
   * por el escáner.
   *
   * No se admiten rutas arbitrarias.
   */

  return (
    ruta === RUTA_QR_PROTEGIDO ||
    ruta === RUTA_QR_ANTERIOR
  );
}

// ================================================
// EXTRAER TOKEN QR
// ================================================

export function extraerTokenQr(
  contenidoLeido: string,
): string | null {
  /*
   * Limitar el tamaño de las lecturas.
   *
   * El escáner no debe procesar
   * contenidos arbitrariamente grandes.
   */

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
   * El lector puede enviar
   * directamente el token.
   *
   * Se admite siempre que cumpla
   * el formato esperado.
   */

  if (esTokenQrValido(contenido)) {
    return contenido;
  }

  /*
   * También se admite una URL.
   *
   * Pero debe pertenecer
   * exactamente al dominio
   * oficial del club.
   *
   * No se admiten dominios externos.
   */

  let url: URL;

  try {
    url = new URL(contenido);
  } catch {
    return null;
  }

  const origenPermitido =
    new URL(DOMINIO_CBA).origin;

  /*
   * Se comprueba:
   *
   * - Dominio oficial.
   * - Protocolo HTTPS.
   * - Ruta permitida.
   * - Ausencia de query string.
   *
   * La ruta antigua se acepta
   * solamente por compatibilidad.
   */

  if (
    url.origin !== origenPermitido ||
    url.protocol !== "https:" ||
    !esRutaQrPermitida(
      url.pathname,
    ) ||
    url.search.length > 0
  ) {
    return null;
  }

  /*
   * El token debe encontrarse
   * únicamente en el fragmento.
   */

  if (!url.hash) {
    return null;
  }

  const parametros =
    new URLSearchParams(
      url.hash.slice(1),
    );

  /*
   * Únicamente se admite:
   *
   * #t=TOKEN
   *
   * Se rechazan:
   *
   * - Tokens repetidos.
   * - Parámetros adicionales.
   * - Tokens sin formato válido.
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
// GENERACIÓN COMPLETA
// ================================================

export async function generarCodigoSeguro(
  tipo: TipoCodigoPanel = "rasca_gana",
): Promise<CodigoSeguroGenerado> {
  /*
   * Los identificadores se generan
   * independientemente.
   *
   * El identificador visible
   * no permite calcular el token.
   *
   * El token tampoco permite
   * descubrir el premio asociado.
   */

  const codigoVisible =
    generarCodigoVisible(tipo);

  const tokenQr =
    generarTokenQr();

  /*
   * Solo almacenaremos el hash
   * y la versión cifrada del token
   * mediante el servicio de lotes.
   */

  const tokenQrHash =
    await calcularHashTokenQr(
      tokenQr,
    );

  /*
   * La URL contendrá exclusivamente
   * el token secreto y la ruta pública.
   */

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
