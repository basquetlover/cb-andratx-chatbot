import type {
  APIRoute,
} from "astro";

import {
  NOMBRE_COOKIE_SESION_SOCIO,
  OPCIONES_ELIMINAR_COOKIE_SESION_SOCIO,
} from "@servicios/seguridad/cookieSesionSocio";

import type {
  RespuestaCerrarSesionSocio,
} from "@tipos/SocioPublico";

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
    RespuestaCerrarSesionSocio,
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

export const POST: APIRoute =
  async ({
    cookies,
  }) => {
    cookies.delete(
      NOMBRE_COOKIE_SESION_SOCIO,
      OPCIONES_ELIMINAR_COOKIE_SESION_SOCIO,
    );

    return crearRespuesta(
      {
        ok: true,
        data: {
          sesionCerrada: true,
        },
        error: null,
      },
      200,
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
      } satisfies RespuestaCerrarSesionSocio,
      {
        status: 405,
        headers: {
          ...cabecerasRespuesta,
          Allow: "POST",
        },
      },
    );
  };