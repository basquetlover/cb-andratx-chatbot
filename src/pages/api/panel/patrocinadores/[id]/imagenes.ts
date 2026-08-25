import type { APIRoute } from "astro";

import { actualizarImagenesPatrocinador, ErrorActualizarImagenesPatrocinador } from "@servicios/backend/patrocinadores/actualizar/actualizarImagenesPatrocinador";
import { ErrorImagenPatrocinador } from "@servicios/backend/patrocinadores/imagenes/procesarImagenPatrocinador";
import { obtenerUsuarioSesion } from "@servicios/backend/sesiones/obtenerUsuarioSesion";
import { comprobarPermisoUsuario } from "@servicios/seguridad/comprobarPermisoUsuario";
import { NOMBRE_COOKIE_SESION } from "@servicios/seguridad/cookieSesion";

export const prerender = false;

const TAMAÑO_MAXIMO_SOLICITUD = 20 * 1024 * 1024;

const cabecerasRespuesta = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function respuestaError(error: string, estado: number, campo?: string) {
  return Response.json(
    {
      ok: false,
      data: null,
      error,
      errores: campo ? [{ campo, mensaje: error }] : [],
    },
    {
      status: estado,
      headers: cabecerasRespuesta,
    },
  );
}

function obtenerArchivo(formulario: FormData, nombre: string): File | null {
  const valor = formulario.get(nombre);

  if (!(valor instanceof File) || valor.size <= 0 || !valor.name.trim()) {
    return null;
  }

  return valor;
}

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  const patrocinadorId = params.id?.trim();
  const tokenSesion = cookies.get(NOMBRE_COOKIE_SESION)?.value;

  if (!patrocinadorId) {
    return respuestaError("El identificador del patrocinador no es válido.", 400);
  }

  if (!tokenSesion) {
    return respuestaError("Debes iniciar sesión.", 401);
  }

  let sesion;

  try {
    sesion = await obtenerUsuarioSesion(tokenSesion);
  } catch (error) {
    console.error("Error comprobando la sesión para modificar imágenes:", error);

    return respuestaError("No se ha podido comprobar la sesión.", 500);
  }

  if (!sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return respuestaError("La sesión no es válida o ha caducado.", 401);
  }

  const autorizado = await comprobarPermisoUsuario(sesion.acceso, "sponsors.editar");

  if (!autorizado) {
    return respuestaError("No tienes permiso para modificar patrocinadores.", 403);
  }

  const tipoContenido = request.headers.get("content-type")?.toLowerCase() ?? "";
  const longitudContenido = Number(request.headers.get("content-length") ?? 0);

  if (!tipoContenido.includes("multipart/form-data")) {
    return respuestaError("El formulario debe enviarse como multipart/form-data.", 415);
  }

  if (Number.isFinite(longitudContenido) && longitudContenido > TAMAÑO_MAXIMO_SOLICITUD) {
    return respuestaError("La solicitud no puede superar los 20 MB.", 413);
  }

  let formulario: FormData;

  try {
    formulario = await request.formData();
  } catch {
    return respuestaError("No se ha podido leer el formulario.", 400);
  }

  let opciones: {
    eliminarLogo?: boolean;
    eliminarBanner?: boolean;
  } = {};

  const datosFormulario = formulario.get("datos");

  if (typeof datosFormulario === "string" && datosFormulario.trim()) {
    try {
      opciones = JSON.parse(datosFormulario);
    } catch {
      return respuestaError("Las opciones de imagen no son válidas.", 400);
    }
  }

  try {
    const resultado = await actualizarImagenesPatrocinador(
      patrocinadorId,
      obtenerArchivo(formulario, "logo"),
      obtenerArchivo(formulario, "banner"),
      opciones.eliminarLogo === true,
      opciones.eliminarBanner === true,
    );

    return Response.json(
      {
        ok: true,
        data: {
          imagenes: resultado,
        },
        error: null,
        errores: [],
      },
      {
        status: 200,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    if (error instanceof ErrorImagenPatrocinador || error instanceof ErrorActualizarImagenesPatrocinador) {
      return respuestaError(error.message, error.status, error.campo);
    }

    console.error(`Error actualizando imágenes del patrocinador ${patrocinadorId}:`, error);

    return respuestaError("No se han podido actualizar las imágenes.", 500);
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
        ...cabecerasRespuesta,
        Allow: "PATCH",
      },
    },
  );
};