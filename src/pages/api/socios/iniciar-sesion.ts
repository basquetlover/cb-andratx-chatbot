import type {
  APIRoute,
} from "astro";

import {
  autenticarSocio,
  ErrorAutenticarSocio,
} from "@servicios/backend/socios/autenticarSocio";

import {
  crearTokenSesionSocio,
  NOMBRE_COOKIE_SESION_SOCIO,
  obtenerOpcionesCookieSesionSocio,
} from "@servicios/seguridad/cookieSesionSocio";

import type {
  CarnetSocioPublico,
} from "@tipos/SocioPanel";

import type {
  CredencialesSocio,
} from "@tipos/SocioPublico";

export const prerender = false;

interface RespuestaInicioSesion {
  ok: boolean;

  data: {
    carnet:
      CarnetSocioPublico;

    redirect: string;
  } | null;

  error: string | null;
}

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
    RespuestaInicioSesion,
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

function convertirTexto(
  valor: unknown,
): string {
  return typeof valor ===
    "string"
    ? valor.trim()
    : "";
}

async function obtenerCredenciales(
  request: Request,
): Promise<CredencialesSocio | null> {
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

  const email =
    convertirTexto(
      contenido.email,
    ).toLowerCase();

  const password =
    convertirTexto(
      contenido.password,
    );

  if (
    !email ||
    !password
  ) {
    return null;
  }

  return {
    email,
    password,
  };
}

function esEmailValido(
  email: string,
): boolean {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  );
}

export const POST: APIRoute =
  async ({
    request,
    cookies,
  }) => {
    const credenciales =
      await obtenerCredenciales(
        request,
      );

    if (!credenciales) {
      return respuestaError(
        "Debes indicar tu correo electrónico y contraseña.",
        400,
      );
    }

    if (
      !esEmailValido(
        credenciales.email,
      )
    ) {
      return respuestaError(
        "El correo electrónico no es válido.",
        400,
      );
    }

    if (
      credenciales.password
        .length > 200
    ) {
      return respuestaError(
        "Las credenciales introducidas no son válidas.",
        400,
      );
    }

    try {
      const resultado =
        await autenticarSocio({
          email:
            credenciales.email,

          password:
            credenciales.password,
        });

      const expiraEn =
        new Date(
          resultado.sesion
            .expiraAt,
        );

      if (
        Number.isNaN(
          expiraEn.getTime(),
        ) ||
        expiraEn.getTime() <=
          Date.now()
      ) {
        console.error(
          "La autenticación del socio devolvió una fecha de caducidad no válida:",
          {
            socioId:
              resultado.sesion
                .socioId,

            carnetId:
              resultado.sesion
                .carnetId,

            expiraAt:
              resultado.sesion
                .expiraAt,
          },
        );

        return respuestaError(
          "No se ha podido crear la sesión del socio.",
          500,
        );
      }

      const token =
        crearTokenSesionSocio({
          socioId:
            resultado.sesion
              .socioId,

          carnetId:
            resultado.sesion
              .carnetId,

          temporadaId:
            resultado.sesion
              .temporadaId,

          versionAcceso:
            resultado.sesion
              .versionAcceso,

          expiraEn,
        });

      cookies.set(
        NOMBRE_COOKIE_SESION_SOCIO,
        token,
        obtenerOpcionesCookieSesionSocio(
          expiraEn,
        ),
      );

      return crearRespuesta(
        {
          ok: true,

          data: {
            carnet:
              resultado.carnet,

            redirect:
              "/socios",
          },

          error: null,
        },
        200,
      );
    } catch (error) {
      if (
        error instanceof
        ErrorAutenticarSocio
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      console.error(
        "Error en POST /api/socios/iniciar-sesion:",
        error,
      );

      return respuestaError(
        "No se ha podido iniciar sesión. Inténtalo de nuevo.",
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
      } satisfies RespuestaInicioSesion,
      {
        status: 405,
        headers: {
          ...cabecerasRespuesta,
          Allow: "POST",
        },
      },
    );
  };