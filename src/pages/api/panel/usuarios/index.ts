import type { APIRoute } from "astro";

import { crearNuevoUsuario } from "@servicios/backend/usuarios/crearNuevoUsuario";

export const prerender = false;

const TAMAÑO_MAXIMO_SOLICITUD = 100_000;

const cabecerasRespuesta = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function respuestaError(error: string, estado: number, errores: Array<{ campo: string; mensaje: string }> = []) {
  return Response.json(
    {
      ok: false,
      data: null,
      error,
      errores,
    },
    {
      status: estado,
      headers: cabecerasRespuesta,
    },
  );
}

export const POST: APIRoute = async ({ request }) => {
  const tipoContenido = request.headers.get("content-type");
  const longitudContenido = Number(request.headers.get("content-length") ?? 0);

  if (!tipoContenido?.toLowerCase().includes("application/json")) {
    return respuestaError("El contenido debe enviarse en formato JSON.", 415);
  }

  if (Number.isFinite(longitudContenido) && longitudContenido > TAMAÑO_MAXIMO_SOLICITUD) {
    return respuestaError("La solicitud es demasiado grande.", 413);
  }

  let contenido: unknown;

  try {
    contenido = await request.json();
  } catch {
    return respuestaError("El contenido JSON no es válido.", 400);
  }

  try {
    const creadoPor = null;
    const resultado = await crearNuevoUsuario(contenido, creadoPor);

    if (!resultado.ok) {
      return respuestaError(resultado.errores[0]?.mensaje ?? "Los datos del usuario no son válidos.", resultado.estadoHttp, resultado.errores);
    }

    return Response.json(
      {
        ok: true,
        data: resultado.data,
      },
      {
        status: resultado.estadoHttp,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    console.error("Error en POST /api/panel/usuarios:", error);

    const mensaje = error instanceof Error ? error.message : "";
    const correoDuplicado = mensaje.toLowerCase().includes("ya existe un usuario");

    if (correoDuplicado) {
      return respuestaError(
        "Ya existe un usuario con ese correo electrónico.",
        409,
        [
          {
            campo: "datosPersonales.email",
            mensaje: "Ya existe un usuario con ese correo electrónico.",
          },
        ],
      );
    }

    return respuestaError("No se ha podido crear el usuario.", 500);
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