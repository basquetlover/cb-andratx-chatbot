import { enviarInvitacionUsuario } from "../../emails/usuarios/enviarInvitacionUsuario";

import { guardarUsuario } from "./guardarUsuario";
import { prepararCreacionUsuario } from "./prepararCreacionUsuario";
import type { ErrorValidacionUsuario } from "./validarNuevoUsuario";

export interface NuevoUsuarioCreado {
  usuarioId: string;
  nombreCompleto: string;
  email: string;
  estado: string;
  enlaceInvitacion: string;
  emailEnviado: boolean;
}

export type ResultadoCrearNuevoUsuario =
  | {
      ok: true;
      data: NuevoUsuarioCreado;
      errores: [];
      estadoHttp: 201;
    }
  | {
      ok: false;
      data: null;
      errores: ErrorValidacionUsuario[];
      estadoHttp: 400 | 409;
    };

export async function crearNuevoUsuario(contenido: unknown, creadoPor: string | null): Promise<ResultadoCrearNuevoUsuario> {
  const preparacion = await prepararCreacionUsuario(contenido);

  if (!preparacion.ok) {
    return {
      ok: false,
      data: null,
      errores: preparacion.errores,
      estadoHttp: preparacion.estadoHttp,
    };
  }

  const usuarioGuardado = await guardarUsuario(preparacion.data, creadoPor);

  let emailEnviado = false;

  try {
    await enviarInvitacionUsuario({
      email: usuarioGuardado.email,
      nombre: preparacion.data.solicitud.datosPersonales.nombre,
      cargo: preparacion.data.solicitud.datosPersonales.cargo || "usuario autorizado",
      enlaceActivacion: preparacion.data.enlaceActivacion,
      fechaCaducidad: preparacion.data.tokenActivacion.fechaCaducidad,
    });

    emailEnviado = true;
  } catch (error) {
    console.error("El usuario se ha creado, pero no se ha podido enviar la invitación:", {
      usuarioId: usuarioGuardado.usuarioId,
      email: usuarioGuardado.email,
      error,
    });
  }

  return {
    ok: true,
    data: {
      usuarioId: usuarioGuardado.usuarioId,
      nombreCompleto: usuarioGuardado.nombreCompleto,
      email: usuarioGuardado.email,
      estado: usuarioGuardado.estado,
      enlaceInvitacion: preparacion.data.enlaceActivacion,
      emailEnviado,
    },
    errores: [],
    estadoHttp: 201,
  };
}