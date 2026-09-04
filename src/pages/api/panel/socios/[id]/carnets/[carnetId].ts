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
  ErrorCampoSocio,
  EstadoCarnetSocio,
  RespuestaSocioPanel,
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
    RespuestaSocioPanel,
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
  errores:
    ErrorCampoSocio[] = [],
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

function obtenerIdentificador(
  valor:
    string | undefined,
): string | null {
  return convertirTexto(
    valor,
  );
}

function esEstadoCarnet(
  valor: unknown,
): valor is EstadoCarnetSocio {
  return (
    valor === "pendiente" ||
    valor === "activo" ||
    valor === "bloqueado" ||
    valor === "caducado"
  );
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

  return (
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
    )
  );
}

function obtenerErroresCampo(
  error: unknown,
): ErrorCampoSocio[] {
  if (
    !esObjeto(error) ||
    !Array.isArray(
      error.errores,
    )
  ) {
    return [];
  }

  return error.errores.flatMap(
    (elemento) => {
      if (!esObjeto(elemento)) {
        return [];
      }

      const campo =
        convertirTexto(
          elemento.campo,
        );

      const mensaje =
        convertirTexto(
          elemento.mensaje,
        );

      if (
        !campo ||
        !mensaje
      ) {
        return [];
      }

      return [
        {
          campo,
          mensaje,
        },
      ];
    },
  );
}

async function obtenerDatosActualizacion(
  request: Request,
): Promise<ActualizarCarnetTemporadaSocio | null> {
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
    return null;
  }

  let contenido:
    unknown;

  try {
    contenido =
      await request.json();
  } catch {
    return null;
  }

  if (!esObjeto(contenido)) {
    return null;
  }

  const tipoSocio =
    convertirTexto(
      contenido.tipoSocio ??
        contenido.tipo_socio,
    );

  const estado =
    contenido.estado;

  const fechaAlta =
    convertirTexto(
      contenido.fechaAlta ??
        contenido.fecha_alta,
    );

  const fechaCaducidad =
    convertirTexto(
      contenido.fechaCaducidad ??
        contenido.fecha_caducidad,
    );

  const motivoBloqueo =
    convertirTexto(
      contenido.motivoBloqueo ??
        contenido.motivo_bloqueo,
    );

  if (
    !tipoSocio ||
    !esEstadoCarnet(
      estado,
    ) ||
    !fechaAlta ||
    !fechaCaducidad
  ) {
    return null;
  }

  return {
    tipoSocio,
    estado,
    fechaAlta,
    fechaCaducidad,

    motivoBloqueo:
      estado ===
        "bloqueado"
        ? motivoBloqueo
        : null,
  };
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

    const usuarioId =
      obtenerUsuarioIdSesion(
        sesion,
      );

    if (!usuarioId) {
      return crearRespuestaError(
        "No se ha podido identificar al administrador.",
        500,
      );
    }

    const datos =
      await obtenerDatosActualizacion(
        request,
      );

    if (!datos) {
      return crearRespuestaError(
        "Los datos enviados no son válidos. Debes indicar tipo, estado, fecha de alta y fecha de caducidad.",
        400,
      );
    }

    try {
      const socio =
        await actualizarCarnetSocioPanel(
          socioId,
          carnetId,
          datos,
          usuarioId,
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
      } satisfies RespuestaSocioPanel,
      {
        status: 405,
        headers: {
          ...cabecerasRespuesta,
          Allow: "PATCH",
        },
      },
    );
  };