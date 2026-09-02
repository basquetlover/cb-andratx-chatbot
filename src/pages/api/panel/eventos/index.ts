import type {
  APIRoute,
} from "astro";

import {
  ALCANCES_EVENTO,
  ESTADOS_EVENTO,
  TIPOS_EVENTO,
} from "@tipos/EventoPanel";



import type {
  AlcanceEvento,
  EstadoEvento,
  FiltrosListadoEventos,
  ResumenEventoPanel,
  ResumenListadoEventosPanel,
  TipoEvento,
} from "@tipos/EventoPanel";

import {
  crearEventoPanel,
  ErrorCrearEventoPanel,
} from "@servicios/backend/eventos/crearEventoPanel";

import {
  obtenerListadoEventosPanel,
  ErrorObtenerListadoEventosPanel,
} from "@servicios/backend/eventos/obtenerListadoEventosPanel";

import {
  validarEventoPanel,
} from "@servicios/backend/eventos/validarEventoPanel";

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

interface AlcanceEquiposUsuario {
  accesoTodos: boolean;
  equiposIds: Set<string>;
}

interface FilaPermisosUsuario {
  acceso_total: boolean | null;
  acceso_todos_equipos:
    boolean | null;
}

interface FilaEquipoUsuario {
  equipo_id: string;
}

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
  return typeof valor === "string"
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

  const usuarioId =
    obtenerTexto(
      sesion.usuarioId,
    ) ||
    obtenerTexto(
      sesion.usuario_id,
    ) ||
    obtenerTexto(
      sesion.id,
    );

  return usuarioId;
}

function esTipoEvento(
  valor: string,
): valor is TipoEvento {
  return (
    TIPOS_EVENTO as
      readonly string[]
  ).includes(valor);
}

function esAlcanceEvento(
  valor: string,
): valor is AlcanceEvento {
  return (
    ALCANCES_EVENTO as
      readonly string[]
  ).includes(valor);
}

function esEstadoEvento(
  valor: string,
): valor is EstadoEvento {
  return (
    ESTADOS_EVENTO as
      readonly string[]
  ).includes(valor);
}

function crearFiltros(
  url: URL,
): FiltrosListadoEventos {
  const consulta =
    url.searchParams
      .get("consulta")
      ?.trim() ??
    "";

  const estado =
    url.searchParams
      .get("estado")
      ?.trim() ??
    "";

  const tipo =
    url.searchParams
      .get("tipo")
      ?.trim() ??
    "";

  const alcance =
    url.searchParams
      .get("alcance")
      ?.trim() ??
    "";

  const fechaInicio =
    url.searchParams
      .get("fechaInicio")
      ?.trim() ??
    "";

  const fechaFin =
    url.searchParams
      .get("fechaFin")
      ?.trim() ??
    "";

  const filtros:
    FiltrosListadoEventos = {};

  if (consulta) {
    filtros.consulta =
      consulta;
  }

  if (
    estado === "todos" ||
    esEstadoEvento(estado)
  ) {
    filtros.estado =
      estado;
  }

  if (
    tipo === "todos" ||
    esTipoEvento(tipo)
  ) {
    filtros.tipo =
      tipo;
  }

  if (
    alcance === "todos" ||
    esAlcanceEvento(
      alcance,
    )
  ) {
    filtros.alcance =
      alcance;
  }

  if (fechaInicio) {
    filtros.fechaInicio =
      fechaInicio;
  }

  if (fechaFin) {
    filtros.fechaFin =
      fechaFin;
  }

  return filtros;
}

function obtenerFechaMadrid():
  string {
  const partes =
    new Intl.DateTimeFormat(
      "es-ES",
      {
        timeZone:
          "Europe/Madrid",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    ).formatToParts(
      new Date(),
    );

  const obtenerParte = (
    tipo:
      Intl.DateTimeFormatPartTypes,
  ) =>
    partes.find(
      (parte) =>
        parte.type === tipo,
    )?.value ?? "";

  return (
    `${obtenerParte("year")}-` +
    `${obtenerParte("month")}-` +
    obtenerParte("day")
  );
}

function crearResumen(
  eventos:
    ResumenEventoPanel[],
): ResumenListadoEventosPanel {
  const hoy =
    obtenerFechaMadrid();

  return {
    total:
      eventos.length,

    borradores:
      eventos.filter(
        (evento) =>
          evento.estado ===
          "borrador",
      ).length,

    publicados:
      eventos.filter(
        (evento) =>
          evento.estado ===
          "publicado",
      ).length,

    cancelados:
      eventos.filter(
        (evento) =>
          evento.estado ===
          "cancelado",
      ).length,

    archivados:
      eventos.filter(
        (evento) =>
          evento.estado ===
          "archivado",
      ).length,

    proximos:
      eventos.filter(
        (evento) =>
          evento.fechaInicio >
          hoy,
      ).length,

    enCurso:
      eventos.filter(
        (evento) =>
          evento.fechaInicio <=
            hoy &&
          evento.fechaFin >=
            hoy,
      ).length,

    finalizados:
      eventos.filter(
        (evento) =>
          evento.fechaFin <
          hoy,
      ).length,
  };
}

async function obtenerAlcanceEquiposUsuario(
  usuarioId: string,
): Promise<AlcanceEquiposUsuario> {
  const {
    data:
      permisosEncontrados,

    error:
      errorPermisos,
  } =
    await supabaseServidor
      .from(
        "usuarios_permisos",
      )
      .select(`
        acceso_total,
        acceso_todos_equipos
      `)
      .eq(
        "usuario_id",
        usuarioId,
      )
      .maybeSingle();

  if (errorPermisos) {
    throw new Error(
      `No se han podido comprobar los permisos de equipos: ${errorPermisos.message}`,
    );
  }

  const permisos =
    permisosEncontrados as
      | FilaPermisosUsuario
      | null;

  if (
    permisos?.acceso_total ===
      true ||
    permisos
      ?.acceso_todos_equipos ===
      true
  ) {
    return {
      accesoTodos: true,
      equiposIds:
        new Set(),
    };
  }

  const ahora =
    new Date().toISOString();

  const {
    data:
      equiposEncontrados,

    error:
      errorEquipos,
  } =
    await supabaseServidor
      .from(
        "usuarios_equipos",
      )
      .select(
        "equipo_id",
      )
      .eq(
        "usuario_id",
        usuarioId,
      )
      .or(
        `expires_at.is.null,expires_at.gt.${ahora}`,
      );

  if (errorEquipos) {
    throw new Error(
      `No se han podido obtener los equipos autorizados: ${errorEquipos.message}`,
    );
  }

  const equipos =
    (
      equiposEncontrados ??
      []
    ) as FilaEquipoUsuario[];

  return {
    accesoTodos:
      false,

    equiposIds:
      new Set(
        equipos.map(
          (equipo) =>
            equipo.equipo_id,
        ),
      ),
  };
}

function filtrarEventosPorAcceso(
  eventos:
    ResumenEventoPanel[],

  alcanceUsuario:
    AlcanceEquiposUsuario,
): ResumenEventoPanel[] {
  if (
    alcanceUsuario.accesoTodos
  ) {
    return eventos;
  }

  return eventos.filter(
    (evento) => {
      /*
       * Los eventos generales pueden
       * ser consultados por cualquier
       * usuario que tenga eventos.ver.
       */
      if (
        evento.alcance ===
        "todo-club"
      ) {
        return true;
      }

      return evento.equipos.some(
        (equipo) =>
          alcanceUsuario
            .equiposIds
            .has(
              equipo.id,
            ),
      );
    },
  );
}

function puedeGestionarEquipos(
  equiposIds: string[],
  alcanceUsuario:
    AlcanceEquiposUsuario,
): boolean {
  if (
    alcanceUsuario.accesoTodos
  ) {
    return true;
  }

  return equiposIds.every(
    (equipoId) =>
      alcanceUsuario
        .equiposIds
        .has(
          equipoId,
        ),
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
        "Debes iniciar sesión para consultar los eventos.",
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
        "Error comprobando la sesión para listar eventos:",
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
        "No tienes permiso para consultar los eventos.",
        403,
      );
    }

    try {
      const [
        resultado,
        alcanceUsuario,
      ] =
        await Promise.all([
          obtenerListadoEventosPanel(
            crearFiltros(url),
          ),

          obtenerAlcanceEquiposUsuario(
            usuarioId,
          ),
        ]);

      const eventosPermitidos =
        filtrarEventosPorAcceso(
          resultado.eventos,
          alcanceUsuario,
        );

      return crearRespuesta(
        {
          ok: true,

          data: {
            ...resultado,

            resumen:
              crearResumen(
                eventosPermitidos,
              ),

            eventos:
              eventosPermitidos,
          },

          error: null,
        },
        200,
      );
    } catch (error) {
      console.error(
        "Error en GET /api/panel/eventos:",
        error,
      );

      if (
        error instanceof
        ErrorObtenerListadoEventosPanel
      ) {
        return respuestaError(
          error.message,
          error.status,
        );
      }

      return respuestaError(
        "No se ha podido obtener el listado de eventos.",
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
      return respuestaError(
        "Debes iniciar sesión para crear eventos.",
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
        "Error comprobando la sesión para crear un evento:",
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

    let puedeCrear =
      false;

    try {
      puedeCrear =
        await comprobarPermisoUsuario(
          sesion.acceso,
          "eventos.crear",
        );
    } catch (error) {
      console.error(
        "Error comprobando el permiso eventos.crear:",
        error,
      );

      return respuestaError(
        "No se ha podido comprobar el permiso del usuario.",
        500,
      );
    }

    if (!puedeCrear) {
      return respuestaError(
        "No tienes permiso para crear eventos.",
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
      if (
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
            "No tienes permiso para crear eventos dirigidos a todo el club.",
            403,
          );
        }
      } else {
        const alcanceUsuario =
          await obtenerAlcanceEquiposUsuario(
            usuarioId,
          );

        if (
          !puedeGestionarEquipos(
            datos.equiposIds,
            alcanceUsuario,
          )
        ) {
          return respuestaError(
            "No tienes acceso a uno o varios de los equipos seleccionados.",
            403,
          );
        }
      }

      const evento =
        await crearEventoPanel(
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
        201,
      );
    } catch (error) {
      console.error(
        "Error en POST /api/panel/eventos:",
        error,
      );

      if (
        error instanceof
        ErrorCrearEventoPanel
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

      return respuestaError(
        "No se ha podido crear el evento.",
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
            "GET, POST",
        },
      },
    );
  };