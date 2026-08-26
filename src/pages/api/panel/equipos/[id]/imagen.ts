import type { APIRoute } from "astro";

import {
  ErrorImagenEquipo,
  actualizarImagenEquipo,
} from "@servicios/backend/equipos/imagenes/actualizarImagenEquipo";

import { eliminarImagenEquipo } from "@servicios/backend/equipos/imagenes/eliminarImagenEquipo";

export const prerender = false;

function crearRespuesta(
  contenido: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(contenido), {
    status,
    headers: {
      "Content-Type":
        "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function responderErrorImagen(
  error: ErrorImagenEquipo,
): Response {
  return crearRespuesta(
    {
      ok: false,
      error: error.message,
      errores: [
        {
          campo: error.campo,
          mensaje: error.message,
        },
      ],
    },
    error.status,
  );
}

export const POST: APIRoute = async ({
  request,
  params,
}) => {
  try {
    const equipoId = params.id?.trim();

    if (!equipoId) {
      return crearRespuesta(
        {
          ok: false,
          error:
            "No se ha indicado el equipo que se quiere actualizar.",
          errores: [
            {
              campo: "equipoId",
              mensaje:
                "El identificador del equipo es obligatorio.",
            },
          ],
        },
        400,
      );
    }

    const tipoContenido =
      request.headers.get("content-type") ?? "";

    if (
      !tipoContenido
        .toLowerCase()
        .includes("multipart/form-data")
    ) {
      return crearRespuesta(
        {
          ok: false,
          error:
            "La solicitud debe enviarse como formulario.",
        },
        415,
      );
    }

    let formulario: FormData;

    try {
      formulario = await request.formData();
    } catch {
      return crearRespuesta(
        {
          ok: false,
          error:
            "No se ha podido leer el archivo enviado.",
        },
        400,
      );
    }

    const imagen = formulario.get("imagen");

    if (!(imagen instanceof File)) {
      return crearRespuesta(
        {
          ok: false,
          error: "Debes seleccionar una imagen.",
          errores: [
            {
              campo: "imagen",
              mensaje:
                "Debes seleccionar una imagen.",
            },
          ],
        },
        400,
      );
    }

    if (imagen.size === 0) {
      return crearRespuesta(
        {
          ok: false,
          error:
            "El archivo seleccionado está vacío.",
          errores: [
            {
              campo: "imagen",
              mensaje:
                "El archivo seleccionado está vacío.",
            },
          ],
        },
        400,
      );
    }

    const imagenActualizada =
      await actualizarImagenEquipo(
        equipoId,
        imagen,
      );

    return crearRespuesta(
      {
        ok: true,
        data: {
          imagen: imagenActualizada,
        },
      },
      200,
    );
  } catch (error) {
    if (error instanceof ErrorImagenEquipo) {
      return responderErrorImagen(error);
    }

    console.error(
      "Error actualizando la imagen del equipo:",
      error,
    );

    return crearRespuesta(
      {
        ok: false,
        error:
          "Se ha producido un error al actualizar la imagen del equipo.",
      },
      500,
    );
  }
};

export const DELETE: APIRoute = async ({
  params,
}) => {
  try {
    const equipoId = params.id?.trim();

    if (!equipoId) {
      return crearRespuesta(
        {
          ok: false,
          error:
            "No se ha indicado el equipo cuya imagen se quiere eliminar.",
          errores: [
            {
              campo: "equipoId",
              mensaje:
                "El identificador del equipo es obligatorio.",
            },
          ],
        },
        400,
      );
    }

    const resultado =
      await eliminarImagenEquipo(equipoId);

    return crearRespuesta(
      {
        ok: true,
        data: {
          imagen: null,
          eliminada: resultado.eliminada,
        },
      },
      200,
    );
  } catch (error) {
    if (error instanceof ErrorImagenEquipo) {
      return responderErrorImagen(error);
    }

    console.error(
      "Error eliminando la imagen del equipo:",
      error,
    );

    return crearRespuesta(
      {
        ok: false,
        error:
          "Se ha producido un error al eliminar la imagen del equipo.",
      },
      500,
    );
  }
};