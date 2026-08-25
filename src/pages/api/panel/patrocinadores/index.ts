import type { APIRoute } from "astro";

import { crearPatrocinador, ErrorCrearPatrocinador } from "@servicios/backend/patrocinadores/crearPatrocinador";
import { eliminarImagenPatrocinador, ErrorImagenPatrocinador, procesarImagenPatrocinador } from "@servicios/backend/patrocinadores/imagenes/procesarImagenPatrocinador";
import { obtenerPatrocinadoresPanel } from "@servicios/backend/patrocinadores/obtenerPatrocinadoresPanel";
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

interface ErrorConEstado {
  status?: number;
  message?: string;
  campo?: string;
}

function respuestaError(error: string, estado: number, campo?: string) {
  return Response.json(
    {
      ok: false,
      data: null,
      error,
      errores: campo
        ? [
            {
              campo,
              mensaje: error,
            },
          ]
        : [],
    },
    {
      status: estado,
      headers: cabecerasRespuesta,
    },
  );
}

async function obtenerSesionPeticion(cookies: Parameters<APIRoute>[0]["cookies"]) {
  const tokenSesion = cookies.get(NOMBRE_COOKIE_SESION)?.value;

  if (!tokenSesion) {
    return null;
  }

  return obtenerUsuarioSesion(tokenSesion);
}

function obtenerArchivo(formulario: FormData, nombre: string): File | null {
  const valor = formulario.get(nombre);

  if (!(valor instanceof File)) {
    return null;
  }

  if (valor.size <= 0 || !valor.name.trim()) {
    return null;
  }

  return valor;
}

async function limpiarImagenes(rutas: string[]): Promise<void> {
  for (const ruta of rutas) {
    try {
      await eliminarImagenPatrocinador(ruta);
    } catch (error) {
      console.error(`No se ha podido retirar la imagen ${ruta}:`, error);
    }
  }
}

export const GET: APIRoute = async ({ cookies }) => {
  let sesion;

  try {
    sesion = await obtenerSesionPeticion(cookies);
  } catch (error) {
    console.error("Error comprobando la sesión para obtener patrocinadores:", error);

    return respuestaError("No se ha podido comprobar la sesión.", 500);
  }

  if (!sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return respuestaError("Debes iniciar sesión.", 401);
  }

  let autorizado = false;

  try {
    autorizado = await comprobarPermisoUsuario(sesion.acceso, "sponsors.ver");
  } catch (error) {
    console.error("Error comprobando el permiso sponsors.ver:", error);

    return respuestaError("No se ha podido comprobar el permiso del usuario.", 500);
  }

  if (!autorizado) {
    return respuestaError("No tienes permiso para consultar los patrocinadores.", 403);
  }

  try {
    const resultado = await obtenerPatrocinadoresPanel();

    return Response.json(
      {
        ok: true,
        data: resultado,
        error: null,
      },
      {
        status: 200,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    console.error("Error en GET /api/panel/patrocinadores:", error);

    return respuestaError("No se han podido obtener los patrocinadores.", 500);
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const tipoContenido = request.headers.get("content-type")?.toLowerCase() ?? "";
  const longitudContenido = Number(request.headers.get("content-length") ?? 0);

  if (!tipoContenido.includes("multipart/form-data")) {
    return respuestaError("El formulario debe enviarse como multipart/form-data.", 415);
  }

  if (Number.isFinite(longitudContenido) && longitudContenido > TAMAÑO_MAXIMO_SOLICITUD) {
    return respuestaError("La solicitud no puede superar los 20 MB.", 413);
  }

  let sesion;

  try {
    sesion = await obtenerSesionPeticion(cookies);
  } catch (error) {
    console.error("Error comprobando la sesión para crear un patrocinador:", error);

    return respuestaError("No se ha podido comprobar la sesión.", 500);
  }

  if (!sesion) {
    cookies.delete(NOMBRE_COOKIE_SESION, {
      path: "/",
    });

    return respuestaError("Debes iniciar sesión.", 401);
  }

  let autorizado = false;

  try {
    autorizado = await comprobarPermisoUsuario(sesion.acceso, "sponsors.crear");
  } catch (error) {
    console.error("Error comprobando el permiso sponsors.crear:", error);

    return respuestaError("No se ha podido comprobar el permiso del usuario.", 500);
  }

  if (!autorizado) {
    return respuestaError("No tienes permiso para crear patrocinadores.", 403);
  }

  let formulario: FormData;

  try {
    formulario = await request.formData();
  } catch {
    return respuestaError("No se ha podido leer el formulario.", 400);
  }

  const datosFormulario = formulario.get("datos");

  if (typeof datosFormulario !== "string") {
    return respuestaError("Faltan los datos del patrocinador.", 400);
  }

  let datos: unknown;

  try {
    datos = JSON.parse(datosFormulario);
  } catch {
    return respuestaError("Los datos del patrocinador no contienen un JSON válido.", 400);
  }

  if (typeof datos !== "object" || datos === null || Array.isArray(datos)) {
    return respuestaError("Los datos del patrocinador no son válidos.", 400);
  }

  const archivoLogo = obtenerArchivo(formulario, "logo");
  const archivoBanner = obtenerArchivo(formulario, "banner");
  const patrocinadorId = crypto.randomUUID();
  const rutasSubidas: string[] = [];

  try {
    let logo: string | null = null;
    let banner: string | null = null;

    if (archivoLogo) {
      const imagenLogo = await procesarImagenPatrocinador(archivoLogo, patrocinadorId, "logo");

      logo = imagenLogo.url;
      rutasSubidas.push(imagenLogo.ruta);
    }

    if (archivoBanner) {
      const imagenBanner = await procesarImagenPatrocinador(archivoBanner, patrocinadorId, "banner");

      banner = imagenBanner.url;
      rutasSubidas.push(imagenBanner.ruta);
    }

    const contenido = {
      ...(datos as Record<string, unknown>),
      logo,
      banner,
    };

    const resultado = await crearPatrocinador(contenido, sesion.usuario.id, patrocinadorId);

    return Response.json(
      {
        ok: true,
        data: resultado,
        error: null,
        errores: [],
      },
      {
        status: 201,
        headers: cabecerasRespuesta,
      },
    );
  } catch (error) {
    await limpiarImagenes(rutasSubidas);

    if (error instanceof ErrorCrearPatrocinador || error instanceof ErrorImagenPatrocinador) {
      if (error.status >= 500) {
        console.error("Error interno creando el patrocinador:", error);
      }

      return respuestaError(error.message, error.status, error.campo);
    }

    const errorConEstado = error as ErrorConEstado;

    console.error("Error en POST /api/panel/patrocinadores:", error);

    return respuestaError(errorConEstado.message || "No se ha podido crear el patrocinador.", 500);
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
        Allow: "GET, POST",
      },
    },
  );
};