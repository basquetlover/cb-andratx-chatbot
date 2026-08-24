import { comprobarEmailDisponible } from "./comprobarEmailDisponible";
import { construirEnlaceActivacion } from "./construirEnlaceActivacion";
import { generarTokenActivacion, type TokenActivacionGenerado } from "./generarTokenActivacion";
import { validarNuevoUsuario, type ErrorValidacionUsuario, type SolicitudCrearUsuario } from "./validarNuevoUsuario";
import { validarReferenciasNuevoUsuario } from "./validarReferenciasNuevoUsuario";

export interface CreacionUsuarioPreparada {
  solicitud: SolicitudCrearUsuario;
  tokenActivacion: TokenActivacionGenerado;
  enlaceActivacion: string;
}

export type ResultadoPreparacionUsuario =
  | {
      ok: true;
      data: CreacionUsuarioPreparada;
      errores: [];
      estadoHttp: 200;
    }
  | {
      ok: false;
      data: null;
      errores: ErrorValidacionUsuario[];
      estadoHttp: 400 | 409;
    };

export async function prepararCreacionUsuario(contenido: unknown): Promise<ResultadoPreparacionUsuario> {
  const validacionEstructura = validarNuevoUsuario(contenido);

  if (!validacionEstructura.ok) {
    return {
      ok: false,
      data: null,
      errores: validacionEstructura.errores,
      estadoHttp: 400,
    };
  }

  const erroresReferencias = await validarReferenciasNuevoUsuario(validacionEstructura.data);

  if (erroresReferencias.length > 0) {
    return {
      ok: false,
      data: null,
      errores: erroresReferencias,
      estadoHttp: 400,
    };
  }

  const disponibilidadEmail = await comprobarEmailDisponible(validacionEstructura.data.datosPersonales.email);

  if (!disponibilidadEmail.disponible) {
    return {
      ok: false,
      data: null,
      errores: [
        {
          campo: "datosPersonales.email",
          mensaje: "Ya existe un usuario con ese correo electrónico.",
        },
      ],
      estadoHttp: 409,
    };
  }

  const tokenActivacion = await generarTokenActivacion(24);
  const enlaceActivacion = construirEnlaceActivacion(tokenActivacion.token);

  return {
    ok: true,
    data: {
      solicitud: validacionEstructura.data,
      tokenActivacion,
      enlaceActivacion,
    },
    errores: [],
    estadoHttp: 200,
  };
}