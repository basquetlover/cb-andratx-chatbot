import type {
  APIRoute,
} from "astro";

import {
  consultarCarnetSocioPanel,
  ErrorConsultarCarnetSocioPanel,
} from "@servicios/backend/socios/consultarCarnetSocioPanel";

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

interface CuerpoEscanearCarnet {
  numeroCarnet: string;
}

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

function obtenerNumeroCarnet(
  valor: unknown,
): string | null {
  if (!esObjeto(valor)) {
    return null;
  }

  if (
    typeof valor.numeroCarnet !==
    "string"
  ) {
    return null;
  }

  const numeroCarnet =
    valor.numeroCarnet.trim();

  if (
    numeroCarnet.length === 0 ||
    numeroCarnet.length > 50
  ) {
    return null;
  }

  return numeroCarnet;
}

export const POST: APIRoute =
  async ({
    cookies,
    request,
  }) => {
    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return crearRespuestaError(
        "Debes iniciar sesión para escanear carnets.",
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
        "Error comprobando la sesión para escanear un carnet:",
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
          "socios.ver",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso socios.ver:",
        error,
      );

      return crearRespuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return crearRespuestaError(
        "No tienes permiso para consultar carnets de socios.",
        403,
      );
    }

    const tipoContenido =
      request.headers.get(
        "content-type",
      ) ?? "";

    if (
      !tipoContenido
        .toLowerCase()
        .includes(
          "application/json",
        )
    ) {
      return crearRespuestaError(
        "El contenido de la petición debe enviarse en formato JSON.",
        415,
      );
    }

    let cuerpoDesconocido: unknown;

    try {
      cuerpoDesconocido =
        await request.json();
    } catch {
      return crearRespuestaError(
        "El cuerpo de la petición no contiene un JSON válido.",
        400,
      );
    }

    const numeroCarnet =
      obtenerNumeroCarnet(
        cuerpoDesconocido,
      );

    if (!numeroCarnet) {
      return crearRespuestaError(
        "Debes indicar un número de carnet válido.",
        400,
      );
    }

    const cuerpo:
      CuerpoEscanearCarnet = {
        numeroCarnet,
      };

    try {
      const resultado =
        await consultarCarnetSocioPanel(
          cuerpo.numeroCarnet,
        );

      return crearRespuesta(
        {
          ok: true,
          data: {
            resultado,
          },
          error: null,
        },
        200,
      );
    } catch (error) {
      console.error(
        `Error consultando el carnet ${cuerpo.numeroCarnet}:`,
        error,
      );

      if (
        error instanceof
        ErrorConsultarCarnetSocioPanel
      ) {
        return crearRespuestaError(
          error.message,
          error.status,
        );
      }

      return crearRespuestaError(
        "No se ha podido consultar el carnet de socio.",
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