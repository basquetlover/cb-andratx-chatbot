import type {
  APIRoute,
} from "astro";

import {
  subirImagenEventoPanel,
  ErrorSubirImagenEventoPanel,
} from "@servicios/backend/eventos/subirImagenEventoPanel";

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

export const prerender =
  false;

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
      status:
        estado,

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

function obtenerRutaImagen(
  valor: unknown,
): string | null {
  if (
    typeof valor !==
    "string"
  ) {
    return null;
  }

  const ruta =
    valor.trim();

  if (
    !ruta ||
    ruta.length > 1000 ||
    ruta.includes("..") ||
    ruta.startsWith("/") ||
    ruta.includes("\\")
  ) {
    return null;
  }

  if (
    ruta.startsWith(
      "carteles/",
    ) ||
    ruta.startsWith(
      "notificaciones/",
    )
  ) {
    return ruta;
  }

  return null;
}

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
      return respuestaError(
        "Debes iniciar sesión para subir imágenes.",
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
        "Error comprobando la sesión para subir una imagen de evento:",
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

    let autorizado =
      false;

    try {
      const [
        puedeCrear,
        puedeEditar,
      ] =
        await Promise.all([
          comprobarPermisoUsuario(
            sesion.acceso,
            "eventos.crear",
          ),

          comprobarPermisoUsuario(
            sesion.acceso,
            "eventos.editar",
          ),
        ]);

      autorizado =
        puedeCrear ||
        puedeEditar;
    } catch (error) {
      console.error(
        "Error comprobando los permisos para subir una imagen de evento:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return respuestaError(
        "No tienes permiso para subir imágenes de eventos.",
        403,
      );
    }

    let formulario:
      FormData;

    try {
      formulario =
        await request.formData();
    } catch (error) {
      console.error(
        "Error leyendo el formulario de imagen del evento:",
        error,
      );

      return respuestaError(
        "El formulario enviado no es válido.",
        400,
      );
    }

    const archivo =
      formulario.get(
        "archivo",
      );

    const tipo =
      formulario.get(
        "tipo",
      );

    const eventoId =
      formulario.get(
        "eventoId",
      );

    if (
      !(archivo instanceof File)
    ) {
      return respuestaError(
        "Debes seleccionar una imagen.",
        400,
      );
    }

    if (
      typeof tipo !==
      "string"
    ) {
      return respuestaError(
        "Debes indicar el tipo de imagen.",
        400,
      );
    }

    if (
      eventoId !== null &&
      typeof eventoId !==
        "string"
    ) {
      return respuestaError(
        "El identificador del evento no es válido.",
        400,
      );
    }

    try {
      const imagen =
        await subirImagenEventoPanel(
          archivo,
          tipo,
          eventoId?.trim() ||
            null,
        );

      return crearRespuesta(
        {
          ok: true,

          data: {
            imagen,
          },

          error: null,
        },
        201,
      );
    } catch (error) {
      console.error(
        "Error en POST /api/panel/eventos/imagenes:",
        error,
      );

      if (
        error instanceof
        ErrorSubirImagenEventoPanel
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se ha podido subir la imagen.",
        500,
      );
    }
  };

export const DELETE: APIRoute =
  async ({
    cookies,
    request,
  }) => {
    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return respuestaError(
        "Debes iniciar sesión para eliminar imágenes.",
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
        "Error comprobando la sesión para eliminar una imagen de evento:",
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

    let autorizado =
      false;

    try {
      const [
        puedeCrear,
        puedeEditar,
      ] =
        await Promise.all([
          comprobarPermisoUsuario(
            sesion.acceso,
            "eventos.crear",
          ),

          comprobarPermisoUsuario(
            sesion.acceso,
            "eventos.editar",
          ),
        ]);

      autorizado =
        puedeCrear ||
        puedeEditar;
    } catch (error) {
      console.error(
        "Error comprobando los permisos para eliminar una imagen de evento:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return respuestaError(
        "No tienes permiso para eliminar imágenes de eventos.",
        403,
      );
    }

    let contenido:
      unknown;

    try {
      contenido =
        await request.json();
    } catch {
      return respuestaError(
        "El contenido enviado no es válido.",
        400,
      );
    }

    if (
      typeof contenido !==
        "object" ||
      contenido === null ||
      Array.isArray(
        contenido,
      )
    ) {
      return respuestaError(
        "El contenido enviado no es válido.",
        400,
      );
    }

    const ruta =
      obtenerRutaImagen(
        (
          contenido as
            Record<
              string,
              unknown
            >
        ).ruta,
      );

    if (!ruta) {
      return respuestaError(
        "La ruta de la imagen no es válida.",
        400,
      );
    }

    const {
      error,
    } =
      await supabaseServidor
        .storage
        .from("eventos")
        .remove([
          ruta,
        ]);

    if (error) {
      console.error(
        `Error eliminando la imagen ${ruta}:`,
        error,
      );

      return respuestaError(
        "No se ha podido eliminar la imagen.",
        500,
      );
    }

    return crearRespuesta(
      {
        ok: true,

        data: {
          ruta,
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
      },
      {
        status: 405,

        headers: {
          ...cabecerasRespuesta,

          Allow:
            "POST, DELETE",
        },
      },
    );
  };