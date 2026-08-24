import { enviarBienvenidaUsuario } from "../../emails/usuarios/enviarBienvenidaUsuario";
import { supabaseServidor } from "../../supabase/servidor";
import { generarHashPassword, validarFormatoPassword } from "../../seguridad/password";

import { obtenerInvitacionActivacion } from "./obtenerInvitacionActivacion";

interface DatosActivacionCuenta {
  token: string;
  password: string;
  confirmarPassword: string;
}

export interface CuentaActivada {
  usuarioId: string;
  nombre: string;
  email: string;
  bienvenidaEnviada: boolean;
}

export type ResultadoActivarCuenta =
  | {
      ok: true;
      data: CuentaActivada;
      error: null;
      estadoHttp: 200;
    }
  | {
      ok: false;
      data: null;
      error: string;
      estadoHttp: 400 | 409;
    };

interface FilaUsuarioActivado {
  id: string;
  nombre: string;
  email: string;
  cargo: string | null;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export async function activarCuentaUsuario(contenido: unknown): Promise<ResultadoActivarCuenta> {
  if (!esObjeto(contenido)) {
    return {
      ok: false,
      data: null,
      error: "Los datos de activación no son válidos.",
      estadoHttp: 400,
    };
  }

  const token = typeof contenido.token === "string" ? contenido.token.trim() : "";
  const password = typeof contenido.password === "string" ? contenido.password : "";
  const confirmarPassword = typeof contenido.confirmarPassword === "string" ? contenido.confirmarPassword : "";

  if (!token) {
    return {
      ok: false,
      data: null,
      error: "El token de activación no es válido.",
      estadoHttp: 400,
    };
  }

  const errorPassword = validarFormatoPassword(password);

  if (errorPassword) {
    return {
      ok: false,
      data: null,
      error: errorPassword,
      estadoHttp: 400,
    };
  }

  if (password !== confirmarPassword) {
    return {
      ok: false,
      data: null,
      error: "Las contraseñas no coinciden.",
      estadoHttp: 400,
    };
  }

  const invitacion = await obtenerInvitacionActivacion(token);

  if (!invitacion.valida) {
    return {
      ok: false,
      data: null,
      error: invitacion.error,
      estadoHttp: 400,
    };
  }

  const passwordHash = await generarHashPassword(password);
  const fechaActivacion = new Date().toISOString();

  const { data: usuarioActivado, error: errorUsuario } = await supabaseServidor
    .from("usuarios")
    .update({
      password_hash: passwordHash,
      estado: "activo",
      email_verificado_at: fechaActivacion,
      password_changed_at: fechaActivacion,
    })
    .eq("id", invitacion.data.usuarioId)
    .eq("estado", "pendiente")
    .is("password_hash", null)
    .select("id, nombre, email, cargo")
    .maybeSingle();

  if (errorUsuario) {
    throw new Error(`No se ha podido activar el usuario: ${errorUsuario.message}`);
  }

  if (!usuarioActivado) {
    return {
      ok: false,
      data: null,
      error: "La cuenta ya ha sido activada o ha cambiado de estado.",
      estadoHttp: 409,
    };
  }

  const usuario = usuarioActivado as FilaUsuarioActivado;

  const { data: tokenUtilizado, error: errorToken } = await supabaseServidor
    .from("tokens_usuario")
    .update({
      usado_at: fechaActivacion,
    })
    .eq("id", invitacion.data.tokenId)
    .eq("usuario_id", invitacion.data.usuarioId)
    .is("usado_at", null)
    .is("cancelado_at", null)
    .gt("expires_at", fechaActivacion)
    .select("id")
    .maybeSingle();

  if (errorToken || !tokenUtilizado) {
    const { error: errorReversion } = await supabaseServidor
      .from("usuarios")
      .update({
        password_hash: null,
        estado: "pendiente",
        email_verificado_at: null,
        password_changed_at: null,
      })
      .eq("id", invitacion.data.usuarioId)
      .eq("password_hash", passwordHash);

    if (errorReversion) {
      console.error("No se ha podido revertir una activación incompleta:", {
        usuarioId: invitacion.data.usuarioId,
        error: errorReversion.message,
      });

      throw new Error("La activación ha quedado incompleta y requiere revisión.");
    }

    if (errorToken) {
      throw new Error(`No se ha podido utilizar el token: ${errorToken.message}`);
    }

    return {
      ok: false,
      data: null,
      error: "La invitación ha caducado o ya ha sido utilizada.",
      estadoHttp: 409,
    };
  }

  let bienvenidaEnviada = false;

  try {
    await enviarBienvenidaUsuario({
      email: usuario.email,
      nombre: usuario.nombre,
      cargo: usuario.cargo || "usuario autorizado",
    });

    bienvenidaEnviada = true;
  } catch (error) {
    console.error("La cuenta se ha activado, pero no se ha podido enviar la bienvenida:", {
      usuarioId: usuario.id,
      email: usuario.email,
      error,
    });
  }

  return {
    ok: true,
    data: {
      usuarioId: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      bienvenidaEnviada,
    },
    error: null,
    estadoHttp: 200,
  };
}