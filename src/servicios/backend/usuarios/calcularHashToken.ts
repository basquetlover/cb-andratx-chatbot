export async function calcularHashToken(token: string): Promise<string> {
  const tokenNormalizado = token.trim();

  if (!/^[A-Za-z0-9_-]{40,128}$/.test(tokenNormalizado)) {
    throw new Error("El token no tiene un formato válido");
  }

  const contenido = new TextEncoder().encode(tokenNormalizado);
  const hashBuffer = await crypto.subtle.digest("SHA-256", contenido);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}