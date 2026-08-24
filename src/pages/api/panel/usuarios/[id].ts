import type { APIRoute } from "astro";

import { obtenerUsuarioSesion } from "@servicios/backend/sesiones/obtenerUsuarioSesion";
import { actualizarAccesoUsuario, ErrorActualizarAccesoUsuario } from "@servicios/backend/usuarios/actualizar/actualizarAccesoUsuario";
import { actualizarDatosPersonalesUsuario, ErrorActualizarUsuario } from "@servicios/backend/usuarios/actualizar/actualizarDatosPersonalesUsuario";
import { actualizarEquiposUsuario, ErrorActualizarEquiposUsuario } from "@servicios/backend/usuarios/actualizar/actualizarEquiposUsuario";
import { comprobarPermisoUsuario } from "@servicios/seguridad/comprobarPermisoUsuario";
import { NOMBRE_COOKIE_SESION } from "@servicios/seguridad/cookieSesion";
import { actualizarSeguridadUsuario, ErrorActualizarSeguridadUsuario } from "@servicios/backend/usuarios/actualizar/actualizarSeguridadUsuario";

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

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  const usuarioId = params.id?.trim();

  if (!usuarioId) {
    return respuestaError("El identificador del usuario no es válido.", 400);
  }

  const tokenSesion = cookies.get(NOMBRE_COOKIE_SESION)?.value;

  if (!tokenSesion) {
    return respuestaError("Debes iniciar sesión.", 401);
  }

  let sesion;

  try {
    sesion = await obtenerUsuarioSesion(tokenSesion);
  } catch (error) {
    console.error("Error comprobando la sesión al actualizar un usuario:", error);

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
    autorizado = await comprobarPermisoUsuario(sesion.acceso, "usuarios.editar");
  } catch (error) {
    console.error("Error comprobando el permiso usuarios.editar:", error);

    return respuestaError("No se ha podido comprobar el permiso del usuario.", 500);
  }

  if (!autorizado) {
    return respuestaError("No tienes permiso para modificar usuarios.", 403);
  }

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

  if (typeof contenido !== "object" || contenido === null) {
    return respuestaError("Los datos enviados no son válidos.", 400);
  }

  const datos = contenido as Record<string, unknown>;

  try {
    if (datos.seccion === "datos-personales") {
      const usuarioActualizado = await actualizarDatosPersonalesUsuario(usuarioId, datos.datos);

      return Response.json(
        {
          ok: true,
          data: {
            usuario: usuarioActualizado,
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

    if (datos.seccion === "acceso-permisos") {
      const accesoActualizado = await actualizarAccesoUsuario(usuarioId, sesion.usuario.id, datos.datos);

      return Response.json(
        {
          ok: true,
          data: {
            acceso: accesoActualizado,
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

    if (datos.seccion === "equipos") {
      const equiposActualizados = await actualizarEquiposUsuario(usuarioId, sesion.usuario.id, datos.datos);

      return Response.json(
        {
          ok: true,
          data: {
            equipos: equiposActualizados,
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

    if (datos.seccion === "seguridad") {
        const seguridadActualizada = await actualizarSeguridadUsuario(usuarioId, sesion.usuario.id, datos.datos);

        return Response.json(
            {
            ok: true,
            data: {
                seguridad: seguridadActualizada,
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
    if (error instanceof ErrorActualizarUsuario || error instanceof ErrorActualizarAccesoUsuario || error instanceof ErrorActualizarEquiposUsuario || error instanceof ErrorActualizarSeguridadUsuario) {
        if (error.status >= 500) {
            console.error("Error interno actualizando el usuario:", error);
        }

        const campo = error instanceof ErrorActualizarUsuario ? error.campo : undefined;

        return respuestaError(error.message, error.status, campo);
        }

    console.error(`Error en PATCH /api/panel/usuarios/${usuarioId}:`, error);

    return respuestaError("No se ha podido actualizar el usuario.", 500);
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