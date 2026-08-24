import type { APIRoute } from "astro";

import { ErrorInicioSesion, iniciarSesionUsuario } from "@servicios/backend/sesiones/iniciarSesionUsuario";
import { obtenerConfiguracionCookieSesion } from "@servicios/seguridad/cookieSesion";

export const prerender = false;

const TAMAÑO_MAXIMO_BODY = 10_000;

const cabecerasRespuesta = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

interface ContenidoInicioSesion {
  email: string;
  password: string;
  mantenerSesion: boolean;
}

function respuestaError(error: string, estado: number) {
  return Response.json(
    {
      ok: false,
      data: null,
      error,
    },
    {
      status: estado,
      headers: cabecerasRespuesta,
    },
  );
}

function esContenidoInicioSesion(contenido: unknown): contenido is ContenidoInicioSesion {
  if (typeof contenido !== "object" || contenido === null) {
    return false;
  }

  const datos = contenido as Record<string, unknown>;

  return typeof datos.email === "string" && typeof datos.password === "string" && (typeof datos.mantenerSesion === "boolean" || typeof datos.mantenerSesion === "undefined");
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const tipoContenido = request.headers.get("content-type");

  if (!tipoContenido?.toLowerCase().includes("application/json")) {
    return respuestaError("El contenido de la petición no es válido.", 415);
  }

  const longitudContenido = Number(request.headers.get("content-length") ?? 0);

  if (Number.isFinite(longitudContenido) && longitudContenido > TAMAÑO_MAXIMO_BODY) {
    return respuestaError("La petición es demasiado grande.", 413);
  }

  let textoContenido: string;

  try {
    textoContenido = await request.text();
  } catch {
    return respuestaError("No se ha podido leer la petición.", 400);
  }

  if (!textoContenido || textoContenido.length > TAMAÑO_MAXIMO_BODY) {
    return respuestaError("El contenido de la petición no es válido.", 400);
  }

  let contenido: unknown;

  try {
    contenido = JSON.parse(textoContenido);
  } catch {
    return respuestaError("El contenido de la petición no es válido.", 400);
  }

  if (!esContenidoInicioSesion(contenido)) {
    return respuestaError("Debes introducir el correo electrónico y la contraseña.", 400);
  }

  try {
    const resultado = await iniciarSesionUsuario({
      email: contenido.email,
      password: contenido.password,
      mantenerSesion: contenido.mantenerSesion ?? false,
      userAgent: request.headers.get("user-agent"),
      requiereAccesoPanel: true,
    });

    const configuracionCookie = obtenerConfiguracionCookieSesion({
      token: resultado.sesion.token,
      duracionSegundos: resultado.sesion.duracionSegundos,
    });

    cookies.set(configuracionCookie.nombre, configuracionCookie.valor, configuracionCookie.opciones);

    return Response.json(
      {
        ok: true,
        data: {
          usuario: resultado.usuario,
          expiresAt: resultado.sesion.fechaCaducidad.toISOString(),
          redirectUrl: "/panel",
        },
        error: null,
      },
      {
        status: 200,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    if (error instanceof ErrorInicioSesion) {
      if (error.status >= 500) {
        console.error("Error interno iniciando sesión:", error);
      }

      return respuestaError(error.message, error.status);
    }

    console.error("Error en POST /api/acceso/iniciar-sesion:", error);

    return respuestaError("No se ha podido iniciar sesión. Inténtalo de nuevo.", 500);
  }
};

export const ALL: APIRoute = async () => {
  return Response.json(
    {
      ok: false,
      data: null,
      error: "Método no permitido.",
    },
    {
      status: 405,
      headers: {
        ...cabecerasRespuesta,
        Allow: "POST",
      },
    },
  );
};