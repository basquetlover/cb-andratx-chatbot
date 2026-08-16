import { defineMiddleware } from "astro:middleware";

import { validarOrigen } from "./servicios/seguridad/validarOrigen";

export const onRequest = defineMiddleware(
  async (context, next) => {
    const esRutaApi =
      context.url.pathname.startsWith("/api/");

    if (!esRutaApi) {
      return next();
    }

    const resultado = validarOrigen(context.request);

    if (!resultado.autorizado) {
      console.warn("Petición API rechazada", {
        ruta: context.url.pathname,
        metodo: context.request.method,
        motivo: resultado.motivo,
        origen: context.request.headers.get("origin"),
        referer: context.request.headers.get("referer"),
        secFetchSite:
          context.request.headers.get("sec-fetch-site"),
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
        }
      );
    }

    const response = await next();

    response.headers.set(
      "X-Content-Type-Options",
      "nosniff"
    );

    response.headers.set(
      "Referrer-Policy",
      "same-origin"
    );

    return response;
  }
);