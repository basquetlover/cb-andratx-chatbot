
import type { APIRoute } from "astro";

import {
  obtenerUsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import {
  comprobarPermisoUsuario,
} from "@servicios/seguridad/comprobarPermisoUsuario";

import {
  NOMBRE_COOKIE_SESION,
} from "@servicios/seguridad/cookieSesion";

import {
  verificarPassword,
} from "@servicios/seguridad/password";

import {
  validarOrigen,
} from "@servicios/seguridad/validarOrigen";

import {
  supabaseServidor,
} from "@servicios/supabase/servidor";

import {
  eliminarSocioPanel,
  ErrorEliminarSocioPanel,
} from "@servicios/backend/socios/eliminarSocioPanel";

export const prerender = false;

const MAX_BODY = 2048;

const EXPRESION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cabeceras = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function responder(
  contenido: unknown,
  status = 200,
): Response {
  return Response.json(contenido, {
    status,
    headers: cabeceras,
  });
}

function responderError(
  mensaje: string,
  status: number,
): Response {
  return responder(
    {
      ok: false,
      data: null,
      error: mensaje,
    },
    status,
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

function mismoOrigen(
  request: Request,
): boolean {
  const resultado = validarOrigen(request);

  if (!resultado.autorizado) {
    return false;
  }

  const sitio = request.headers.get(
    "sec-fetch-site",
  );

  if (
    sitio &&
    sitio !== "same-origin" &&
    sitio !== "none"
  ) {
    return false;
  }

  const origen = request.headers.get("origin");
  const referer = request.headers.get("referer");

  try {
    const destino = new URL(request.url).origin;

    if (origen) {
      return new URL(origen).origin === destino;
    }

    if (referer) {
      return new URL(referer).origin === destino;
    }

    return sitio === "same-origin";
  } catch {
    return false;
  }
}

export const DELETE: APIRoute = async ({
  cookies,
  params,
  request,
}) => {
  if (!mismoOrigen(request)) {
    return responderError(
      "El origen de la petición no está autorizado.",
      403,
    );
  }

  const token = cookies.get(
    NOMBRE_COOKIE_SESION,
  )?.value;

  if (!token) {
    return responderError(
      "Debes iniciar sesión para eliminar un socio.",
      401,
    );
  }

  let sesion;

  try {
    sesion = await obtenerUsuarioSesion(token);
  } catch (error) {
    console.error(
      "Error comprobando la sesión:",
      error,
    );

    return responderError(
      "No se ha podido comprobar la sesión.",
      500,
    );
  }

  if (!sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return responderError(
      "La sesión no es válida o ha caducado.",
      401,
    );
  }

  let autorizado = false;

  try {
    autorizado = await comprobarPermisoUsuario(
      sesion.acceso,
      "socios.editar",
    );
  } catch (error) {
    console.error(
      "Error comprobando el permiso de socios:",
      error,
    );

    return responderError(
      "No se han podido comprobar los permisos.",
      500,
    );
  }

  if (!autorizado) {
    return responderError(
      "No tienes permiso para eliminar socios.",
      403,
    );
  }

  const socioId = params.id?.trim() ?? "";

  if (!EXPRESION_UUID.test(socioId)) {
    return responderError(
      "El identificador del socio no es válido.",
      400,
    );
  }

  const tipoContenido =
    request.headers.get("content-type") ?? "";

  if (
    !tipoContenido
      .toLowerCase()
      .includes("application/json")
  ) {
    return responderError(
      "La petición debe enviarse en formato JSON.",
      415,
    );
  }

  const longitud = Number(
    request.headers.get("content-length") ?? 0,
  );

  if (
    Number.isFinite(longitud) &&
    longitud > MAX_BODY
  ) {
    return responderError(
      "La petición es demasiado grande.",
      413,
    );
  }

  let texto: string;

  try {
    texto = await request.text();
  } catch {
    return responderError(
      "No se ha podido leer la petición.",
      400,
    );
  }

  if (!texto || texto.length > MAX_BODY) {
    return responderError(
      "El contenido enviado no es válido.",
      400,
    );
  }

  let datos: unknown;

  try {
    datos = JSON.parse(texto);
  } catch {
    return responderError(
      "El JSON enviado no es válido.",
      400,
    );
  }

  if (
    !esObjeto(datos) ||
    datos.confirmar !== true ||
    typeof datos.password !== "string" ||
    datos.password.length === 0 ||
    datos.password.length > 128
  ) {
    return responderError(
      "Debes confirmar la eliminación e introducir tu contraseña.",
      400,
    );
  }

  /*
   * Comprobar la contraseña de la misma
   * persona que ha iniciado sesión.
   */
  const {
    data: administrador,
    error: errorAdministrador,
  } = await supabaseServidor
    .from("usuarios")
    .select("id, password_hash, estado")
    .eq("id", sesion.usuario.id)
    .maybeSingle();

  if (errorAdministrador) {
    console.error(
      "Error consultando las credenciales administrativas:",
      errorAdministrador,
    );

    return responderError(
      "No se ha podido verificar la contraseña.",
      500,
    );
  }

  if (
    !administrador ||
    administrador.estado !== "activo" ||
    typeof administrador.password_hash !== "string"
  ) {
    return responderError(
      "La cuenta administrativa no está disponible.",
      403,
    );
  }

  const correcta = await verificarPassword(
    administrador.password_hash,
    datos.password,
  );

  if (!correcta) {
    return responderError(
      "La contraseña es incorrecta.",
      401,
    );
  }

  /*
   * La eliminación solo se ejecuta después
   * de validar sesión, permiso y contraseña.
   */
  try {
    const resultado = await eliminarSocioPanel(
      socioId,
    );

    return responder({
      ok: true,
      data: resultado,
      error: null,
    });
  } catch (error) {
    console.error(
      "Error eliminando completamente el socio:",
      error,
    );

    if (error instanceof ErrorEliminarSocioPanel) {
      return responderError(
        error.message,
        error.status,
      );
    }

    return responderError(
      "No se ha podido completar la eliminación del socio.",
      500,
    );
  }
};

export const ALL: APIRoute = async () => {
  return Response.json(
    {
      ok: false,
      data: null,
      error: "Método no permitido.",
    },
    {
      status: 405,
      headers: {
        ...cabeceras,
        Allow: "DELETE",
      },
    },
  );
};
