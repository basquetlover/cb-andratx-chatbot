import type { APIRoute } from "astro";

import { actualizarInformacionPatrocinador, ErrorActualizarInformacionPatrocinador } from "@servicios/backend/patrocinadores/actualizar/actualizarInformacionPatrocinador";
import { obtenerPatrocinadorPanelPorId } from "@servicios/backend/patrocinadores/obtenerPatrocinadorPanelPorId";
import { obtenerUsuarioSesion } from "@servicios/backend/sesiones/obtenerUsuarioSesion";
import { comprobarPermisoUsuario } from "@servicios/seguridad/comprobarPermisoUsuario";
import { NOMBRE_COOKIE_SESION } from "@servicios/seguridad/cookieSesion";

export const prerender = false;

const TAMAÑO_MAXIMO_SOLICITUD = 50_000;

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
      errores: campo
        ? [
            {
              campo,
              mensaje: error,
            },
          ]
        : [],
    },
    {
      status: estado,
      headers: cabecerasRespuesta,
    },
  );
}

async function obtenerSesion(cookies: Parameters<APIRoute>[0]["cookies"]) {
  const tokenSesion = cookies.get(NOMBRE_COOKIE_SESION)?.value;

  if (!tokenSesion) {
    return null;
  }

  return obtenerUsuarioSesion(tokenSesion);
}

async function comprobarAcceso(cookies: Parameters<APIRoute>[0]["cookies"], permiso: string) {
  const sesion = await obtenerSesion(cookies);

  if (!sesion) {
    return {
      sesion: null,
      autorizado: false,
    };
  }

  const autorizado = await comprobarPermisoUsuario(sesion.acceso, permiso);

  return {
    sesion,
    autorizado,
  };
}

export const GET: APIRoute = async ({ cookies, params }) => {
  const patrocinadorId = params.id?.trim();

  if (!patrocinadorId) {
    return respuestaError("El identificador del patrocinador no es válido.", 400);
  }

  let acceso;

  try {
    acceso = await comprobarAcceso(cookies, "sponsors.ver");
  } catch (error) {
    console.error("Error comprobando el acceso para consultar un patrocinador:", error);

    return respuestaError("No se ha podido comprobar la sesión.", 500);
  }

  if (!acceso.sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return respuestaError("Debes iniciar sesión.", 401);
  }

  if (!acceso.autorizado) {
    return respuestaError("No tienes permiso para consultar patrocinadores.", 403);
  }

  try {
    const patrocinador = await obtenerPatrocinadorPanelPorId(patrocinadorId);

    if (!patrocinador) {
      return respuestaError("El patrocinador no existe.", 404);
    }

    return Response.json(
      {
        ok: true,
        data: {
          patrocinador,
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
    console.error(`Error en GET /api/panel/patrocinadores/${patrocinadorId}:`, error);

    return respuestaError("No se ha podido obtener el patrocinador.", 500);
  }
};

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  const patrocinadorId = params.id?.trim();

  if (!patrocinadorId) {
    return respuestaError("El identificador del patrocinador no es válido.", 400);
  }

  let acceso;

  try {
    acceso = await comprobarAcceso(cookies, "sponsors.editar");
  } catch (error) {
    console.error("Error comprobando el acceso para modificar un patrocinador:", error);

    return respuestaError("No se ha podido comprobar la sesión.", 500);
  }

  if (!acceso.sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return respuestaError("Debes iniciar sesión.", 401);
  }

  if (!acceso.autorizado) {
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

  if (typeof contenido !== "object" || contenido === null || Array.isArray(contenido)) {
    return respuestaError("Los datos enviados no son válidos.", 400);
  }

  const datosPeticion = contenido as Record<string, unknown>;
  const seccion = datosPeticion.seccion;

  try {
    if (seccion === "informacion") {
      const patrocinador = await actualizarInformacionPatrocinador(patrocinadorId, datosPeticion.datos);

      return Response.json(
        {
          ok: true,
          data: {
            patrocinador,
          },
          error: null,
          errores: [],
        },
        {
          status: 200,
          headers: cabecerasRespuesta,
        },
      );
    }

    return respuestaError("La sección que intentas actualizar no es válida.", 400);
  } catch (error) {
    if (error instanceof ErrorActualizarInformacionPatrocinador) {
      if (error.status >= 500) {
        console.error("Error interno actualizando el patrocinador:", error);
      }

      return respuestaError(error.message, error.status, error.campo);
    }

    console.error(`Error en PATCH /api/panel/patrocinadores/${patrocinadorId}:`, error);

    return respuestaError("No se ha podido actualizar el patrocinador.", 500);
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
        Allow: "GET, PATCH",
      },
    },
  );
};