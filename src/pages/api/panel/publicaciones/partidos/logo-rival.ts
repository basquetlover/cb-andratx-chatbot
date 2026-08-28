import type {
  APIRoute,
} from "astro";

import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

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

const NOMBRE_BUCKET =
  "publicaciones";

const TAMANO_MAXIMO =
  5 * 1024 * 1024;

const TIPOS_PERMITIDOS =
  new Map<string, string>([
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"],
    ["image/svg+xml", "svg"],
  ]);

const cabecerasJson = {
  "Cache-Control":
    "no-store, max-age=0",

  "Content-Type":
    "application/json; charset=utf-8",

  "X-Content-Type-Options":
    "nosniff",
};

function respuestaJson(
  contenido: unknown,
  estado: number,
): Response {
  return Response.json(
    contenido,
    {
      status: estado,
      headers:
        cabecerasJson,
    },
  );
}

function respuestaError(
  error: string,
  estado: number,
): Response {
  return respuestaJson(
    {
      ok: false,
      data: null,
      error,
    },
    estado,
  );
}

async function comprobarAcceso(
  cookies: Parameters<
    APIRoute
  >[0]["cookies"],
) {
  const tokenSesion =
    cookies.get(
      NOMBRE_COOKIE_SESION,
    )?.value;

  if (!tokenSesion) {
    return {
      sesion: null,

      respuesta:
        respuestaError(
          "Debes iniciar sesión para gestionar escudos.",
          401,
        ),
    };
  }

  try {
    const sesion =
      await obtenerUsuarioSesion(
        tokenSesion,
      );

    if (!sesion) {
      cookies.delete(
        NOMBRE_COOKIE_SESION,
        {
          path: "/",
        },
      );

      return {
        sesion: null,

        respuesta:
          respuestaError(
            "La sesión no es válida o ha caducado.",
            401,
          ),
      };
    }

    const autorizado =
      await comprobarPermisoUsuario(
        sesion.acceso,
        "publicaciones.gestionar",
      );

    if (!autorizado) {
      return {
        sesion: null,

        respuesta:
          respuestaError(
            "No tienes permiso para gestionar escudos.",
            403,
          ),
      };
    }

    return {
      sesion,
      respuesta: null,
    };
  } catch (error) {
    console.error(
      "Error comprobando el acceso para gestionar escudos:",
      error,
    );

    return {
      sesion: null,

      respuesta:
        respuestaError(
          "No se ha podido comprobar el acceso.",
          500,
        ),
    };
  }
}

function crearUrlInterna(
  rutaArchivo: string,
): string {
  const parametros =
    new URLSearchParams({
      archivo: rutaArchivo,
    });

  return (
    "/api/panel/publicaciones/" +
    "partidos/logo-rival?" +
    parametros.toString()
  );
}

function rutaArchivoValida(
  ruta: string,
): boolean {
  return /^rivales\/[0-9a-f-]{36}\.(png|jpg|webp|svg)$/i.test(
    ruta,
  );
}

function obtenerTipoContenido(
  rutaArchivo: string,
  tipoOriginal: string,
): string {
  if (
    tipoOriginal.startsWith(
      "image/",
    )
  ) {
    return tipoOriginal;
  }

  if (
    rutaArchivo.endsWith(
      ".svg",
    )
  ) {
    return "image/svg+xml";
  }

  if (
    rutaArchivo.endsWith(
      ".webp",
    )
  ) {
    return "image/webp";
  }

  if (
    rutaArchivo.endsWith(
      ".jpg",
    )
  ) {
    return "image/jpeg";
  }

  return "image/png";
}

export const POST: APIRoute =
  async ({
    cookies,
    request,
  }) => {
    const acceso =
      await comprobarAcceso(
        cookies,
      );

    if (!acceso.sesion) {
      return (
        acceso.respuesta ??
        respuestaError(
          "No se ha podido comprobar el acceso.",
          500,
        )
      );
    }

    let formulario: FormData;

    try {
      formulario =
        await request.formData();
    } catch {
      return respuestaError(
        "No se ha podido interpretar el archivo enviado.",
        400,
      );
    }

    const archivo =
      formulario.get("archivo");

    if (
      !(archivo instanceof File)
    ) {
      return respuestaError(
        "Debes seleccionar un archivo.",
        400,
      );
    }

    const extension =
      TIPOS_PERMITIDOS.get(
        archivo.type,
      );

    if (!extension) {
      return respuestaError(
        "El escudo debe ser PNG, JPG, WEBP o SVG.",
        400,
      );
    }

    if (archivo.size <= 0) {
      return respuestaError(
        "El archivo seleccionado está vacío.",
        400,
      );
    }

    if (
      archivo.size >
      TAMANO_MAXIMO
    ) {
      return respuestaError(
        "El escudo no puede superar los 5 MB.",
        400,
      );
    }

    let contenido:
      ArrayBuffer;

    try {
      contenido =
        await archivo.arrayBuffer();
    } catch (error) {
      console.error(
        "Error leyendo el escudo enviado:",
        error,
      );

      return respuestaError(
        "No se ha podido leer el archivo.",
        400,
      );
    }

    const rutaArchivo =
      `rivales/${crypto.randomUUID()}.${extension}`;

    const {
      error: errorSubida,
    } = await supabaseServidor
      .storage
      .from(NOMBRE_BUCKET)
      .upload(
        rutaArchivo,
        contenido,
        {
          contentType:
            archivo.type,

          cacheControl:
            "31536000",

          upsert: false,
        },
      );

    if (errorSubida) {
      console.error(
        "Error subiendo el escudo del rival:",
        errorSubida,
      );

      return respuestaError(
        "No se ha podido guardar el escudo.",
        500,
      );
    }

    return respuestaJson(
      {
        ok: true,

        data: {
          url:
            crearUrlInterna(
              rutaArchivo,
            ),
        },

        error: null,
      },
      201,
    );
  };

export const GET: APIRoute =
  async ({
    cookies,
    url,
  }) => {
    const acceso =
      await comprobarAcceso(
        cookies,
      );

    if (!acceso.sesion) {
      return (
        acceso.respuesta ??
        respuestaError(
          "No se ha podido comprobar el acceso.",
          500,
        )
      );
    }

    const rutaArchivo =
      url.searchParams
        .get("archivo")
        ?.trim() ?? "";

    if (
      !rutaArchivo ||
      !rutaArchivoValida(
        rutaArchivo,
      )
    ) {
      return respuestaError(
        "La ruta del escudo no es válida.",
        400,
      );
    }

    const {
      data: archivo,
      error,
    } = await supabaseServidor
      .storage
      .from(NOMBRE_BUCKET)
      .download(rutaArchivo);

    if (error || !archivo) {
      console.error(
        `Error descargando el escudo ${rutaArchivo}:`,
        error,
      );

      return respuestaError(
        "El escudo solicitado no existe.",
        404,
      );
    }

    let contenido:
      ArrayBuffer;

    try {
      contenido =
        await archivo.arrayBuffer();
    } catch (error) {
      console.error(
        `Error leyendo el escudo ${rutaArchivo}:`,
        error,
      );

      return respuestaError(
        "No se ha podido leer el escudo.",
        500,
      );
    }

    const tipoContenido =
      obtenerTipoContenido(
        rutaArchivo,
        archivo.type,
      );

    return new Response(
      contenido,
      {
        status: 200,

        headers: {
          "Cache-Control":
            "private, max-age=31536000, immutable",

          "Content-Type":
            tipoContenido,

          "Content-Length":
            String(
              contenido.byteLength,
            ),

          "X-Content-Type-Options":
            "nosniff",
        },
      },
    );
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
          ...cabecerasJson,
          Allow: "GET, POST",
        },
      },
    );
  };