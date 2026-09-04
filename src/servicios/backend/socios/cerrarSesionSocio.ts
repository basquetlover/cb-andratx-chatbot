import type {
  AstroCookies,
} from "astro";

import {
  NOMBRE_COOKIE_SESION_SOCIO,
  OPCIONES_ELIMINAR_COOKIE_SESION_SOCIO,
} from "@servicios/seguridad/cookieSesionSocio";

export interface ResultadoCerrarSesionSocio {
  sesionCerrada: boolean;
}

export function cerrarSesionSocio(
  cookies: AstroCookies,
): ResultadoCerrarSesionSocio {
  cookies.delete(
    NOMBRE_COOKIE_SESION_SOCIO,
    OPCIONES_ELIMINAR_COOKIE_SESION_SOCIO,
  );

  return {
    sesionCerrada: true,
  };
}