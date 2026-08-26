import type { APIRoute } from "astro";

import { obtenerListadoEquiposPanel } from "@servicios/backend/equipos/obtenerListadoEquiposPanel";
import { filtrarEquiposPorAccesoUsuario } from "@servicios/backend/permisos/filtrarEquiposPorAccesoUsuario";
import { obtenerUsuarioSesion } from "@servicios/backend/sesiones/obtenerUsuarioSesion";
import { comprobarPermisoUsuario } from "@servicios/seguridad/comprobarPermisoUsuario";
import { NOMBRE_COOKIE_SESION } from "@servicios/seguridad/cookieSesion";

export const prerender = false;

const cabecerasRespuesta = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function respuestaError(
  error: string,
  estado: number,
) {
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

export const GET: APIRoute = async ({
  cookies,
}) => {
  const tokenSesion =
    cookies.get(NOMBRE_COOKIE_SESION)?.value;

  if (!tokenSesion) {
    return respuestaError(
      "Debes iniciar sesión para consultar los equipos.",
      401,
    );
  }

  let sesion;

  try {
    sesion =
      await obtenerUsuarioSesion(tokenSesion);
  } catch (error) {
    console.error(
      "Error comprobando la sesión para listar equipos:",
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
    autorizado =
      await comprobarPermisoUsuario(
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
    const resultado =
    await obtenerListadoEquiposPanel(
      sesion.usuario.id,
    );

    const equiposPermitidos =
      await filtrarEquiposPorAccesoUsuario(
        sesion.usuario.id,
        resultado.equipos,
      );

    const resultadoFiltrado = {
      ...resultado,
      equipos: equiposPermitidos,
      total: equiposPermitidos.length,
    };

    return Response.json(
      {
        ok: true,
        data: resultadoFiltrado,
        error: null,
      },
      {
        status: 200,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    console.error(
      "Error en GET /api/panel/equipos/listado:",
      error,
    );

    return respuestaError(
      "No se ha podido obtener la lista de equipos.",
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
    },
    {
      status: 405,
      headers: {
        ...cabecerasRespuesta,
        Allow: "GET",
      },
    },
  );
};