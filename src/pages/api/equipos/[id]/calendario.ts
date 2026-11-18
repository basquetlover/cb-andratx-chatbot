
import type {
  APIRoute,
} from "astro";

import {
  obtenerCalendarioEquipoPublico,
} from "@servicios/backend/equipos/obtenerCalendarioEquipoPublico";

import {
  comprobarAccesoSocio,
} from "@servicios/backend/socios/comprobarAccesoSocio";

export const prerender = false;

// ======================================================
// CABECERAS DE SEGURIDAD
// ======================================================

const cabeceras = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",

  "Pragma":
    "no-cache",

  "Expires":
    "0",

  "Vary":
    "Cookie",

  "Content-Type":
    "application/json; charset=utf-8",

  "X-Content-Type-Options":
    "nosniff",
};

// ======================================================
// RESPUESTAS DE ERROR
// ======================================================

function crearError(
  mensaje: string,
  estado: number,
): Response {
  return Response.json(
    {
      ok: false,
      data: null,
      error: mensaje,
    },
    {
      status: estado,
      headers: cabeceras,
    },
  );
}

// ======================================================
// VALIDACIONES
// ======================================================

function esUuidValido(
  valor: string,
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function esFechaValida(
  anio: number,
  mes: number,
): boolean {
  return (
    Number.isInteger(anio) &&
    anio >= 2020 &&
    anio <= 2100 &&
    Number.isInteger(mes) &&
    mes >= 1 &&
    mes <= 12
  );
}

// ======================================================
// GET /api/equipos/:id/calendario
// ======================================================

export const GET: APIRoute =
  async ({
    params,
    url,
    cookies,
  }) => {
    const equipoId =
      params.id?.trim() ?? "";

    const anio = Number(
      url.searchParams.get("anio"),
    );

    const mes = Number(
      url.searchParams.get("mes"),
    );

    // --------------------------------------------------
    // 1. VALIDAR IDENTIFICADOR
    // --------------------------------------------------

    if (
      !esUuidValido(equipoId)
    ) {
      return crearError(
        "El identificador del equipo no es válido.",
        400,
      );
    }

    // --------------------------------------------------
    // 2. VALIDAR FECHA
    // --------------------------------------------------

    if (
      !esFechaValida(
        anio,
        mes,
      )
    ) {
      return crearError(
        "Debes indicar un año y un mes válidos.",
        400,
      );
    }

    try {
      // ------------------------------------------------
      // 3. COMPROBAR ACCESO DE SOCIO
      // ------------------------------------------------

      const accesoSocio =
        await comprobarAccesoSocio(
          cookies,
        );

      const puedeVerEntrenamientos =
        accesoSocio.autorizado;

      // La comprobación es exclusiva
      // del servidor.
      //
      // No se permite habilitar los
      // entrenamientos mediante
      // parámetros enviados por el usuario.

      // ------------------------------------------------
      // 4. CONSULTAR CALENDARIO
      // ------------------------------------------------

      const resultado =
        await obtenerCalendarioEquipoPublico(
          equipoId,
          anio,
          mes,
          {
            incluirEntrenamientos:
              puedeVerEntrenamientos,
          },
        );

      // El servicio consulta los
      // entrenamientos únicamente
      // cuando incluirEntrenamientos
      // es true.

      // ------------------------------------------------
      // 5. DEVOLVER RESPUESTA
      // ------------------------------------------------

      return Response.json(
        {
          ok: true,

          data: {
            ...resultado,

            puedeVerEntrenamientos,
          },

          error: null,
        },
        {
          status: 200,
          headers: cabeceras,
        },
      );
    } catch (error) {
      console.error(
        `Error en GET /api/equipos/${equipoId}/calendario:`,
        error,
      );

      const mensaje =
        error instanceof Error
          ? error.message
          : "No se ha podido obtener el calendario.";

      const noEncontrado =
        mensaje.includes(
          "no existe",
        );

      return crearError(
        noEncontrado
          ? mensaje
          : "No se ha podido obtener el calendario del equipo.",
        noEncontrado ? 404 : 500,
      );
    }
  };

// ======================================================
// MÉTODOS NO PERMITIDOS
// ======================================================

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
          ...cabeceras,
          Allow: "GET",
        },
      },
    );
  };
