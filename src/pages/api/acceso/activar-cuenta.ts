import type { APIRoute } from "astro";

import { activarCuentaUsuario } from "@servicios/backend/usuarios/activarCuentaUsuario";
import { obtenerInvitacionActivacion } from "@servicios/backend/usuarios/obtenerInvitacionActivacion";

export const prerender = false;

const TAMAÑO_MAXIMO_BODY = 10_000;

const cabecerasRespuesta = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

interface ErrorConEstado {
  status?: number;
  message?: string;
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

function obtenerEstadoError(error: unknown): number {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return 500;
  }

  const status = (error as ErrorConEstado).status;

  if (typeof status !== "number" || status < 400 || status > 599) {
    return 500;
  }

  return status;
}

function obtenerMensajeError(error: unknown, status: number): string {
  if (status >= 500) {
    return "No se ha podido completar la activación de la cuenta.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "La solicitud de activación no es válida.";
}

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token")?.trim();

  if (!token) {
    return respuestaError("El enlace de activación no contiene un token.", 400);
  }

  if (token.length > 128) {
    return respuestaError("El token de activación no es válido.", 400);
  }

  try {
    const invitacion = await obtenerInvitacionActivacion(token);

    if (!invitacion.valida) {
      return respuestaError(invitacion.error, 400);
    }

    return Response.json(
      {
        ok: true,
        data: {
          nombre: invitacion.data.nombre,
          email: invitacion.data.email,
          cargo: invitacion.data.cargo,
          expiresAt: invitacion.data.expiresAt,
        },
        error: null,
      },
      {
        status: 200,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    console.error("Error en GET /api/acceso/activar-cuenta:", error);

    return respuestaError("No se ha podido comprobar la invitación.", 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const tipoContenido = request.headers.get("content-type");

  if (!tipoContenido?.toLowerCase().includes("application/json")) {
    return respuestaError("El contenido de la petición no es válido.", 415);
  }

  const longitudContenido = Number(request.headers.get("content-length") ?? 0);

  if (Number.isFinite(longitudContenido) && longitudContenido > TAMAÑO_MAXIMO_BODY) {
    return respuestaError("La petición es demasiado grande.", 413);
  }

  let contenido: unknown;

  try {
    contenido = await request.json();
  } catch {
    return respuestaError("El contenido de la petición no es válido.", 400);
  }

  try {
    const resultado = await activarCuentaUsuario(contenido);

    return Response.json(
      {
        ok: true,
        data: resultado,
        error: null,
      },
      {
        status: 200,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    const status = obtenerEstadoError(error);

    if (status >= 500) {
      console.error("Error en POST /api/acceso/activar-cuenta:", error);
    }

    return respuestaError(obtenerMensajeError(error, status), status);
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
        Allow: "GET, POST",
      },
    },
  );
};