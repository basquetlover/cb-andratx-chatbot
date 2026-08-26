import type { APIRoute } from "astro";

import { crearEquipoPanel, ErrorCrearEquipo } from "@servicios/backend/equipos/crearEquipoPanel";
import { obtenerEquiposPanel } from "@servicios/backend/equipos/obtenerEquiposPanel";
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

function respuestaError(
  error: string,
  estado: number,
  errores: Array<{
    campo: string;
    mensaje: string;
  }> = [],
) {
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

export const GET: APIRoute = async ({ cookies }) => {
  const tokenSesion = cookies.get(NOMBRE_COOKIE_SESION)?.value;

  if (!tokenSesion) {
    return respuestaError(
      "Debes iniciar sesión para consultar los equipos.",
      401,
    );
  }

  let sesion;

  try {
    sesion = await obtenerUsuarioSesion(tokenSesion);
  } catch (error) {
    console.error(
      "Error comprobando la sesión para obtener los equipos:",
      error,
    );

    return respuestaError(
      "No se ha podido comprobar la sesión.",
      500,
    );
  }

  if (!sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return respuestaError(
      "La sesión no es válida o ha caducado.",
      401,
    );
  }

  let autorizado = false;

  try {
    autorizado = await comprobarPermisoUsuario(
      sesion.acceso,
      "equipos.ver",
    );
  } catch (error) {
    console.error(
      "Error comprobando el permiso equipos.ver:",
      error,
    );

    return respuestaError(
      "No se ha podido comprobar el permiso del usuario.",
      500,
    );
  }

  if (!autorizado) {
    return respuestaError(
      "No tienes permiso para consultar los equipos.",
      403,
    );
  }

  try {
    const equipos = await obtenerEquiposPanel();

    return Response.json(
      {
        ok: true,
        data: equipos,
        total: equipos.length,
        error: null,
      },
      {
        status: 200,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    console.error(
      "Error en GET /api/panel/equipos:",
      error,
    );

    return respuestaError(
      "No se ha podido obtener la lista de equipos.",
      500,
    );
  }
};

export const POST: APIRoute = async ({
  request,
  cookies,
}) => {
  const tokenSesion =
    cookies.get(NOMBRE_COOKIE_SESION)?.value;

  if (!tokenSesion) {
    return respuestaError(
      "Debes iniciar sesión para crear un equipo.",
      401,
    );
  }

  let sesion;

  try {
    sesion = await obtenerUsuarioSesion(tokenSesion);
  } catch (error) {
    console.error(
      "Error comprobando la sesión para crear un equipo:",
      error,
    );

    return respuestaError(
      "No se ha podido comprobar la sesión.",
      500,
    );
  }

  if (!sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return respuestaError(
      "La sesión no es válida o ha caducado.",
      401,
    );
  }

  let autorizado = false;

  try {
    autorizado = await comprobarPermisoUsuario(
      sesion.acceso,
      "equipos.crear",
    );
  } catch (error) {
    console.error(
      "Error comprobando el permiso equipos.crear:",
      error,
    );

    return respuestaError(
      "No se ha podido comprobar el permiso del usuario.",
      500,
    );
  }

  if (!autorizado) {
    return respuestaError(
      "No tienes permiso para crear equipos.",
      403,
    );
  }

  const tipoContenido =
    request.headers.get("content-type");

  if (
    !tipoContenido
      ?.toLowerCase()
      .includes("application/json")
  ) {
    return respuestaError(
      "El contenido debe enviarse en formato JSON.",
      415,
    );
  }

  const longitudContenido = Number(
    request.headers.get("content-length") ?? 0,
  );

  if (
    Number.isFinite(longitudContenido) &&
    longitudContenido > TAMAÑO_MAXIMO_SOLICITUD
  ) {
    return respuestaError(
      "La solicitud es demasiado grande.",
      413,
    );
  }

  let contenido: unknown;

  try {
    contenido = await request.json();
  } catch {
    return respuestaError(
      "El contenido JSON no es válido.",
      400,
    );
  }

  try {
    const equipo = await crearEquipoPanel(
      contenido,
      sesion.usuario.id,
    );

    return Response.json(
      {
        ok: true,
        data: {
          equipo,
        },
        error: null,
        errores: [],
      },
      {
        status: 201,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    if (error instanceof ErrorCrearEquipo) {
      if (error.status >= 500) {
        console.error(
          "Error interno creando un equipo:",
          error,
        );
      }

      return respuestaError(
        error.message,
        error.status,
        error.errores,
      );
    }

    console.error(
      "Error en POST /api/panel/equipos:",
      error,
    );

    return respuestaError(
      "No se ha podido crear el equipo.",
      500,
    );
  }
};

export const ALL: APIRoute = async () => {
  return Response.json(
    {
      ok: false,
      data: null,
      error: "Método no permitido.",
      errores: [],
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