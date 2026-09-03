import type {
  APIRoute,
} from "astro";

import {
  regenerarPasswordSocioPanel,
  ErrorRegenerarPasswordSocioPanel,
} from "@servicios/backend/socios/regenerarPasswordSocioPanel";

import {
  obtenerUsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import {
  comprobarPermisoUsuario,
} from "@servicios/seguridad/comprobarPermisoUsuario";

import {
  NOMBRE_COOKIE_SESION,
} from "@servicios/seguridad/cookieSesion";

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
  contenido: unknown,
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

function crearRespuestaError(
  error: string,
  estado: number,
): Response {
  return crearRespuesta(
    {
      ok: false,
      data: null,
      error,
      errores: [],
    },
    estado,
  );
}

function obtenerIdentificador(
  valor: string | undefined,
): string | null {
  if (
    typeof valor !== "string"
  ) {
    return null;
  }

  const identificador =
    valor.trim();

  return identificador || null;
}

export const POST: APIRoute =
  async ({
    cookies,
    params,
  }) => {
    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return crearRespuestaError(
        "Debes iniciar sesión para regenerar la contraseña.",
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
        "Error comprobando la sesión para regenerar la contraseña de un socio:",
        error,
      );

      return crearRespuestaError(
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

      return crearRespuestaError(
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
        "Error comprobando el permiso socios.editar para regenerar una contraseña:",
        error,
      );

      return crearRespuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return crearRespuestaError(
        "No tienes permiso para regenerar contraseñas de socios.",
        403,
      );
    }

    const socioId =
      obtenerIdentificador(
        params.id,
      );

    const carnetId =
      obtenerIdentificador(
        params.carnetId,
      );

    if (!socioId) {
      return crearRespuestaError(
        "El identificador del socio no es válido.",
        400,
      );
    }

    if (!carnetId) {
      return crearRespuestaError(
        "El identificador del carnet no es válido.",
        400,
      );
    }

    try {
      const resultado =
        await regenerarPasswordSocioPanel(
          carnetId,
          sesion.usuario.id,
        );

      return crearRespuesta(
        {
          ok: true,
          data: resultado,
          error: null,
          errores: [],
        },
        200,
      );
    } catch (error) {
      console.error(
        `Error en POST /api/panel/socios/${socioId}/carnets/${carnetId}/regenerar-password:`,
        error,
      );

      if (
        error instanceof
        ErrorRegenerarPasswordSocioPanel
      ) {
        return crearRespuestaError(
          error.message,
          error.status,
        );
      }

      return crearRespuestaError(
        "No se ha podido regenerar la contraseña del socio.",
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
        errores: [],
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