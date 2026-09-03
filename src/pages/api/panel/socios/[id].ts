import type {
  APIRoute,
} from "astro";

import {
  obtenerSocioPanel,
  ErrorObtenerSocioPanel,
} from "@servicios/backend/socios/obtenerSocioPanel";

import {
  actualizarSocioPanel,
  ErrorActualizarSocioPanel,
} from "@servicios/backend/socios/actualizarSocioPanel";

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
  ActualizarSocioPanel,
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
  errores: unknown[] = [],
): Response {
  return crearRespuesta(
    {
      ok: false,
      data: null,
      error,
      errores,
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

function obtenerErroresCampo(
  error: unknown,
): unknown[] {
  if (!esObjeto(error)) {
    return [];
  }

  return Array.isArray(
    error.errores,
  )
    ? error.errores
    : [];
}

function obtenerSocioId(
  valor: string | undefined,
): string | null {
  if (
    typeof valor !== "string"
  ) {
    return null;
  }

  const socioId =
    valor.trim();

  if (!socioId) {
    return null;
  }

  return socioId;
}

export const GET: APIRoute =
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
        "Debes iniciar sesión para consultar el socio.",
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
        "Error comprobando la sesión para consultar un socio:",
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
        "No tienes permiso para consultar socios.",
        403,
      );
    }

    const socioId =
      obtenerSocioId(
        params.id,
      );

    if (!socioId) {
      return crearRespuestaError(
        "El identificador del socio no es válido.",
        400,
      );
    }

    try {
      const socio =
        await obtenerSocioPanel(
          socioId,
        );

      return crearRespuesta(
        {
          ok: true,
          data: {
            socio,
          },
          error: null,
          errores: [],
        },
        200,
      );
    } catch (error) {
      console.error(
        `Error en GET /api/panel/socios/${socioId}:`,
        error,
      );

      if (
        error instanceof
        ErrorObtenerSocioPanel
      ) {
        return crearRespuestaError(
          error.message,
          error.status,
        );
      }

      return crearRespuestaError(
        "No se ha podido obtener la información del socio.",
        500,
      );
    }
  };

export const PATCH: APIRoute =
  async ({
    cookies,
    params,
    request,
  }) => {
    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return crearRespuestaError(
        "Debes iniciar sesión para modificar el socio.",
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
        "Error comprobando la sesión para modificar un socio:",
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
        "Error comprobando el permiso socios.editar:",
        error,
      );

      return crearRespuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return crearRespuestaError(
        "No tienes permiso para modificar socios.",
        403,
      );
    }

    const socioId =
      obtenerSocioId(
        params.id,
      );

    if (!socioId) {
      return crearRespuestaError(
        "El identificador del socio no es válido.",
        400,
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

    if (
      !esObjeto(
        cuerpoDesconocido,
      )
    ) {
      return crearRespuestaError(
        "Los datos enviados no son válidos.",
        400,
      );
    }

    const datos =
      cuerpoDesconocido as unknown as
        ActualizarSocioPanel;

    try {
      const socio =
        await actualizarSocioPanel(
          socioId,
          datos,
          sesion.usuario.id,
        );

      return crearRespuesta(
        {
          ok: true,
          data: {
            socio,
          },
          error: null,
          errores: [],
        },
        200,
      );
    } catch (error) {
      console.error(
        `Error en PATCH /api/panel/socios/${socioId}:`,
        error,
      );

      if (
        error instanceof
        ErrorActualizarSocioPanel
      ) {
        return crearRespuestaError(
          error.message,
          error.status,
          obtenerErroresCampo(
            error,
          ),
        );
      }

      return crearRespuestaError(
        "No se ha podido modificar el socio.",
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
          Allow: "GET, PATCH",
        },
      },
    );
  };