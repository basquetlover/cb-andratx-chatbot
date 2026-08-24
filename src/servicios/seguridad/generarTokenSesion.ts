import { calcularHashToken } from "../backend/usuarios/calcularHashToken";

export interface TokenSesionGenerado {
  token: string;
  tokenHash: string;
}

function convertirBase64Url(bytes: Uint8Array): string {
  let contenidoBinario = "";

  bytes.forEach((byte) => {
    contenidoBinario += String.fromCharCode(byte);
  });

  return btoa(contenidoBinario).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function generarTokenSesion(): Promise<TokenSesionGenerado> {
  const bytesToken = new Uint8Array(32);

  crypto.getRandomValues(bytesToken);

  const token = convertirBase64Url(bytesToken);
  const tokenHash = await calcularHashToken(token);

  return {
    token,
    tokenHash,
  };
}