import type {
  APIRoute,
} from "astro";

import {
  actualizarCarnetSocioPanel,
  ErrorActualizarCarnetSocioPanel,
} from "@servicios/backend/socios/actualizarCarnetSocioPanel";

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
  ActualizarCarnetTemporadaSocio,
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
        "Debes iniciar sesión para modificar el carnet.",
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
        "Error comprobando la sesión para modificar un carnet:",
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
        "Error comprobando el permiso socios.editar para modificar un carnet:",
        error,
      );

      return crearRespuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return crearRespuestaError(
        "No tienes permiso para modificar carnets de socios.",
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
        ActualizarCarnetTemporadaSocio;

    try {
      const socio =
        await actualizarCarnetSocioPanel(
          carnetId,
          datos,
          sesion.usuario.id,
        );

      if (
        socio.id !== socioId
      ) {
        console.error(
          "El carnet actualizado no pertenece al socio indicado en la ruta.",
          {
            socioIdRuta:
              socioId,
            socioIdCarnet:
              socio.id,
            carnetId,
          },
        );

        return crearRespuestaError(
          "El carnet no pertenece al socio indicado.",
          409,
        );
      }

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
        `Error en PATCH /api/panel/socios/${socioId}/carnets/${carnetId}:`,
        error,
      );

      if (
        error instanceof
        ErrorActualizarCarnetSocioPanel
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
        "No se ha podido modificar el carnet del socio.",
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
          Allow: "PATCH",
        },
      },
    );
  };