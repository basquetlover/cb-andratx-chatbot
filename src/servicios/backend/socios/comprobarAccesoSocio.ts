
import type { APIContext } from "astro";

import {
  ErrorObtenerCarnetSocioSesion,
  obtenerCarnetSocioSesion,
} from "./obtenerCarnetSocioSesion";

import {
  NOMBRE_COOKIE_SESION_SOCIO,
  verificarTokenSesionSocio,
} from "../../seguridad/cookieSesionSocio";

export type MotivoAccesoSocio =
  | "sin-sesion"
  | "sesion-no-valida"
  | "carnet-no-disponible"
  | "error-comprobacion";

export type ResultadoAccesoSocio =
  | {
      autorizado: true;
      estadoHttp: 200;
      motivo: null;
    }
  | {
      autorizado: false;
      estadoHttp: 401 | 403 | 503;
      motivo: MotivoAccesoSocio;
    };

function accesoDenegado(
  estadoHttp: 401 | 403 | 503,
  motivo: MotivoAccesoSocio,
): ResultadoAccesoSocio {
  return {
    autorizado: false,
    estadoHttp,
    motivo,
  };
}

export async function comprobarAccesoSocio(
  cookies: APIContext["cookies"],
): Promise<ResultadoAccesoSocio> {
  const tokenSesion = cookies.get(
    NOMBRE_COOKIE_SESION_SOCIO,
  )?.value;

  if (!tokenSesion) {
    return accesoDenegado(
      401,
      "sin-sesion",
    );
  }

  let sesion;

  try {
    sesion = verificarTokenSesionSocio(
      tokenSesion,
    );
  } catch (error) {
    console.error(
      "Error verificando el token del socio:",
      error,
    );

    return accesoDenegado(
      503,
      "error-comprobacion",
    );
  }

  if (!sesion) {
    return accesoDenegado(
      401,
      "sesion-no-valida",
    );
  }

  try {
    await obtenerCarnetSocioSesion(
      sesion,
    );

    return {
      autorizado: true,
      estadoHttp: 200,
      motivo: null,
    };
  } catch (error) {
    if (
      error instanceof
      ErrorObtenerCarnetSocioSesion
    ) {
      if (
        error.motivo ===
        "error-consulta"
      ) {
        console.error(
          "Error consultando la validez del carnet de socio:",
          error,
        );

        return accesoDenegado(
          503,
          "error-comprobacion",
        );
      }

      if (
        error.motivo ===
          "sesion-no-valida" ||
        error.motivo ===
          "sesion-caducada" ||
        error.motivo ===
          "sesion-revocada"
      ) {
        return accesoDenegado(
          401,
          "sesion-no-valida",
        );
      }

      return accesoDenegado(
        403,
        "carnet-no-disponible",
      );
    }

    console.error(
      "Error inesperado comprobando el acceso del socio:",
      error,
    );

    return accesoDenegado(
      503,
      "error-comprobacion",
    );
  }
}
