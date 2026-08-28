import type {
  APIRoute,
} from "astro";

import {
  obtenerDatosEsbFbib,
} from "@servicios/fbib/cliente/obtenerDatosEsbFbib";

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

interface ImagenBase64 {
  contenido: string;
  tipo: string;
}

const cabecerasJson = {
  "Cache-Control":
    "no-store, max-age=0",
  "Content-Type":
    "application/json; charset=utf-8",
  "X-Content-Type-Options":
    "nosniff",
};

function respuestaError(
  error: string,
  estado: number,
): Response {
  return Response.json(
    {
      ok: false,
      data: null,
      error,
    },
    {
      status: estado,
      headers:
        cabecerasJson,
    },
  );
}

function convertirTexto(
  valor: unknown,
): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function extraerValorImagen(
  valor: unknown,
): string | null {
  if (typeof valor === "string") {
    const texto = valor.trim();

    return texto || null;
  }

  if (Array.isArray(valor)) {
    for (const elemento of valor) {
      const resultado =
        extraerValorImagen(
          elemento,
        );

      if (resultado) {
        return resultado;
      }
    }

    return null;
  }

  if (
    typeof valor !== "object" ||
    valor === null
  ) {
    return null;
  }

  const objeto =
    valor as Record<
      string,
      unknown
    >;

  const propiedades = [
    "imagen",
    "image",
    "escudo",
    "logo",
    "data",
    "content",
    "value",
  ];

  for (
    const propiedad of propiedades
  ) {
    const resultado =
      extraerValorImagen(
        objeto[propiedad],
      );

    if (resultado) {
      return resultado;
    }
  }

  return null;
}

function extraerBase64(
  valor: string,
): ImagenBase64 | null {
  const dataUrl = valor.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s,
  );

  if (dataUrl) {
    return {
      tipo: dataUrl[1],
      contenido:
        dataUrl[2].replace(
          /\s/g,
          "",
        ),
    };
  }

  const base64Limpio =
    valor.replace(/\s/g, "");

  if (
    /^[A-Za-z0-9+/]+={0,2}$/.test(
      base64Limpio,
    ) &&
    base64Limpio.length >= 20
  ) {
    return {
      tipo: "image/png",
      contenido:
        base64Limpio,
    };
  }

  return null;
}

function convertirBase64EnArrayBuffer(
  contenido: string,
): ArrayBuffer {
  const binario = atob(contenido);

  const buffer = new ArrayBuffer(
    binario.length,
  );

  const bytes = new Uint8Array(
    buffer,
  );

  for (
    let indice = 0;
    indice < binario.length;
    indice += 1
  ) {
    bytes[indice] =
      binario.charCodeAt(indice);
  }

  return buffer;
}

function normalizarUrlFbib(
  valor: string,
): string | null {
  if (
    valor.startsWith(
      "https://",
    )
  ) {
    return valor;
  }

  if (
    valor.startsWith(
      "http://",
    )
  ) {
    return valor.replace(
      "http://",
      "https://",
    );
  }

  if (valor.startsWith("/")) {
    return `https://www.fbib.es${valor}`;
  }

  return null;
}

async function crearRespuestaDesdeUrl(
  urlImagen: string,
): Promise<Response> {
  const respuesta =
    await fetch(urlImagen, {
      method: "GET",
      headers: {
        Accept: "image/*",
      },
      signal:
        AbortSignal.timeout(
          10000,
        ),
    });

  if (!respuesta.ok) {
    throw new Error(
      `La imagen ha respondido con el estado ${respuesta.status}.`,
    );
  }

  const tipo =
    respuesta.headers.get(
      "content-type",
    ) ?? "image/png";

  if (
    !tipo
      .toLowerCase()
      .startsWith("image/")
  ) {
    throw new Error(
      "La respuesta de la FBIB no es una imagen.",
    );
  }

  const contenido =
    await respuesta.arrayBuffer();

  return new Response(
    contenido,
    {
      status: 200,
      headers: {
        "Cache-Control":
          "private, max-age=86400",
        "Content-Type": tipo,
        "X-Content-Type-Options":
          "nosniff",
      },
    },
  );
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
      return respuestaError(
        "Debes iniciar sesión para consultar el escudo.",
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
        "Error comprobando la sesión para consultar un escudo FBIB:",
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
          "publicaciones.gestionar",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso publicaciones.gestionar:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return respuestaError(
        "No tienes permiso para consultar este escudo.",
        403,
      );
    }

    const equipoFbibId =
      convertirTexto(
        url.searchParams.get(
          "equipoFbibId",
        ),
      );

    if (
      !equipoFbibId ||
      equipoFbibId.length > 100 ||
      !/^[A-Za-z0-9_-]+$/.test(
        equipoFbibId,
      )
    ) {
      return respuestaError(
        "El identificador FBIB del equipo no es válido.",
        400,
      );
    }

    try {
      const resultado =
        await obtenerDatosEsbFbib(
          `/Clubs/getImageByTeamId/${encodeURIComponent(
            equipoFbibId,
          )}`,
        );

      const imagen =
        extraerValorImagen(
          resultado,
        );

      if (!imagen) {
        return respuestaError(
          "La FBIB no dispone de un escudo para este equipo.",
          404,
        );
      }

      const imagenBase64 =
        extraerBase64(imagen);

      if (imagenBase64) {
        const buffer =
            convertirBase64EnArrayBuffer(
                imagenBase64.contenido,
            );

            return new Response(
            buffer,
            {
                status: 200,
                headers: {
                "Cache-Control":
                    "private, max-age=86400",
                "Content-Type":
                    imagenBase64.tipo,
                "Content-Length":
                    String(buffer.byteLength),
                "X-Content-Type-Options":
                    "nosniff",
                },
            },
            );
      }

      const urlImagen =
        normalizarUrlFbib(
          imagen,
        );

      if (!urlImagen) {
        return respuestaError(
          "El formato del escudo recibido no es válido.",
          502,
        );
      }

      return await crearRespuestaDesdeUrl(
        urlImagen,
      );
    } catch (error) {
      console.error(
        `Error obteniendo el escudo FBIB ${equipoFbibId}:`,
        error,
      );

      return respuestaError(
        "No se ha podido obtener el escudo desde la FBIB.",
        502,
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
          ...cabecerasJson,
          Allow: "GET",
        },
      },
    );
  };