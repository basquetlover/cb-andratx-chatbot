
import type {
  APIRoute,
} from "astro";

import type {
  ErrorCampoCodigos,
  RespuestaApiCodigos,
} from "@tipos/CodigosPanel";

import {
  obtenerUsuarioSesion,
  type UsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import {
  comprobarPermisoUsuario,
} from "@servicios/seguridad/comprobarPermisoUsuario";

import {
  NOMBRE_COOKIE_SESION,
} from "@servicios/seguridad/cookieSesion";

/*
 * C.B. ANDRATX
 * Seguridad del sistema de códigos y boletos.
 *
 * Reutiliza:
 *
 * - Sesiones existentes del panel.
 * - Usuarios actuales.
 * - Niveles de acceso.
 * - Permisos almacenados en Supabase.
 *
 * Todas las operaciones privadas deberán
 * comprobar sus permisos en el servidor.
 */

// ================================================
// PERMISOS DEL MÓDULO
// ================================================

export const PERMISOS_CODIGOS = {
  ver: "codigos.ver",
  crear: "codigos.crear",
  editar: "codigos.editar",
  eliminar: "codigos.eliminar",

  escanear: "codigos.escanear",
  premios: "codigos.premios",
  canjear: "codigos.canjear",
  imprimir: "codigos.imprimir",
} as const;

export type PermisoCodigos =
  (typeof PERMISOS_CODIGOS)[keyof typeof PERMISOS_CODIGOS];

// ================================================
// TIPOS DE AUTORIZACIÓN
// ================================================

export type ContextoApiCodigos =
  Parameters<APIRoute>[0];

export type ResultadoAccesoCodigos =
  | {
      autorizado: true;
      sesion: UsuarioSesion;
      respuesta: null;
    }
  | {
      autorizado: false;
      sesion: null;
      respuesta: Response;
    };

// ================================================
// CABECERAS DE LAS RESPUESTAS
// ================================================

export const CABECERAS_API_CODIGOS = {
  "Cache-Control":
    "private, no-store, max-age=0",

  "Content-Type":
    "application/json; charset=utf-8",

  "X-Content-Type-Options":
    "nosniff",

  "Pragma":
    "no-cache",

  "Vary":
    "Cookie",
} as const;

// ================================================
// RESPUESTA CORRECTA
// ================================================

export function respuestaCorrectaCodigos<T>(
  data: T,
  estado: number = 200,
): Response {
  const contenido:
    RespuestaApiCodigos<T> = {
      ok: true,

      data,

      error: null,
    };

  return Response.json(
    contenido,
    {
      status: estado,
      headers: CABECERAS_API_CODIGOS,
    },
  );
}

// ================================================
// RESPUESTA DE ERROR
// ================================================

export function respuestaErrorCodigos(
  error: string,
  estado: number,
  errores: ErrorCampoCodigos[] = [],
): Response {
  const contenido:
    RespuestaApiCodigos<null> = {
      ok: false,

      data: null,

      error,

      errores,
    };

  return Response.json(
    contenido,
    {
      status: estado,
      headers: CABECERAS_API_CODIGOS,
    },
  );
}

// ================================================
// COMPROBACIÓN DE PERMISOS
// ================================================

/*
 * Comprueba todos los permisos indicados.
 *
 * Si un usuario tiene acceso total,
 * comprobarPermisoUsuario ya lo autoriza
 * mediante el sistema actual del panel.
 *
 * Los permisos no son acumulativos:
 *
 * - Ver no permite editar.
 * - Editar no permite eliminar.
 * - Escanear no permite consultar premios.
 * - Consultar premios no permite canjear.
 *
 * Para operaciones que requieren varias
 * capacidades se deben exigir todas.
 */

export async function comprobarPermisosCodigos(
  sesion: UsuarioSesion,
  permisosRequeridos: readonly PermisoCodigos[],
): Promise<boolean> {
  if (permisosRequeridos.length === 0) {
    return false;
  }

  const permisosUnicos =
    [...new Set(permisosRequeridos)];

  for (const permiso of permisosUnicos) {
    const autorizado =
      await comprobarPermisoUsuario(
        sesion.acceso,
        permiso,
      );

    if (!autorizado) {
      return false;
    }
  }

  return true;
}

// ================================================
// AUTORIZACIÓN DE PETICIONES API
// ================================================

/*
 * Función principal que utilizarán las API
 * privadas del módulo.
 *
 * Comprueba:
 *
 * 1. Existencia de la cookie.
 * 2. Validez de la sesión.
 * 3. Estado y acceso del usuario.
 * 4. Permisos exigidos por la operación.
 *
 * Devuelve la sesión autorizada o una
 * respuesta HTTP que podrá devolver
 * directamente el endpoint.
 *
 * La validación del origen de la petición
 * ya se realiza en src/middleware.ts.
 */

export async function obtenerAccesoCodigos(
  contexto: ContextoApiCodigos,
  permisosRequeridos: readonly PermisoCodigos[],
): Promise<ResultadoAccesoCodigos> {
  // No permitir operaciones sin un permiso definido.

  if (permisosRequeridos.length === 0) {
    console.error(
      "Se ha intentado acceder al módulo de códigos sin definir permisos.",
    );

    return {
      autorizado: false,
      sesion: null,

      respuesta: respuestaErrorCodigos(
        "No se ha configurado correctamente el acceso a esta operación.",
        500,
      ),
    };
  }

  // Obtener el token de sesión.

  const tokenSesion =
    contexto.cookies.get(
      NOMBRE_COOKIE_SESION,
    )?.value;

  if (!tokenSesion) {
    return {
      autorizado: false,
      sesion: null,

      respuesta: respuestaErrorCodigos(
        "Debes iniciar sesión para acceder al sistema de códigos y boletos.",
        401,
      ),
    };
  }

  // Comprobar la sesión existente.

  let sesion: UsuarioSesion | null = null;

  try {
    sesion =
      await obtenerUsuarioSesion(
        tokenSesion,
      );
  } catch (error) {
    console.error(
      "Error comprobando la sesión del módulo de códigos:",
      error,
    );

    return {
      autorizado: false,
      sesion: null,

      respuesta: respuestaErrorCodigos(
        "No se ha podido comprobar la sesión del usuario.",
        500,
      ),
    };
  }

  // Sesión inexistente o caducada.

  if (!sesion) {
    contexto.cookies.delete(
      NOMBRE_COOKIE_SESION,
      {
        path: "/",
      },
    );

    return {
      autorizado: false,
      sesion: null,

      respuesta: respuestaErrorCodigos(
        "La sesión no es válida o ha caducado. Vuelve a iniciar sesión.",
        401,
      ),
    };
  }

  // Comprobar todos los permisos solicitados.

  let autorizado = false;

  try {
    autorizado =
      await comprobarPermisosCodigos(
        sesion,
        permisosRequeridos,
      );
  } catch (error) {
    console.error(
      "Error comprobando permisos del módulo de códigos:",
      error,
    );

    return {
      autorizado: false,
      sesion: null,

      respuesta: respuestaErrorCodigos(
        "No se han podido comprobar los permisos del usuario.",
        500,
      ),
    };
  }

  // Usuario sin los permisos necesarios.

  if (!autorizado) {
    return {
      autorizado: false,
      sesion: null,

      respuesta: respuestaErrorCodigos(
        "No tienes permisos suficientes para realizar esta operación.",
        403,
      ),
    };
  }

  // Acceso autorizado.

  return {
    autorizado: true,
    sesion,
    respuesta: null,
  };
}

// ================================================
// FIN DEL ARCHIVO
// ================================================
