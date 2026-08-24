import { calcularHashToken } from "./calcularHashToken";

export interface TokenActivacionGenerado {
  token: string;
  tokenHash: string;
  fechaCaducidad: Date;
}

function convertirBase64Url(bytes: Uint8Array): string {
  let contenidoBinario = "";

  bytes.forEach((byte) => {
    contenidoBinario += String.fromCharCode(byte);
  });

  return btoa(contenidoBinario)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function generarTokenActivacion(duracionHoras = 24): Promise<TokenActivacionGenerado> {
  if (!Number.isFinite(duracionHoras) || duracionHoras <= 0 || duracionHoras > 168) {
    throw new Error("La duración del token de activación no es válida");
  }

  const bytesToken = new Uint8Array(32);

  crypto.getRandomValues(bytesToken);

  const token = convertirBase64Url(bytesToken);
  const tokenHash = await calcularHashToken(token);
  const fechaCaducidad = new Date(Date.now() + duracionHoras * 60 * 60 * 1000);

  return {
    token,
    tokenHash,
    fechaCaducidad,
  };
}