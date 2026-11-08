
import type { APIRoute } from "astro";

import {
  comprobarRecuperacionPassword,
  restablecerPasswordUsuario,
  ErrorRecuperacionPassword,
} from "@servicios/backend/usuarios/recuperacionPasswordUsuario";

import { validarOrigen } from "@servicios/seguridad/validarOrigen";

export const prerender = false;

const cabeceras = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function respuestaError(mensaje: string, status: number) {
  return Response.json(
    { ok: false, data: null, error: mensaje },
    { status, headers: cabeceras },
  );
}

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token")?.trim() ?? "";

  if (!token || token.length > 128) {
    return respuestaError("Enlace no válido.", 400);
  }

  try {
    const resultado = await comprobarRecuperacionPassword(token);

    if (!resultado) {
      return respuestaError(
        "El enlace no es válido, ha caducado o ya se ha utilizado.",
        400,
      );
    }

    return Response.json(
      {
        ok: true,
        data: resultado,
        error: null,
      },
      { status: 200, headers: cabeceras },
    );
  } catch (error) {
    console.error("Error comprobando recuperación:", error);

    return respuestaError(
      "No se ha podido comprobar el enlace.",
      500,
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!validarOrigen(request).autorizado) {
    return respuestaError("Origen no autorizado.", 403);
  }

  if (
    !request.headers
      .get("content-type")
      ?.includes("application/json")
  ) {
    return respuestaError("Contenido no válido.", 415);
  }

  let datos: unknown;

  try {
    const texto = await request.text();

    if (texto.length > 3000) {
      throw new Error("Body demasiado grande.");
    }

    datos = JSON.parse(texto);
  } catch {
    return respuestaError("Solicitud no válida.", 400);
  }

  if (
    typeof datos !== "object" ||
    datos === null ||
    Array.isArray(datos)
  ) {
    return respuestaError("Datos no válidos.", 400);
  }

  const entrada = datos as Record<string, unknown>;

  const token =
    typeof entrada.token === "string"
      ? entrada.token.trim()
      : "";

  const password =
    typeof entrada.password === "string"
      ? entrada.password
      : "";

  const confirmarPassword =
    typeof entrada.confirmarPassword === "string"
      ? entrada.confirmarPassword
      : "";

  if (!token || token.length > 128) {
    return respuestaError("Enlace no válido.", 400);
  }

  try {
    const resultado = await restablecerPasswordUsuario(
      token,
      password,
      confirmarPassword,
    );

    return Response.json(
      {
        ok: true,
        data: {
          mensaje: "La contraseña se ha actualizado correctamente.",
          sesionesCerradas: resultado.sesionesCerradas,
        },
        error: null,
      },
      { status: 200, headers: cabeceras },
    );
  } catch (error) {
    if (error instanceof ErrorRecuperacionPassword) {
      return respuestaError(error.message, error.status);
    }

    console.error("Error restableciendo contraseña:", error);

    return respuestaError(
      "No se ha podido completar el cambio de contraseña.",
      500,
    );
  }
};

export const ALL: APIRoute = async () =>
  respuestaError("Método no permitido.", 405);
