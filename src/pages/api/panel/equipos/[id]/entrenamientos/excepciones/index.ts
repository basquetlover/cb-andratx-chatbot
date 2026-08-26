import type {
  APIContext,
  APIRoute,
} from "astro";

import {
  crearExcepcionEntrenamiento,
  ErrorCrearExcepcionEntrenamiento,
} from "@servicios/backend/entrenamientos/excepciones/crearExcepcionEntrenamiento";

import { obtenerExcepcionesEntrenamientosEquipo } from "@servicios/backend/entrenamientos/excepciones/obtenerExcepcionesEntrenamientosEquipo";

import {
  obtenerAccesoEquiposUsuario,
  usuarioPuedeAccederEquipo,
} from "@servicios/backend/permisos/obtenerAccesoEquiposUsuario";

import { obtenerUsuarioSesion } from "@servicios/backend/sesiones/obtenerUsuarioSesion";
import { comprobarPermisoUsuario } from "@servicios/seguridad/comprobarPermisoUsuario";
import { NOMBRE_COOKIE_SESION } from "@servicios/seguridad/cookieSesion";

import type {
  DatosExcepcionEntrenamiento,
  TipoExcepcionEntrenamiento,
} from "@tipos/ExcepcionesEntrenamientosPanel";

export const prerender = false;

const cabecerasRespuesta = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type":
    "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

interface AutorizacionCorrecta {
  ok: true;
  usuarioId: string;
}

interface AutorizacionIncorrecta {
  ok: false;
  respuesta: Response;
}

type ResultadoAutorizacion =
  | AutorizacionCorrecta
  | AutorizacionIncorrecta;

function crearRespuesta(
  contenido: unknown,
  estado: number,
  cabecerasAdicionales: Record<
    string,
    string
  > = {},
) {
  return Response.json(contenido, {
    status: estado,
    headers: {
      ...cabecerasRespuesta,
      ...cabecerasAdicionales,
    },
  });
}

function respuestaError(
  error: string,
  estado: number,
  errores: Array<{
    campo: string;
    mensaje: string;
  }> = [],
) {
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

function textoOpcional(
  valor: unknown,
): string | null {
  return typeof valor === "string"
    ? valor
    : null;
}

async function comprobarAutorizacion(
  contexto: APIContext,
  equipoId: string,
): Promise<ResultadoAutorizacion> {
  const tokenSesion =
    contexto.cookies.get(
      NOMBRE_COOKIE_SESION,
    )?.value;

  if (!tokenSesion) {
    return {
      ok: false,
      respuesta: respuestaError(
        "Debes iniciar sesión.",
        401,
      ),
    };
  }

  let sesion;

  try {
    sesion =
      await obtenerUsuarioSesion(
        tokenSesion,
      );
  } catch (error) {
    console.error(
      "Error comprobando la sesión para gestionar excepciones:",
      error,
    );

    return {
      ok: false,
      respuesta: respuestaError(
        "No se ha podido comprobar la sesión.",
        500,
      ),
    };
  }

  if (!sesion) {
    contexto.cookies.delete(
      NOMBRE_COOKIE_SESION,
      {
        path: "/",
      },
    );

    return {
      ok: false,
      respuesta: respuestaError(
        "La sesión no es válida o ha caducado.",
        401,
      ),
    };
  }

  try {
    const [
      puedeEditar,
      alcanceEquipos,
    ] = await Promise.all([
      comprobarPermisoUsuario(
        sesion.acceso,
        "equipos.editar",
      ),
      obtenerAccesoEquiposUsuario(
        sesion.usuario.id,
      ),
    ]);

    const puedeAcceder =
      usuarioPuedeAccederEquipo(
        alcanceEquipos,
        equipoId,
      );

    if (!puedeEditar || !puedeAcceder) {
      return {
        ok: false,
        respuesta: respuestaError(
          "Acceso denegado. No estás autorizado a editar este equipo.",
          403,
        ),
      };
    }

    return {
      ok: true,
      usuarioId: sesion.usuario.id,
    };
  } catch (error) {
    console.error(
      "Error comprobando los permisos para gestionar excepciones:",
      error,
    );

    return {
      ok: false,
      respuesta: respuestaError(
        "No se han podido comprobar los permisos del usuario.",
        500,
      ),
    };
  }
}

export const GET: APIRoute = async (
  contexto,
) => {
  const equipoId =
    contexto.params.id?.trim() ?? "";

  const temporadaId =
    contexto.url.searchParams
      .get("temporadaId")
      ?.trim() ?? "";

  if (!equipoId) {
    return respuestaError(
      "No se ha proporcionado el equipo.",
      400,
    );
  }

  if (!temporadaId) {
    return respuestaError(
      "No se ha proporcionado la temporada.",
      400,
      [
        {
          campo: "temporadaId",
          mensaje:
            "Debes indicar la temporada.",
        },
      ],
    );
  }

  const autorizacion =
    await comprobarAutorizacion(
      contexto,
      equipoId,
    );

  if (!autorizacion.ok) {
    return autorizacion.respuesta;
  }

  try {
    const resultado =
      await obtenerExcepcionesEntrenamientosEquipo(
        equipoId,
        temporadaId,
      );

    return crearRespuesta(
      {
        ok: true,
        data: resultado,
        error: null,
        errores: [],
      },
      200,
    );
  } catch (error) {
    console.error(
      `Error obteniendo las excepciones del equipo ${equipoId}:`,
      error,
    );

    return respuestaError(
      "No se han podido obtener las excepciones.",
      500,
    );
  }
};

export const POST: APIRoute = async (
  contexto,
) => {
  const equipoId =
    contexto.params.id?.trim() ?? "";

  if (!equipoId) {
    return respuestaError(
      "No se ha proporcionado el equipo.",
      400,
    );
  }

  const autorizacion =
    await comprobarAutorizacion(
      contexto,
      equipoId,
    );

  if (!autorizacion.ok) {
    return autorizacion.respuesta;
  }

  let contenido: unknown;

  try {
    contenido =
      await contexto.request.json();
  } catch {
    return respuestaError(
      "El cuerpo de la petición no contiene un JSON válido.",
      400,
    );
  }

  if (
    typeof contenido !== "object" ||
    contenido === null
  ) {
    return respuestaError(
      "Los datos de la petición no son válidos.",
      400,
    );
  }

  const cuerpo =
    contenido as Record<string, unknown>;

  const temporadaId =
    textoOpcional(
      cuerpo.temporadaId,
    )?.trim() ?? "";

  if (!temporadaId) {
    return respuestaError(
      "No se ha proporcionado la temporada.",
      400,
      [
        {
          campo: "temporadaId",
          mensaje:
            "Debes indicar la temporada.",
        },
      ],
    );
  }

  if (
    typeof cuerpo.datos !== "object" ||
    cuerpo.datos === null
  ) {
    return respuestaError(
      "No se han proporcionado los datos de la excepción.",
      400,
    );
  }

  const datosRecibidos =
    cuerpo.datos as Record<
      string,
      unknown
    >;

  const datos: DatosExcepcionEntrenamiento =
    {
      tipo:
        textoOpcional(
          datosRecibidos.tipo,
        ) as TipoExcepcionEntrenamiento,
      fecha:
        textoOpcional(
          datosRecibidos.fecha,
        ) ?? "",
      entrenamientoId:
        textoOpcional(
          datosRecibidos.entrenamientoId,
        ),
      instalacionId:
        textoOpcional(
          datosRecibidos.instalacionId,
        ),
      horaInicio:
        textoOpcional(
          datosRecibidos.horaInicio,
        ),
      horaFin:
        textoOpcional(
          datosRecibidos.horaFin,
        ),
      motivo:
        textoOpcional(
          datosRecibidos.motivo,
        ),
    };

  try {
    await crearExcepcionEntrenamiento(
      equipoId,
      temporadaId,
      datos,
    );

    const resultadoActualizado =
      await obtenerExcepcionesEntrenamientosEquipo(
        equipoId,
        temporadaId,
      );

    return crearRespuesta(
      {
        ok: true,
        data: resultadoActualizado,
        error: null,
        errores: [],
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof
      ErrorCrearExcepcionEntrenamiento
    ) {
      return respuestaError(
        error.message,
        error.status,
        error.campo
          ? [
              {
                campo: error.campo,
                mensaje: error.message,
              },
            ]
          : [],
      );
    }

    console.error(
      `Error creando una excepción para el equipo ${equipoId}:`,
      error,
    );

    return respuestaError(
      "No se ha podido crear la excepción.",
      500,
    );
  }
};

export const ALL: APIRoute = async () => {
  return crearRespuesta(
    {
      ok: false,
      data: null,
      error: "Método no permitido.",
      errores: [],
    },
    405,
    {
      Allow: "GET, POST",
    },
  );
};