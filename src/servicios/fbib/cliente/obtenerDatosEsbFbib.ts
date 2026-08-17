const URL_ESB_FBIB = "https://esb.optimalwayconsulting.com/fbib/1/jR4rgA5K6Chhh5vyfrxo9wTScdg2NT7K";

interface RespuestaEsbFbib {
  messageData?: unknown;
}

function extraerBase64(contenido: string): string {
  const contenidoLimpio = contenido.trim();

  try {
    const resultado = JSON.parse(contenidoLimpio) as unknown;

    if (typeof resultado === "string") {
      return resultado;
    }

    if (typeof resultado === "object" && resultado !== null && "data" in resultado && typeof resultado.data === "string") {
      return resultado.data;
    }
  } catch {
    return contenidoLimpio;
  }

  throw new Error("La respuesta codificada de la FBIB no es válida");
}

function decodificarBase64Utf8(valor: string): string {
  const binario = atob(valor);
  const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export async function obtenerDatosEsbFbib(ruta: string): Promise<unknown> {
  const respuesta = await fetch(`${URL_ESB_FBIB}${ruta}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!respuesta.ok) {
    throw new Error(`La FBIB ha respondido con el estado ${respuesta.status}`);
  }

  const contenido = await respuesta.text();
  const base64 = extraerBase64(contenido);
  const contenidoDecodificado = decodificarBase64Utf8(base64);

  let resultado: RespuestaEsbFbib;

  try {
    resultado = JSON.parse(contenidoDecodificado) as RespuestaEsbFbib;
  } catch {
    throw new Error("No se ha podido interpretar la respuesta de la FBIB");
  }

  return resultado.messageData ?? null;
}