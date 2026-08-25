import type { APIRoute } from "astro";

import { actualizarRedesPatrocinador, ErrorActualizarRedesPatrocinador } from "@servicios/backend/patrocinadores/actualizar/actualizarRedesPatrocinador";
import { obtenerUsuarioSesion } from "@servicios/backend/sesiones/obtenerUsuarioSesion";
import { comprobarPermisoUsuario } from "@servicios/seguridad/comprobarPermisoUsuario";
import { NOMBRE_COOKIE_SESION } from "@servicios/seguridad/cookieSesion";

export const prerender = false;

const TAMAÑO_MAXIMO_SOLICITUD = 30_000;

const cabecerasRespuesta = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function respuestaError(error: string, estado: number, campo?: string) {
  return Response.json(
    {
      ok: false,
      data: null,
      error,
      errores: campo ? [{ campo, mensaje: error }] : [],
    },
    {
      status: estado,
      headers: cabecerasRespuesta,
    },
  );
}

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  const patrocinadorId = params.id?.trim();
  const tokenSesion = cookies.get(NOMBRE_COOKIE_SESION)?.value;

  if (!patrocinadorId) {
    return respuestaError("El identificador del patrocinador no es válido.", 400);
  }

  if (!tokenSesion) {
    return respuestaError("Debes iniciar sesión.", 401);
  }

  let sesion;

  try {
    sesion = await obtenerUsuarioSesion(tokenSesion);
  } catch (error) {
    console.error("Error comprobando la sesión para modificar las redes:", error);

    return respuestaError("No se ha podido comprobar la sesión.", 500);
  }

  if (!sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return respuestaError("La sesión no es válida o ha caducado.", 401);
  }

  let autorizado = false;

  try {
    autorizado = await comprobarPermisoUsuario(sesion.acceso, "sponsors.editar");
  } catch (error) {
    console.error("Error comprobando el permiso sponsors.editar:", error);

    return respuestaError("No se ha podido comprobar el permiso.", 500);
  }

  if (!autorizado) {
    return respuestaError("No tienes permiso para modificar patrocinadores.", 403);
  }

  const tipoContenido = request.headers.get("content-type")?.toLowerCase() ?? "";
  const longitudContenido = Number(request.headers.get("content-length") ?? 0);

  if (!tipoContenido.includes("application/json")) {
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
    const redes = await actualizarRedesPatrocinador(patrocinadorId, contenido);

    return Response.json(
      {
        ok: true,
        data: {
          redes,
        },
        error: null,
        errores: [],
      },
      {
        status: 200,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    if (error instanceof ErrorActualizarRedesPatrocinador) {
      return respuestaError(error.message, error.status, error.campo);
    }

    console.error(`Error actualizando las redes del patrocinador ${patrocinadorId}:`, error);

    return respuestaError("No se han podido actualizar las redes sociales.", 500);
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
        Allow: "PATCH",
      },
    },
  );
};