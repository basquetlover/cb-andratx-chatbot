import type {
  APIRoute,
} from "astro";

import {
  desbloquearAccesoSocioPanel,
  ErrorDesbloquearAccesoSocioPanel,
} from "@servicios/backend/socios/desbloquearAccesoSocioPanel";

import {
  obtenerUsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import {
  comprobarPermisoUsuario,
} from "@servicios/seguridad/comprobarPermisoUsuario";

import {
  NOMBRE_COOKIE_SESION,
} from "@servicios/seguridad/cookieSesion";

import type {
  RespuestaDesbloquearAccesoSocio,
} from "@tipos/SocioPanel";

export const prerender = false;

const cabecerasRespuesta = {
  "Cache-Control":
    "no-store, max-age=0",

  "Content-Type":
    "application/json; charset=utf-8",

  "X-Content-Type-Options":
    "nosniff",
};

function crearRespuesta(
  contenido:
    RespuestaDesbloquearAccesoSocio,
  estado: number,
): Response {
  return Response.json(
    contenido,
    {
      status: estado,
      headers:
        cabecerasRespuesta,
    },
  );
}

function respuestaError(
  mensaje: string,
  estado: number,
): Response {
  return crearRespuesta(
    {
      ok: false,
      data: null,
      error: mensaje,
    },
    estado,
  );
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function convertirTexto(
  valor: unknown,
): string | null {
  if (
    typeof valor !== "string"
  ) {
    return null;
  }

  const texto =
    valor.trim();

  return texto || null;
}

function obtenerUsuarioIdSesion(
  sesion: unknown,
): string | null {
  if (!esObjeto(sesion)) {
    return null;
  }

  const usuario =
    esObjeto(
      sesion.usuario,
    )
      ? sesion.usuario
      : null;

  const usuarioId =
    convertirTexto(
      usuario?.id,
    ) ??
    convertirTexto(
      sesion.usuarioId,
    ) ??
    convertirTexto(
      sesion.usuario_id,
    ) ??
    convertirTexto(
      sesion.id,
    );

  return usuarioId;
}

export const POST: APIRoute =
  async ({
    cookies,
    params,
  }) => {
    const socioId =
      params.id?.trim() ?? "";

    if (!socioId) {
      return respuestaError(
        "No se ha indicado el socio.",
        400,
      );
    }

    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return respuestaError(
        "Debes iniciar sesión para desbloquear el acceso de un socio.",
        401,
      );
    }

    let sesion;

    try {
      sesion =
        await obtenerUsuarioSesion(
          tokenSesion,
        );
    } catch (error) {
      console.error(
        "Error comprobando la sesión para desbloquear el acceso de un socio:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar la sesión.",
        500,
      );
    }

    if (!sesion) {
      cookies.delete(
        NOMBRE_COOKIE_SESION,
        {
          path: "/",
        },
      );

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
          "socios.editar",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso socios.editar:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return respuestaError(
        "No tienes permiso para desbloquear el acceso de socios.",
        403,
      );
    }

    const usuarioId =
      obtenerUsuarioIdSesion(
        sesion,
      );

    if (!usuarioId) {
      console.error(
        "No se ha podido obtener el identificador del administrador desde la sesión:",
        {
          socioId,
        },
      );

      return respuestaError(
        "No se ha podido identificar al administrador.",
        500,
      );
    }

    try {
      const resultado =
        await desbloquearAccesoSocioPanel(
          socioId,
          usuarioId,
        );

      return crearRespuesta(
        {
          ok: true,
          data: resultado,
          error: null,
        },
        200,
      );
    } catch (error) {
      if (
        error instanceof
        ErrorDesbloquearAccesoSocioPanel
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      console.error(
        `Error en POST /api/panel/socios/${socioId}/desbloquear-acceso:`,
        error,
      );

      return respuestaError(
        "No se ha podido desbloquear el acceso del socio.",
        500,
      );
    }
  };

export const ALL: APIRoute =
  async () => {
    return Response.json(
      {
        ok: false,
        data: null,
        error:
          "Método no permitido.",
      } satisfies RespuestaDesbloquearAccesoSocio,
      {
        status: 405,
        headers: {
          ...cabecerasRespuesta,
          Allow: "POST",
        },
      },
    );
  };