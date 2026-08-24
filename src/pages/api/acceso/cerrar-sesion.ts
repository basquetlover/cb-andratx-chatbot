import type { APIRoute } from "astro";

import { cerrarSesionUsuario } from "@servicios/backend/sesiones/cerrarSesionUsuario";
import { NOMBRE_COOKIE_SESION } from "@servicios/seguridad/cookieSesion";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const token = cookies.get(NOMBRE_COOKIE_SESION)?.value;

  if (token) {
    try {
      await cerrarSesionUsuario(token);
    } catch (error) {
      console.error("Error cerrando la sesión:", error);
    }
  }

  cookies.delete(NOMBRE_COOKIE_SESION, {
    path: "/",
  });

  return redirect("/panel/iniciar-sesion", 303);
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
        Allow: "POST",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
};