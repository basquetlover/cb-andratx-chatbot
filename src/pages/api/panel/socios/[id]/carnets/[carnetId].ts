
import type { APIRoute } from "astro";

import {
  actualizarCarnetSocioPanel,
  ErrorActualizarCarnetSocioPanel,
} from "@servicios/backend/socios/actualizarCarnetSocioPanel";

import {
  eliminarCarnetSocioPanel,
  ErrorEliminarCarnetSocioPanel,
} from "@servicios/backend/socios/eliminarCarnetSocioPanel";

import {
  obtenerSocioPanel,
} from "@servicios/backend/socios/obtenerSocioPanel";

import {
  obtenerUsuarioSesion,
} from "@servicios/backend/sesiones/obtenerUsuarioSesion";

import {
  comprobarPermisoUsuario,
} from "@servicios/seguridad/comprobarPermisoUsuario";

import {
  NOMBRE_COOKIE_SESION,
} from "@servicios/seguridad/cookieSesion";

import type {
  ActualizarCarnetTemporadaSocio,
  ErrorCampoSocio,
  EstadoCarnetSocio,
  RespuestaSocioPanel,
} from "@tipos/SocioPanel";

export const prerender = false;

const cabecerasRespuesta = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function crearRespuesta(
  contenido: RespuestaSocioPanel,
  estado: number,
): Response {
  return Response.json(contenido, {
    status: estado,
    headers: cabecerasRespuesta,
  });
}

function crearRespuestaError(
  error: string,
  estado: number,
  errores: ErrorCampoSocio[] = [],
): Response {
  return crearRespuesta(
    {
      ok: false,
      data: null,
      error,
      errores,
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
): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  return valor.trim() || null;
}

function obtenerIdentificador(
  valor: string | undefined,
): string | null {
  return convertirTexto(valor);
}

function esEstadoCarnet(
  valor: unknown,
): valor is EstadoCarnetSocio {
  return (
    valor === "pendiente" ||
    valor === "activo" ||
    valor === "bloqueado" ||
    valor === "caducado"
  );
}

function obtenerUsuarioIdSesion(
  sesion: unknown,
): string | null {
  if (!esObjeto(sesion)) {
    return null;
  }

  const usuario = esObjeto(sesion.usuario)
    ? sesion.usuario
    : null;

  return (
    convertirTexto(usuario?.id) ??
    convertirTexto(sesion.usuarioId) ??
    convertirTexto(sesion.usuario_id) ??
    convertirTexto(sesion.id)
  );
}

function obtenerErroresCampo(
  error: unknown,
): ErrorCampoSocio[] {
  if (
    !esObjeto(error) ||
    !Array.isArray(error.errores)
  ) {
    return [];
  }

  return error.errores.flatMap((elemento) => {
    if (!esObjeto(elemento)) {
      return [];
    }

    const campo = convertirTexto(elemento.campo);
    const mensaje = convertirTexto(elemento.mensaje);

    if (!campo || !mensaje) {
      return [];
    }

    return [{ campo, mensaje }];
  });
}

async function obtenerDatosActualizacion(
  request: Request,
): Promise<ActualizarCarnetTemporadaSocio | null> {
  const tipoContenido =
    request.headers.get("content-type") ?? "";

  if (
    !tipoContenido
      .toLowerCase()
      .includes("application/json")
  ) {
    return null;
  }

  let contenido: unknown;

  try {
    contenido = await request.json();
  } catch {
    return null;
  }

  if (!esObjeto(contenido)) {
    return null;
  }

  const tipoSocio = convertirTexto(
    contenido.tipoSocio ?? contenido.tipo_socio,
  );

  const estado = contenido.estado;

  const fechaAlta = convertirTexto(
    contenido.fechaAlta ?? contenido.fecha_alta,
  );

  const fechaCaducidad = convertirTexto(
    contenido.fechaCaducidad ?? contenido.fecha_caducidad,
  );

  const motivoBloqueo = convertirTexto(
    contenido.motivoBloqueo ?? contenido.motivo_bloqueo,
  );

  if (
    !tipoSocio ||
    !esEstadoCarnet(estado) ||
    !fechaAlta ||
    !fechaCaducidad
  ) {
    return null;
  }

  return {
    tipoSocio,
    estado,
    fechaAlta,
    fechaCaducidad,
    motivoBloqueo:
      estado === "bloqueado"
        ? motivoBloqueo
        : null,
  };
}

/*
 * Protección de la operación destructiva
 * frente a solicitudes desde otros orígenes.
 */
function origenPermitido(request: Request): boolean {
  const origen = request.headers.get("origin");
  const tipoSitio = request.headers.get(
    "sec-fetch-site",
  );

  if (
    tipoSitio &&
    tipoSitio !== "same-origin" &&
    tipoSitio !== "none"
  ) {
    return false;
  }

  if (!origen) {
    return true;
  }

  try {
    return (
      new URL(origen).origin ===
      new URL(request.url).origin
    );
  } catch {
    return false;
  }
}

/*
 * PATCH: actualizar un carnet existente.
 */
export const PATCH: APIRoute = async ({
  cookies,
  params,
  request,
}) => {
  const tokenSesion = cookies.get(
    NOMBRE_COOKIE_SESION,
  )?.value;

  if (!tokenSesion) {
    return crearRespuestaError(
      "Debes iniciar sesión para modificar el carnet.",
      401,
    );
  }

  let sesion;

  try {
    sesion = await obtenerUsuarioSesion(tokenSesion);
  } catch (error) {
    console.error(
      "Error comprobando la sesión para modificar un carnet:",
      error,
    );

    return crearRespuestaError(
      "No se ha podido comprobar la sesión.",
      500,
    );
  }

  if (!sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return crearRespuestaError(
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
      "Error comprobando el permiso para modificar un carnet:",
      error,
    );

    return crearRespuestaError(
      "No se ha podido comprobar el permiso del usuario.",
      500,
    );
  }

  if (!autorizado) {
    return crearRespuestaError(
      "No tienes permiso para modificar carnets de socios.",
      403,
    );
  }

  const socioId = obtenerIdentificador(params.id);
  const carnetId = obtenerIdentificador(
    params.carnetId,
  );

  if (!socioId || !carnetId) {
    return crearRespuestaError(
      "El identificador del socio o del carnet no es válido.",
      400,
    );
  }

  const usuarioId = obtenerUsuarioIdSesion(sesion);

  if (!usuarioId) {
    return crearRespuestaError(
      "No se ha podido identificar al administrador.",
      500,
    );
  }

  const datos = await obtenerDatosActualizacion(
    request,
  );

  if (!datos) {
    return crearRespuestaError(
      "Los datos enviados no son válidos. Debes indicar tipo, estado, fecha de alta y fecha de caducidad.",
      400,
    );
  }

  try {
    const socio = await actualizarCarnetSocioPanel(
      socioId,
      carnetId,
      datos,
      usuarioId,
    );

    return crearRespuesta(
      {
        ok: true,
        data: { socio },
        error: null,
        errores: [],
      },
      200,
    );
  } catch (error) {
    console.error(
      "Error actualizando el carnet:",
      error,
    );

    if (
      error instanceof ErrorActualizarCarnetSocioPanel
    ) {
      return crearRespuestaError(
        error.message,
        error.status,
        obtenerErroresCampo(error),
      );
    }

    return crearRespuestaError(
      "No se ha podido modificar el carnet del socio.",
      500,
    );
  }
};

/*
 * DELETE: eliminar exclusivamente el carnet
 * de la temporada seleccionada.
 *
 * El socio permanece en la base de datos.
 */
export const DELETE: APIRoute = async ({
  cookies,
  params,
  request,
}) => {
  if (!origenPermitido(request)) {
    return crearRespuestaError(
      "El origen de la solicitud no está permitido.",
      403,
    );
  }

  const tokenSesion = cookies.get(
    NOMBRE_COOKIE_SESION,
  )?.value;

  if (!tokenSesion) {
    return crearRespuestaError(
      "Debes iniciar sesión para eliminar el carnet.",
      401,
    );
  }

  let sesion;

  try {
    sesion = await obtenerUsuarioSesion(tokenSesion);
  } catch (error) {
    console.error(
      "Error comprobando la sesión para eliminar un carnet:",
      error,
    );

    return crearRespuestaError(
      "No se ha podido comprobar la sesión.",
      500,
    );
  }

  if (!sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return crearRespuestaError(
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
      "Error comprobando permisos para eliminar el carnet:",
      error,
    );

    return crearRespuestaError(
      "No se ha podido comprobar el permiso del usuario.",
      500,
    );
  }

  if (!autorizado) {
    return crearRespuestaError(
      "No tienes permiso para eliminar carnets de socios.",
      403,
    );
  }

  const socioId = obtenerIdentificador(params.id);
  const carnetId = obtenerIdentificador(
    params.carnetId,
  );

  if (!socioId || !carnetId) {
    return crearRespuestaError(
      "El identificador del socio o del carnet no es válido.",
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
    return crearRespuestaError(
      "Debes enviar la confirmación en formato JSON.",
      415,
    );
  }

  let contenido: unknown;

  try {
    contenido = await request.json();
  } catch {
    return crearRespuestaError(
      "La confirmación enviada no es válida.",
      400,
    );
  }

  if (
    !esObjeto(contenido) ||
    contenido.confirmar !== true
  ) {
    return crearRespuestaError(
      "Debes confirmar expresamente la eliminación del carnet.",
      400,
    );
  }

  try {
    await eliminarCarnetSocioPanel(
      socioId,
      carnetId,
    );
  } catch (error) {
    console.error(
      "Error eliminando el carnet:",
      error,
    );

    if (
      error instanceof ErrorEliminarCarnetSocioPanel
    ) {
      return crearRespuestaError(
        error.message,
        error.status,
      );
    }

    return crearRespuestaError(
      "No se ha podido eliminar el carnet.",
      500,
    );
  }

  /*
   * La eliminación ya se ha completado.
   * Recuperamos la ficha del socio actualizada.
   */
  try {
    const socio = await obtenerSocioPanel(socioId);

    return crearRespuesta(
      {
        ok: true,
        data: { socio },
        error: null,
        errores: [],
      },
      200,
    );
  } catch (error) {
    console.error(
      "Carnet eliminado, pero no se ha podido recuperar la ficha actualizada:",
      error,
    );

    return crearRespuestaError(
      "El carnet se ha eliminado, pero no se ha podido actualizar la ficha. Recarga la página.",
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
      errores: [],
    } satisfies RespuestaSocioPanel,
    {
      status: 405,
      headers: {
        ...cabecerasRespuesta,
        Allow: "PATCH, DELETE",
      },
    },
  );
};
