import type {
  APIRoute,
} from "astro";

import {
  obtenerListadoSociosPanel,
  ErrorObtenerListadoSociosPanel,
} from "@servicios/backend/socios/obtenerListadoSociosPanel";

import {
  crearSocioPanel,
  ErrorCrearSocioPanel,
} from "@servicios/backend/socios/crearSocioPanel";

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
  CrearSocioPanel,
  EstadoCarnetSocio,
} from "@tipos/SocioPanel";

export const prerender = false;

type FiltrosListadoSociosPanel =
  Parameters<
    typeof obtenerListadoSociosPanel
  >[0];

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

function convertirEntero(
  valor: string | null,
  predeterminado: number,
  minimo: number,
  maximo: number,
): number {
  if (!valor) {
    return predeterminado;
  }

  const numero =
    Number.parseInt(
      valor,
      10,
    );

  if (
    !Number.isFinite(numero)
  ) {
    return predeterminado;
  }

  return Math.min(
    Math.max(
      numero,
      minimo,
    ),
    maximo,
  );
}

function convertirEstadoCarnet(
  valor: string | null,
): EstadoCarnetSocio | "todos" {
  switch (valor) {
    case "pendiente":
    case "activo":
    case "bloqueado":
    case "caducado":
      return valor;

    default:
      return "todos";
  }
}

function convertirEstadoSocio(
  valor: string | null,
):
  | "todos"
  | "activos"
  | "inactivos" {
  switch (valor) {
    case "activos":
    case "inactivos":
      return valor;

    default:
      return "todos";
  }
}

export const GET: APIRoute =
  async ({
    cookies,
    url,
  }) => {
    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return crearRespuestaError(
        "Debes iniciar sesión para consultar los socios.",
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
        "Error comprobando la sesión para listar socios:",
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
        "No tienes permiso para consultar los socios.",
        403,
      );
    }

    const busqueda =
      url.searchParams
        .get("busqueda")
        ?.trim()
        .slice(0, 150) ?? "";

    const temporadaId =
      url.searchParams
        .get("temporadaId")
        ?.trim() || undefined;

    const estado =
      convertirEstadoCarnet(
        url.searchParams.get(
          "estado",
        ),
      );

    const activo =
      convertirEstadoSocio(
        url.searchParams.get(
          "activo",
        ),
      );

    const pagina =
      convertirEntero(
        url.searchParams.get(
          "pagina",
        ),
        1,
        1,
        100_000,
      );

    const limite =
      convertirEntero(
        url.searchParams.get(
          "limite",
        ),
        20,
        1,
        100,
      );

    const filtros = {
      busqueda,
      temporadaId,
      estado,
      activo,
      pagina,
      limite,
    } as FiltrosListadoSociosPanel;

    try {
      const resultado =
        await obtenerListadoSociosPanel(
          filtros,
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
        "Error en GET /api/panel/socios:",
        error,
      );

      if (
        error instanceof
        ErrorObtenerListadoSociosPanel
      ) {
        return crearRespuestaError(
          error.message,
          error.status,
        );
      }

      return crearRespuestaError(
        "No se ha podido obtener el listado de socios.",
        500,
      );
    }
  };

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
        "Debes iniciar sesión para crear socios.",
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
        "Error comprobando la sesión para crear un socio:",
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
          "socios.crear",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso socios.crear:",
        error,
      );

      return crearRespuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return crearRespuestaError(
        "No tienes permiso para crear socios.",
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
        CrearSocioPanel;

    try {
      const resultado =
        await crearSocioPanel(
          datos,
          sesion.usuario.id,
        );

      return crearRespuesta(
        {
          ok: true,
          data: resultado,
          error: null,
          errores: [],
        },
        201,
      );
    } catch (error) {
      console.error(
        "Error en POST /api/panel/socios:",
        error,
      );

      if (
        error instanceof
        ErrorCrearSocioPanel
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
        "No se ha podido crear el socio.",
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
          Allow: "GET, POST",
        },
      },
    );
  };