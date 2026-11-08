
import type { APIRoute } from "astro";

import { solicitarRecuperacionPassword } from "@servicios/backend/usuarios/recuperacionPasswordUsuario";
import { validarOrigen } from "@servicios/seguridad/validarOrigen";

export const prerender = false;

const MENSAJE =
  "Si el correo corresponde a una cuenta autorizada, recibirás un enlace para restablecer la contraseña.";

const cabeceras = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

export const POST: APIRoute = async ({ request }) => {
  if (!validarOrigen(request).autorizado) {
    return Response.json(
      { ok: false, data: null, error: "Origen no autorizado." },
      { status: 403, headers: cabeceras },
    );
  }

  if (
    !request.headers
      .get("content-type")
      ?.includes("application/json")
  ) {
    return Response.json(
      { ok: false, data: null, error: "Contenido no válido." },
      { status: 415, headers: cabeceras },
    );
  }

  let datos: unknown;

  try {
    const texto = await request.text();

    if (texto.length > 2000) {
      throw new Error("Body demasiado grande.");
    }

    datos = JSON.parse(texto);
  } catch {
    return Response.json(
      { ok: false, data: null, error: "Solicitud no válida." },
      { status: 400, headers: cabeceras },
    );
  }

  const email =
    typeof datos === "object" &&
    datos !== null &&
    "email" in datos &&
    typeof datos.email === "string"
      ? datos.email.trim().toLowerCase()
      : "";

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254
  ) {
    return Response.json(
      {
        ok: false,
        data: null,
        error: "Introduce un correo electrónico válido.",
      },
      { status: 400, headers: cabeceras },
    );
  }

  try {
    await solicitarRecuperacionPassword(email);
  } catch (error) {
    console.error(
      "Error solicitando recuperación de contraseña:",
      error,
    );
  }

  // Nunca confirmamos si un correo está registrado.
  return Response.json(
    {
      ok: true,
      data: { mensaje: MENSAJE },
      error: null,
    },
    { status: 200, headers: cabeceras },
  );
};

export const ALL: APIRoute = async () =>
  Response.json(
    { ok: false, data: null, error: "Método no permitido." },
    { status: 405, headers: { ...cabeceras, Allow: "POST" } },
  );
