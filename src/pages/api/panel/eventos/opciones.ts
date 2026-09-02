import type {
  APIRoute,
} from "astro";

import {
  obtenerOpcionesEventoPanel,
  ErrorObtenerOpcionesEventoPanel,
} from "@servicios/backend/eventos/obtenerOpcionesEventoPanel";

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
  supabaseServidor,
} from "@servicios/supabase/servidor";

export const prerender = false;

const cabecerasRespuesta = {
  "Cache-Control":
    "no-store, max-age=0",

  "Content-Type":
    "application/json; charset=utf-8",

  "X-Content-Type-Options":
    "nosniff",
};

interface FilaPermisosUsuario {
  acceso_total: boolean | null;
  acceso_todos_equipos:
    boolean | null;
}

interface FilaEquipoUsuario {
  equipo_id: string | null;
  expires_at: string | null;
}

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

function obtenerUsuarioId(
  sesion: unknown,
): string | null {
  if (
    typeof sesion !== "object" ||
    sesion === null
  ) {
    return null;
  }

  const datos =
    sesion as Record<
      string,
      unknown
    >;

  if (
    typeof datos.usuarioId ===
    "string"
  ) {
    return datos.usuarioId;
  }

  if (
    typeof datos.usuario_id ===
    "string"
  ) {
    return datos.usuario_id;
  }

  if (
    typeof datos.id === "string"
  ) {
    return datos.id;
  }

  if (
    typeof datos.usuario ===
      "object" &&
    datos.usuario !== null
  ) {
    const usuario =
      datos.usuario as Record<
        string,
        unknown
      >;

    if (
      typeof usuario.id ===
      "string"
    ) {
      return usuario.id;
    }
  }

  return null;
}

function asignacionVigente(
  asignacion:
    FilaEquipoUsuario,
): boolean {
  if (!asignacion.expires_at) {
    return true;
  }

  const caducidad =
    new Date(
      asignacion.expires_at,
    );

  if (
    Number.isNaN(
      caducidad.getTime(),
    )
  ) {
    return false;
  }

  return (
    caducidad.getTime() >
    Date.now()
  );
}

export const GET: APIRoute =
  async ({ cookies }) => {
    const tokenSesion =
      cookies.get(
        NOMBRE_COOKIE_SESION,
      )?.value;

    if (!tokenSesion) {
      return respuestaError(
        "Debes iniciar sesión para consultar las opciones de los eventos.",
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
        "Error comprobando la sesión para obtener las opciones de eventos:",
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
      obtenerUsuarioId(sesion);

    if (!usuarioId) {
      console.error(
        "La sesión no contiene un identificador de usuario válido.",
      );

      return respuestaError(
        "No se ha podido identificar al usuario de la sesión.",
        500,
      );
    }

    let puedeVer = false;
    let puedeCrear = false;
    let puedeEditar = false;

    try {
      [
        puedeVer,
        puedeCrear,
        puedeEditar,
      ] = await Promise.all([
        comprobarPermisoUsuario(
          sesion.acceso,
          "eventos.ver",
        ),

        comprobarPermisoUsuario(
          sesion.acceso,
          "eventos.crear",
        ),

        comprobarPermisoUsuario(
          sesion.acceso,
          "eventos.editar",
        ),
      ]);
    } catch (error) {
      console.error(
        "Error comprobando los permisos para obtener las opciones de eventos:",
        error,
      );

      return respuestaError(
        "No se han podido comprobar los permisos del usuario.",
        500,
      );
    }

    if (
      !puedeVer &&
      !puedeCrear &&
      !puedeEditar
    ) {
      return respuestaError(
        "No tienes permiso para consultar las opciones de los eventos.",
        403,
      );
    }

    try {
      const [
        opciones,
        resultadoPermisos,
      ] = await Promise.all([
        obtenerOpcionesEventoPanel(),

        supabaseServidor
          .from(
            "usuarios_permisos",
          )
          .select(
            `
              acceso_total,
              acceso_todos_equipos
            `,
          )
          .eq(
            "usuario_id",
            usuarioId,
          )
          .maybeSingle(),
      ]);

      if (
        resultadoPermisos.error
      ) {
        throw new Error(
          `No se han podido obtener los permisos generales del usuario: ${resultadoPermisos.error.message}`,
        );
      }

      const permisos =
        resultadoPermisos.data as
          | FilaPermisosUsuario
          | null;

      const accesoTotal =
        Boolean(
          permisos?.acceso_total,
        );

      const accesoTodosEquipos =
        Boolean(
          permisos
            ?.acceso_todos_equipos,
        );

      if (
        accesoTotal ||
        accesoTodosEquipos
      ) {
        return crearRespuesta(
          {
            ok: true,

            data: {
              temporada:
                opciones.temporada,

              equipos:
                opciones.equipos,

              instalaciones:
                opciones.instalaciones,
            },

            error: null,
          },
          200,
        );
      }

      const {
        data:
          asignacionesEncontradas,
        error:
          errorAsignaciones,
      } = await supabaseServidor
        .from("usuarios_equipos")
        .select(
          `
            equipo_id,
            expires_at
          `,
        )
        .eq(
          "usuario_id",
          usuarioId,
        );

      if (errorAsignaciones) {
        throw new Error(
          `No se han podido obtener los equipos asignados al usuario: ${errorAsignaciones.message}`,
        );
      }

      const asignaciones =
        (
          asignacionesEncontradas ??
          []
        ) as FilaEquipoUsuario[];

      const idsEquiposPermitidos =
        new Set(
          asignaciones
            .filter(
              asignacionVigente,
            )
            .flatMap(
              (asignacion) =>
                asignacion.equipo_id
                  ? [
                      asignacion
                        .equipo_id,
                    ]
                  : [],
            ),
        );

      const equiposPermitidos =
        opciones.equipos.filter(
          (equipo) =>
            idsEquiposPermitidos.has(
              equipo.id,
            ),
        );

      return crearRespuesta(
        {
          ok: true,

          data: {
            temporada:
              opciones.temporada,

            equipos:
              equiposPermitidos,

            instalaciones:
              opciones.instalaciones,
          },

          error: null,
        },
        200,
      );
    } catch (error) {
      console.error(
        "Error en GET /api/panel/eventos/opciones:",
        error,
      );

      if (
        error instanceof
        ErrorObtenerOpcionesEventoPanel
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se han podido obtener las opciones necesarias para editar el evento.",
        500,
      );
    }
  };

export const ALL: APIRoute =
  async () =>
    crearRespuesta(
      {
        ok: false,
        data: null,
        error:
          "Método no permitido.",
      },
      405,
    );