export function construirEnlaceActivacion(token: string): string {
  const webUrl = import.meta.env.WEB_URL?.trim().replace(/\/+$/, "");

  if (!webUrl) {
    throw new Error("La variable WEB_URL no está configurada");
  }

  if (!token.trim()) {
    throw new Error("El token de activación no es válido");
  }

  let urlBase: URL;

  try {
    urlBase = new URL(webUrl);
  } catch {
    throw new Error("La variable WEB_URL no contiene una URL válida");
  }

  if (urlBase.protocol !== "https:" && urlBase.hostname !== "localhost") {
    throw new Error("WEB_URL debe utilizar HTTPS");
  }

  const enlaceActivacion = new URL("/activar-cuenta", urlBase);

  enlaceActivacion.searchParams.set("token", token);

  return enlaceActivacion.toString();
}