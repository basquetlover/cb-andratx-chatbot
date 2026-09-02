import type {
  APIRoute,
} from "astro";

import {
  actualizarEventoPanel,
  ErrorActualizarEventoPanel,
} from "@servicios/backend/eventos/actualizarEventoPanel";

import {
  eliminarEventoPanel,
  ErrorEliminarEventoPanel,
} from "@servicios/backend/eventos/eliminarEventoPanel";

import {
  obtenerEventoPanel,
  ErrorObtenerEventoPanel,
} from "@servicios/backend/eventos/obtenerEventoPanel";

import {
  validarEventoPanel,
} from "@servicios/backend/eventos/validarEventoPanel";

import {
  obtenerAlcanceEventosUsuario,
  puedeConsultarEvento,
  puedeGestionarEquiposEvento,
  puedeGestionarEvento,
  ErrorComprobarAccesoEventoUsuario,
} from "@servicios/backend/eventos/comprobarAccesoEventoUsuario";

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

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function obtenerTexto(
  valor: unknown,
): string {
  return typeof valor ===
    "string"
    ? valor.trim()
    : "";
}

function obtenerUsuarioIdSesion(
  sesion: unknown,
): string {
  if (!esObjeto(sesion)) {
    return "";
  }

  if (
    esObjeto(
      sesion.usuario,
    )
  ) {
    const usuarioId =
      obtenerTexto(
        sesion.usuario.id,
      );

    if (usuarioId) {
      return usuarioId;
    }
  }

  return (
    obtenerTexto(
      sesion.usuarioId,
    ) ||
    obtenerTexto(
      sesion.usuario_id,
    ) ||
    obtenerTexto(
      sesion.id,
    )
  );
}

function obtenerEventoId(
  valor:
    | string
    | undefined,
): string {
  return valor?.trim() ??
    "";
}

export const GET: APIRoute =
  async ({
    cookies,
    params,
  }) => {
    const eventoId =
      obtenerEventoId(
        params.id,
      );

    if (!eventoId) {
      return respuestaError(
        "El identificador del evento no es válido.",
        400,
      );
    }

    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return respuestaError(
        "Debes iniciar sesión para consultar el evento.",
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
        "Error comprobando la sesión para consultar un evento:",
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

    const usuarioId =
      obtenerUsuarioIdSesion(
        sesion,
      );

    if (!usuarioId) {
      return respuestaError(
        "No se ha podido identificar al usuario.",
        401,
      );
    }

    let autorizado =
      false;

    try {
      autorizado =
        await comprobarPermisoUsuario(
          sesion.acceso,
          "eventos.ver",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso eventos.ver:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!autorizado) {
      return respuestaError(
        "No tienes permiso para consultar eventos.",
        403,
      );
    }

    try {
      const [
        evento,
        alcanceUsuario,
      ] =
        await Promise.all([
          obtenerEventoPanel(
            eventoId,
          ),

          obtenerAlcanceEventosUsuario(
            usuarioId,
          ),
        ]);

      if (
        !puedeConsultarEvento(
          evento,
          alcanceUsuario,
        )
      ) {
        return respuestaError(
          "Acceso denegado. No estás autorizado a consultar este evento.",
          403,
        );
      }

      return crearRespuesta(
        {
          ok: true,

          data: {
            evento,
          },

          error: null,
        },
        200,
      );
    } catch (error) {
      console.error(
        `Error en GET /api/panel/eventos/${eventoId}:`,
        error,
      );

      if (
        error instanceof
        ErrorObtenerEventoPanel ||
        error instanceof
        ErrorComprobarAccesoEventoUsuario
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se ha podido obtener el evento.",
        500,
      );
    }
  };

export const PATCH: APIRoute =
  async ({
    cookies,
    params,
    request,
  }) => {
    const eventoId =
      obtenerEventoId(
        params.id,
      );

    if (!eventoId) {
      return respuestaError(
        "El identificador del evento no es válido.",
        400,
      );
    }

    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return respuestaError(
        "Debes iniciar sesión para actualizar el evento.",
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
        "Error comprobando la sesión para actualizar un evento:",
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

    const usuarioId =
      obtenerUsuarioIdSesion(
        sesion,
      );

    if (!usuarioId) {
      return respuestaError(
        "No se ha podido identificar al usuario.",
        401,
      );
    }

    let puedeEditar =
      false;

    try {
      puedeEditar =
        await comprobarPermisoUsuario(
          sesion.acceso,
          "eventos.editar",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso eventos.editar:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!puedeEditar) {
      return respuestaError(
        "No tienes permiso para editar eventos.",
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

    const validacion =
      validarEventoPanel(
        contenido,
      );

    if (
      !validacion.valido ||
      !validacion.datos
    ) {
      return crearRespuesta(
        {
          ok: false,
          data: null,

          error:
            "Hay campos del evento que deben corregirse.",

          errores:
            validacion.errores,
        },
        400,
      );
    }

    const datos =
      validacion.datos;

    try {
      const [
        eventoActual,
        alcanceUsuario,
      ] =
        await Promise.all([
          obtenerEventoPanel(
            eventoId,
          ),

          obtenerAlcanceEventosUsuario(
            usuarioId,
          ),
        ]);

      /*
       * Para modificar un evento
       * asociado a equipos debe tener
       * acceso a todos sus equipos
       * actuales.
       */
      if (
        !puedeGestionarEvento(
          eventoActual,
          alcanceUsuario,
        )
      ) {
        return respuestaError(
          "Acceso denegado. No estás autorizado a editar este evento.",
          403,
        );
      }

      /*
       * También se comprueba el nuevo
       * alcance solicitado.
       */
      if (
        datos.alcance ===
        "equipos" &&
        !puedeGestionarEquiposEvento(
          datos.equiposIds,
          alcanceUsuario,
        )
      ) {
        return respuestaError(
          "No tienes acceso a uno o varios de los equipos seleccionados.",
          403,
        );
      }

      /*
       * Se exige el permiso de eventos
       * generales si el evento ya era
       * general o se quiere convertir
       * en general.
       */
      if (
        eventoActual.alcance ===
          "todo-club" ||
        datos.alcance ===
          "todo-club"
      ) {
        const puedeGestionarGenerales =
          await comprobarPermisoUsuario(
            sesion.acceso,
            "eventos.generales.gestionar",
          );

        if (
          !puedeGestionarGenerales
        ) {
          return respuestaError(
            "No tienes permiso para gestionar eventos de todo el club.",
            403,
          );
        }
      }

      const evento =
        await actualizarEventoPanel(
          eventoId,
          datos,
          usuarioId,
        );

      return crearRespuesta(
        {
          ok: true,

          data: {
            evento,
          },

          error: null,
        },
        200,
      );
    } catch (error) {
      console.error(
        `Error en PATCH /api/panel/eventos/${eventoId}:`,
        error,
      );

      if (
        error instanceof
        ErrorActualizarEventoPanel
      ) {
        return crearRespuesta(
          {
            ok: false,
            data: null,

            error:
              error.message,

            errores:
              error.errores,
          },
          error.status,
        );
      }

      if (
        error instanceof
          ErrorObtenerEventoPanel ||
        error instanceof
          ErrorComprobarAccesoEventoUsuario
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se ha podido actualizar el evento.",
        500,
      );
    }
  };

export const DELETE: APIRoute =
  async ({
    cookies,
    params,
  }) => {
    const eventoId =
      obtenerEventoId(
        params.id,
      );

    if (!eventoId) {
      return respuestaError(
        "El identificador del evento no es válido.",
        400,
      );
    }

    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return respuestaError(
        "Debes iniciar sesión para eliminar el evento.",
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
        "Error comprobando la sesión para eliminar un evento:",
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

    const usuarioId =
      obtenerUsuarioIdSesion(
        sesion,
      );

    if (!usuarioId) {
      return respuestaError(
        "No se ha podido identificar al usuario.",
        401,
      );
    }

    let puedeEliminar =
      false;

    try {
      puedeEliminar =
        await comprobarPermisoUsuario(
          sesion.acceso,
          "eventos.eliminar",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso eventos.eliminar:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!puedeEliminar) {
      return respuestaError(
        "No tienes permiso para eliminar eventos.",
        403,
      );
    }

    try {
      const [
        evento,
        alcanceUsuario,
      ] =
        await Promise.all([
          obtenerEventoPanel(
            eventoId,
          ),

          obtenerAlcanceEventosUsuario(
            usuarioId,
          ),
        ]);

      if (
        !puedeGestionarEvento(
          evento,
          alcanceUsuario,
        )
      ) {
        return respuestaError(
          "Acceso denegado. No estás autorizado a eliminar este evento.",
          403,
        );
      }

      if (
        evento.alcance ===
        "todo-club"
      ) {
        const puedeGestionarGenerales =
          await comprobarPermisoUsuario(
            sesion.acceso,
            "eventos.generales.gestionar",
          );

        if (
          !puedeGestionarGenerales
        ) {
          return respuestaError(
            "No tienes permiso para eliminar eventos de todo el club.",
            403,
          );
        }
      }

      const idEliminado =
        await eliminarEventoPanel(
          eventoId,
        );

      return crearRespuesta(
        {
          ok: true,

          data: {
            id:
              idEliminado,
          },

          error: null,
        },
        200,
      );
    } catch (error) {
      console.error(
        `Error en DELETE /api/panel/eventos/${eventoId}:`,
        error,
      );

      if (
        error instanceof
          ErrorEliminarEventoPanel ||
        error instanceof
          ErrorObtenerEventoPanel ||
        error instanceof
          ErrorComprobarAccesoEventoUsuario
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se ha podido eliminar el evento.",
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
      },
      {
        status: 405,

        headers: {
          ...cabecerasRespuesta,

          Allow:
            "GET, PATCH, DELETE",
        },
      },
    );
  };