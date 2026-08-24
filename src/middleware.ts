import { defineMiddleware } from "astro:middleware";

import { obtenerPermisoRutaPanel } from "./configuracion/accesoRutasPanel";
import { obtenerUsuarioSesion } from "./servicios/backend/sesiones/obtenerUsuarioSesion";
import { comprobarPermisoUsuario } from "./servicios/seguridad/comprobarPermisoUsuario";
import { NOMBRE_COOKIE_SESION } from "./servicios/seguridad/cookieSesion";
import { validarOrigen } from "./servicios/seguridad/validarOrigen";

const rutasPanelPublicas = [
  "/panel/iniciar-sesion",
  "/panel/acceso-denegado",
];

function esRutaPanelPublica(ruta: string): boolean {
  return rutasPanelPublicas.some((rutaPublica) => ruta === rutaPublica || ruta.startsWith(`${rutaPublica}/`));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const ruta = context.url.pathname;
  const esRutaApi = ruta.startsWith("/api/");
  const esRutaPanel = ruta === "/panel" || ruta.startsWith("/panel/");

  if (esRutaApi) {
    const resultado = validarOrigen(context.request);

    if (!resultado.autorizado) {
      console.warn("Petición API rechazada", {
        ruta,
        metodo: context.request.method,
        motivo: resultado.motivo,
        origen: context.request.headers.get("origin"),
        referer: context.request.headers.get("referer"),
        secFetchSite: context.request.headers.get("sec-fetch-site"),
      });

      return Response.json(
        {
          ok: false,
          error: "Petición no autorizada",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }
  }

  if (esRutaPanel && !esRutaPanelPublica(ruta)) {
    const tokenSesion = context.cookies.get(NOMBRE_COOKIE_SESION)?.value;

    if (!tokenSesion) {
      console.log("No se puede obtener tokenSesion")
      return context.redirect("/panel/iniciar-sesion", 302);
    }

    let sesion;

    try {
      sesion = await obtenerUsuarioSesion(tokenSesion);
    } catch (error) {
      console.error("Error comprobando el acceso al panel:", error);

      return context.redirect("/panel/iniciar-sesion", 302);
    }

    if (!sesion) {
      context.cookies.delete(NOMBRE_COOKIE_SESION, {
        path: "/",
      });

      return context.redirect("/panel/iniciar-sesion", 302);
    }

    const permisoRequerido = obtenerPermisoRutaPanel(ruta);

    if (permisoRequerido) {
      let autorizado = false;

      try {
        autorizado = await comprobarPermisoUsuario(sesion.acceso, permisoRequerido);
      } catch (error) {
        console.error("Error comprobando los permisos del usuario:", error);

        return new Response("No se ha podido comprobar el acceso.", {
          status: 500,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }

      if (!autorizado) {
        const rutaOrigen = encodeURIComponent(ruta);

        return context.redirect(`/panel/acceso-denegado?desde=${rutaOrigen}`, 302);
      }
    }
  }

  const response = await next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");

  return response;
});