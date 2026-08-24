export const NOMBRE_COOKIE_SESION = "cba_sesion";

interface ConfiguracionCookieSesion {
  token: string;
  duracionSegundos: number;
}

export function obtenerConfiguracionCookieSesion({ token, duracionSegundos }: ConfiguracionCookieSesion) {
  return {
    nombre: NOMBRE_COOKIE_SESION,
    valor: token,
    opciones: {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "lax" as const,
      path: "/",
      maxAge: duracionSegundos,
    },
  };
}